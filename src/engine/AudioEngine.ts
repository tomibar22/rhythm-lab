/**
 * @file AudioEngine.ts
 * Tone.js-based audio engine for Rhythm Lab.
 *
 * Each layer schedules its onsets as a Tone.Part within a looping Transport.
 * Random layers use Tone.Loop with per-step probability checks.
 * Different layers can have different step counts, enabling polyrhythm.
 * Gap control: layers can rest for N cycles after each played cycle.
 *
 * Parts are tracked per layer ID so that editing one layer doesn't
 * interrupt others — only the changed layer is rescheduled.
 */

import * as Tone from "tone";
import { Layer, SOUND_PRESETS, SoundPreset, SoundSpec } from "./types";

const APP_PPQ = 960;

type StepCallback = (layerId: string, step: number) => void;

/**
 * Humanize velocity at playback time.
 * Applies metric accent hierarchy + random micro-jitter.
 * Never modifies stored pattern data — purely a rendering-time effect.
 *
 * @param baseVelocity  Raw velocity (0–1 scale, already incorporating layer volume)
 * @param step          Current step index within the layer
 * @param totalSteps    Total steps in the layer
 * @param cycleBeats    Number of beats in the cycle
 * @returns             Humanized velocity (0–1 scale)
 */
function humanizeVelocity(
  baseVelocity: number,
  step: number,
  totalSteps: number,
  cycleBeats: number,
): number {
  const stepsPerBeat = totalSteps / cycleBeats;

  // ── Metric accent hierarchy ──
  // Where does this step fall within the beat?
  // beat position 0 = downbeat, 0.5 = "and", 0.25/"0.75" = "e"/"a"
  const posInBeat = (step % stepsPerBeat) / stepsPerBeat;

  let accentScale: number;
  if (posInBeat === 0) {
    // Downbeat — full weight, slight boost for beat 1
    accentScale = step === 0 ? 1.0 : 0.97;
  } else if (Math.abs(posInBeat - 0.5) < 0.001) {
    // "and" — slightly softer
    accentScale = 0.92;
  } else if (stepsPerBeat >= 4 && (
    Math.abs(posInBeat - 0.25) < 0.001 ||
    Math.abs(posInBeat - 0.75) < 0.001
  )) {
    // "e" / "a" (16th note subdivisions) — ghost-note territory
    accentScale = 0.84;
  } else {
    // Other subdivisions — gentle reduction proportional to depth
    accentScale = 0.88;
  }

  // ── Random micro-jitter ──
  // ±6% random variation — breaks machine-gun effect
  const jitter = 1.0 + (Math.random() - 0.5) * 0.12;

  return Math.min(1.0, Math.max(0, baseVelocity * accentScale * jitter));
}

export class AudioEngine {
  private synths = new Map<string, Tone.Synth | Tone.NoiseSynth>();
  /** Per-layer scheduled events (Part or Loop). */
  private layerEvents = new Map<string, { stop: () => void; dispose: () => void }[]>();
  /** Tick offset for cycle-aligned progress calculation. */
  private cycleAlignTick = 0;
  /** The cycle length the engine is currently using for scheduling. */
  private _effectiveCycleBeats = 4;
  /** Repeating transport event that fires at each cycle boundary. */
  private boundaryEventId: number | null = null;
  /** Pending deferred cycle-length change, applied at next boundary. */
  private pendingCycleChange: {
    cycleBeats: number;
    callback: (boundaryTick: number) => void;
  } | null = null;

  async init(): Promise<void> {
    await Tone.start();
    if (Tone.getContext().state !== "running") {
      await Tone.getContext().resume();
    }
    Tone.getTransport().PPQ = APP_PPQ;
    // initialized
  }

  private getSpec(sound: SoundPreset): SoundSpec {
    return SOUND_PRESETS.find((s) => s.value === sound)!;
  }

  private getOrCreateSynth(
    layerId: string,
    sound: SoundPreset,
  ): Tone.Synth | Tone.NoiseSynth {
    const key = `${layerId}:${sound}`;
    const existing = this.synths.get(key);
    if (existing) return existing;

    const spec = this.getSpec(sound);
    let synth: Tone.Synth | Tone.NoiseSynth;

    if (spec.isNoise) {
      synth = new Tone.NoiseSynth({
        noise: { type: spec.noiseType ?? "white" },
        envelope: { attack: 0.001, decay: spec.decay, sustain: 0 },
      }).toDestination();
    } else {
      synth = new Tone.Synth({
        oscillator: { type: spec.oscType },
        envelope: {
          attack: 0.001,
          decay: spec.decay,
          sustain: 0,
          release: 0.01,
        },
      }).toDestination();
    }

    this.synths.set(key, synth);
    return synth;
  }

  private triggerSynth(
    synth: Tone.Synth | Tone.NoiseSynth,
    spec: SoundSpec,
    time: number,
    vol: number,
  ): void {
    if (synth instanceof Tone.NoiseSynth) {
      synth.triggerAttackRelease(spec.decay, time, vol);
    } else {
      (synth as Tone.Synth).triggerAttackRelease(
        spec.freq,
        spec.decay,
        time,
        vol,
      );
    }
  }

  // ── Per-layer part management ──

  private addLayerEvent(layerId: string, event: { stop: () => void; dispose: () => void }): void {
    const events = this.layerEvents.get(layerId) ?? [];
    events.push(event);
    this.layerEvents.set(layerId, events);
  }

  private clearLayerParts(layerId: string): void {
    const events = this.layerEvents.get(layerId);
    if (events) {
      for (const e of events) {
        e.stop();
        e.dispose();
      }
      this.layerEvents.delete(layerId);
    }
  }

  private clearAllParts(): void {
    for (const layerId of this.layerEvents.keys()) {
      this.clearLayerParts(layerId);
    }
  }

  // ── Scheduling ──

  // ── Boundary sentinel ──
  // A repeating transport event that fires at each cycle boundary.
  // When a deferred cycle change is pending, it applies it exactly
  // on the downbeat. More reliable than scheduleOnce for this purpose.

  private startBoundarySentinel(cycleBeats: number, alignTick: number): void {
    this.stopBoundarySentinel();
    const transport = Tone.getTransport();
    const cycleTicks = cycleBeats * APP_PPQ;

    // Start at the NEXT boundary (alignTick + cycleTicks), not alignTick itself
    // which would fire as a no-op immediately. Track the exact mathematical
    // boundary tick rather than reading transport.ticks (which has main-thread jitter).
    let nextBoundary = alignTick + cycleTicks;

    this.boundaryEventId = transport.scheduleRepeat(
      () => {
        const boundaryTick = nextBoundary;
        nextBoundary += cycleTicks;

        if (!this.pendingCycleChange) return;
        const change = this.pendingCycleChange;
        this.pendingCycleChange = null;
        change.callback(boundaryTick);
      },
      `${cycleTicks}i`,                   // interval: every cycle
      `${alignTick + cycleTicks}i`,       // start: first future boundary
    );
  }

  private stopBoundarySentinel(): void {
    if (this.boundaryEventId !== null) {
      Tone.getTransport().clear(this.boundaryEventId);
      this.boundaryEventId = null;
    }
  }

  /**
   * Request a deferred cycle-length change. The change is applied at the
   * next cycle boundary by the boundary sentinel.
   * Multiple calls before the boundary just overwrite the pending change.
   */
  requestCycleChange(newCycleBeats: number, callback: (boundaryTick: number) => void): void {
    this.pendingCycleChange = { cycleBeats: newCycleBeats, callback };
  }

  /** Cancel any pending deferred cycle change. */
  cancelPendingCycleChange(): void {
    this.pendingCycleChange = null;
  }

  /**
   * Compute the correct startTick and initialCounter for a random layer
   * so it stays in sync with the cycle position mid-playback.
   */
  private computeRandomLayerSync(
    layer: Layer,
    cycleTicks: number,
    alignTick: number,
  ): { startTick: number; initialCounter: number } {
    const transport = Tone.getTransport();
    const roundedStepTicks = Math.round(cycleTicks / layer.steps);
    const totalStepsPerSuper = layer.steps * (1 + layer.gap);

    const offsetTicks = transport.ticks - alignTick;
    // How many step intervals have elapsed since alignTick?
    // Use ceil to find the next step boundary at or after current position.
    const stepsElapsed = Math.ceil(offsetTicks / roundedStepTicks);
    const startTick = alignTick + stepsElapsed * roundedStepTicks;
    const initialCounter = stepsElapsed % totalStepsPerSuper;

    return { startTick, initialCounter };
  }

  /**
   * Schedule all layers (full reschedule). Clears everything first.
   * Used for: play start, cycle-length changes, mute/solo changes.
   *
   * @param alignTick — When > 0, parts start at this transport tick so the
   *   loop begins at beat 0. Used for deferred cycle-length changes.
   *   When 0, parts anchor to transport time 0 for natural continuity.
   */
  scheduleLayers(
    layers: Layer[],
    cycleBeats: number,
    onStep: StepCallback,
    alignTick = 0,
  ): void {
    this.clearAllParts();
    this.cycleAlignTick = alignTick;
    this._effectiveCycleBeats = cycleBeats;
    this.startBoundarySentinel(cycleBeats, alignTick);

    const cycleTicks = cycleBeats * APP_PPQ;
    const hasSolo = layers.some((l) => l.solo);
    const transport = Tone.getTransport();
    const isMidPlayback = transport.state === "started" && transport.ticks > alignTick;

    for (const layer of layers) {
      if (layer.muted) continue;
      if (hasSolo && !layer.solo) continue;

      if (layer.type === "random") {
        if (isMidPlayback) {
          // Mid-playback: compute correct counter so random layers stay
          // in sync with the cycle position instead of resetting to step 0.
          const { startTick, initialCounter } =
            this.computeRandomLayerSync(layer, cycleTicks, alignTick);
          this.scheduleRandomLayer(layer, cycleTicks, onStep, startTick, initialCounter);
        } else {
          this.scheduleRandomLayer(layer, cycleTicks, onStep, alignTick);
        }
      } else {
        this.scheduleManualLayer(layer, cycleTicks, onStep, alignTick);
      }
    }
  }

  /**
   * Reschedule a single layer without touching other layers.
   * Used for: pattern/density/steps/volume/sound changes on one layer.
   */
  rescheduleLayer(
    layer: Layer,
    cycleBeats: number,
    onStep: StepCallback,
  ): void {
    this.clearLayerParts(layer.id);

    const cycleTicks = cycleBeats * APP_PPQ;

    if (layer.type === "random") {
      const { startTick, initialCounter } =
        this.computeRandomLayerSync(layer, cycleTicks, this.cycleAlignTick);
      this.scheduleRandomLayer(layer, cycleTicks, onStep, startTick, initialCounter);
    } else {
      this.scheduleManualLayer(layer, cycleTicks, onStep, 0);
    }
  }

  private scheduleManualLayer(
    layer: Layer,
    cycleTicks: number,
    onStep: StepCallback,
    alignTick: number,
  ): void {
    const synth = this.getOrCreateSynth(layer.id, layer.sound);
    const spec = this.getSpec(layer.sound);
    const stepTicks = cycleTicks / layer.steps;
    const gap = layer.gap;

    // With gap: super-cycle = (1 + gap) cycles, only play in the first
    const superCycleTicks = cycleTicks * (1 + gap);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events: Array<Record<string, any>> = [];

    for (let i = 0; i < layer.steps; i++) {
      if (layer.pattern[i] !== 1) continue;

      let tickPos = Math.round(i * stepTicks);

      if (layer.swing !== 0.5 && i % 2 === 1) {
        const pairStart = Math.floor(i / 2) * 2 * stepTicks;
        tickPos = Math.round(pairStart + layer.swing * 2 * stepTicks);
      }

      events.push({
        time: `${tickPos}i`,
        step: i,
        velocity: layer.velocities[i],
      });
    }

    const layerVolume = layer.volume;
    const layerId = layer.id;

    const cycleBeats = cycleTicks / APP_PPQ;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const part = new Tone.Part((time: number, event: any) => {
      if (layerVolume > 0) {
        const rawVol = (event.velocity / 127) * layerVolume;
        const vol = humanizeVelocity(rawVol, event.step, layer.steps, cycleBeats);
        this.triggerSynth(synth, spec, time, vol);
      }
      Tone.getDraw().schedule(() => {
        onStep(layerId, event.step);
      }, time);
    }, events);

    part.loop = true;
    part.loopEnd = `${superCycleTicks}i`;
    part.start(`${alignTick}i`);

    this.addLayerEvent(layerId, part);
  }

  private scheduleRandomLayer(
    layer: Layer,
    cycleTicks: number,
    onStep: StepCallback,
    alignTick: number,
    initialCounter: number = 0,
  ): void {
    const synth = this.getOrCreateSynth(layer.id, layer.sound);
    const spec = this.getSpec(layer.sound);
    const stepTicks = cycleTicks / layer.steps;

    const layerVolume = layer.volume;
    const layerId = layer.id;
    const density = layer.density;
    const swing = layer.swing;
    const steps = layer.steps;
    const gap = layer.gap;
    const allowedMask = [...layer.pattern]; // 1 = allowed, 0 = forbidden
    const totalStepsPerSuper = steps * (1 + gap);
    const roundedStepTicks = Math.round(stepTicks);

    // Counter-based step tracking: increments exactly once per loop callback.
    // initialCounter allows resuming mid-cycle (e.g., after density change)
    // so the layer stays in sync with the cycle position.
    let stepCounter = initialCounter;

    const loop = new Tone.Loop((time: number) => {
      const superStep = stepCounter % totalStepsPerSuper;
      const currentStep = superStep % steps;
      const isInPlayCycle = superStep < steps;
      stepCounter++;

      if (isInPlayCycle) {
        let triggerTime = time;
        if (swing !== 0.5 && currentStep % 2 === 1) {
          const straightInterval = Tone.Ticks(stepTicks).toSeconds();
          const swungOffset = (swing - 0.5) * 2 * straightInterval;
          triggerTime = time + swungOffset;
        }

        // pattern[step] === 0 means "forbidden" — never fires
        if (allowedMask[currentStep] === 1 && Math.random() < density) {
          if (layerVolume > 0) {
            const cycleBeats = cycleTicks / APP_PPQ;
            const rawVol = (100 / 127) * layerVolume;
            const vol = humanizeVelocity(rawVol, currentStep, steps, cycleBeats);
            this.triggerSynth(synth, spec, triggerTime, vol);
          }
          Tone.getDraw().schedule(() => {
            onStep(layerId, currentStep);
          }, triggerTime);
        }
      }
    }, `${roundedStepTicks}i`);

    loop.start(`${alignTick}i`);
    this.addLayerEvent(layerId, loop);
  }

  play(tempo: number): void {
    const transport = Tone.getTransport();
    transport.bpm.value = tempo;
    transport.position = 0;
    this.cycleAlignTick = 0;
    transport.start();
  }

  stop(): void {
    const transport = Tone.getTransport();
    transport.stop();
    transport.position = 0;
    this.cycleAlignTick = 0;
    this.pendingCycleChange = null;
    this.stopBoundarySentinel();
    this.clearAllParts();
  }

  setTempo(bpm: number): void {
    Tone.getTransport().bpm.value = bpm;
  }

  // scheduleAtCycleBoundary and clearScheduledEvent removed —
  // replaced by boundary sentinel + requestCycleChange API.

  get isStarted(): boolean {
    return Tone.getTransport().state === "started";
  }

  /** The cycle length the engine is actually playing right now. */
  get effectiveCycleBeats(): number {
    return this._effectiveCycleBeats;
  }

  getProgress(cycleBeats?: number): number {
    const transport = Tone.getTransport();
    // Use the engine's effective cycle beats — not the UI value which may
    // have changed before the deferred boundary switch takes effect.
    const beats = cycleBeats ?? this._effectiveCycleBeats;
    const cycleTicks = beats * APP_PPQ;
    // Subtract alignTick offset so progress stays in phase with audio parts
    const offsetTicks = transport.ticks - this.cycleAlignTick;
    const currentTicks = ((offsetTicks % cycleTicks) + cycleTicks) % cycleTicks;
    return currentTicks / cycleTicks;
  }

  dispose(): void {
    this.pendingCycleChange = null;
    this.stopBoundarySentinel();
    this.clearAllParts();
    this.stop();
    for (const synth of this.synths.values()) {
      synth.dispose();
    }
    this.synths.clear();
    // reset
  }
}

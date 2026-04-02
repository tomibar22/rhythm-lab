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
 * Applies a pre-computed accent weight + random micro-jitter.
 * Never modifies stored pattern data — purely a rendering-time effect.
 */
function humanizeVelocity(baseVelocity: number, accentWeight: number): number {
  // ±6% random variation — breaks machine-gun effect
  const jitter = 1.0 + (Math.random() - 0.5) * 0.12;
  return Math.min(1.0, Math.max(0, baseVelocity * accentWeight * jitter));
}

/**
 * Compute per-onset accent weights from the pattern's inter-onset intervals.
 *
 * Instead of a fixed metric hierarchy (downbeat > offbeat), this derives
 * accents from the rhythm's own structure: a note after a longer gap gets
 * slightly more weight. This naturally produces correct accents for:
 * - Swing grooves (offbeats after long gaps get emphasis)
 * - Polyrhythmic groupings (first note of each group gets emphasis)
 * - Evenly spaced patterns (uniform — no bias)
 *
 * Uses time-domain gaps (accounting for swing) so swing feel is reflected
 * in the accent contour, not just in timing.
 *
 * @returns Array of accent weights (0–1) per step. 0 for rests.
 */
function computeAccentWeights(
  pattern: (0 | 1)[],
  steps: number,
  swing: number,
): number[] {
  const stepDur = 1 / steps; // fractional duration per step within cycle

  // Collect onset positions in time-space (0–1 fraction of cycle)
  const onsets: { step: number; time: number }[] = [];
  for (let i = 0; i < steps; i++) {
    if (pattern[i] !== 1) continue;
    let time: number;
    if (swing !== 0.5 && i % 2 === 1) {
      const pairStart = Math.floor(i / 2) * 2 * stepDur;
      time = pairStart + swing * 2 * stepDur;
    } else {
      time = i * stepDur;
    }
    onsets.push({ step: i, time });
  }

  const weights = new Array<number>(steps).fill(0);

  if (onsets.length <= 1) {
    for (const o of onsets) weights[o.step] = 1.0;
    return weights;
  }

  // Compute time-domain IOI (gap) before each onset, wrapping around cycle
  const iois: number[] = [];
  for (let i = 0; i < onsets.length; i++) {
    const prev = i === 0 ? onsets[onsets.length - 1] : onsets[i - 1];
    let gap = onsets[i].time - prev.time;
    if (gap <= 0) gap += 1.0;
    iois.push(gap);
  }

  const maxIOI = Math.max(...iois);
  const minIOI = Math.min(...iois);

  if (maxIOI - minIOI < 1e-6) {
    // Uniform spacing — all accents equal
    for (const o of onsets) weights[o.step] = 1.0;
    return weights;
  }

  // Map: longer preceding gap → stronger accent
  // Range: 0.75 (after shortest gap) to 1.0 (after longest gap)
  // Wide enough to create musical contour in dense patterns.
  const BASE = 0.75;
  const RANGE = 1.0 - BASE;
  for (let i = 0; i < onsets.length; i++) {
    const normalized = (iois[i] - minIOI) / (maxIOI - minIOI);
    weights[onsets[i].step] = BASE + normalized * RANGE;
  }

  // Consecutive-hit rolloff: in runs of 3+ adjacent onsets, inner hits
  // are slightly attenuated — like a drummer's natural energy sag in the
  // middle of a fast passage. First and last hits of each run keep full weight.
  let runStart = -1;
  for (let i = 0; i <= steps; i++) {
    const isOn = i < steps && pattern[i] === 1;
    if (isOn && runStart === -1) {
      runStart = i;
    } else if (!isOn && runStart !== -1) {
      const runLen = i - runStart;
      if (runLen >= 3) {
        for (let j = runStart + 1; j < i - 1; j++) {
          weights[j] *= 0.90; // ~10% dip on inner hits
        }
      }
      runStart = -1;
    }
  }

  return weights;
}

export class AudioEngine {
  private synths = new Map<string, Tone.Synth | Tone.NoiseSynth>();
  /** Per-layer scheduled events (Part or Loop). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private layerEvents = new Map<string, any[]>();
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

  constructor() {
    // No master bus processing — synths go directly to destination.
    // Headroom is handled by conservative per-layer volumes (0.8 default).
  }

  async init(): Promise<void> {
    await Tone.start();
    if (Tone.getContext().state !== "running") {
      await Tone.getContext().resume();
    }
    Tone.getTransport().PPQ = APP_PPQ;
    // initialized
  }

  /**
   * Pre-create synths for all layers so they're fully initialized before
   * any scheduling or transport start. Without this, synths are lazily
   * created inside scheduleLayers and their first trigger fires with
   * essentially zero time since construction — causing a startup click
   * because the underlying OscillatorNode/AudioBufferSourceNode hasn't
   * fully initialized within the Web Audio graph.
   */
  warmUpSynths(layers: Layer[], includeCountdown = false): void {
    for (const layer of layers) {
      this.getOrCreateSynth(layer.id, layer.sound);
    }
    if (includeCountdown) {
      this.getOrCreateSynth("__countdown__", "ping");
    }
  }

  private getSpec(sound: SoundPreset): SoundSpec {
    return SOUND_PRESETS.find((s) => s.value === sound) ?? SOUND_PRESETS[0];
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
        envelope: { attack: 0.005, decay: spec.decay, sustain: 0 },
      }).toDestination();
    } else {
      synth = new Tone.Synth({
        oscillator: { type: spec.oscType },
        envelope: {
          attack: 0.005,
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
    try {
      if (synth.disposed) return;

      // Duration microvariation: ±12% on note length — subtly varies how
      // long each hit rings. We vary the `duration` param to triggerAttackRelease
      // (which controls when release is called), NOT `synth.envelope.decay`
      // (mutating envelope AudioParams before trigger causes first-hit artifacts).
      const durVar = spec.decay * (1.0 + (Math.random() - 0.5) * 0.24);

      if (synth instanceof Tone.NoiseSynth) {
        synth.triggerAttackRelease(durVar, time, vol);
      } else {
        // Pitch microvariation: ±1% (~±17 cents) — alive but not detuned.
        const freqVar = spec.freq * (1.0 + (Math.random() - 0.5) * 0.02);
        (synth as Tone.Synth).triggerAttackRelease(freqVar, durVar, time, vol);
      }
    } catch {
      // Synth may have been disposed between check and trigger — ignore
    }
  }

  // ── Per-layer part management ──

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private addLayerEvent(layerId: string, event: any): void {
    const events = this.layerEvents.get(layerId) ?? [];
    events.push(event);
    this.layerEvents.set(layerId, events);
  }

  private clearLayerParts(layerId: string): void {
    const events = this.layerEvents.get(layerId);
    if (events) {
      for (const e of events) {
        try {
          // Cancel pending events in the transport lookahead before stopping
          if (typeof e.cancel === "function") e.cancel(0);
          e.stop();
          e.dispose();
        } catch {
          // Part/Loop may already be disposed
        }
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
    const totalStepsPerSuper = layer.steps * layer.cyclePattern.length;

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

    const hasSolo = layers.some((l) => l.solo);
    const transport = Tone.getTransport();
    const isMidPlayback = transport.state === "started" && transport.ticks > alignTick;

    for (const layer of layers) {
      if (layer.muted) continue;
      if (hasSolo && !layer.solo) continue;

      // Polymetric layers: cycleTicks = steps × (PPQ / subdivision)
      // Normal layers: cycleTicks = cycleBeats × PPQ
      const layerCycleTicks = layer.polymetric && layer.subdivision
        ? Math.round(layer.steps * APP_PPQ / layer.subdivision)
        : cycleBeats * APP_PPQ;

      if (layer.type === "random") {
        if (isMidPlayback) {
          const { startTick, initialCounter } =
            this.computeRandomLayerSync(layer, layerCycleTicks, alignTick);
          this.scheduleRandomLayer(layer, layerCycleTicks, onStep, startTick, initialCounter);
        } else {
          this.scheduleRandomLayer(layer, layerCycleTicks, onStep, alignTick);
        }
      } else {
        this.scheduleManualLayer(layer, layerCycleTicks, onStep, alignTick);
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

    const cycleTicks = layer.polymetric && layer.subdivision
      ? Math.round(layer.steps * APP_PPQ / layer.subdivision)
      : cycleBeats * APP_PPQ;

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
    const cyclePattern = layer.cyclePattern;

    // Super-cycle = cyclePattern.length cycles
    const superCycleTicks = cycleTicks * cyclePattern.length;

    const accentWeights = computeAccentWeights(layer.pattern as (0 | 1)[], layer.steps, layer.swing);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events: Array<Record<string, any>> = [];

    // Place events only in play-cycles (cyclePattern[c] === 1)
    for (let c = 0; c < cyclePattern.length; c++) {
      if (cyclePattern[c] !== 1) continue;
      const cycleOffset = c * cycleTicks;
      for (let i = 0; i < layer.steps; i++) {
        if (layer.pattern[i] !== 1) continue;

        let tickPos = Math.round(i * stepTicks);

        if (layer.swing !== 0.5 && i % 2 === 1) {
          const pairStart = Math.floor(i / 2) * 2 * stepTicks;
          tickPos = Math.round(pairStart + layer.swing * 2 * stepTicks);
        }

        events.push({
          time: `${cycleOffset + tickPos}i`,
          step: i,
          velocity: layer.velocities[i],
          accent: accentWeights[i],
        });
      }
    }

    const layerVolume = layer.volume;
    const layerId = layer.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const part = new Tone.Part((time: number, event: any) => {
      if (layerVolume > 0) {
        const rawVol = (event.velocity / 127) * layerVolume;
        const vol = humanizeVelocity(rawVol, event.accent);
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
    const cyclePattern = [...layer.cyclePattern];
    const allowedMask = [...layer.pattern]; // 0 = forbidden, 1 = allowed (random), 2 = locked (always fires)
    const totalStepsPerSuper = steps * cyclePattern.length;
    const roundedStepTicks = Math.round(stepTicks);
    const repeatCycles = layer.repeatCycles ?? 0;
    const hitsPerCycle = layer.hitsPerCycle ?? 0;
    const allowedIndices = allowedMask.reduce<number[]>((acc, v, i) => { if (v === 1) acc.push(i); return acc; }, []);
    const lockedIndices = new Set(allowedMask.reduce<number[]>((acc, v, i) => { if (v === 2) acc.push(i); return acc; }, []));

    // Counter-based step tracking: increments exactly once per loop callback.
    // initialCounter allows resuming mid-cycle (e.g., after density change)
    // so the layer stays in sync with the cycle position.
    let stepCounter = initialCounter;

    // Repeat feature: cache random hits and replay for N extra play-cycles
    let cachedHits: boolean[] | null = null;
    let playCycleCount = 0;

    /** Generate exactly N random hits. Locked steps always fire and count toward the total. */
    const generateExactHits = (n: number): boolean[] => {
      const result = new Array<boolean>(steps).fill(false);
      // Locked steps fire first and count toward the hit budget
      for (const idx of lockedIndices) result[idx] = true;
      const remaining = Math.max(0, n - lockedIndices.size);
      const pool = [...allowedIndices]; // only non-locked allowed steps
      const count = Math.min(remaining, pool.length);
      for (let i = 0; i < count; i++) {
        const j = i + Math.floor(Math.random() * (pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
        result[pool[i]] = true;
      }
      return result;
    };

    const loop = new Tone.Loop((time: number) => {
      const superStep = stepCounter % totalStepsPerSuper;
      const currentStep = superStep % steps;
      const cycleIdx = Math.floor(superStep / steps);
      const isPlayCycle = cyclePattern[cycleIdx] === 1;
      stepCounter++;

      if (isPlayCycle) {
        // At start of play-cycle, decide whether to regenerate random hits
        if (currentStep === 0) {
          if (hitsPerCycle > 0) {
            // Exact hits mode: always generate cached hits
            if (repeatCycles === 0 || playCycleCount % (1 + repeatCycles) === 0) {
              cachedHits = generateExactHits(hitsPerCycle);
            }
          } else if (repeatCycles === 0) {
            cachedHits = null; // per-step random (default behavior)
          } else if (playCycleCount % (1 + repeatCycles) === 0) {
            cachedHits = Array.from({ length: steps }, (_, i) =>
              allowedMask[i] === 2 || (allowedMask[i] === 1 && Math.random() < density),
            );
          }
          playCycleCount++;
        }

        let shouldFire: boolean;
        if (lockedIndices.has(currentStep)) {
          shouldFire = true; // locked steps always fire
        } else if (cachedHits) {
          shouldFire = cachedHits[currentStep];
        } else {
          shouldFire = allowedMask[currentStep] === 1 && Math.random() < density;
        }

        if (shouldFire) {
          let triggerTime = time;
          if (swing !== 0.5 && currentStep % 2 === 1) {
            const straightInterval = Tone.Ticks(stepTicks).toSeconds();
            const swungOffset = (swing - 0.5) * 2 * straightInterval;
            triggerTime = time + swungOffset;
          }

          if (layerVolume > 0) {
            const rawVol = (100 / 127) * layerVolume;
            const vol = humanizeVelocity(rawVol, 1.0);
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

  /**
   * Schedule countdown pip clicks before layer playback begins.
   * Non-looping — plays once then the layers take over.
   * @param onBeat Called on the main thread for each countdown beat with
   *   `{ beat, totalBeats, isBarStart }` — used for the visual overlay.
   *   Beat is 1-indexed (1 = first beat).
   */
  scheduleCountdown(
    cycleBeats: number,
    countdownBars: number,
    onBeat?: (info: { beat: number; totalBeats: number; isBarStart: boolean }) => void,
  ): void {
    const spec = this.getSpec("ping");
    const synth = this.getOrCreateSynth("__countdown__", "ping");
    const totalBeats = countdownBars * cycleBeats;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events: Array<Record<string, any>> = [];
    for (let i = 0; i < totalBeats; i++) {
      // First beat of each bar gets a slightly louder accent
      const isBarStart = i % cycleBeats === 0;
      events.push({ time: `${i * APP_PPQ}i`, vol: isBarStart ? 0.7 : 0.4, beat: i + 1, isBarStart });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const part = new Tone.Part((time: number, event: any) => {
      this.triggerSynth(synth, spec, time, event.vol);
      if (onBeat) {
        // Fire on main thread so React can update
        Tone.getDraw().schedule(() => {
          onBeat({ beat: event.beat, totalBeats, isBarStart: event.isBarStart });
        }, time);
      }
    }, events);

    part.loop = false;
    part.start("0i");
    this.addLayerEvent("__countdown__", part);
  }

  play(tempo: number): void {
    const transport = Tone.getTransport();
    transport.bpm.value = tempo;
    transport.position = 0;
    // Don't reset cycleAlignTick — scheduleLayers already set it
    // (e.g., for countdown offset)
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

  /** Get progress for a polymetric layer (cycle length in ticks, not beats). */
  getProgressByTicks(cycleTicks: number): number {
    const transport = Tone.getTransport();
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
      try {
        if (!synth.disposed) synth.dispose();
      } catch {
        // ignore disposal errors
      }
    }
    this.synths.clear();
  }
}

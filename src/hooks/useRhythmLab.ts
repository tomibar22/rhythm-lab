/**
 * @file useRhythmLab.ts
 * Main state management hook for Rhythm Lab.
 * Manages layers, transport, and audio engine coordination.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Layer, LayerType, LayerGroup, LAYER_COLORS, SOUND_PRESETS, SoundPreset } from "../engine/types";
import { AudioEngine } from "../engine/AudioEngine";
import { euclidean } from "../engine/RhythmEngine";
import {
  SavedTemplate,
  SavedTemplateLayer,
  SavedTemplateGroup,
  getSavedTemplates,
} from "../engine/storage";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

/** Step multipliers shared with GridEditor. */
export const STEP_MULTIPLIERS = [1, 2, 3, 4, 6, 8] as const;
const MAX_STEPS = 128;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Convert legacy playCount+gap to cyclePattern. */
function legacyCyclePattern(playCount?: number, gap?: number): (0 | 1)[] {
  const p = playCount ?? 1;
  const g = gap ?? 0;
  if (p <= 1 && g <= 0) return [1];
  return [
    ...Array(p).fill(1) as (0 | 1)[],
    ...Array(g).fill(0) as (0 | 1)[],
  ];
}

/** Adjust layers whose steps match a multiplier preset when cycle length changes. */
function adjustLayersForCycleChange(
  layers: Layer[],
  oldBeats: number,
  newBeats: number,
): Layer[] {
  return layers.map((l) => {
    const multiplier = STEP_MULTIPLIERS.find((m) => m * oldBeats === l.steps);
    if (!multiplier) return l;

    const newSteps = multiplier * newBeats;
    if (newSteps < 2 || newSteps > MAX_STEPS) return l;

    let newPattern: (0 | 1)[];
    if (l.type === "random") {
      newPattern = Array(newSteps).fill(1) as (0 | 1)[];
      for (let i = 0; i < Math.min(l.steps, newSteps); i++) {
        newPattern[i] = l.pattern[i];
      }
    } else {
      const onsets = l.pattern.filter((v) => v === 1).length;
      const newOnsets = Math.max(1, Math.round((onsets / l.steps) * newSteps));
      newPattern = euclidean(newOnsets, newSteps);
    }

    return {
      ...l,
      steps: newSteps,
      pattern: newPattern,
      velocities: Array(newSteps).fill(100),
    };
  });
}

/** Check if a layer's audio-relevant properties changed. */
function layerAudioChanged(a: Layer, b: Layer): boolean {
  if (a.steps !== b.steps) return true;
  if (a.sound !== b.sound) return true;
  if (a.volume !== b.volume) return true;
  if (a.density !== b.density) return true;
  if (a.swing !== b.swing) return true;
  if (a.repeatCycles !== b.repeatCycles) return true;
  if (a.hitsPerCycle !== b.hitsPerCycle) return true;
  if (a.cyclePattern.length !== b.cyclePattern.length) return true;
  for (let i = 0; i < a.cyclePattern.length; i++) {
    if (a.cyclePattern[i] !== b.cyclePattern[i]) return true;
  }
  if (a.pattern.length !== b.pattern.length) return true;
  for (let i = 0; i < a.pattern.length; i++) {
    if (a.pattern[i] !== b.pattern[i]) return true;
  }
  return false;
}

/** Get the set of layer IDs that should currently produce sound. */
function getPlayingIds(layers: Layer[]): Set<string> {
  const hasSolo = layers.some((l) => l.solo);
  return new Set(
    layers
      .filter((l) => !l.muted && (!hasSolo || l.solo))
      .map((l) => l.id),
  );
}

/**
 * Compute layers with group effects (mute/solo/volume) baked in for engine scheduling.
 * The audio engine doesn't know about groups — this pre-processes layers so group
 * mute/solo/volume are reflected in each layer's own muted/volume fields.
 */
function getEngineReadyLayers(layers: Layer[], groups: LayerGroup[]): Layer[] {
  if (groups.length === 0) return layers;
  const groupMap = new Map(groups.map((g) => [g.id, g]));
  const hasGroupSolo = groups.some((g) => g.solo);

  return layers.map((l) => {
    if (!l.groupId) {
      // Ungrouped: if any group is soloed, this layer is silenced
      return hasGroupSolo ? { ...l, muted: true } : l;
    }
    const group = groupMap.get(l.groupId);
    if (!group) return l;
    const silenced = group.muted || (hasGroupSolo && !group.solo);
    const groupGapActive = group.cyclePattern.length > 1;
    if (!silenced && group.volume === 1 && !groupGapActive) return l;
    return {
      ...l,
      muted: l.muted || silenced,
      volume: l.volume * group.volume,
      ...(groupGapActive ? { cyclePattern: [...group.cyclePattern] } : {}),
    };
  });
}

/** Group actions interface for components. */
export interface GroupActions {
  add: () => void;
  remove: (groupId: string) => void;
  update: (groupId: string, updates: Partial<LayerGroup>) => void;
  toggleMute: (groupId: string) => void;
  toggleSolo: (groupId: string) => void;
  clear: (groupId: string) => void;
  duplicate: (groupId: string) => void;
  addLayer: (groupId: string, type: LayerType) => void;
  ungroupLayer: (layerId: string) => void;
  /** Move a layer to a group or ungroup it (undefined). Optional targetIndex for positioning. */
  moveLayerToGroup: (layerId: string, groupId: string | undefined, targetIndex?: number) => void;
  /** Move an entire group's layer block to a new position in the flat layers array. */
  reorderGroupBlock: (groupId: string, targetLayerIndex: number) => void;
}

/** Pick a sound not yet used by existing layers; if all taken, pick the least-used. */
function pickUnusedSound(existingLayers: Layer[]): SoundPreset {
  const allSounds = SOUND_PRESETS.map((s) => s.value);
  const usedCounts = new Map<SoundPreset, number>();
  for (const l of existingLayers) {
    usedCounts.set(l.sound, (usedCounts.get(l.sound) ?? 0) + 1);
  }
  const unused = allSounds.filter((s) => !usedCounts.has(s));
  if (unused.length > 0) {
    return unused[Math.floor(Math.random() * unused.length)];
  }
  // All taken — pick the least-used (random among ties)
  const minCount = Math.min(...allSounds.map((s) => usedCounts.get(s) ?? 0));
  const leastUsed = allSounds.filter((s) => (usedCounts.get(s) ?? 0) === minCount);
  return leastUsed[Math.floor(Math.random() * leastUsed.length)];
}

function createLayer(
  index: number,
  overrides?: Partial<Layer>,
  cycleBeats = 4,
): Layer {
  const type = overrides?.type ?? "manual";
  const steps = overrides?.steps ?? cycleBeats * 2;
  const density = overrides?.density ?? 0.5;
  // Random layers: pattern = allowed mask (1 = can fire, 0 = forbidden)
  // Manual layers: pattern = onset pattern (1 = on, 0 = off)
  const pattern =
    overrides?.pattern ??
    (type === "random"
      ? (Array(steps).fill(1) as (0 | 1)[])
      : (Array(steps).fill(0) as (0 | 1)[]));
  return {
    id: crypto.randomUUID(),
    name: overrides?.name ?? (type === "random" ? `Random ${index + 1}` : `Layer ${index + 1}`),
    type,
    steps,
    pattern,
    velocities: overrides?.velocities ?? Array(steps).fill(100),
    sound: overrides?.sound ?? (type === "random" ? "dust" : "tap"),
    volume: overrides?.volume ?? 0.8,
    muted: false,
    solo: false,
    color: LAYER_COLORS[index % LAYER_COLORS.length],
    swing: overrides?.swing ?? 0.5,
    density,
    cyclePattern: overrides?.cyclePattern ?? [1],
    repeatCycles: overrides?.repeatCycles ?? 0,
    hitsPerCycle: overrides?.hitsPerCycle ?? 0,
    groupId: overrides?.groupId,
  };
}

const DEFAULT_LAYERS: Layer[] = [
  createLayer(0, {
    name: "Kick",
    steps: 8,
    pattern: [1, 0, 0, 0, 1, 0, 0, 0],
    sound: "kick",
  }),
  createLayer(1, {
    name: "Brush",
    steps: 8,
    pattern: [1, 1, 1, 1, 1, 1, 1, 1],
    sound: "brush",
    volume: 0.5,
  }),
  createLayer(2, {
    name: "Ping",
    steps: 8,
    pattern: euclidean(3, 8),
    sound: "ping",
    volume: 0.7,
  }),
];

/**
 * Try to load "Basic Beat" template from localStorage as default state.
 */
function getInitialState() {
  try {
    const templates = getSavedTemplates();
    const defaultTemplate = templates.find((t) => t.name === "Basic Beat") || templates.find((t) => t.name === "Random 8ths");
    if (defaultTemplate && defaultTemplate.layers.length > 0) {
      const layers = defaultTemplate.layers.map((tl: SavedTemplateLayer, i: number) =>
        createLayer(i, {
          name: tl.name,
          type: tl.type,
          steps: tl.steps,
          pattern: [...tl.pattern],
          sound: tl.sound,
          volume: tl.volume,
          density: tl.density,
          cyclePattern: tl.cyclePattern ? [...tl.cyclePattern] : legacyCyclePattern(tl.playCount, tl.gap),
          repeatCycles: tl.repeatCycles ?? 0,
          hitsPerCycle: tl.hitsPerCycle ?? 0,
          swing: tl.swing,
          groupId: tl.groupId,
        }),
      );
      const groups: LayerGroup[] = (defaultTemplate.groups || []).map((g) => ({
        id: g.id,
        name: g.name,
        collapsed: false,
        muted: false,
        solo: false,
        volume: g.volume ?? 1,
        gap: g.gap ?? 0,
        cyclePattern: g.cyclePattern ? [...g.cyclePattern] : [1] as (0 | 1)[],
      }));
      return {
        layers,
        tempo: defaultTemplate.tempo,
        cycleBeats: defaultTemplate.cycleBeats,
        groups,
      };
    }
  } catch {
    // fall through to defaults
  }
  return { layers: DEFAULT_LAYERS, tempo: 120, cycleBeats: 4, groups: [] as LayerGroup[] };
}

// ─────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────

export function useRhythmLab() {
  const initial = useRef(getInitialState()).current;

  const [layers, setLayers] = useState<Layer[]>(initial.layers);
  const [tempo, setTempo] = useState(initial.tempo);
  const [cycleBeats, setCycleBeats] = useState(initial.cycleBeats);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pendingCycleChange, setPendingCycleChange] = useState(false);
  const [activeSteps, setActiveSteps] = useState<Record<string, number>>({});
  const [groups, setGroups] = useState<LayerGroup[]>(initial.groups);
  const [selectedLayerId, setSelectedLayerId] = useState<string>(
    initial.layers[0].id,
  );
  const [countdownRaw, setCountdownRaw] = useState<0 | 0.5 | 1 | 2>(0);
  // Auto-fallback: if ½ is selected but cycle is now odd, treat as off
  const countdown = (countdownRaw === 0.5 && cycleBeats % 2 !== 0) ? 0 : countdownRaw;
  const setCountdown = setCountdownRaw;
  /** Current countdown beat info, or null when not counting in. */
  const [countdownBeat, setCountdownBeat] = useState<{ beat: number; totalBeats: number; isBarStart: boolean } | null>(null);

  const engineRef = useRef<AudioEngine | null>(null);

  // Lazy-init engine
  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AudioEngine();
    }
    return engineRef.current;
  }, []);

  const makeStepCallback = useCallback(
    () => {
      const timers = new Map<string, ReturnType<typeof setTimeout>>();
      return (layerId: string, step: number) => {
        setActiveSteps((prev) => ({ ...prev, [layerId]: step }));

        // Clear previous timer for this layer
        const existing = timers.get(layerId);
        if (existing) clearTimeout(existing);

        // Auto-clear after 80ms flash
        const timer = setTimeout(() => {
          setActiveSteps((prev) => {
            if (prev[layerId] !== step) return prev;
            const next = { ...prev };
            delete next[layerId];
            return next;
          });
        }, 80);
        timers.set(layerId, timer);
      };
    },
    [],
  );

  // Refs to avoid stale closures in togglePlay
  const isPlayingRef = useRef(false);
  const layersRef = useRef(layers);
  const tempoRef = useRef(tempo);
  const cycleBeatsRef = useRef(cycleBeats);

  const groupsRef = useRef(groups);
  const countdownRef = useRef(countdown);

  // Keep refs in sync
  isPlayingRef.current = isPlaying;
  layersRef.current = layers;
  tempoRef.current = tempo;
  cycleBeatsRef.current = cycleBeats;
  groupsRef.current = groups;
  countdownRef.current = countdown;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  // Track whether togglePlay just started playback (to avoid double-schedule)
  const justStartedRef = useRef(false);

  // The cycleBeats the engine is *currently using* for scheduling.
  // UI cycleBeats may differ while waiting for the next cycle boundary.
  const engineCycleBeatsRef = useRef(cycleBeats);

  // Previous layers/groups refs for smart diffing
  const prevLayersRef = useRef(layers);
  const prevGroupsRef = useRef(groups);

  // ── Layer/group changes → smart reschedule ──
  // Only reschedule layers that actually changed. Mute/solo/add/remove
  // require a full reschedule; property edits only touch the changed layer.
  // Uses engineCycleBeatsRef (not the UI cycleBeats) so a pending cycle-change
  // doesn't get applied early.
  // Group changes (mute/solo/volume) also trigger rescheduling via getEngineReadyLayers.
  useEffect(() => {
    if (!isPlaying) {
      prevLayersRef.current = layers;
      prevGroupsRef.current = groups;
      return;
    }
    if (justStartedRef.current) {
      justStartedRef.current = false;
      prevLayersRef.current = layers;
      prevGroupsRef.current = groups;
      return;
    }

    // If a cycle-length change is pending (UI cycleBeats differs from engine's),
    // skip rescheduling here — the deferred boundary callback will do a full
    // scheduleLayers with the correct new cycle length and updated layers.
    if (engineCycleBeatsRef.current !== cycleBeatsRef.current) {
      prevLayersRef.current = layers;
      prevGroupsRef.current = groups;
      return;
    }

    const engine = getEngine();
    const cycleBts = engineCycleBeatsRef.current;
    const cb = makeStepCallback();

    // Compare engine-ready layers (with group effects baked in)
    const prevEngine = getEngineReadyLayers(prevLayersRef.current, prevGroupsRef.current);
    const curEngine = getEngineReadyLayers(layers, groups);

    const prevPlayIds = getPlayingIds(prevEngine);
    const curPlayIds = getPlayingIds(curEngine);

    const playSetChanged =
      prevPlayIds.size !== curPlayIds.size ||
      [...prevPlayIds].some((id) => !curPlayIds.has(id)) ||
      [...curPlayIds].some((id) => !prevPlayIds.has(id));

    if (playSetChanged) {
      // Full reschedule — mute/solo/add/remove affects which layers play
      engine.scheduleLayers(curEngine, cycleBts, cb);
    } else {
      // Only reschedule layers whose audio-relevant properties changed
      for (const layer of curEngine) {
        if (layer.muted) continue;
        const hasSolo = curEngine.some((l) => l.solo);
        if (hasSolo && !layer.solo) continue;

        const oldLayer = prevEngine.find((l) => l.id === layer.id);
        if (!oldLayer || layerAudioChanged(oldLayer, layer)) {
          engine.rescheduleLayer(layer, cycleBts, cb);
        }
      }
    }

    prevLayersRef.current = layers;
    prevGroupsRef.current = groups;
  }, [layers, groups, isPlaying, getEngine, makeStepCallback]);

  // ── CycleBeats changes → defer to next cycle boundary ──
  // The current pattern completes naturally, then the new cycle length kicks in.
  // The engine's boundary sentinel fires at each cycle boundary; we just tell
  // the engine what to do when the next boundary arrives.
  useEffect(() => {
    if (!isPlaying) {
      // Not playing — just sync the ref so it's ready for next play
      engineCycleBeatsRef.current = cycleBeats;
      setPendingCycleChange(false);
      return;
    }
    // No actual change (e.g. isPlaying toggled but cycleBeats same)
    if (engineCycleBeatsRef.current === cycleBeats) {
      setPendingCycleChange(false);
      return;
    }

    const engine = getEngine();
    const newCycleBeats = cycleBeats;
    setPendingCycleChange(true);

    const oldBeats = engineCycleBeatsRef.current;
    engine.requestCycleChange(newCycleBeats, (boundaryTick: number) => {
      engineCycleBeatsRef.current = newCycleBeats;
      setPendingCycleChange(false);

      // Adjust layers with multiplier presets at the boundary
      const adjustedLayers = adjustLayersForCycleChange(
        layersRef.current, oldBeats, newCycleBeats,
      );
      setLayers(adjustedLayers);
      prevLayersRef.current = adjustedLayers; // prevent double reschedule
      prevGroupsRef.current = groupsRef.current;

      const engineLayers = getEngineReadyLayers(adjustedLayers, groupsRef.current);
      engine.scheduleLayers(engineLayers, newCycleBeats, makeStepCallback(), boundaryTick);
    });
  }, [cycleBeats, isPlaying, getEngine, makeStepCallback]);

  // Update tempo in real-time
  useEffect(() => {
    if (isPlaying) {
      getEngine().setTempo(tempo);
    }
  }, [tempo, isPlaying, getEngine]);

  // ── Transport ──

  const togglePlay = useCallback(async () => {
    try {
      const engine = getEngine();
      // Use ref to avoid stale closure on isPlaying
      if (isPlayingRef.current) {
        engine.stop();
        setIsPlaying(false);
        setActiveSteps({});
        setCountdownBeat(null);
      } else {
        await engine.init();
        const engineLayers = getEngineReadyLayers(layersRef.current, groupsRef.current);
        const cd = countdownRef.current;
        const alignTick = cd > 0 ? cd * cycleBeatsRef.current * 960 : 0;
        engine.scheduleLayers(
          engineLayers,
          cycleBeatsRef.current,
          makeStepCallback(),
          alignTick,
        );
        // Schedule countdown AFTER scheduleLayers (which clears all parts)
        if (cd > 0) {
          engine.scheduleCountdown(cycleBeatsRef.current, cd, (info) => {
            setCountdownBeat(info);
            // Clear overlay after the last beat (at the next beat's duration)
            if (info.beat === info.totalBeats) {
              const beatMs = 60_000 / tempoRef.current;
              setTimeout(() => setCountdownBeat(null), beatMs * 0.8);
            }
          });
        }
        engine.play(tempoRef.current);
        justStartedRef.current = true;
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("[Rhythm Lab] togglePlay failed:", err);
      // Reset to stopped state so the UI isn't stuck
      setIsPlaying(false);
      setActiveSteps({});
    }
  }, [getEngine, makeStepCallback]);

  // ── Cycle length change ──
  // Only updates cycleBeats state. Layer adjustments (multiplier presets)
  // are deferred to the boundary callback so UI + audio change together.
  // When not playing, layers adjust immediately (no boundary to wait for).
  const changeCycleBeats = useCallback((newBeats: number) => {
    const oldBeats = cycleBeatsRef.current;
    setCycleBeats(newBeats);

    if (!isPlayingRef.current && oldBeats !== newBeats) {
      // Not playing — adjust layers immediately
      setLayers((prev) => adjustLayersForCycleChange(prev, oldBeats, newBeats));
    }
    // When playing, layer adjustments happen in the boundary callback
  }, []);

  // ── Layer CRUD ──

  const addLayer = useCallback((type: LayerType = "manual") => {
    setLayers((prev) => {
      const newLayer = createLayer(prev.length, { type, sound: pickUnusedSound(prev) }, cycleBeatsRef.current);
      return [...prev, newLayer];
    });
  }, []);

  const duplicateLayer = useCallback((layerId: string) => {
    setLayers((prev) => {
      const source = prev.find((l) => l.id === layerId);
      if (!source) return prev;
      const newIndex = prev.length;
      const clone = createLayer(newIndex, {
        name: `${source.name} copy`,
        type: source.type,
        steps: source.steps,
        pattern: [...source.pattern],
        velocities: [...source.velocities],
        sound: source.sound,
        volume: source.volume,
        swing: source.swing,
        density: source.density,
        cyclePattern: [...source.cyclePattern],
        repeatCycles: source.repeatCycles,
        hitsPerCycle: source.hitsPerCycle,
        groupId: source.groupId,
      });
      // Insert right after the source layer
      const sourceIndex = prev.indexOf(source);
      const newLayers = [...prev];
      newLayers.splice(sourceIndex + 1, 0, clone);
      return newLayers;
    });
  }, []);

  const removeLayer = useCallback(
    (layerId: string) => {
      setLayers((prev) => {
        if (prev.length <= 1) return prev;
        return prev.filter((l) => l.id !== layerId);
      });
      if (selectedLayerId === layerId) {
        setSelectedLayerId((prev) => {
          const remaining = layers.filter((l) => l.id !== layerId);
          return remaining.length > 0 ? remaining[0].id : prev;
        });
      }
    },
    [selectedLayerId, layers],
  );

  const updateLayer = useCallback(
    (layerId: string, updates: Partial<Layer>) => {
      setLayers((prev) =>
        prev.map((l) => {
          if (l.id !== layerId) return l;

          const updated = { ...l, ...updates };

          // If steps changed, resize pattern and velocities
          if (updates.steps !== undefined && updates.steps !== l.steps) {
            const newSteps = updates.steps;
            if (updates.pattern === undefined) {
              if (l.type === "random") {
                // Random layers: resize allowed mask — preserve existing, fill new with 1 (allowed)
                const newPattern = Array(newSteps).fill(1) as (0 | 1)[];
                for (let i = 0; i < Math.min(l.steps, newSteps); i++) {
                  newPattern[i] = l.pattern[i];
                }
                updated.pattern = newPattern;
              } else {
                const newOnsets = Math.max(
                  1,
                  Math.round((l.pattern.filter((v) => v === 1).length / l.steps) * newSteps),
                );
                updated.pattern = euclidean(newOnsets, newSteps);
              }
            }
            if (updates.velocities === undefined) {
              updated.velocities = Array(newSteps).fill(100);
            }
          }

          // Clamp hitsPerCycle to allowed steps count
          if (updated.hitsPerCycle > 0) {
            const maxHits = updated.pattern.filter((v) => v === 1).length;
            if (updated.hitsPerCycle > maxHits) {
              updated.hitsPerCycle = maxHits;
            }
          }

          return updated;
        }),
      );
    },
    [],
  );

  const toggleStep = useCallback((layerId: string, step: number) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== layerId) return l;
        const newPattern = [...l.pattern];
        newPattern[step] = newPattern[step] === 1 ? 0 : 1;
        return { ...l, pattern: newPattern };
      }),
    );
  }, []);

  const setStep = useCallback((layerId: string, step: number, value: 0 | 1) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== layerId) return l;
        if (l.pattern[step] === value) return l; // no-op, avoid unnecessary re-render
        const newPattern = [...l.pattern];
        newPattern[step] = value;
        return { ...l, pattern: newPattern };
      }),
    );
  }, []);

  const setLayerPattern = useCallback(
    (layerId: string, pattern: (0 | 1)[], steps: number) => {
      updateLayer(layerId, {
        steps,
        pattern,
        velocities: Array(steps).fill(100),
      });
    },
    [updateLayer],
  );

  const toggleMute = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((l) =>
        l.id === layerId ? { ...l, muted: !l.muted } : l,
      ),
    );
  }, []);

  const toggleSolo = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((l) =>
        l.id === layerId ? { ...l, solo: !l.solo } : l,
      ),
    );
  }, []);

  const clearPattern = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== layerId) return l;
        if (l.type === "random") {
          // For random layers, "clear" = forbid all steps (silence)
          return { ...l, pattern: Array(l.steps).fill(0) as (0 | 1)[] };
        }
        return { ...l, pattern: Array(l.steps).fill(0) as (0 | 1)[] };
      }),
    );
  }, []);

  const fillPattern = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== layerId || l.type === "random") return l;
        return { ...l, pattern: Array(l.steps).fill(1) as (0 | 1)[] };
      }),
    );
  }, []);

  const reorderLayers = useCallback((fromIndex: number, toIndex: number, targetGroupId?: string | null) => {
    setLayers((prev) => {
      if (fromIndex === toIndex && targetGroupId === undefined) return prev;
      const newLayers = [...prev];
      const [moved] = newLayers.splice(fromIndex, 1);
      // targetGroupId: undefined = keep current, null = ungroup, string = join group
      const newGid = targetGroupId === undefined ? moved.groupId : (targetGroupId ?? undefined);
      const updatedMoved = moved.groupId === newGid ? moved : { ...moved, groupId: newGid };
      if (fromIndex === toIndex) {
        newLayers.splice(fromIndex, 0, updatedMoved);
      } else {
        newLayers.splice(toIndex, 0, updatedMoved);
      }
      return newLayers;
    });
  }, []);

  // ── Group CRUD ──

  const addGroup = useCallback(() => {
    setGroups((prev) => {
      const num = prev.length + 1;
      return [...prev, {
        id: crypto.randomUUID(),
        name: `Group ${num}`,
        collapsed: false,
        muted: false,
        solo: false,
        gap: 0,
        volume: 1,
        cyclePattern: [1],
      }];
    });
  }, []);

  const removeGroup = useCallback((groupId: string) => {
    // Ungroup layers (non-destructive — keeps layers, removes group assignment)
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setLayers((prev) => prev.map((l) =>
      l.groupId === groupId ? { ...l, groupId: undefined } : l,
    ));
  }, []);

  const updateGroup = useCallback((groupId: string, updates: Partial<LayerGroup>) => {
    setGroups((prev) => prev.map((g) =>
      g.id === groupId ? { ...g, ...updates } : g,
    ));
  }, []);

  const toggleGroupMute = useCallback((groupId: string) => {
    setGroups((prev) => prev.map((g) =>
      g.id === groupId ? { ...g, muted: !g.muted } : g,
    ));
  }, []);

  const toggleGroupSolo = useCallback((groupId: string) => {
    setGroups((prev) => prev.map((g) =>
      g.id === groupId ? { ...g, solo: !g.solo } : g,
    ));
  }, []);

  const clearGroup = useCallback((groupId: string) => {
    setLayers((prev) => prev.map((l) => {
      if (l.groupId !== groupId) return l;
      return { ...l, pattern: Array(l.steps).fill(0) as (0 | 1)[] };
    }));
  }, []);

  const duplicateGroup = useCallback((groupId: string) => {
    const newGroupId = crypto.randomUUID();
    setGroups((prev) => {
      const source = prev.find((g) => g.id === groupId);
      if (!source) return prev;
      return [...prev, {
        ...source,
        id: newGroupId,
        name: `${source.name} copy`,
        muted: false,
        solo: false,
      }];
    });
    setLayers((prev) => {
      const groupLayers = prev.filter((l) => l.groupId === groupId);
      if (groupLayers.length === 0) return prev;
      const lastIdx = prev.reduce((acc, l, i) => l.groupId === groupId ? i : acc, -1);
      const clones = groupLayers.map((l, i) =>
        createLayer(prev.length + i, {
          name: `${l.name} copy`,
          type: l.type,
          steps: l.steps,
          pattern: [...l.pattern],
          velocities: [...l.velocities],
          sound: l.sound,
          volume: l.volume,
          swing: l.swing,
          density: l.density,
          cyclePattern: [...l.cyclePattern],
          repeatCycles: l.repeatCycles,
          hitsPerCycle: l.hitsPerCycle,
          groupId: newGroupId,
        }),
      );
      const result = [...prev];
      result.splice(lastIdx + 1, 0, ...clones);
      return result;
    });
  }, []);

  const addLayerToGroup = useCallback((groupId: string, type: LayerType = "manual") => {
    setLayers((prev) => {
      const newLayer = createLayer(prev.length, { type, groupId, sound: pickUnusedSound(prev) }, cycleBeatsRef.current);
      // Insert after last layer of the group (or append if group has no layers yet)
      const lastIdx = prev.reduce((acc, l, i) => l.groupId === groupId ? i : acc, -1);
      if (lastIdx === -1) return [...prev, newLayer];
      const result = [...prev];
      result.splice(lastIdx + 1, 0, newLayer);
      return result;
    });
  }, []);

  const ungroupLayer = useCallback((layerId: string) => {
    setLayers((prev) => prev.map((l) =>
      l.id === layerId ? { ...l, groupId: undefined } : l,
    ));
  }, []);

  const moveLayerToGroup = useCallback((layerId: string, targetGroupId: string | undefined, targetIndex?: number) => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === layerId);
      if (idx === -1) return prev;
      const layer = prev[idx];
      if (layer.groupId === targetGroupId && targetIndex === undefined) return prev;
      const newLayers = [...prev];
      const [moved] = newLayers.splice(idx, 1);
      const updated = { ...moved, groupId: targetGroupId };

      if (targetIndex !== undefined) {
        // Explicit target position provided by drag-and-drop
        const adjustedTarget = targetIndex > idx ? targetIndex - 1 : targetIndex;
        newLayers.splice(Math.min(Math.max(0, adjustedTarget), newLayers.length), 0, updated);
      } else if (targetGroupId) {
        // No explicit position — append after last layer in target group
        const lastIdx = newLayers.reduce((acc, l, i) => l.groupId === targetGroupId ? i : acc, -1);
        if (lastIdx >= 0) {
          newLayers.splice(lastIdx + 1, 0, updated);
        } else {
          newLayers.splice(Math.min(idx, newLayers.length), 0, updated);
        }
      } else {
        // Ungrouped, no position — append at end
        newLayers.push(updated);
      }
      return newLayers;
    });
  }, []);

  const reorderGroupBlock = useCallback((groupId: string, targetLayerIndex: number) => {
    setLayers((prev) => {
      const groupLayers = prev.filter((l) => l.groupId === groupId);
      if (groupLayers.length === 0) return prev;
      const rest = prev.filter((l) => l.groupId !== groupId);
      // Adjust target index for removed layers that were before the target
      const removedBefore = prev.slice(0, targetLayerIndex).filter((l) => l.groupId === groupId).length;
      const adjustedTarget = Math.min(Math.max(0, targetLayerIndex - removedBefore), rest.length);
      rest.splice(adjustedTarget, 0, ...groupLayers);
      return rest;
    });
  }, []);

  const groupActions: GroupActions = {
    add: addGroup,
    remove: removeGroup,
    update: updateGroup,
    toggleMute: toggleGroupMute,
    toggleSolo: toggleGroupSolo,
    clear: clearGroup,
    duplicate: duplicateGroup,
    addLayer: addLayerToGroup,
    ungroupLayer,
    moveLayerToGroup,
    reorderGroupBlock,
  };

  const loadTemplate = useCallback((template: SavedTemplate) => {
    // Stop playback first
    if (isPlayingRef.current) {
      engineRef.current?.stop();
      setIsPlaying(false);
      setActiveSteps({});
    }

    const newLayers = template.layers.map((tl: SavedTemplateLayer, i: number) =>
      createLayer(i, {
        name: tl.name,
        type: tl.type,
        steps: tl.steps,
        pattern: [...tl.pattern],
        sound: tl.sound,
        volume: tl.volume,
        density: tl.density,
        cyclePattern: tl.cyclePattern ? [...tl.cyclePattern] : legacyCyclePattern(tl.playCount, tl.gap),
        repeatCycles: tl.repeatCycles ?? 0,
        hitsPerCycle: tl.hitsPerCycle ?? 0,
        swing: tl.swing,
        groupId: tl.groupId,
      }),
    );
    const newGroups: LayerGroup[] = (template.groups || []).map((g: SavedTemplateGroup) => ({
      id: g.id,
      name: g.name,
      collapsed: false,
      muted: false,
      solo: false,
      volume: g.volume ?? 1,
      gap: g.gap ?? 0,
      cyclePattern: g.cyclePattern ? [...g.cyclePattern] : [1] as (0 | 1)[],
    }));
    setLayers(newLayers);
    setGroups(newGroups);
    setTempo(template.tempo);
    setCycleBeats(template.cycleBeats);
    setCountdownRaw(template.countdown ?? 0);
    if (newLayers.length > 0) {
      setSelectedLayerId(newLayers[0].id);
    }
  }, []);

  return {
    // State
    layers,
    tempo,
    cycleBeats,
    isPlaying,
    activeSteps,
    selectedLayerId,

    // Transport
    togglePlay,
    setTempo,
    setCycleBeats: changeCycleBeats,
    pendingCycleChange,
    countdown,
    setCountdown,
    countdownBeat,

    // Groups
    groups,
    groupActions,

    // Layer operations
    addLayer,
    duplicateLayer,
    removeLayer,
    updateLayer,
    toggleStep,
    setStep,
    setLayerPattern,
    toggleMute,
    toggleSolo,
    clearPattern,
    fillPattern,
    setSelectedLayerId,
    reorderLayers,
    loadTemplate,

    // Engine access (for circle view animation)
    getEngine,
  };
}

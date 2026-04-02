/**
 * @file types.ts
 * Core types for Rhythm Lab — a multi-layer rhythmic composition environment.
 *
 * Key design: each Layer has its own step count. When layers have different
 * step counts over the same cycle, polyrhythm emerges naturally.
 * No special "polyrhythm mode" — it's just how the system works.
 */

// ─────────────────────────────────────────────
// LAYER
// ─────────────────────────────────────────────

export type LayerType = "manual" | "random";

export interface Layer {
  id: string;
  name: string;
  /** "manual" = user-edited pattern, "random" = probability-based per cycle */
  type: LayerType;
  /** Number of steps in one cycle */
  steps: number;
  /** Binary pattern: manual: 1=onset, 0=rest. Random: 0=forbidden, 1=allowed, 2=locked (always fires). */
  pattern: (0 | 1 | 2)[];
  /** Per-step velocity 0–127 */
  velocities: number[];
  /** Sound preset */
  sound: SoundPreset;
  /** Layer volume 0–1 */
  volume: number;
  muted: boolean;
  solo: boolean;
  /** UI color */
  color: string;
  /** Swing ratio: 0.5 = straight, 0.67 = triplet swing */
  swing: number;
  /** Density for random layers: 0–1 probability of each step firing */
  density: number;
  /** Random layers only: exact number of hits per cycle. 0 = use density mode. */
  hitsPerCycle: number;
  /** Per-cycle play/rest pattern: 1 = play, 0 = rest. Loops. Default [1] = every cycle. */
  cyclePattern: (0 | 1)[];
  /** Gap mode: "manual" = user-edited cyclePattern, "random" = auto-generated from gapDensity. */
  gapMode: "manual" | "random";
  /** Probability (0–1) of playing each cycle when gapMode="random". */
  gapDensity: number;
  /** Random layers only: repeat the same random result for N extra play-cycles before regenerating. 0 = pure random. */
  repeatCycles: number;
  /**
   * Polymeter mode: when true, the layer loops independently.
   * `steps` becomes the pattern length, and `subdivision` sets the step rate.
   * Loop duration = steps × (PPQ / subdivision) ticks.
   */
  polymetric?: boolean;
  /** Step rate for polymetric layers: 0.5=half, 1=quarter, 2=8th, 3=triplet, 4=16th, 6=sextuplet, 8=32nd. Only used when polymetric=true. */
  subdivision?: number;
  /** Optional group this layer belongs to */
  groupId?: string;
}

// ─────────────────────────────────────────────
// LAYER GROUPS
// ─────────────────────────────────────────────

export interface LayerGroup {
  id: string;
  name: string;
  collapsed: boolean;
  muted: boolean;
  solo: boolean;
  /** Group volume multiplier 0–1, applied on top of individual layer volumes */
  volume: number;
  /** @deprecated Legacy gap — use cyclePattern instead */
  gap: number;
  /** Per-cycle play/rest pattern for all group members. [1] = inactive (layers use own). Length > 1 = active (overrides layers). */
  cyclePattern: (0 | 1)[];
  /** Gap mode: "manual" = user-edited cyclePattern, "random" = auto-generated from gapDensity. */
  gapMode: "manual" | "random";
  /** Probability (0–1) of playing each cycle when gapMode="random". */
  gapDensity: number;
}

// ─────────────────────────────────────────────
// SOUNDS
// ─────────────────────────────────────────────

export type SoundPreset =
  | "kick"
  | "drop"
  | "tap"
  | "pip"
  | "tick"
  | "ping"
  | "brush"
  | "dust"
  | "mist"
  | "haze";

export interface SoundSpec {
  value: SoundPreset;
  label: string;
  /** Base frequency in Hz (ignored for noise-based sounds) */
  freq: number;
  /** Envelope decay in seconds */
  decay: number;
  /** Oscillator type (ignored for noise-based sounds) */
  oscType: OscillatorType;
  /** Whether this sound uses noise instead of an oscillator */
  isNoise: boolean;
  /** Noise type if isNoise */
  noiseType?: "white" | "pink" | "brown";
}

export const SOUND_PRESETS: SoundSpec[] = [
  // Tonal — ascending pitch, decreasing decay (same sine timbre family)
  { value: "kick", label: "Kick", freq: 55, decay: 0.25, oscType: "sine", isNoise: false },
  { value: "drop", label: "Drop", freq: 330, decay: 0.06, oscType: "sine", isNoise: false },
  { value: "tap", label: "Tap", freq: 700, decay: 0.035, oscType: "sine", isNoise: false },
  { value: "pip", label: "Pip", freq: 1000, decay: 0.025, oscType: "sine", isNoise: false },
  { value: "tick", label: "Tick", freq: 1400, decay: 0.018, oscType: "sine", isNoise: false },
  { value: "ping", label: "Ping", freq: 2200, decay: 0.012, oscType: "sine", isNoise: false },
  // Noise — varying color and decay
  { value: "brush", label: "Brush", freq: 0, decay: 0.06, oscType: "sine", isNoise: true, noiseType: "brown" },
  { value: "dust", label: "Dust", freq: 0, decay: 0.035, oscType: "sine", isNoise: true, noiseType: "pink" },
  { value: "mist", label: "Mist", freq: 0, decay: 0.08, oscType: "sine", isNoise: true, noiseType: "pink" },
  { value: "haze", label: "Haze", freq: 0, decay: 0.1, oscType: "sine", isNoise: true, noiseType: "brown" },
];

// ─────────────────────────────────────────────
// PATTERNS
// ─────────────────────────────────────────────

export interface PatternPreset {
  name: string;
  category: "euclidean" | "clave" | "world" | "jazz" | "grid";
  steps: number;
  onsets: number;
  pattern: (0 | 1)[];
  description?: string;
}

// ─────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────

export const LAYER_COLORS = [
  "#e8706e", // warm coral
  "#4dbfb5", // soft teal
  "#e8c95a", // warm gold
  "#8cc5a8", // sage green
  "#e8875c", // burnt orange
  "#8b7cf0", // soft violet
  "#d87da0", // dusty rose
  "#5ab8c5", // muted cyan
  "#c5b87a", // khaki gold
  "#92c483", // olive green
] as const;

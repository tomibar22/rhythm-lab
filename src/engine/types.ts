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
  /** Binary pattern: 1 = onset, 0 = rest */
  pattern: (0 | 1)[];
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
  /** How many cycles to play before resting (default 1) */
  playCount: number;
  /** Gap: number of cycles to rest after each play run (0 = no gap) */
  gap: number;
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
  /** Gap: number of cycles to rest after each played cycle (0 = no gap) */
  gap: number;
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

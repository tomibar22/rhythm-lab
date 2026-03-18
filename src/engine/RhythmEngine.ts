/**
 * @file RhythmEngine.ts
 * Pure computation for rhythmic patterns.
 * No audio or UI concerns — just math and pattern generation.
 */

import { PatternPreset } from "./types";

// ─────────────────────────────────────────────
// EUCLIDEAN RHYTHM (Bjorklund algorithm)
// ─────────────────────────────────────────────

/**
 * Generate a Euclidean rhythm: k onsets distributed as evenly as possible over n steps.
 * Uses the Bjorklund algorithm (same as Bresenham's line algorithm).
 *
 * E(3,8) = [1,0,0,1,0,0,1,0] = tresillo
 * E(7,12) = [1,0,1,0,1,1,0,1,0,1,0,1] = West African bell
 */
export function euclidean(k: number, n: number): (0 | 1)[] {
  if (k <= 0) return Array(n).fill(0) as (0 | 1)[];
  if (k >= n) return Array(n).fill(1) as (0 | 1)[];

  let groups: number[][] = [];
  let remainder: number[][] = [];

  for (let i = 0; i < n; i++) {
    if (i < k) groups.push([1]);
    else remainder.push([0]);
  }

  while (remainder.length > 1) {
    const newGroups: number[][] = [];
    const minLen = Math.min(groups.length, remainder.length);

    for (let i = 0; i < minLen; i++) {
      newGroups.push([...groups[i], ...remainder[i]]);
    }

    const leftoverGroups = groups.slice(minLen);
    const leftoverRemainder = remainder.slice(minLen);

    groups = newGroups;
    remainder =
      leftoverGroups.length > 0 ? leftoverGroups : leftoverRemainder;
  }

  if (remainder.length > 0) {
    groups.push(...remainder);
  }

  return groups.flat() as (0 | 1)[];
}

// ─────────────────────────────────────────────
// PATTERN OPERATIONS
// ─────────────────────────────────────────────

/** Rotate a pattern by the given number of steps (positive = right) */
export function rotate(pattern: (0 | 1)[], amount: number): (0 | 1)[] {
  const n = pattern.length;
  if (n === 0) return [];
  const shift = ((amount % n) + n) % n;
  return [...pattern.slice(shift), ...pattern.slice(0, shift)];
}

/** Invert a pattern (swap 0s and 1s) */
export function invert(pattern: (0 | 1)[]): (0 | 1)[] {
  return pattern.map((v) => (v === 1 ? 0 : 1) as 0 | 1);
}

/** Compute inter-onset intervals (IOIs) from a binary pattern */
export function getIOIs(pattern: (0 | 1)[]): number[] {
  const onsets = pattern
    .map((v, i) => (v === 1 ? i : -1))
    .filter((i) => i >= 0);

  if (onsets.length < 2) return onsets.length === 1 ? [pattern.length] : [];

  const iois: number[] = [];
  for (let i = 0; i < onsets.length; i++) {
    const next = (i + 1) % onsets.length;
    const gap =
      next === 0
        ? pattern.length - onsets[i] + onsets[0]
        : onsets[next] - onsets[i];
    iois.push(gap);
  }
  return iois;
}

/** Count onsets in a pattern */
export function countOnsets(pattern: (0 | 1)[]): number {
  return pattern.filter((v) => v === 1).length;
}

// ─────────────────────────────────────────────
// MATH UTILITIES
// ─────────────────────────────────────────────

export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

export function lcmMultiple(nums: number[]): number {
  return nums.reduce((acc, n) => lcm(acc, n), 1);
}

// ─────────────────────────────────────────────
// PATTERN LIBRARY
// ─────────────────────────────────────────────

export function getPatternLibrary(): PatternPreset[] {
  return [
    // ── Euclidean ──
    {
      name: "E(2,3) Tango",
      category: "euclidean",
      steps: 3,
      onsets: 2,
      pattern: euclidean(2, 3),
    },
    {
      name: "E(3,4)",
      category: "euclidean",
      steps: 4,
      onsets: 3,
      pattern: euclidean(3, 4),
      description: "Common in African music",
    },
    {
      name: "E(3,8) Tresillo",
      category: "euclidean",
      steps: 8,
      onsets: 3,
      pattern: euclidean(3, 8),
      description: "3+3+2: DNA of Afro-diasporic rhythm",
    },
    {
      name: "E(5,8) Cinquillo",
      category: "euclidean",
      steps: 8,
      onsets: 5,
      pattern: euclidean(5, 8),
    },
    {
      name: "E(3,16)",
      category: "euclidean",
      steps: 16,
      onsets: 3,
      pattern: euclidean(3, 16),
    },
    {
      name: "E(5,12)",
      category: "euclidean",
      steps: 12,
      onsets: 5,
      pattern: euclidean(5, 12),
      description: "Bossa nova variant",
    },
    {
      name: "E(7,12) Bell",
      category: "euclidean",
      steps: 12,
      onsets: 7,
      pattern: euclidean(7, 12),
      description: "Standard Ewe/Yoruba bell pattern",
    },
    {
      name: "E(5,16)",
      category: "euclidean",
      steps: 16,
      onsets: 5,
      pattern: euclidean(5, 16),
      description: "Common in techno",
    },
    {
      name: "E(7,16)",
      category: "euclidean",
      steps: 16,
      onsets: 7,
      pattern: euclidean(7, 16),
      description: "Samba variant",
    },
    {
      name: "E(9,16)",
      category: "euclidean",
      steps: 16,
      onsets: 9,
      pattern: euclidean(9, 16),
    },

    // ── Clave ──
    {
      name: "Son 3-2",
      category: "clave",
      steps: 16,
      onsets: 5,
      pattern: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0],
      description: "Most common salsa/son orientation",
    },
    {
      name: "Son 2-3",
      category: "clave",
      steps: 16,
      onsets: 5,
      pattern: [0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    },
    {
      name: "Rumba 3-2",
      category: "clave",
      steps: 16,
      onsets: 5,
      pattern: [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
      description: "3rd onset shifted one 16th vs son",
    },
    {
      name: "Bossa Clave",
      category: "clave",
      steps: 16,
      onsets: 5,
      pattern: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    },
    {
      name: "Cascara",
      category: "clave",
      steps: 16,
      onsets: 10,
      pattern: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0],
      description: "Shell pattern filling space between clave",
    },

    // ── World ──
    {
      name: "Rupak (7)",
      category: "world",
      steps: 7,
      onsets: 3,
      pattern: [1, 0, 0, 1, 0, 1, 0],
      description: "7 matra — sam falls on khali",
    },
    {
      name: "Keherwa (8)",
      category: "world",
      steps: 8,
      onsets: 4,
      pattern: [1, 0, 0, 1, 0, 1, 0, 1],
      description: "Light Hindustani tala",
    },
    {
      name: "Jhaptal (10)",
      category: "world",
      steps: 10,
      onsets: 5,
      pattern: [1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
      description: "10 matra — asymmetric 2+3+2+3",
    },

    // ── Jazz ──
    {
      name: "Ride Cymbal",
      category: "jazz",
      steps: 8,
      onsets: 4,
      pattern: [1, 0, 0, 1, 1, 0, 0, 1],
      description: "Standard jazz ride (apply swing!)",
    },
    {
      name: "Charleston",
      category: "jazz",
      steps: 8,
      onsets: 2,
      pattern: [1, 0, 0, 0, 0, 0, 1, 0],
      description: 'Beat 1 + "and" of 2',
    },
    {
      name: "2 & 4",
      category: "jazz",
      steps: 8,
      onsets: 2,
      pattern: [0, 0, 1, 0, 0, 0, 1, 0],
      description: "Hi-hat / snare on 2 and 4",
    },

    // ── Grid ──
    {
      name: "4 on floor",
      category: "grid",
      steps: 16,
      onsets: 4,
      pattern: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    },
    {
      name: "8th notes",
      category: "grid",
      steps: 8,
      onsets: 8,
      pattern: [1, 1, 1, 1, 1, 1, 1, 1],
    },
    {
      name: "16th notes",
      category: "grid",
      steps: 16,
      onsets: 16,
      pattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    },
    {
      name: "Backbeat",
      category: "grid",
      steps: 8,
      onsets: 2,
      pattern: [0, 0, 1, 0, 0, 0, 1, 0],
      description: "Snare on 2 and 4",
    },
  ];
}

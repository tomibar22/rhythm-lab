/**
 * @file defaultTemplates.ts
 * Built-in templates that ship with the app. These are always available
 * and cannot be deleted by users. To update: save templates locally,
 * then run `exportTemplatesForBundling()` from the browser console,
 * copy the output, and paste it into the BUILT_IN_TEMPLATES array below.
 */

import { SavedTemplate } from "./storage";

/**
 * Built-in templates — curated by the teacher, bundled with the app.
 * These are always available regardless of localStorage state.
 * IDs are prefixed with "builtin:" so they can be distinguished from user-saved templates.
 */
export const BUILT_IN_TEMPLATES: SavedTemplate[] = [
  {
    id: "builtin:random-beats",
    name: "Random Beats",
    tempo: 120,
    cycleBeats: 4,
    layers: [
      { name: "Kick", type: "manual", steps: 4, pattern: [1, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, gap: 1, swing: 0.5 },
      { name: "Random ", type: "random", steps: 4, pattern: [1, 1, 1, 1], sound: "pip", volume: 0.6, density: 0.35, gap: 0, swing: 0.5 },
    ],
    savedAt: 0,
  },
  {
    id: "builtin:random-8ths",
    name: "Random 8ths",
    tempo: 120,
    cycleBeats: 4,
    layers: [
      { name: "Kick", type: "manual", steps: 4, pattern: [1, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, gap: 1, swing: 0.5 },
      { name: "Random ", type: "random", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "tap", volume: 0.6, density: 0.35, gap: 0, swing: 0.5 },
    ],
    savedAt: 0,
  },
  {
    id: "builtin:random-off-beats",
    name: "Random off-beats",
    tempo: 120,
    cycleBeats: 4,
    layers: [
      { name: "Kick", type: "manual", steps: 4, pattern: [1, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, gap: 1, swing: 0.5 },
      { name: "Random ", type: "random", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "tap", volume: 0.6, density: 0.4, gap: 0, swing: 0.5 },
    ],
    savedAt: 0,
  },
  {
    id: "builtin:random-swing-8ths",
    name: "Random Swing 8ths",
    tempo: 120,
    cycleBeats: 4,
    layers: [
      { name: "Kick", type: "manual", steps: 4, pattern: [1, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, gap: 1, swing: 0.5 },
      { name: "Random ", type: "random", steps: 12, pattern: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1], sound: "tap", volume: 0.6, density: 0.3, gap: 0, swing: 0.5 },
    ],
    savedAt: 0,
  },
  {
    id: "builtin:random-swing-off-beats",
    name: "Random Swing off-beats",
    tempo: 120,
    cycleBeats: 4,
    layers: [
      { name: "Kick", type: "manual", steps: 4, pattern: [1, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, gap: 1, swing: 0.5 },
      { name: "Random ", type: "random", steps: 12, pattern: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], sound: "tap", volume: 0.6, density: 0.4, gap: 0, swing: 0.5 },
    ],
    savedAt: 0,
  },
  {
    id: "builtin:swing-playback",
    name: "Swing Playback",
    tempo: 240,
    cycleBeats: 8,
    layers: [
      { name: "Kick", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "kick", volume: 0.75, density: 0.5, playCount: 1, gap: 1, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "2&4", type: "manual", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "dust", volume: 0.25, density: 0.5, playCount: 1, gap: 0, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "beats", type: "manual", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "haze", volume: 0.1, density: 0.5, playCount: 1, gap: 0, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "swing", type: "random", steps: 16, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "mist", volume: 0.1, density: 0.25, playCount: 1, gap: 0, swing: 0.5935, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
    ],
    groups: [{ id: "02dc14b8-45d2-4450-8788-b2d03d2bc65b", name: "Swing Playback", volume: 1 }],
    savedAt: 0,
  },
  {
    id: "builtin:blues-gap-4-8",
    name: "Blues Gap 4-8",
    tempo: 270,
    cycleBeats: 8,
    layers: [
      { name: "Kick", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, playCount: 3, gap: 3, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "Ping", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "ping", volume: 0.15, density: 0.5, playCount: 2, gap: 4, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "2&4", type: "manual", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "dust", volume: 0.3, density: 0.5, playCount: 2, gap: 4, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "beats", type: "manual", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "haze", volume: 0.2, density: 0.5, playCount: 2, gap: 4, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "swing", type: "random", steps: 16, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "mist", volume: 0.1, density: 0.25, playCount: 2, gap: 4, swing: 0.5935, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
    ],
    groups: [{ id: "02dc14b8-45d2-4450-8788-b2d03d2bc65b", name: "Swing Playback", volume: 1 }],
    savedAt: 0,
  },
  {
    id: "builtin:blues-gap-8-4",
    name: "Blues Gap 8-4",
    tempo: 270,
    cycleBeats: 8,
    layers: [
      { name: "Kick", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, playCount: 5, gap: 1, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "Ping", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "ping", volume: 0.15, density: 0.5, playCount: 4, gap: 2, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "2&4", type: "manual", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "dust", volume: 0.3, density: 0.5, playCount: 4, gap: 2, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "beats", type: "manual", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "haze", volume: 0.2, density: 0.5, playCount: 4, gap: 2, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "swing", type: "random", steps: 16, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "mist", volume: 0.1, density: 0.25, playCount: 4, gap: 2, swing: 0.5935, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
    ],
    groups: [{ id: "02dc14b8-45d2-4450-8788-b2d03d2bc65b", name: "Swing Playback", volume: 1 }],
    savedAt: 0,
  },
  {
    id: "builtin:swing-4-4",
    name: "Swing 4-4",
    tempo: 140,
    cycleBeats: 8,
    layers: [
      { name: "Kick", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, playCount: 3, gap: 1, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "Ping", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "ping", volume: 0.15, density: 0.5, playCount: 2, gap: 2, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "2&4", type: "manual", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "dust", volume: 0.3, density: 0.5, playCount: 2, gap: 2, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "beats", type: "manual", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "haze", volume: 0.2, density: 0.5, playCount: 2, gap: 2, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "swing", type: "random", steps: 16, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "mist", volume: 0.1, density: 0.25, playCount: 2, gap: 2, swing: 0.636, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
    ],
    groups: [{ id: "02dc14b8-45d2-4450-8788-b2d03d2bc65b", name: "Swing Playback", volume: 1 }],
    savedAt: 0,
  },
  {
    id: "builtin:swing-8-8",
    name: "Swing 8-8",
    tempo: 140,
    cycleBeats: 8,
    layers: [
      { name: "Kick", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, playCount: 5, gap: 3, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "Ping", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "ping", volume: 0.15, density: 0.5, playCount: 5, gap: 3, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "2&4", type: "manual", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "dust", volume: 0.3, density: 0.5, playCount: 4, gap: 4, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "beats", type: "manual", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "haze", volume: 0.2, density: 0.5, playCount: 4, gap: 4, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "swing", type: "random", steps: 16, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "mist", volume: 0.1, density: 0.25, playCount: 4, gap: 4, swing: 0.636, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
    ],
    groups: [{ id: "02dc14b8-45d2-4450-8788-b2d03d2bc65b", name: "Swing Playback", volume: 1 }],
    savedAt: 0,
  },
  {
    id: "builtin:swing-6-2",
    name: "Swing 6-2",
    tempo: 140,
    cycleBeats: 8,
    layers: [
      { name: "Kick", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, playCount: 4, gap: 0, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "Ping", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "ping", volume: 0.15, density: 0.5, playCount: 3, gap: 1, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "2&4", type: "manual", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "dust", volume: 0.3, density: 0.5, playCount: 3, gap: 1, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "beats", type: "manual", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "haze", volume: 0.2, density: 0.5, playCount: 3, gap: 1, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "swing", type: "random", steps: 16, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "mist", volume: 0.1, density: 0.25, playCount: 3, gap: 1, swing: 0.636, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
    ],
    groups: [{ id: "02dc14b8-45d2-4450-8788-b2d03d2bc65b", name: "Swing Playback", volume: 1 }],
    savedAt: 0,
  },
  {
    id: "builtin:medium-swing",
    name: "Medium Swing",
    tempo: 120,
    cycleBeats: 8,
    layers: [
      { name: "Kick", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "kick", volume: 0.75, density: 0.5, playCount: 1, gap: 1, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "2&4", type: "manual", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "dust", volume: 0.25, density: 0.5, playCount: 1, gap: 0, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "beats", type: "manual", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "haze", volume: 0.1, density: 0.5, playCount: 1, gap: 0, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "swing", type: "random", steps: 16, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "mist", volume: 0.1, density: 0.25, playCount: 1, gap: 0, swing: 0.6105, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
    ],
    groups: [{ id: "02dc14b8-45d2-4450-8788-b2d03d2bc65b", name: "Swing Playback", volume: 1 }],
    savedAt: 0,
  },
];

/** Check if a template is built-in (cannot be deleted/renamed by users) */
export function isBuiltIn(templateId: string): boolean {
  return templateId.startsWith("builtin:");
}

/**
 * Call this from the browser console to export ALL templates (built-in + user)
 * in their current display order as code for BUILT_IN_TEMPLATES.
 *
 * Usage (in browser console):
 *   copy(exportTemplatesForBundling())
 *
 * Then paste into the BUILT_IN_TEMPLATES array in this file.
 */
export function exportTemplatesForBundling(): string {
  try {
    const userRaw = localStorage.getItem("rhythm-lab:templates");
    const userTemplates: SavedTemplate[] = userRaw ? JSON.parse(userRaw) : [];
    const all = [...BUILT_IN_TEMPLATES, ...userTemplates];

    // Apply custom order if set
    const orderRaw = localStorage.getItem("rhythm-lab:template-order");
    let ordered = all;
    if (orderRaw) {
      const order: string[] = JSON.parse(orderRaw);
      const idxMap = new Map(order.map((id, i) => [id, i]));
      ordered = [...all].sort((a, b) => {
        const ai = idxMap.get(a.id) ?? order.length;
        const bi = idxMap.get(b.id) ?? order.length;
        return ai - bi;
      });
    }

    if (ordered.length === 0) return "// No templates found";
    // Remap IDs to builtin: prefix, reset timestamps
    const exported = ordered.map((t) => ({
      ...t,
      id: `builtin:${t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      savedAt: 0,
    }));
    return JSON.stringify(exported, null, 2);
  } catch {
    return "// Error exporting templates";
  }
}

// Expose to window for console access
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).exportTemplatesForBundling = exportTemplatesForBundling;
}

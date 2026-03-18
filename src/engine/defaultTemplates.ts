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
];

/** Check if a template is built-in (cannot be deleted/renamed by users) */
export function isBuiltIn(templateId: string): boolean {
  return templateId.startsWith("builtin:");
}

/**
 * Call this from the browser console to export your current localStorage
 * templates as code you can paste into BUILT_IN_TEMPLATES above.
 *
 * Usage (in browser console):
 *   copy(exportTemplatesForBundling())
 *
 * Then paste into the BUILT_IN_TEMPLATES array in this file.
 */
export function exportTemplatesForBundling(): string {
  const raw = localStorage.getItem("rhythm-lab:templates");
  if (!raw) return "// No templates found in localStorage";
  try {
    const templates = JSON.parse(raw) as SavedTemplate[];
    // Remap IDs to builtin: prefix, reset timestamps
    const exported = templates.map((t) => ({
      ...t,
      id: `builtin:${t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      savedAt: 0,
    }));
    return JSON.stringify(exported, null, 2);
  } catch {
    return "// Error parsing templates from localStorage";
  }
}

// Expose to window for console access
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).exportTemplatesForBundling = exportTemplatesForBundling;
}

/**
 * @file storage.ts
 * localStorage-based persistence for saved patterns and templates.
 */

import { Layer, LayerType, SoundPreset } from "./types";
import { BUILT_IN_TEMPLATES, isBuiltIn } from "./defaultTemplates";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface SavedPattern {
  id: string;
  name: string;
  type: LayerType;
  steps: number;
  pattern: (0 | 1)[];
  sound: SoundPreset;
  density: number;
  playCount?: number;
  gap: number;
  swing: number;
  savedAt: number;
}

export interface SavedTemplate {
  id: string;
  name: string;
  tempo: number;
  cycleBeats: number;
  layers: SavedTemplateLayer[];
  groups?: SavedTemplateGroup[];
  savedAt: number;
}

export interface SavedTemplateLayer {
  name: string;
  type: LayerType;
  steps: number;
  pattern: (0 | 1)[];
  sound: SoundPreset;
  volume: number;
  density: number;
  playCount?: number;
  gap: number;
  swing: number;
  groupId?: string;
}

export interface SavedTemplateGroup {
  id: string;
  name: string;
  volume: number;
  gap?: number;
}

// ─────────────────────────────────────────────
// KEYS
// ─────────────────────────────────────────────

const PATTERNS_KEY = "rhythm-lab:patterns";
const TEMPLATES_KEY = "rhythm-lab:templates";

// ─────────────────────────────────────────────
// PATTERNS (single-layer)
// ─────────────────────────────────────────────

export function getSavedPatterns(): SavedPattern[] {
  try {
    return JSON.parse(localStorage.getItem(PATTERNS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function savePattern(layer: Layer, name: string): SavedPattern {
  const pattern: SavedPattern = {
    id: crypto.randomUUID(),
    name,
    type: layer.type,
    steps: layer.steps,
    pattern: [...layer.pattern],
    sound: layer.sound,
    density: layer.density,
    playCount: layer.playCount,
    gap: layer.gap,
    swing: layer.swing,
    savedAt: Date.now(),
  };
  const patterns = getSavedPatterns();
  patterns.push(pattern);
  localStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));
  return pattern;
}

export function deletePattern(id: string): void {
  const patterns = getSavedPatterns().filter((p) => p.id !== id);
  localStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));
}

// ─────────────────────────────────────────────
// TEMPLATES (full composition)
// ─────────────────────────────────────────────

/** Get user-saved templates from localStorage only (no built-ins) */
function getUserTemplates(): SavedTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || "[]");
  } catch {
    return [];
  }
}

/** Get all templates: built-in first, then user-saved */
export function getSavedTemplates(): SavedTemplate[] {
  return [...BUILT_IN_TEMPLATES, ...getUserTemplates()];
}

export function saveTemplate(
  name: string,
  layers: Layer[],
  tempo: number,
  cycleBeats: number,
  overwriteId?: string,
  groups?: SavedTemplateGroup[],
): SavedTemplate {
  const templateData: Omit<SavedTemplate, "id" | "savedAt"> = {
    name,
    tempo,
    cycleBeats,
    layers: layers.map((l) => ({
      name: l.name,
      type: l.type,
      steps: l.steps,
      pattern: [...l.pattern],
      sound: l.sound,
      volume: l.volume,
      density: l.density,
      playCount: l.playCount,
      gap: l.gap,
      swing: l.swing,
      ...(l.groupId ? { groupId: l.groupId } : {}),
    })),
    ...(groups && groups.length > 0 ? { groups } : {}),
  };

  const userTemplates = getUserTemplates();

  if (overwriteId && !isBuiltIn(overwriteId)) {
    // Overwrite existing user template in-place (preserve position)
    const idx = userTemplates.findIndex((t) => t.id === overwriteId);
    if (idx !== -1) {
      const updated: SavedTemplate = {
        ...templateData,
        id: overwriteId,
        savedAt: Date.now(),
      };
      userTemplates[idx] = updated;
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(userTemplates));
      return updated;
    }
  }

  // Create new
  const template: SavedTemplate = {
    ...templateData,
    id: crypto.randomUUID(),
    savedAt: Date.now(),
  };
  userTemplates.push(template);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(userTemplates));
  return template;
}

export function renameTemplate(id: string, newName: string): void {
  if (isBuiltIn(id)) return; // Cannot rename built-in templates
  const templates = getUserTemplates();
  const idx = templates.findIndex((t) => t.id === id);
  if (idx !== -1) {
    templates[idx].name = newName;
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  }
}

export function deleteTemplate(id: string): void {
  if (isBuiltIn(id)) return; // Cannot delete built-in templates
  const templates = getUserTemplates().filter((t) => t.id !== id);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

export function reorderTemplates(fromIndex: number, toIndex: number): void {
  const templates = getUserTemplates();
  // Adjust indices to account for built-in templates at the beginning
  const builtInCount = BUILT_IN_TEMPLATES.length;
  const adjFrom = fromIndex - builtInCount;
  const adjTo = toIndex - builtInCount;
  if (adjFrom < 0 || adjTo < 0 || adjFrom === adjTo) return;
  if (adjFrom >= templates.length || adjTo >= templates.length) return;
  const [moved] = templates.splice(adjFrom, 1);
  templates.splice(adjTo, 0, moved);
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

/** Re-export for use in UI to show/hide delete/rename buttons */
export { isBuiltIn } from "./defaultTemplates";

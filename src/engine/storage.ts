/**
 * @file storage.ts
 * localStorage-based persistence for saved patterns and templates.
 */

import { Layer, LayerType, SoundPreset } from "./types";
import { BUILT_IN_TEMPLATES, isBuiltIn } from "./defaultTemplates";

const ORDER_KEY = "rhythm-lab:template-order";

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
  swing: number;
  savedAt: number;
  cyclePattern?: (0 | 1)[];
  repeatCycles?: number;
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
  /** @deprecated Legacy — use cyclePattern instead */
  playCount?: number;
  /** @deprecated Legacy — use cyclePattern instead */
  gap?: number;
  swing: number;
  groupId?: string;
  /** Per-cycle play/rest pattern. If absent, derive from legacy playCount+gap. */
  cyclePattern?: (0 | 1)[];
  /** Random repeat cycles. 0 = pure random per step. */
  repeatCycles?: number;
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
    swing: layer.swing,
    savedAt: Date.now(),
    cyclePattern: [...layer.cyclePattern],
    ...(layer.repeatCycles > 0 ? { repeatCycles: layer.repeatCycles } : {}),
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

/** Get saved custom order (array of template IDs), or null if none */
function getTemplateOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Get all templates: respects custom order if set, else built-in first then user */
export function getSavedTemplates(): SavedTemplate[] {
  const all = [...BUILT_IN_TEMPLATES, ...getUserTemplates()];
  const order = getTemplateOrder();
  if (!order) return all;

  // Sort by custom order; any templates not in the order list go at the end
  const idxMap = new Map(order.map((id, i) => [id, i]));
  return all.sort((a, b) => {
    const ai = idxMap.get(a.id) ?? order.length;
    const bi = idxMap.get(b.id) ?? order.length;
    return ai - bi;
  });
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
      swing: l.swing,
      cyclePattern: [...l.cyclePattern],
      ...(l.repeatCycles > 0 ? { repeatCycles: l.repeatCycles } : {}),
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

  // Append to custom order if one exists
  const order = getTemplateOrder();
  if (order) {
    order.push(template.id);
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  }

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
  // Remove from custom order if present
  const order = getTemplateOrder();
  if (order) {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order.filter((oid) => oid !== id)));
  }
}

export function reorderTemplates(fromIndex: number, toIndex: number): void {
  if (fromIndex === toIndex) return;
  // Work on the full ordered list (built-in + user)
  const all = getSavedTemplates();
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= all.length || toIndex >= all.length) return;
  const ids = all.map((t) => t.id);
  const [moved] = ids.splice(fromIndex, 1);
  ids.splice(toIndex, 0, moved);
  localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
}

/** Re-export for use in UI to show/hide delete/rename buttons */
export { isBuiltIn } from "./defaultTemplates";

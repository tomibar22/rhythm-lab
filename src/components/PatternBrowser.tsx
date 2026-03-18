import { useState, useMemo } from "react";
import { Layer, PatternPreset } from "../engine/types";
import { getPatternLibrary, euclidean } from "../engine/RhythmEngine";
import {
  SavedPattern,
  getSavedPatterns,
  savePattern,
  deletePattern,
} from "../engine/storage";

interface PatternBrowserProps {
  selectedLayerId: string;
  selectedLayer: Layer;
  onApplyPattern: (layerId: string, pattern: (0 | 1)[], steps: number) => void;
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
}

type Category = "saved" | "euclidean" | "clave" | "world" | "jazz" | "grid" | "custom";

const CATEGORY_LABELS: Record<Category, string> = {
  saved: "Saved",
  euclidean: "Euclidean",
  clave: "Clave",
  world: "World",
  jazz: "Jazz",
  grid: "Grid",
  custom: "Custom E(k,n)",
};

export function PatternBrowser({
  selectedLayerId,
  selectedLayer,
  onApplyPattern,
  onUpdateLayer,
}: PatternBrowserProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<Category>("saved");
  const [customK, setCustomK] = useState(3);
  const [customN, setCustomN] = useState(8);
  const [savedPatterns, setSavedPatterns] = useState<SavedPattern[]>(getSavedPatterns);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const library = useMemo(() => getPatternLibrary(), []);

  const filteredPatterns = useMemo(() => {
    if (category === "saved" || category === "custom") return [];
    return library.filter((p) => p.category === category);
  }, [library, category]);

  const customPattern = useMemo(
    () => euclidean(customK, customN),
    [customK, customN],
  );

  const handleSave = () => {
    const name = saveName.trim() || `${selectedLayer.name} pattern`;
    savePattern(selectedLayer, name);
    setSavedPatterns(getSavedPatterns());
    setSaveName("");
    setShowSaveInput(false);
    setCategory("saved");
  };

  const handleDelete = (id: string) => {
    deletePattern(id);
    setSavedPatterns(getSavedPatterns());
  };

  const handleApplySaved = (sp: SavedPattern) => {
    // Apply pattern + settings from saved pattern
    onApplyPattern(selectedLayerId, [...sp.pattern], sp.steps);
    onUpdateLayer(selectedLayerId, {
      sound: sp.sound,
      density: sp.density,
      gap: sp.gap,
      swing: sp.swing,
    });
  };

  return (
    <div className={`pattern-browser ${isOpen ? "open" : ""}`}>
      <button
        className="browser-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Pattern Library</span>
        <span className="toggle-arrow">{isOpen ? "▼" : "▲"}</span>
      </button>

      {isOpen && (
        <div className="browser-content">
          {/* Save current layer button */}
          <div className="save-pattern-bar">
            {showSaveInput ? (
              <div className="save-input-row">
                <input
                  className="save-name-input"
                  type="text"
                  placeholder="Pattern name..."
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                  autoFocus
                />
                <button className="save-confirm-btn" onClick={handleSave}>Save</button>
                <button className="save-cancel-btn" onClick={() => setShowSaveInput(false)}>Cancel</button>
              </div>
            ) : (
              <button
                className="save-layer-btn"
                onClick={() => setShowSaveInput(true)}
              >
                Save current layer as pattern
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div className="category-tabs">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
              <button
                key={cat}
                className={`cat-tab ${category === cat ? "active" : ""} ${cat === "saved" && savedPatterns.length > 0 ? "has-items" : ""}`}
                onClick={() => setCategory(cat)}
              >
                {CATEGORY_LABELS[cat]}
                {cat === "saved" && savedPatterns.length > 0 && (
                  <span className="tab-count">{savedPatterns.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Saved patterns */}
          {category === "saved" && (
            <div className="pattern-list">
              {savedPatterns.length === 0 ? (
                <div className="empty-saved">No saved patterns yet. Use the button above to save.</div>
              ) : (
                savedPatterns.map((sp) => (
                  <div key={sp.id} className="pattern-card saved-card">
                    <button
                      className="saved-card-body"
                      onClick={() => handleApplySaved(sp)}
                    >
                      <div className="card-header">
                        <span className="card-name">{sp.name}</span>
                        <span className="card-meta">
                          {sp.type === "random" ? `~${Math.round(sp.density * 100)}%` : `${sp.pattern.filter(v => v === 1).length}/${sp.steps}`}
                          {sp.gap > 0 && ` g${sp.gap}`}
                        </span>
                      </div>
                      {sp.type === "random" ? (
                        <div className="saved-random-indicator">
                          <span className="random-badge-small">RND</span>
                          <span className="card-meta">{sp.steps} steps</span>
                        </div>
                      ) : (
                        <PatternMini pattern={sp.pattern} color="#6c5ce7" />
                      )}
                    </button>
                    <button
                      className="delete-saved-btn"
                      onClick={() => handleDelete(sp.id)}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Custom Euclidean generator */}
          {category === "custom" && (
            <div className="euclidean-generator">
              <div className="gen-controls">
                <label>
                  k (onsets):
                  <input
                    type="number"
                    min={0}
                    max={customN}
                    value={customK}
                    onChange={(e) =>
                      setCustomK(
                        Math.min(
                          customN,
                          Math.max(0, parseInt(e.target.value) || 0),
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  n (steps):
                  <input
                    type="number"
                    min={2}
                    max={32}
                    value={customN}
                    onChange={(e) =>
                      setCustomN(
                        Math.min(
                          32,
                          Math.max(2, parseInt(e.target.value) || 2),
                        ),
                      )
                    }
                  />
                </label>
              </div>
              <div className="gen-preview">
                <PatternMini
                  pattern={customPattern}
                  color="#6c5ce7"
                />
                <span className="gen-label">
                  E({customK},{customN})
                </span>
                <button
                  className="apply-btn"
                  onClick={() =>
                    onApplyPattern(selectedLayerId, customPattern, customN)
                  }
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Preset pattern list */}
          {category !== "saved" && category !== "custom" && (
            <div className="pattern-list">
              {filteredPatterns.map((preset, i) => (
                <PatternCard
                  key={`${preset.name}-${i}`}
                  preset={preset}
                  onApply={() =>
                    onApplyPattern(
                      selectedLayerId,
                      [...preset.pattern],
                      preset.steps,
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function PatternCard({
  preset,
  onApply,
}: {
  preset: PatternPreset;
  onApply: () => void;
}) {
  const categoryColors: Record<string, string> = {
    euclidean: "#6c5ce7",
    clave: "#ff6b6b",
    world: "#ffe66d",
    jazz: "#4ecdc4",
    grid: "#dfe6e9",
  };
  const color = categoryColors[preset.category] ?? "#aaa";

  return (
    <button className="pattern-card" onClick={onApply}>
      <div className="card-header">
        <span className="card-name">{preset.name}</span>
        <span className="card-meta">
          {preset.onsets}/{preset.steps}
        </span>
      </div>
      <PatternMini pattern={preset.pattern} color={color} />
      {preset.description && (
        <div className="card-desc">{preset.description}</div>
      )}
    </button>
  );
}

function PatternMini({
  pattern,
  color,
}: {
  pattern: (0 | 1)[];
  color: string;
}) {
  return (
    <div className="pattern-mini">
      {pattern.map((v, i) => (
        <div
          key={i}
          className={`mini-cell ${v === 1 ? "on" : "off"}`}
          style={v === 1 ? { backgroundColor: color } : undefined}
        />
      ))}
    </div>
  );
}

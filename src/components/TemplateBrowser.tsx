import { useState, useRef, useMemo } from "react";
import { Layer, LayerGroup } from "../engine/types";
import {
  SavedTemplate,
  getSavedTemplates,
  saveTemplate,
  deleteTemplate,
  renameTemplate,
  reorderTemplates,
} from "../engine/storage";

interface TemplateBrowserProps {
  layers: Layer[];
  groups: LayerGroup[];
  tempo: number;
  cycleBeats: number;
  countdown: 0 | 0.5 | 1 | 2;
  onLoadTemplate: (template: SavedTemplate) => void;
}

export function TemplateBrowser({
  layers,
  groups,
  tempo,
  cycleBeats,
  countdown,
  onLoadTemplate,
}: TemplateBrowserProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<SavedTemplate[]>(getSavedTemplates);
  const [saveName, setSaveName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [overwriteId, setOverwriteId] = useState<string | null>(null);

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  // Drag state
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Check if the typed name matches an existing template
  const nameMatch = useMemo(() => {
    if (!saveName.trim()) return null;
    return templates.find(
      (t) => t.name.toLowerCase() === saveName.trim().toLowerCase(),
    ) || null;
  }, [saveName, templates]);

  // Determine if we're overwriting (explicit click or name match)
  const effectiveOverwriteId = overwriteId || nameMatch?.id || null;
  const isOverwrite = effectiveOverwriteId !== null;

  const handleSave = () => {
    const name = saveName.trim() || `Template ${templates.length + 1}`;
    const savedGroups = groups.length > 0
      ? groups.map((g) => ({ id: g.id, name: g.name, volume: g.volume, ...(g.cyclePattern.length > 1 ? { cyclePattern: [...g.cyclePattern] } : {}), ...(g.gapMode !== "manual" ? { gapMode: g.gapMode, gapDensity: g.gapDensity } : {}) }))
      : undefined;
    saveTemplate(name, layers, tempo, cycleBeats, effectiveOverwriteId || undefined, savedGroups, countdown);
    setTemplates(getSavedTemplates());
    setSaveName("");
    setShowSave(false);
    setOverwriteId(null);
  };

  const handleSelectForOverwrite = (t: SavedTemplate) => {
    setSaveName(t.name);
    setOverwriteId(t.id);
  };

  const cancelSave = () => {
    setShowSave(false);
    setSaveName("");
    setOverwriteId(null);
  };

  // ── Rename ──
  const startRename = (t: SavedTemplate) => {
    setRenamingId(t.id);
    setRenameText(t.name);
  };

  const commitRename = () => {
    if (renamingId && renameText.trim()) {
      renameTemplate(renamingId, renameText.trim());
      setTemplates(getSavedTemplates());
    }
    setRenamingId(null);
    setRenameText("");
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameText("");
  };

  const handleDelete = (id: string) => {
    deleteTemplate(id);
    setTemplates(getSavedTemplates());
    if (overwriteId === id) setOverwriteId(null);
    if (renamingId === id) cancelRename();
  };

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      reorderTemplates(dragIndexRef.current, index);
      setTemplates(getSavedTemplates());
    }
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  return (
    <div className="template-browser">
      <button
        className="template-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        Templates{templates.length > 0 && ` (${templates.length})`}
      </button>

      {isOpen && (
        <div className="template-dropdown">
          <div className="template-header">
            <span className="template-title">Templates</span>
            {!showSave && (
              <button
                className="template-save-btn"
                onClick={() => setShowSave(true)}
              >
                Save current
              </button>
            )}
          </div>

          {showSave && (
            <div className="template-save-row">
              <input
                className="template-name-input"
                type="text"
                placeholder="Template name..."
                value={saveName}
                onChange={(e) => {
                  setSaveName(e.target.value);
                  setOverwriteId(null);
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") cancelSave(); }}
                autoFocus
              />
              <button
                className={`save-confirm-btn ${isOverwrite ? "overwrite" : ""}`}
                onClick={handleSave}
              >
                {isOverwrite ? "Overwrite" : "Save"}
              </button>
              <button className="save-cancel-btn" onClick={cancelSave}>×</button>
            </div>
          )}

          <div className="template-list">
            {templates.length === 0 ? (
              <div className="empty-templates">No saved templates</div>
            ) : (
              templates.map((t, index) => (
                <div
                  key={t.id}
                  className={`template-card ${dragOverIndex === index ? "drag-over" : ""} ${effectiveOverwriteId === t.id ? "overwrite-target" : ""}`}
                  draggable={!showSave && renamingId !== t.id}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    handleDragStart(index);
                  }}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => { e.preventDefault(); handleDrop(index); }}
                >
                  <div className="template-drag-handle" title="Drag to reorder">⠿</div>
                  {renamingId === t.id ? (
                    <div className="template-card-body template-rename-row">
                      <input
                        className="template-rename-input"
                        type="text"
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") cancelRename();
                        }}
                        onBlur={commitRename}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      className="template-card-body"
                      onClick={() => {
                        if (showSave) {
                          handleSelectForOverwrite(t);
                        } else {
                          onLoadTemplate(t);
                          setIsOpen(false);
                        }
                      }}
                    >
                      <span className="template-card-name">{t.name}</span>
                      <span className="template-card-meta">
                        {t.layers.length} layers · {t.tempo} BPM · {t.cycleBeats}b
                      </span>
                    </button>
                  )}
                  <button
                    className="rename-template-btn"
                    onClick={() => startRename(t)}
                    title="Rename"
                  >
                    ✎
                  </button>
                  <button
                    className="delete-template-btn"
                    onClick={() => handleDelete(t.id)}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Close on outside click */}
      {isOpen && (
        <div
          className="template-backdrop"
          onClick={() => { setIsOpen(false); cancelSave(); cancelRename(); }}
        />
      )}
    </div>
  );
}

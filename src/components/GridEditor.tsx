import { useState, useEffect, useRef, useCallback } from "react";
import { Layer, LayerType, LayerGroup, SOUND_PRESETS, SoundPreset } from "../engine/types";
import { STEP_MULTIPLIERS, GroupActions } from "../hooks/useRhythmLab";

const MAX_STEPS = 128;

interface GridEditorProps {
  layers: Layer[];
  groups: LayerGroup[];
  groupActions: GroupActions;
  activeSteps: Record<string, number>;
  selectedLayerId: string;
  cycleBeats: number;
  onSetStep: (layerId: string, step: number, value: 0 | 1) => void;
  onSelectLayer: (layerId: string) => void;
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
  onToggleMute: (layerId: string) => void;
  onToggleSolo: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onRemoveLayer: (layerId: string) => void;
  onAddLayer: (type: LayerType) => void;
  onClearPattern: (layerId: string) => void;
  onReorderLayers: (fromIndex: number, toIndex: number, targetGroupId?: string | null) => void;
}

export function GridEditor({
  layers,
  groups,
  groupActions,
  activeSteps,
  selectedLayerId,
  cycleBeats,
  onSetStep,
  onSelectLayer,
  onUpdateLayer,
  onToggleMute,
  onToggleSolo,
  onDuplicateLayer,
  onRemoveLayer,
  onAddLayer,
  onClearPattern,
  onReorderLayers,
}: GridEditorProps) {
  // ── Element-index based drag system ──
  // Every rendered item (layer or group) gets a `data-elem-idx`.
  // Drag/drop operates entirely in this unified element-index space.
  // Only at drop time do we convert to flat-layer operations.

  type ElemInfo =
    | { type: "layer"; layerIndex: number; groupId: string | null }
    | { type: "group"; groupId: string; firstLayerIndex: number; lastLayerIndex: number };

  const [draggingId, setDraggingId] = useState<string | null>(null);
  // dropAfterElem: element index whose bottom edge shows the indicator line.
  // -1 = top drop zone, null = no indicator
  const [dropAfterElem, setDropAfterElem] = useState<number | null>(null);
  // Highlight group container when dragging a layer over it
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  // Element map: built during render, read during drop
  const elemMapRef = useRef<ElemInfo[]>([]);

  // Pointer drag tracking
  const pointerDrag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    active: boolean;
    ghostEl: HTMLElement | null;
    sourceElemIdx: number;
    id: string;
    label: string;
    color: string;
    // Drop target: insert position in element space (0 = before first, N = after last)
    dropInsertIdx: number | null;
    // If dropping onto a group area, the target group to join
    dropTargetGroupId: string | null;
  } | null>(null);

  const resetDrag = useCallback(() => {
    setDropAfterElem(null);
    setDraggingId(null);
    setDragOverGroupId(null);
    if (pointerDrag.current?.ghostEl) {
      pointerDrag.current.ghostEl.remove();
    }
    pointerDrag.current = null;
  }, []);

  // Refs for values needed in pointer event handlers (avoid stale closures)
  const layersRef = useRef(layers);
  layersRef.current = layers;

  // Start a pointer-based drag from a drag handle
  const handleDragHandlePointerDown = useCallback((
    e: React.PointerEvent,
    elemIdx: number,
    id: string,
    label: string,
    color: string,
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    pointerDrag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
      ghostEl: null,
      sourceElemIdx: elemIdx,
      id, label, color,
      dropInsertIdx: null,
      dropTargetGroupId: null,
    };
  }, []);

  useEffect(() => {
    const DRAG_THRESHOLD = 5;

    const onPointerMove = (e: PointerEvent) => {
      const drag = pointerDrag.current;
      if (!drag) return;

      if (!drag.active) {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;

        drag.active = true;
        setDraggingId(drag.id);

        const ghost = document.createElement("div");
        ghost.className = "pointer-drag-ghost";
        ghost.textContent = drag.label;
        ghost.style.cssText = `position:fixed;z-index:9999;padding:6px 14px;border-radius:6px;background:${drag.color};color:white;font:600 13px system-ui;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.4);opacity:0.9;pointer-events:none;transform:translate(-50%,-100%);`;
        document.body.appendChild(ghost);
        drag.ghostEl = ghost;
      }

      if (drag.ghostEl) {
        drag.ghostEl.style.left = e.clientX + "px";
        drag.ghostEl.style.top = (e.clientY - 10) + "px";
      }

      // Hit-test using elementFromPoint
      if (drag.ghostEl) drag.ghostEl.style.display = "none";
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (drag.ghostEl) drag.ghostEl.style.display = "";

      if (!el) return;

      // Is the dragged item a layer? (vs a group being dragged)
      const isDraggingLayer = layersRef.current.some(l => l.id === drag.id);

      // Top drop zone → insert at position 0
      if (el.closest(".top-drop-zone")) {
        drag.dropInsertIdx = 0;
        drag.dropTargetGroupId = null;
        setDropAfterElem(-1);
        setDragOverGroupId(null);
        return;
      }

      // Bottom drop zone → insert at end
      if (el.closest(".bottom-drop-zone")) {
        drag.dropInsertIdx = elemMapRef.current.length;
        drag.dropTargetGroupId = null;
        setDropAfterElem(-2);
        setDragOverGroupId(null);
        return;
      }

      // Check if cursor is over a group container (for "drop into group")
      const groupEl = el.closest("[data-group-id]") as HTMLElement | null;
      const hoveredGroupId = groupEl?.dataset.groupId ?? null;

      // Find the closest element with data-elem-idx
      const elemEl = el.closest("[data-elem-idx]") as HTMLElement | null;
      if (elemEl) {
        const idx = parseInt(elemEl.dataset.elemIdx!, 10);
        const rect = elemEl.getBoundingClientRect();
        const inTopHalf = e.clientY < rect.top + rect.height / 2;

        // Track whether we're dropping into a group
        drag.dropTargetGroupId = hoveredGroupId;

        // Highlight the group if dragging a layer over a different group
        if (isDraggingLayer && hoveredGroupId) {
          const draggedLayer = layersRef.current.find(l => l.id === drag.id);
          setDragOverGroupId(draggedLayer?.groupId !== hoveredGroupId ? hoveredGroupId : null);
        } else {
          setDragOverGroupId(null);
        }

        if (inTopHalf) {
          drag.dropInsertIdx = idx;
          setDropAfterElem(idx === 0 ? -1 : idx - 1);
        } else {
          drag.dropInsertIdx = idx + 1;
          setDropAfterElem(idx);
        }
        return;
      }

      // Over grid editor background → insert at end, ungroup
      drag.dropInsertIdx = elemMapRef.current.length;
      drag.dropTargetGroupId = null;
      setDropAfterElem(-2);
      setDragOverGroupId(null);
    };

    const onPointerUp = (_e: PointerEvent) => {
      const drag = pointerDrag.current;
      if (!drag) return;

      if (!drag.active) {
        pointerDrag.current = null;
        return;
      }

      const elemMap = elemMapRef.current;
      const currentLayers = layersRef.current;
      const { dropInsertIdx, sourceElemIdx } = drag;

      const sourceElem = dropInsertIdx !== null ? elemMap[sourceElemIdx] : null;
      // For layers inside groups, sourceElemIdx is the group's index (shared by all
      // group members), so the "same position" guard doesn't apply — always allow the drop.
      const isLayerInGroup = sourceElem?.type === "group" && sourceElem.firstLayerIndex >= 0;
      const isSamePosition = !isLayerInGroup && (dropInsertIdx === sourceElemIdx || dropInsertIdx === sourceElemIdx + 1);

      if (dropInsertIdx !== null && !isSamePosition && sourceElem) {
        const targetGroupId = drag.dropTargetGroupId;

        // Compute target flat-layer index from the element-space insert position.
        let targetLayerIdx = currentLayers.length;
        if (dropInsertIdx < elemMap.length) {
          for (let k = dropInsertIdx; k < elemMap.length; k++) {
            const te = elemMap[k];
            if (te.type === "layer") {
              targetLayerIdx = te.layerIndex;
              break;
            } else if (te.firstLayerIndex >= 0) {
              targetLayerIdx = te.firstLayerIndex;
              break;
            }
          }
        }

        // Determine if we're dragging an individual layer or a whole group.
        // Layers inside groups share the group's sourceElemIdx, so check drag.id
        // against the layers array to distinguish.
        const draggedLayer = currentLayers.find(l => l.id === drag.id);

        if (draggedLayer) {
          // Dragging an individual layer
          const from = currentLayers.indexOf(draggedLayer);
          const sourceGroupId = draggedLayer.groupId ?? null;

          if (targetGroupId && targetGroupId !== sourceGroupId) {
            // Dropping into a different group → join it, at the computed position
            groupActions.moveLayerToGroup(draggedLayer.id, targetGroupId, targetLayerIdx);
          } else if (!targetGroupId && sourceGroupId) {
            // Dropping outside any group → ungroup, at the computed position
            groupActions.moveLayerToGroup(draggedLayer.id, undefined, targetLayerIdx);
          } else {
            // Same group (or both ungrouped) → reorder
            const to = targetLayerIdx > from ? targetLayerIdx - 1 : targetLayerIdx;
            if (from !== to) {
              onReorderLayers(from, to, targetGroupId);
            }
          }
        } else if (sourceElem.type === "group") {
          // Dragging a group (drag.id matches a group, not a layer)
          if (sourceElem.firstLayerIndex >= 0) {
            groupActions.reorderGroupBlock(sourceElem.groupId, targetLayerIdx);
          } else {
            emptyGroupInserts.current.set(sourceElem.groupId, dropInsertIdx);
            groupActions.update(sourceElem.groupId, {});
          }
        }
      }

      resetDrag();
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, [onReorderLayers, groupActions, resetDrag]);

  const groupMap = new Map(groups.map((g) => [g.id, g]));

  // Track where empty groups should render (element index in the sections list)
  const emptyGroupInserts = useRef<Map<string, number>>(new Map());

  const renderLayerRow = (layer: Layer, index: number, elemIdx: number, inGroup: boolean) => (
    <LayerRow
      key={layer.id}
      layer={layer}
      index={index}
      activeStep={activeSteps[layer.id] ?? -1}
      isSelected={layer.id === selectedLayerId}
      canRemove={layers.length > 1}
      cycleBeats={cycleBeats}
      isDragging={draggingId === layer.id}
      dropPos={dropAfterElem === elemIdx ? "below" : null}
      inGroup={inGroup}
      elemIdx={elemIdx}
      onSetStep={(step, value) => onSetStep(layer.id, step, value)}
      onSelect={() => onSelectLayer(layer.id)}
      onUpdateLayer={(updates) => onUpdateLayer(layer.id, updates)}
      onToggleMute={() => onToggleMute(layer.id)}
      onToggleSolo={() => onToggleSolo(layer.id)}
      onDuplicate={() => onDuplicateLayer(layer.id)}
      onRemove={() => onRemoveLayer(layer.id)}
      onClear={() => onClearPattern(layer.id)}
      onUngroupLayer={inGroup ? () => groupActions.ungroupLayer(layer.id) : undefined}
      onHandlePointerDown={(e) => handleDragHandlePointerDown(
        e, elemIdx, layer.id, layer.name, layer.color,
      )}
    />
  );

  // Build group-aware render sections from flat layers array.
  // Two-pass approach: first build the element map, then render using final indices.
  const renderSections = () => {
    // Pass 1: Build the element map (ordered list of all visual elements)
    const elemMap: ElemInfo[] = [];
    const renderedGroupIds = new Set<string>();
    // Also collect data needed for rendering
    const elemData: Array<
      | { type: "layer"; layer: Layer; layerIndex: number }
      | { type: "group"; group: LayerGroup; groupLayers: { layer: Layer; index: number }[] }
    > = [];

    let i = 0;
    while (i < layers.length) {
      const layer = layers[i];
      if (layer.groupId && groupMap.has(layer.groupId)) {
        const group = groupMap.get(layer.groupId)!;
        renderedGroupIds.add(group.id);
        const groupLayers: { layer: Layer; index: number }[] = [];
        const firstIdx = i;
        while (i < layers.length && layers[i].groupId === layer.groupId) {
          groupLayers.push({ layer: layers[i], index: i });
          i++;
        }
        const lastIdx = i - 1;
        elemMap.push({ type: "group", groupId: group.id, firstLayerIndex: firstIdx, lastLayerIndex: lastIdx });
        elemData.push({ type: "group", group, groupLayers });
      } else {
        elemMap.push({ type: "layer", layerIndex: i, groupId: layer.groupId || null });
        elemData.push({ type: "layer", layer: layers[i], layerIndex: i });
        i++;
      }
    }

    // Insert empty groups at their stored positions (or at end)
    const emptyGroups: { group: LayerGroup; insertAt: number }[] = [];
    for (const group of groups) {
      if (renderedGroupIds.has(group.id)) {
        emptyGroupInserts.current.delete(group.id);
        continue;
      }
      const pos = emptyGroupInserts.current.get(group.id);
      const insertAt = pos !== undefined ? Math.min(pos, elemMap.length) : elemMap.length;
      emptyGroups.push({ group, insertAt });
    }
    emptyGroups.sort((a, b) => b.insertAt - a.insertAt);
    for (const { group, insertAt } of emptyGroups) {
      elemMap.splice(insertAt, 0, { type: "group", groupId: group.id, firstLayerIndex: -1, lastLayerIndex: -1 });
      elemData.splice(insertAt, 0, { type: "group", group, groupLayers: [] });
    }

    // Update the element map ref so pointer handlers can use it
    elemMapRef.current = elemMap;

    // Pass 2: Render elements using final indices from elemMap
    const renderGroupElement = (group: LayerGroup, groupLayers: { layer: Layer; index: number }[], eIdx: number) => (
      <div
        key={`group-${group.id}`}
        className={`layer-group ${group.muted ? "group-muted" : ""} ${draggingId === group.id ? "dragging" : ""} ${dropAfterElem === eIdx ? "drop-below" : ""} ${dragOverGroupId === group.id ? "drag-target" : ""}`}
        data-elem-idx={eIdx}
        data-group-id={group.id}
      >
        <GroupHeader
          group={group}
          layerCount={groupLayers.length}
          onToggleCollapse={() => groupActions.update(group.id, { collapsed: !group.collapsed })}
          onToggleMute={() => groupActions.toggleMute(group.id)}
          onToggleSolo={() => groupActions.toggleSolo(group.id)}
          onUpdateGroup={(updates) => groupActions.update(group.id, updates)}
          onClear={() => groupActions.clear(group.id)}
          onDuplicate={() => groupActions.duplicate(group.id)}
          onRemove={() => groupActions.remove(group.id)}
          onHandlePointerDown={(e) => handleDragHandlePointerDown(
            e, eIdx, group.id, `⌗ ${group.name}`, "rgba(60,60,65,0.95)",
          )}
        />
        {!group.collapsed && (
          <>
            {groupLayers.length > 0 && groupLayers.map(({ layer: gl, index: gi }) => renderLayerRow(gl, gi, eIdx, true))}
            <div className="group-add-layer">
              <button className="add-layer-btn" onClick={() => groupActions.addLayer(group.id, "manual")}>+ Manual</button>
              <button className="add-layer-btn add-random-btn" onClick={() => groupActions.addLayer(group.id, "random")}>+ Random</button>
            </div>
          </>
        )}
      </div>
    );

    return elemData.map((data, eIdx) => {
      if (data.type === "layer") {
        return renderLayerRow(data.layer, data.layerIndex, eIdx, false);
      } else {
        return renderGroupElement(data.group, data.groupLayers, eIdx);
      }
    });
  };

  return (
    <div className="grid-editor">
      {draggingId && (
        <div className={`top-drop-zone ${dropAfterElem === -1 ? "active" : ""}`} />
      )}
      {renderSections()}
      {draggingId && (
        <div className={`bottom-drop-zone ${dropAfterElem === -2 ? "active" : ""}`} />
      )}
      <div className="add-layer-controls">
        <button className="add-layer-btn" onClick={() => onAddLayer("manual")}>
          + Manual
        </button>
        <button className="add-layer-btn add-random-btn" onClick={() => onAddLayer("random")}>
          + Random
        </button>
        <button className="add-layer-btn add-group-btn" onClick={groupActions.add}>
          + Group
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LAYER ROW
// ─────────────────────────────────────────────

interface LayerRowProps {
  layer: Layer;
  index: number;
  activeStep: number;
  isSelected: boolean;
  canRemove: boolean;
  cycleBeats: number;
  isDragging: boolean;
  dropPos: "above" | "below" | null;
  inGroup: boolean;
  elemIdx: number;
  onSetStep: (step: number, value: 0 | 1) => void;
  onSelect: () => void;
  onUpdateLayer: (updates: Partial<Layer>) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onClear: () => void;
  onUngroupLayer?: () => void;
  onHandlePointerDown: (e: React.PointerEvent) => void;
}

function LayerRow({
  layer,
  index,
  activeStep,
  isSelected,
  canRemove,
  cycleBeats,
  isDragging,
  dropPos,
  inGroup,
  elemIdx,
  onSetStep,
  onSelect,
  onUpdateLayer,
  onToggleMute,
  onToggleSolo,
  onDuplicate,
  onRemove,
  onClear,
  onUngroupLayer,
  onHandlePointerDown,
}: LayerRowProps) {
  // ── Step painting state ──
  const paintModeRef = useRef<0 | 1 | null>(null); // null = not painting
  const lastPaintedStepRef = useRef<number | null>(null);

  const handleStepPointerDown = useCallback((step: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const currentValue = layer.pattern[step];
    const paintValue: 0 | 1 = currentValue === 1 ? 0 : 1;
    paintModeRef.current = paintValue;
    lastPaintedStepRef.current = step;
    onSetStep(step, paintValue);
  }, [layer.pattern, onSetStep]);

  const handleGridPointerMove = useCallback((e: React.PointerEvent) => {
    if (paintModeRef.current === null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    const stepAttr = (el as HTMLElement).dataset.step;
    if (stepAttr == null) return;
    const step = parseInt(stepAttr, 10);
    if (isNaN(step) || step === lastPaintedStepRef.current) return;
    lastPaintedStepRef.current = step;
    onSetStep(step, paintModeRef.current!);
  }, [onSetStep]);

  useEffect(() => {
    const stopPaint = () => {
      paintModeRef.current = null;
      lastPaintedStepRef.current = null;
    };
    document.addEventListener("pointerup", stopPaint);
    return () => document.removeEventListener("pointerup", stopPaint);
  }, []);

  const [stepsText, setStepsText] = useState(String(layer.steps));
  const [densityText, setDensityText] = useState(String(Math.round(layer.density * 100)));
  const [densityEditing, setDensityEditing] = useState(false);
  const densityInputRef = useRef<HTMLInputElement>(null);
  const densityDragStartY = useRef(0);
  const densityDragStart = useRef(0);
  const densityWheelAcc = useRef(0);
  const isDraggingDensity = useRef(false);

  const [volumeText, setVolumeText] = useState(String(Math.round(layer.volume * 100)));
  const [volumeEditing, setVolumeEditing] = useState(false);
  const volumeInputRef = useRef<HTMLInputElement>(null);
  const volumeDragStartY = useRef(0);
  const volumeDragStart = useRef(0);
  const volumeWheelAcc = useRef(0);
  const isDraggingVolume = useRef(false);

  const isRandom = layer.type === "random";

  useEffect(() => {
    setStepsText(String(layer.steps));
  }, [layer.steps]);

  useEffect(() => {
    setDensityText(String(Math.round(layer.density * 100)));
  }, [layer.density]);

  const commitSteps = () => {
    const val = parseInt(stepsText);
    if (!isNaN(val) && val >= 2 && val <= MAX_STEPS) {
      onUpdateLayer({ steps: val });
    } else {
      setStepsText(String(layer.steps));
    }
  };

  const commitDensity = () => {
    const val = parseInt(densityText);
    if (!isNaN(val) && val >= 1 && val <= 100) {
      onUpdateLayer({ density: val / 100 });
    } else {
      setDensityText(String(Math.round(layer.density * 100)));
    }
  };

  const handleDensityPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      if (densityEditing) return;

      e.preventDefault();
      e.stopPropagation();
      densityDragStartY.current = e.clientY;
      densityDragStart.current = Math.round(layer.density * 100);
      isDraggingDensity.current = false;

      const onMove = (me: PointerEvent) => {
        const dy = densityDragStartY.current - me.clientY;
        const steps = Math.trunc(dy / 3);
        if (steps !== 0) isDraggingDensity.current = true;
        // Snap to multiples of 5
        const base = Math.round(densityDragStart.current / 5) * 5;
        const raw = Math.min(100, Math.max(5, base + steps * 5));
        onUpdateLayer({ density: raw / 100 });
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [layer.density, densityEditing, onUpdateLayer],
  );

  const handleDensityDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDensityEditing(true);
    requestAnimationFrame(() => {
      densityInputRef.current?.focus();
      densityInputRef.current?.select();
    });
  }, []);

  const handleDensityWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      densityWheelAcc.current += e.deltaY;
      const threshold = 50;
      if (Math.abs(densityWheelAcc.current) >= threshold) {
        const steps = Math.trunc(densityWheelAcc.current / threshold);
        densityWheelAcc.current -= steps * threshold;
        const cur = Math.round(layer.density * 100);
        const raw = Math.min(100, Math.max(5, cur + steps * 5));
        onUpdateLayer({ density: raw / 100 });
      }
    },
    [layer.density, onUpdateLayer],
  );

  // ── Volume control handlers ──

  useEffect(() => {
    setVolumeText(String(Math.round(layer.volume * 100)));
  }, [layer.volume]);

  const commitVolume = () => {
    const val = parseInt(volumeText);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      onUpdateLayer({ volume: val / 100 });
    } else {
      setVolumeText(String(Math.round(layer.volume * 100)));
    }
  };

  const handleVolumePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      if (volumeEditing) return;

      e.preventDefault();
      e.stopPropagation();
      volumeDragStartY.current = e.clientY;
      volumeDragStart.current = Math.round(layer.volume * 100);
      isDraggingVolume.current = false;

      const onMove = (me: PointerEvent) => {
        const dy = volumeDragStartY.current - me.clientY;
        const steps = Math.trunc(dy / 3);
        if (steps !== 0) isDraggingVolume.current = true;
        const base = Math.round(volumeDragStart.current / 5) * 5;
        const raw = Math.min(100, Math.max(0, base + steps * 5));
        onUpdateLayer({ volume: raw / 100 });
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [layer.volume, volumeEditing, onUpdateLayer],
  );

  const handleVolumeDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setVolumeEditing(true);
    requestAnimationFrame(() => {
      volumeInputRef.current?.focus();
      volumeInputRef.current?.select();
    });
  }, []);

  const handleVolumeWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      volumeWheelAcc.current += e.deltaY;
      const threshold = 50;
      if (Math.abs(volumeWheelAcc.current) >= threshold) {
        const steps = Math.trunc(volumeWheelAcc.current / threshold);
        volumeWheelAcc.current -= steps * threshold;
        const cur = Math.round(layer.volume * 100);
        const raw = Math.min(100, Math.max(0, cur + steps * 5));
        onUpdateLayer({ volume: raw / 100 });
      }
    },
    [layer.volume, onUpdateLayer],
  );

  const activeMultiplier = STEP_MULTIPLIERS.find((m) => m * cycleBeats === layer.steps);

  return (
    <div
      className={`layer-row ${isSelected ? "selected" : ""} ${layer.muted ? "muted" : ""} ${isRandom ? "random" : ""} ${isDragging ? "dragging" : ""} ${dropPos === "below" ? "drop-below" : ""}`}
      data-elem-idx={inGroup ? undefined : elemIdx}
      data-layer-index={index}
      onClick={onSelect}
    >
      {/* Row 1: layer info + right-side controls */}
      <div className="layer-top-bar">
        <div className="layer-info">
          <div
            className="drag-handle"
            role="group"
            aria-label="Drag to reorder"
            onPointerDown={onHandlePointerDown}
          >⠿</div>
          <div
            className="layer-color"
            style={{ backgroundColor: layer.color }}
          />
          {isRandom && <span className="layer-type-badge">RND</span>}
          <input
            className="layer-name"
            value={layer.name}
            onChange={(e) => onUpdateLayer({ name: e.target.value })}
            onClick={(e) => e.stopPropagation()}
          />
          <select
            className="layer-sound"
            value={layer.sound}
            onChange={(e) => {
              onUpdateLayer({ sound: e.target.value as SoundPreset });
              (e.target as HTMLSelectElement).blur();
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {SOUND_PRESETS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="layer-controls">
          <GapControl gap={layer.gap} onChange={(gap) => onUpdateLayer({ gap })} />
          <button
            className={`ctrl-btn mute-btn ${layer.muted ? "active" : ""}`}
            onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
            title="Mute"
          >M</button>
          <button
            className={`ctrl-btn solo-btn ${layer.solo ? "active" : ""}`}
            onClick={(e) => { e.stopPropagation(); onToggleSolo(); }}
            title="Solo"
          >S</button>
          <div
            className={`volume-control ${volumeEditing ? "editing" : ""}`}
            onPointerDown={handleVolumePointerDown}
            onDoubleClick={handleVolumeDoubleClick}
            onWheel={handleVolumeWheel}
            onClick={(e) => e.stopPropagation()}
            title="Drag to adjust volume, double-click to type"
          >
            <span className="volume-icon">vol</span>
            <input
              ref={volumeInputRef}
              className="volume-input"
              type="text"
              inputMode="numeric"
              readOnly={!volumeEditing}
              value={volumeText}
              onChange={(e) => setVolumeText(e.target.value)}
              onBlur={() => { commitVolume(); setVolumeEditing(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { commitVolume(); setVolumeEditing(false); (e.target as HTMLInputElement).blur(); }
                else if (e.key === "Escape") { setVolumeText(String(Math.round(layer.volume * 100))); setVolumeEditing(false); (e.target as HTMLInputElement).blur(); }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <button
            className="ctrl-btn clear-btn"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            title={isRandom ? "Forbid all steps" : "Clear pattern"}
          >CLR</button>
          <button
            className="ctrl-btn dup-btn"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            title="Duplicate layer"
          >DUP</button>
          {inGroup && onUngroupLayer && (
            <button
              className="ctrl-btn ungroup-btn"
              onClick={(e) => { e.stopPropagation(); onUngroupLayer(); }}
              title="Remove from group"
            >↑</button>
          )}
          {canRemove && (
            <button
              className="ctrl-btn remove-btn"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              title="Remove layer"
            >×</button>
          )}
        </div>
      </div>

      {/* Row 2: step controls + multiplier pills + density (compact) */}
      <div className="layer-step-bar" onClick={(e) => e.stopPropagation()}>
        <div className="steps-control">
          <button
            className="steps-btn"
            onClick={() => { if (layer.steps > 2) onUpdateLayer({ steps: layer.steps - 1 }); }}
          >−</button>
          <input
            className="steps-value"
            type="text"
            inputMode="numeric"
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            onBlur={commitSteps}
            onKeyDown={(e) => {
              if (e.key === "Enter") { commitSteps(); (e.target as HTMLInputElement).blur(); }
            }}
          />
          <button
            className="steps-btn"
            onClick={() => { if (layer.steps < MAX_STEPS) onUpdateLayer({ steps: layer.steps + 1 }); }}
          >+</button>
        </div>
        <div className="step-multipliers">
          {STEP_MULTIPLIERS.map((m) => {
            const targetSteps = m * cycleBeats;
            if (targetSteps > MAX_STEPS) return null;
            return (
              <button
                key={m}
                className={`step-mult-btn ${activeMultiplier === m ? "active" : ""}`}
                onClick={() => onUpdateLayer({ steps: targetSteps })}
                title={`${targetSteps} steps (${m} per beat)`}
              >×{m}</button>
            );
          })}
        </div>

        {isRandom && (
          <div
            className={`density-control ${densityEditing ? "editing" : ""}`}
            onPointerDown={handleDensityPointerDown}
            onDoubleClick={handleDensityDoubleClick}
            onWheel={handleDensityWheel}
            title="Drag to adjust density, double-click to type"
          >
            <span className="density-label">density</span>
            <input
              ref={densityInputRef}
              className="density-input"
              type="text"
              inputMode="numeric"
              readOnly={!densityEditing}
              value={densityText}
              onChange={(e) => setDensityText(e.target.value)}
              onBlur={() => { commitDensity(); setDensityEditing(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { commitDensity(); setDensityEditing(false); (e.target as HTMLInputElement).blur(); }
                else if (e.key === "Escape") { setDensityText(String(Math.round(layer.density * 100))); setDensityEditing(false); (e.target as HTMLInputElement).blur(); }
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="density-pct">%</span>
          </div>
        )}
      </div>

      {/* Row 3: step grid — grouped by beat */}
      <div
        className={`step-grid ${isRandom ? "random-grid" : ""}`}
        onPointerMove={handleGridPointerMove}
      >
        {(() => {
          const stepsPerBeat = layer.steps / cycleBeats;
          const groupSize =
            Number.isInteger(stepsPerBeat) && stepsPerBeat > 0
              ? stepsPerBeat
              : layer.steps % 4 === 0
                ? layer.steps / 4
                : layer.steps % 3 === 0
                  ? layer.steps / 3
                  : 0;

          if (groupSize > 0) {
            const groups: number[][] = [];
            for (let i = 0; i < layer.steps; i += groupSize) {
              groups.push(
                Array.from({ length: Math.min(groupSize, layer.steps - i) }, (_, j) => i + j)
              );
            }
            return groups.map((group, gi) => (
              <div key={gi} className="beat-group">
                {group.map((step) => (
                  <StepButton
                    key={step}
                    step={step}
                    value={layer.pattern[step]}
                    isActive={activeStep === step}
                    isDownbeat={step % groupSize === 0}
                    color={layer.color}
                    isRandom={isRandom}
                    density={isRandom ? layer.density : undefined}
                    onPointerDown={handleStepPointerDown}
                  />
                ))}
              </div>
            ));
          }

          return layer.pattern.map((value, step) => (
            <StepButton
              key={step}
              step={step}
              value={value}
              isActive={activeStep === step}
              isDownbeat={false}
              color={layer.color}
              isRandom={isRandom}
              density={isRandom ? layer.density : undefined}
              onPointerDown={handleStepPointerDown}
            />
          ));
        })()}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP BUTTON
// ─────────────────────────────────────────────

function StepButton({
  step,
  value,
  isActive,
  isDownbeat,
  color,
  isRandom,
  density,
  onPointerDown,
}: {
  step: number;
  value: 0 | 1;
  isActive: boolean;
  isDownbeat: boolean;
  color: string;
  isRandom?: boolean;
  density?: number;
  onPointerDown: (step: number, e: React.PointerEvent) => void;
}) {
  const isOn = value === 1;

  if (isRandom) {
    const isAllowed = isOn;
    const isForbidden = !isAllowed;
    const d = density ?? 0.5;

    const style: React.CSSProperties = isForbidden
      ? { opacity: 0.3 }
      : {
          backgroundColor: color,
          opacity: isActive ? 1 : d * 0.6 + 0.1,
          boxShadow: isActive
            ? `0 0 12px ${color}, inset 0 1px 1px rgba(255,255,255,0.25)`
            : undefined,
        };

    return (
      <button
        className={`step-cell random-step ${isForbidden ? "forbidden" : ""} ${isActive && !isForbidden ? "active" : ""} ${isDownbeat ? "downbeat" : ""}`}
        style={style}
        data-step={step}
        onPointerDown={(e) => onPointerDown(step, e)}
        aria-label={`Step ${step + 1}: ${isForbidden ? "forbidden" : `${Math.round(d * 100)}% density`}`}
      />
    );
  }

  const manualStyle = isOn
    ? {
        backgroundColor: color,
        boxShadow: isActive
          ? `0 0 12px ${color}, inset 0 1px 1px rgba(255,255,255,0.25)`
          : `inset 0 1px 1px rgba(255,255,255,0.15)`,
      }
    : undefined;

  return (
    <button
      className={`step-cell ${isOn ? "on" : "off"} ${isActive ? "active" : ""} ${isDownbeat ? "downbeat" : ""}`}
      style={manualStyle}
      data-step={step}
      onPointerDown={(e) => onPointerDown(step, e)}
      aria-label={`Step ${step + 1}: ${isOn ? "on" : "off"}`}
    />
  );
}

// ─────────────────────────────────────────────
// GROUP HEADER
// ─────────────────────────────────────────────

function GroupHeader({
  group,
  layerCount,
  onToggleCollapse,
  onToggleMute,
  onToggleSolo,
  onUpdateGroup,
  onClear,
  onDuplicate,
  onRemove,
  onHandlePointerDown,
}: {
  group: LayerGroup;
  layerCount: number;
  onToggleCollapse: () => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onUpdateGroup: (updates: Partial<LayerGroup>) => void;
  onClear: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onHandlePointerDown: (e: React.PointerEvent) => void;
}) {
  // ── Volume DragValue ──
  const [volText, setVolText] = useState(String(Math.round(group.volume * 100)));
  const [volEditing, setVolEditing] = useState(false);
  const volInputRef = useRef<HTMLInputElement>(null);
  const volDragStartY = useRef(0);
  const volDragStart = useRef(0);
  const volWheelAcc = useRef(0);
  const isDraggingVol = useRef(false);

  useEffect(() => {
    setVolText(String(Math.round(group.volume * 100)));
  }, [group.volume]);

  const commitVolume = () => {
    const val = parseInt(volText);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      onUpdateGroup({ volume: val / 100 });
    } else {
      setVolText(String(Math.round(group.volume * 100)));
    }
  };

  const handleVolPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      if (volEditing) return;
      e.preventDefault();
      e.stopPropagation();
      volDragStartY.current = e.clientY;
      volDragStart.current = Math.round(group.volume * 100);
      isDraggingVol.current = false;
      const onMove = (me: PointerEvent) => {
        const dy = volDragStartY.current - me.clientY;
        const steps = Math.trunc(dy / 3);
        if (steps !== 0) isDraggingVol.current = true;
        const base = Math.round(volDragStart.current / 5) * 5;
        const raw = Math.min(100, Math.max(0, base + steps * 5));
        onUpdateGroup({ volume: raw / 100 });
      };
      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [group.volume, volEditing, onUpdateGroup],
  );

  const handleVolDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setVolEditing(true);
    requestAnimationFrame(() => {
      volInputRef.current?.focus();
      volInputRef.current?.select();
    });
  }, []);

  const handleVolWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      volWheelAcc.current += e.deltaY;
      const threshold = 50;
      if (Math.abs(volWheelAcc.current) >= threshold) {
        const steps = Math.trunc(volWheelAcc.current / threshold);
        volWheelAcc.current -= steps * threshold;
        const cur = Math.round(group.volume * 100);
        const raw = Math.min(100, Math.max(0, cur + steps * 5));
        onUpdateGroup({ volume: raw / 100 });
      }
    },
    [group.volume, onUpdateGroup],
  );

  return (
    <div className="group-header" onClick={(e) => e.stopPropagation()}>
      <div className="group-header-left">
        <div
          className="drag-handle group-drag-handle"
          role="group"
          aria-label="Drag to reorder group"
          onPointerDown={onHandlePointerDown}
        >⠿</div>
        <button className="group-collapse-btn" onClick={onToggleCollapse}>
          {group.collapsed ? "▸" : "▾"}
        </button>
        <input
          className="group-name-input"
          value={group.name}
          onChange={(e) => onUpdateGroup({ name: e.target.value })}
        />
        {group.collapsed && (
          <span className="group-layer-count">
            {layerCount} layer{layerCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="group-header-controls">
        <button
          className={`ctrl-btn mute-btn ${group.muted ? "active" : ""}`}
          onClick={onToggleMute}
          title="Mute group"
        >M</button>
        <button
          className={`ctrl-btn solo-btn ${group.solo ? "active" : ""}`}
          onClick={onToggleSolo}
          title="Solo group"
        >S</button>
        <div
          className={`volume-control ${volEditing ? "editing" : ""}`}
          onPointerDown={handleVolPointerDown}
          onDoubleClick={handleVolDoubleClick}
          onWheel={handleVolWheel}
          title="Group volume (drag or double-click)"
        >
          <span className="volume-icon">vol</span>
          <input
            ref={volInputRef}
            className="volume-input"
            type="text"
            inputMode="numeric"
            readOnly={!volEditing}
            value={volText}
            onChange={(e) => setVolText(e.target.value)}
            onBlur={() => { commitVolume(); setVolEditing(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { commitVolume(); setVolEditing(false); (e.target as HTMLInputElement).blur(); }
              else if (e.key === "Escape") { setVolText(String(Math.round(group.volume * 100))); setVolEditing(false); (e.target as HTMLInputElement).blur(); }
            }}
          />
        </div>
        <button className="ctrl-btn clear-btn" onClick={onClear} title="Clear group patterns">CLR</button>
        <button className="ctrl-btn dup-btn" onClick={onDuplicate} title="Duplicate group">DUP</button>
        <button
          className="ctrl-btn remove-btn"
          onClick={onRemove}
          title="Ungroup layers"
        >×</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// GAP CONTROL
// ─────────────────────────────────────────────

function GapControl({
  gap,
  onChange,
}: {
  gap: number;
  onChange: (gap: number) => void;
}) {
  const total = 1 + gap;
  const tooltip = gap === 0
    ? "Plays every cycle (click + to add rest cycles)"
    : `Plays 1 cycle, rests ${gap} cycle${gap > 1 ? "s" : ""}`;
  const showCompact = total > 6;

  return (
    <div
      className={`gap-control ${gap > 0 ? "has-gap" : ""}`}
      onClick={(e) => e.stopPropagation()}
      title={tooltip}
    >
      <button
        className="gap-btn"
        onClick={() => { if (gap > 0) onChange(gap - 1); }}
        disabled={gap === 0}
      >−</button>
      <div className="gap-dots">
        {showCompact ? (
          <>
            <span className="gap-dot play" />
            <span className="gap-compact-rest">
              <span className="gap-dot rest" />
              <span className="gap-rest-count">×{gap}</span>
            </span>
          </>
        ) : (
          Array.from({ length: total }, (_, i) => (
            <span key={i} className={`gap-dot ${i === 0 ? "play" : "rest"}`} />
          ))
        )}
      </div>
      <button
        className="gap-btn"
        onClick={() => { if (gap < 16) onChange(gap + 1); }}
        disabled={gap >= 16}
      >+</button>
    </div>
  );
}

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

// ── VisualRow-based drag system ──
// Every visible row (layer, group-header, layer-inside-group) gets its own
// sequential `data-row-idx`. Drop targets are "slots" — gaps between rows.
// Slot 0 = before first row, slot N = after last row.
// This eliminates the bugs caused by layers-inside-groups sharing indices.

type VisualRow =
  | { kind: "layer"; layerId: string; layerIndex: number; groupId: string | null }
  | { kind: "group-header"; groupId: string; firstLayerIndex: number; layerCount: number };

type DropTarget =
  | { kind: "slot"; slotIndex: number; targetGroupId?: string | null }
  | { kind: "into-group"; groupId: string }
  | null;

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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Slot index for the drop indicator line. null = no indicator.
  const [indicatorSlot, setIndicatorSlot] = useState<number | null>(null);
  // Which group the indicator is INSIDE of (for boundary disambiguation).
  // When set, the last layer in the group shows the indicator.
  // When null, the group container shows it (meaning "outside/below group").
  const [indicatorInGroupId, setIndicatorInGroupId] = useState<string | null>(null);
  // Highlight group when dragging a layer into it
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  // Visual row map: built during render, read during drag/drop
  const rowMapRef = useRef<VisualRow[]>([]);

  // Track where empty groups should render (row-level position)
  const emptyGroupInserts = useRef<Map<string, number>>(new Map());

  // Pointer drag tracking
  const pointerDrag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    active: boolean;
    ghostEl: HTMLElement | null;
    id: string;
    label: string;
    color: string;
    // The stored drop target from the last pointermove
    dropTarget: DropTarget;
  } | null>(null);

  const resetDrag = useCallback(() => {
    setIndicatorSlot(null);
    setIndicatorInGroupId(null);
    setDraggingId(null);
    setDragOverGroupId(null);
    if (pointerDrag.current?.ghostEl) {
      pointerDrag.current.ghostEl.remove();
    }
    pointerDrag.current = null;
  }, []);

  const layersRef = useRef(layers);
  layersRef.current = layers;

  // Determine which row indices the dragged item occupies
  const getDraggedRowRange = useCallback((dragId: string, rowMap: VisualRow[]): [number, number] | null => {
    const currentLayers = layersRef.current;
    const draggedLayer = currentLayers.find(l => l.id === dragId);
    if (draggedLayer) {
      // Single layer
      const idx = rowMap.findIndex(r => r.kind === "layer" && r.layerId === dragId);
      return idx >= 0 ? [idx, idx] : null;
    }
    // Group: find header + all member layers
    const headerIdx = rowMap.findIndex(r => r.kind === "group-header" && r.groupId === dragId);
    if (headerIdx < 0) return null;
    let lastIdx = headerIdx;
    for (let i = headerIdx + 1; i < rowMap.length; i++) {
      if (rowMap[i].kind === "layer" && (rowMap[i] as { groupId: string | null }).groupId === dragId) {
        lastIdx = i;
      } else {
        break;
      }
    }
    return [headerIdx, lastIdx];
  }, []);

  const handleDragHandlePointerDown = useCallback((
    e: React.PointerEvent,
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
      id, label, color,
      dropTarget: null,
    };
  }, []);

  useEffect(() => {
    const DRAG_THRESHOLD = 5;

    // Helper: find the group's last row index from the header row index
    const groupLastRowIdx = (headerIdx: number, gid: string, rowMap: VisualRow[]): number => {
      let last = headerIdx;
      for (let r = headerIdx + 1; r < rowMap.length; r++) {
        if (rowMap[r].kind === "layer" && (rowMap[r] as { groupId: string | null }).groupId === gid) {
          last = r;
        } else break;
      }
      return last;
    };

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

      // Hit-test
      if (drag.ghostEl) drag.ghostEl.style.display = "none";
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (drag.ghostEl) drag.ghostEl.style.display = "";
      if (!el) return;

      const rowMap = rowMapRef.current;
      const dragRange = getDraggedRowRange(drag.id, rowMap);
      const isDraggingLayer = layersRef.current.some(l => l.id === drag.id);

      // Helper: apply slot with self-drop guard.
      // `inGroupId` disambiguates boundary slots: when set, the indicator
      // appears inside the group (last layer's drop-below); when null, it
      // appears outside (group container's drop-below = ungroup).
      const applySlot = (slot: number, inGroupId: string | null = null) => {
        // Self-drop guard: skip if dropping on own row range — UNLESS the
        // target group is different from the source (that's a valid move-into-group,
        // not a self-drop, even though the slot index happens to coincide).
        const draggedLayer = isDraggingLayer ? layersRef.current.find(l => l.id === drag.id) : null;
        const isSelfDrop = dragRange && slot >= dragRange[0] && slot <= dragRange[1];
        const isCrossGroup = draggedLayer && inGroupId && (draggedLayer.groupId ?? null) !== inGroupId;
        if (isSelfDrop && !isCrossGroup) {
          drag.dropTarget = null;
          setIndicatorSlot(null);
          setIndicatorInGroupId(null);
        } else {
          drag.dropTarget = { kind: "slot", slotIndex: slot, targetGroupId: inGroupId };
          setIndicatorSlot(slot);
          setIndicatorInGroupId(inGroupId);
        }
      };

      // Top drop zone
      if (el.closest(".top-drop-zone")) {
        applySlot(0);
        setDragOverGroupId(null);
        return;
      }

      // Bottom drop zone
      if (el.closest(".bottom-drop-zone")) {
        applySlot(rowMap.length);
        setDragOverGroupId(null);
        return;
      }

      // Find row element
      const rowEl = el.closest("[data-row-idx]") as HTMLElement | null;

      if (rowEl) {
        const idx = parseInt(rowEl.dataset.rowIdx!, 10);
        const isGroupContainer = !!rowEl.dataset.groupId;

        if (isGroupContainer) {
          const gid = rowEl.dataset.groupId!;

          const headerEl = rowEl.querySelector(".group-header") as HTMLElement | null;
          const headerRect = headerEl?.getBoundingClientRect();
          const isOverHeader = headerRect && e.clientY <= headerRect.bottom;

          if (isDraggingLayer) {
            const draggedLayer = layersRef.current.find(l => l.id === drag.id);
            const isExternal = draggedLayer?.groupId !== gid;

            if (isExternal) {
              // External layer over ANY part of group container → "into-group"
              // (append to end). The group highlight is the visual cue.
              // For precise positioning within the group, the user can hover
              // over individual layer rows (handled by the "Regular row" branch).
              drag.dropTarget = { kind: "into-group", groupId: gid };
              setIndicatorSlot(null);
              setIndicatorInGroupId(null);
              setDragOverGroupId(gid);
              return;
            }
          }

          // Internal layer or group drag → slot-based positioning
          if (headerRect) {
            if (isOverHeader) {
              // Over header area
              const inTopHalf = e.clientY < headerRect.top + headerRect.height / 2;
              // Top half = above group (ungroup), bottom half = inside group
              applySlot(inTopHalf ? idx : idx + 1, inTopHalf ? null : gid);
            } else {
              // Below header: cursor is in controls/padding area (below all layers)
              // For internal layers: UNGROUP (place after group)
              // For group drags: position after this group
              const lastRow = groupLastRowIdx(idx, gid, rowMap);
              applySlot(lastRow + 1, null);
            }
          } else {
            const rect = rowEl.getBoundingClientRect();
            applySlot(e.clientY < rect.top + rect.height / 2 ? idx : idx + 1);
          }
          setDragOverGroupId(null);
          return;
        }

        // Regular row (layer) — standard top/bottom half
        const rect = rowEl.getBoundingClientRect();
        const inTopHalf = e.clientY < rect.top + rect.height / 2;
        const slot = inTopHalf ? idx : idx + 1;

        // Determine target group: if hovering over a grouped layer, the
        // slot inherits that group membership
        const rowData = rowMap[idx];
        const rowGroupId = rowData?.kind === "layer" ? rowData.groupId : null;
        applySlot(slot, rowGroupId);

        // Group highlight when hovering layer over a layer inside a different group
        if (isDraggingLayer && rowGroupId) {
          const draggedLayer = layersRef.current.find(l => l.id === drag.id);
          setDragOverGroupId(draggedLayer?.groupId !== rowGroupId ? rowGroupId : null);
        } else {
          setDragOverGroupId(null);
        }
        return;
      }

      // Grid editor background — find nearest slot by Y-scanning row elements
      const allRowEls = Array.from(document.querySelectorAll("[data-row-idx]"))
        .map(r => {
          const htmlEl = r as HTMLElement;
          const rIdx = parseInt(htmlEl.dataset.rowIdx!, 10);
          let rRect = htmlEl.getBoundingClientRect();
          if (htmlEl.dataset.groupId) {
            const hdr = htmlEl.querySelector(".group-header");
            if (hdr) rRect = hdr.getBoundingClientRect();
          }
          return { idx: rIdx, rect: rRect };
        })
        .sort((a, b) => a.rect.top - b.rect.top);

      let bestSlot = rowMap.length;
      for (const { idx: rIdx, rect: rRect } of allRowEls) {
        if (e.clientY < rRect.top + rRect.height / 2) {
          bestSlot = rIdx;
          break;
        }
      }
      applySlot(bestSlot);
      setDragOverGroupId(null);
    };

    const onPointerUp = (_e: PointerEvent) => {
      const drag = pointerDrag.current;
      if (!drag) return;

      if (!drag.active) {
        pointerDrag.current = null;
        return;
      }

      const rowMap = rowMapRef.current;
      const currentLayers = layersRef.current;
      const target = drag.dropTarget;

      if (target) {
        const draggedLayer = currentLayers.find(l => l.id === drag.id);

        if (target.kind === "into-group" && draggedLayer) {
          groupActions.moveLayerToGroup(draggedLayer.id, target.groupId);
        } else if (target.kind === "slot") {
          const slotIndex = target.slotIndex;

          // Convert slot index → flat layer index
          let targetLayerIdx = currentLayers.length;
          if (slotIndex < rowMap.length) {
            const row = rowMap[slotIndex];
            if (row.kind === "layer") {
              targetLayerIdx = row.layerIndex;
            } else if (row.kind === "group-header") {
              targetLayerIdx = row.firstLayerIndex >= 0 ? row.firstLayerIndex : currentLayers.length;
              if (row.firstLayerIndex < 0) {
                for (let k = slotIndex + 1; k < rowMap.length; k++) {
                  const r = rowMap[k];
                  if (r.kind === "layer") { targetLayerIdx = r.layerIndex; break; }
                  if (r.kind === "group-header" && r.firstLayerIndex >= 0) { targetLayerIdx = r.firstLayerIndex; break; }
                }
              }
            }
          }

          // Target group is determined by the pointer handler during drag
          // (stored in dropTarget.targetGroupId), not computed from slot position.
          // This eliminates boundary ambiguity (same slot can mean "inside group"
          // or "outside group" depending on cursor position).
          const targetGroupId: string | null = target.targetGroupId ?? null;

          if (draggedLayer) {
            const from = currentLayers.indexOf(draggedLayer);
            const sourceGroupId = draggedLayer.groupId ?? null;

            if (targetGroupId && targetGroupId !== sourceGroupId) {
              groupActions.moveLayerToGroup(draggedLayer.id, targetGroupId, targetLayerIdx);
            } else if (!targetGroupId && sourceGroupId) {
              // Ungrouping: if last layer, store group position
              const membersLeft = currentLayers.filter(l => l.groupId === sourceGroupId && l.id !== draggedLayer.id);
              if (membersLeft.length === 0) {
                const groupRowIdx = rowMap.findIndex(r => r.kind === "group-header" && r.groupId === sourceGroupId);
                if (groupRowIdx >= 0) {
                  let sectionIdx = 0;
                  for (let k = 0; k < groupRowIdx; k++) {
                    const r = rowMap[k];
                    if (r.kind === "group-header" || (r.kind === "layer" && !r.groupId)) {
                      sectionIdx++;
                    }
                  }
                  // If dropping above the group, group should appear after the dropped layer
                  const adjustedPos = slotIndex <= groupRowIdx ? sectionIdx + 1 : sectionIdx;
                  emptyGroupInserts.current.set(sourceGroupId, Math.max(0, adjustedPos));
                }
              }
              groupActions.moveLayerToGroup(draggedLayer.id, undefined, targetLayerIdx);
            } else {
              const to = targetLayerIdx > from ? targetLayerIdx - 1 : targetLayerIdx;
              if (from !== to) {
                onReorderLayers(from, to, targetGroupId);
              }
            }
          } else {
            // Dragging a group
            const headerRow = rowMap.find(r => r.kind === "group-header" && r.groupId === drag.id);
            if (headerRow && headerRow.kind === "group-header") {
              if (headerRow.firstLayerIndex >= 0) {
                groupActions.reorderGroupBlock(headerRow.groupId, targetLayerIdx);
              } else {
                let sectionIdx = 0;
                for (let k = 0; k < slotIndex && k < rowMap.length; k++) {
                  const r = rowMap[k];
                  if (r.kind === "group-header" || (r.kind === "layer" && !r.groupId)) {
                    if (!(r.kind === "group-header" && r.groupId === drag.id)) {
                      sectionIdx++;
                    }
                  }
                }
                emptyGroupInserts.current.set(headerRow.groupId, sectionIdx);
                groupActions.update(headerRow.groupId, {});
              }
            }
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
  }, [onReorderLayers, groupActions, resetDrag, getDraggedRowRange]);

  const groupMap = new Map(groups.map((g) => [g.id, g]));

  // renderLayerRow with explicit dropPos (computed by caller to avoid doubles)
  const renderLayerRow = (layer: Layer, index: number, rowIdx: number, inGroup: boolean, dropPos: "above" | "below" | null) => (
    <LayerRow
      key={layer.id}
      layer={layer}
      index={index}
      activeStep={activeSteps[layer.id] ?? -1}
      isSelected={layer.id === selectedLayerId}
      canRemove={layers.length > 1}
      cycleBeats={cycleBeats}
      isDragging={draggingId === layer.id}
      dropPos={dropPos}
      inGroup={inGroup}
      rowIdx={rowIdx}
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
        e, layer.id, layer.name, layer.color,
      )}
      groupGapActive={inGroup && layer.groupId ? (groupMap.get(layer.groupId)?.cyclePattern.length ?? 1) > 1 : false}
    />
  );

  // Build VisualRow map and render sections
  const renderSections = () => {
    const rowMap: VisualRow[] = [];
    const renderedGroupIds = new Set<string>();

    // Collect section data for rendering
    type SectionData =
      | { type: "layer"; layer: Layer; layerIndex: number }
      | { type: "group"; group: LayerGroup; groupLayers: { layer: Layer; index: number }[] };
    const sections: SectionData[] = [];

    let i = 0;
    while (i < layers.length) {
      const layer = layers[i];
      if (layer.groupId && groupMap.has(layer.groupId)) {
        const group = groupMap.get(layer.groupId)!;
        renderedGroupIds.add(group.id);
        const groupLayers: { layer: Layer; index: number }[] = [];
        while (i < layers.length && layers[i].groupId === layer.groupId) {
          groupLayers.push({ layer: layers[i], index: i });
          i++;
        }
        sections.push({ type: "group", group, groupLayers });
      } else {
        sections.push({ type: "layer", layer: layers[i], layerIndex: i });
        i++;
      }
    }

    // Insert empty groups at stored positions
    const emptyGroups: { group: LayerGroup; insertAt: number }[] = [];
    for (const group of groups) {
      if (renderedGroupIds.has(group.id)) {
        emptyGroupInserts.current.delete(group.id);
        continue;
      }
      const pos = emptyGroupInserts.current.get(group.id);
      const insertAt = pos !== undefined ? Math.min(pos, sections.length) : sections.length;
      emptyGroups.push({ group, insertAt });
    }
    emptyGroups.sort((a, b) => b.insertAt - a.insertAt);
    for (const { group, insertAt } of emptyGroups) {
      sections.splice(insertAt, 0, { type: "group", group, groupLayers: [] });
    }

    // Build the VisualRow map — every visible row gets its own index
    for (const section of sections) {
      if (section.type === "layer") {
        rowMap.push({
          kind: "layer",
          layerId: section.layer.id,
          layerIndex: section.layerIndex,
          groupId: null,
        });
      } else {
        const { group, groupLayers } = section;
        rowMap.push({
          kind: "group-header",
          groupId: group.id,
          firstLayerIndex: groupLayers.length > 0 ? groupLayers[0].index : -1,
          layerCount: groupLayers.length,
        });
        if (!group.collapsed) {
          for (const { layer: gl, index: gi } of groupLayers) {
            rowMap.push({
              kind: "layer",
              layerId: gl.id,
              layerIndex: gi,
              groupId: group.id,
            });
          }
        }
      }
    }

    rowMapRef.current = rowMap;

    // Render: assign sequential row indices with single-indicator logic
    // Rule: each slot S is shown by exactly ONE element:
    //   - Slot 0: top-drop-zone
    //   - Slot N: bottom-drop-zone
    //   - Slot at group outer boundary: group container's drop-below
    //   - Slot between header and first layer in group: first layer's drop-above
    //   - All other slots: row S-1's drop-below
    let rowIdx = 0;
    const elements: React.JSX.Element[] = [];

    for (const section of sections) {
      if (section.type === "layer") {
        // Standalone layer: show drop-below for slot = rowIdx + 1
        // Guard: slot N (bottom) is handled exclusively by bottom-drop-zone
        const dp = indicatorSlot === rowIdx + 1 && indicatorSlot !== rowMap.length ? "below" as const : null;
        elements.push(renderLayerRow(section.layer, section.layerIndex, rowIdx, false, dp));
        rowIdx++;
      } else {
        const { group, groupLayers } = section;
        const headerRowIdx = rowIdx;
        rowIdx++;

        const groupLastRow = headerRowIdx + (group.collapsed ? 0 : groupLayers.length);

        const layerElements: React.JSX.Element[] = [];
        if (!group.collapsed) {
          for (let li = 0; li < groupLayers.length; li++) {
            const { layer: gl, index: gi } = groupLayers[li];
            const layerRowIdx = headerRowIdx + 1 + li;
            const isFirst = li === 0;
            const isLast = li === groupLayers.length - 1;

            let dp: "above" | "below" | null = null;
            // First layer: show drop-above for slot between header and first layer
            if (isFirst && indicatorSlot === layerRowIdx) {
              dp = "above";
            }
            // Show drop-below for internal slots
            if (indicatorSlot === layerRowIdx + 1) {
              if (!isLast) {
                dp = "below";
              } else {
                // Last layer: show drop-below only when indicator targets
                // inside this group (indicatorInGroupId). When null, the
                // group container handles it (meaning ungroup/outside).
                if (indicatorInGroupId === group.id) {
                  dp = "below";
                }
              }
            }

            layerElements.push(renderLayerRow(gl, gi, layerRowIdx, true, dp));
          }
          rowIdx += groupLayers.length;
        }

        // Group container shows drop-below at the outer boundary ONLY when
        // the indicator targets outside the group (indicatorInGroupId !== group.id).
        // When indicatorInGroupId === group.id, the last layer handles it instead.
        const showGroupDropBelow = indicatorSlot === groupLastRow + 1
          && indicatorSlot !== rowMap.length
          && indicatorInGroupId !== group.id;

        elements.push(
          <div
            key={`group-${group.id}`}
            className={`layer-group ${group.muted ? "group-muted" : ""} ${draggingId === group.id ? "dragging" : ""} ${showGroupDropBelow ? "drop-below" : ""} ${dragOverGroupId === group.id ? "drag-target" : ""}`}
            data-row-idx={headerRowIdx}
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
                e, group.id, `⌗ ${group.name}`, "rgba(60,60,65,0.95)",
              )}
            />
            {!group.collapsed && (
              <>
                {layerElements}
                <div className="group-add-layer">
                  <button className="add-layer-btn" onClick={() => groupActions.addLayer(group.id, "manual")}>+ Manual</button>
                  <button className="add-layer-btn add-random-btn" onClick={() => groupActions.addLayer(group.id, "random")}>+ Random</button>
                </div>
              </>
            )}
          </div>
        );
      }
    }

    return elements;
  };

  return (
    <div className="grid-editor">
      {draggingId && (
        <div className={`top-drop-zone ${indicatorSlot === 0 ? "active" : ""}`} />
      )}
      {renderSections()}
      {draggingId && (
        <div className={`bottom-drop-zone ${indicatorSlot === rowMapRef.current.length && !indicatorInGroupId ? "active" : ""}`} />
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
  rowIdx: number;
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
  groupGapActive?: boolean;
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
  rowIdx,
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
  groupGapActive,
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

  const [swingText, setSwingText] = useState(String(Math.round(layer.swing * 100)));
  const [swingEditing, setSwingEditing] = useState(false);
  const swingInputRef = useRef<HTMLInputElement>(null);
  const swingDragStartY = useRef(0);
  const swingDragStart = useRef(0);
  const swingWheelAcc = useRef(0);
  const isDraggingSwing = useRef(false);

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

  // ── Swing control handlers ──
  // Display: 0–100% (0=straight, 100=triplet feel)
  // Internal: 0.5–0.67 (swing ratio for odd-indexed steps)
  const swingToDisplay = (internal: number) => Math.round(((internal - 0.5) / 0.17) * 100);
  const displayToSwing = (display: number) => 0.5 + (display / 100) * 0.17;

  useEffect(() => {
    setSwingText(String(swingToDisplay(layer.swing)));
  }, [layer.swing]);

  const commitSwing = () => {
    const val = parseInt(swingText);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      onUpdateLayer({ swing: displayToSwing(val) });
    } else {
      setSwingText(String(swingToDisplay(layer.swing)));
    }
  };

  const handleSwingPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      if (swingEditing) return;

      e.preventDefault();
      e.stopPropagation();
      swingDragStartY.current = e.clientY;
      swingDragStart.current = swingToDisplay(layer.swing);
      isDraggingSwing.current = false;

      const onMove = (me: PointerEvent) => {
        const dy = swingDragStartY.current - me.clientY;
        const steps = Math.trunc(dy / 3);
        if (steps !== 0) isDraggingSwing.current = true;
        const base = Math.round(swingDragStart.current / 5) * 5;
        const raw = Math.min(100, Math.max(0, base + steps * 5));
        onUpdateLayer({ swing: displayToSwing(raw) });
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [layer.swing, swingEditing, onUpdateLayer],
  );

  const handleSwingDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSwingEditing(true);
    requestAnimationFrame(() => {
      swingInputRef.current?.focus();
      swingInputRef.current?.select();
    });
  }, []);

  const handleSwingWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      swingWheelAcc.current += e.deltaY;
      const threshold = 50;
      if (Math.abs(swingWheelAcc.current) >= threshold) {
        const steps = Math.trunc(swingWheelAcc.current / threshold);
        swingWheelAcc.current -= steps * threshold;
        const cur = swingToDisplay(layer.swing);
        const raw = Math.min(100, Math.max(0, cur - steps * 5));
        onUpdateLayer({ swing: displayToSwing(raw) });
      }
    },
    [layer.swing, onUpdateLayer],
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
      className={`layer-row ${isSelected ? "selected" : ""} ${layer.muted ? "muted" : ""} ${isRandom ? "random" : ""} ${isDragging ? "dragging" : ""} ${dropPos === "below" ? "drop-below" : ""} ${dropPos === "above" ? "drop-above" : ""}`}
      data-row-idx={rowIdx}
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
          {groupGapActive ? (
            <div className="gap-control group-controlled" title="Controlled by group gap">
              <div className="gap-dots">
                <span className="gap-dot play" />
              </div>
            </div>
          ) : (
            <GapControl
              cyclePattern={layer.cyclePattern}
              onChange={(cyclePattern) => onUpdateLayer({ cyclePattern })}
            />
          )}
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
          layer.hitsPerCycle > 0 ? (
            <div
              className="density-control hits-mode"
              onClick={(e) => e.stopPropagation()}
              title="Exact hits per cycle. Click 🎲 to switch to density mode"
            >
              <button
                className="mode-toggle"
                onClick={() => onUpdateLayer({ hitsPerCycle: 0 })}
                title="Switch to density (probability) mode"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5"/>
                  <circle cx="8" cy="8" r="2"/><circle cx="16" cy="8" r="2"/>
                  <circle cx="12" cy="12" r="2"/>
                  <circle cx="8" cy="16" r="2"/><circle cx="16" cy="16" r="2"/>
                </svg>
              </button>
              <span className="density-label">hits</span>
              <button
                className="hits-btn"
                onClick={() => onUpdateLayer({ hitsPerCycle: Math.max(1, layer.hitsPerCycle - 1) })}
                disabled={layer.hitsPerCycle <= 1}
              >−</button>
              <span className="hits-value">{layer.hitsPerCycle}</span>
              <button
                className="hits-btn"
                onClick={() => {
                  const maxHits = layer.pattern.filter(v => v === 1).length;
                  onUpdateLayer({ hitsPerCycle: Math.min(maxHits, layer.hitsPerCycle + 1) });
                }}
                disabled={layer.hitsPerCycle >= layer.pattern.filter(v => v === 1).length}
              >+</button>
              <span className="hits-of">/{layer.pattern.filter(v => v === 1).length}</span>
            </div>
          ) : (
            <div
              className={`density-control ${densityEditing ? "editing" : ""}`}
              onPointerDown={handleDensityPointerDown}
              onDoubleClick={handleDensityDoubleClick}
              onWheel={handleDensityWheel}
              title="Drag to adjust density, double-click to type. Click # to switch to exact hits mode"
            >
              <button
                className="mode-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  const maxHits = layer.pattern.filter(v => v === 1).length;
                  const estimated = Math.max(1, Math.round(layer.density * maxHits));
                  onUpdateLayer({ hitsPerCycle: estimated });
                }}
                title="Switch to exact hits mode"
              >#</button>
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
          )
        )}

        {activeMultiplier === 2 && (
          <div
            className={`swing-control ${swingEditing ? "editing" : ""}`}
            onPointerDown={handleSwingPointerDown}
            onDoubleClick={handleSwingDoubleClick}
            onWheel={handleSwingWheel}
            title="Swing amount (0=straight, 100=triplet feel). Drag or double-click to type"
          >
            <span className="swing-label">swing</span>
            <input
              ref={swingInputRef}
              className="swing-input"
              type="text"
              inputMode="numeric"
              readOnly={!swingEditing}
              value={swingText}
              onChange={(e) => setSwingText(e.target.value)}
              onBlur={() => { commitSwing(); setSwingEditing(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { commitSwing(); setSwingEditing(false); (e.target as HTMLInputElement).blur(); }
                else if (e.key === "Escape") { setSwingText(String(Math.round(layer.swing * 100))); setSwingEditing(false); (e.target as HTMLInputElement).blur(); }
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="swing-pct">%</span>
          </div>
        )}

        {isRandom && (
          <div
            className="repeat-control"
            onClick={(e) => e.stopPropagation()}
            title={layer.repeatCycles === 0
              ? "Pure random every cycle (click + to repeat)"
              : `Repeat same random for ${layer.repeatCycles} extra cycle${layer.repeatCycles > 1 ? "s" : ""}`}
          >
            <svg className="repeat-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 2l4 4-4 4" />
              <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
              <path d="M7 22l-4-4 4-4" />
              <path d="M21 13v1a4 4 0 0 1-4 4H3" />
            </svg>
            <button
              className="repeat-btn"
              onClick={() => onUpdateLayer({ repeatCycles: Math.max(0, layer.repeatCycles - 1) })}
              disabled={layer.repeatCycles <= 0}
            >−</button>
            <span className="repeat-value">{layer.repeatCycles}</span>
            <button
              className="repeat-btn"
              onClick={() => onUpdateLayer({ repeatCycles: Math.min(16, layer.repeatCycles + 1) })}
              disabled={layer.repeatCycles >= 16}
            >+</button>
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
        <GapControl
          cyclePattern={group.cyclePattern}
          onChange={(cyclePattern) => onUpdateGroup({ cyclePattern })}
        />
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
  cyclePattern,
  onChange,
}: {
  cyclePattern: (0 | 1)[];
  onChange: (cyclePattern: (0 | 1)[]) => void;
}) {
  const total = cyclePattern.length;
  const playCount = cyclePattern.filter((v) => v === 1).length;
  const hasGap = cyclePattern.some((v) => v === 0);

  const tooltip = !hasGap
    ? "Plays every cycle (click + to add rest cycles)"
    : `${playCount} play, ${total - playCount} rest across ${total} cycles`;

  // Toggle individual dot — but prevent removing the last play dot
  const handleDotClick = (i: number) => {
    const isPlay = cyclePattern[i] === 1;
    if (isPlay && playCount <= 1) return;
    const newPattern = [...cyclePattern] as (0 | 1)[];
    newPattern[i] = isPlay ? 0 : 1;
    onChange(newPattern);
  };

  // − removes last dot (but keep ≥ 1 total and ≥ 1 play)
  const handleMinus = () => {
    if (total <= 1) return;
    const newPattern = cyclePattern.slice(0, -1) as (0 | 1)[];
    if (newPattern.filter((v) => v === 1).length === 0) return;
    onChange(newPattern);
  };

  // + adds a rest dot at end
  const handlePlus = () => {
    if (total >= 16) return;
    onChange([...cyclePattern, 0] as (0 | 1)[]);
  };

  return (
    <div
      className={`gap-control ${hasGap ? "has-gap" : ""}`}
      onClick={(e) => e.stopPropagation()}
      title={tooltip}
    >
      <button
        className="gap-btn"
        onClick={handleMinus}
        disabled={total <= 1}
      >−</button>
      <div className="gap-dots">
        {cyclePattern.map((v, i) => (
          <span
            key={i}
            className={`gap-dot ${v === 1 ? "play" : "rest"} clickable ${total > 6 ? "small" : ""}`}
            onClick={() => handleDotClick(i)}
          />
        ))}
      </div>
      <button
        className="gap-btn"
        onClick={handlePlus}
        disabled={total >= 16}
      >+</button>
    </div>
  );
}

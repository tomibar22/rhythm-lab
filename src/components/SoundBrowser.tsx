import { useState, useRef, useEffect, useCallback } from "react";
import { SOUND_PRESETS, SoundPreset } from "../engine/types";
import { AudioEngine } from "../engine/AudioEngine";
import {
  getSamplesByPack,
  getSamplesByCategory,
  getSoundLabel,
  getSoundPackLabel,
  isSampleSound,
} from "../engine/sampleManifest";

type GroupMode = "pack" | "type";

interface SoundBrowserProps {
  value: SoundPreset;
  onChange: (sound: SoundPreset) => void;
  getEngine: () => AudioEngine;
}

export function SoundBrowser({ value, onChange, getEngine }: SoundBrowserProps) {
  const [open, setOpen] = useState(false);
  const [groupMode, setGroupMode] = useState<GroupMode>("pack");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const toggleSection = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSelect = useCallback(async (soundId: string) => {
    try {
      const engine = getEngine();
      await engine.previewSound(soundId);
    } catch { /* ignore preview errors */ }
    onChange(soundId as SoundPreset);
  }, [onChange, getEngine]);

  const handlePreview = useCallback(async (e: React.MouseEvent, soundId: string) => {
    e.stopPropagation();
    try {
      const engine = getEngine();
      await engine.previewSound(soundId);
    } catch { /* ignore */ }
  }, [getEngine]);

  // Build grouped data
  const samplesByPack = getSamplesByPack();
  const samplesByCategory = getSamplesByCategory();

  const displayLabel = isSampleSound(value)
    ? getSoundLabel(value)
    : (SOUND_PRESETS.find((s) => s.value === value)?.label ?? value);
  const packLabel = getSoundPackLabel(value);

  return (
    <div className="sound-browser-wrapper" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        className={`sound-browser-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
        title={`${packLabel} / ${displayLabel}`}
      >
        <span className="sound-browser-label">{displayLabel}</span>
        <span className="sound-browser-chevron">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div ref={panelRef} className="sound-browser-panel">
          <div className="sound-browser-tabs">
            <button
              className={`sound-browser-tab ${groupMode === "pack" ? "active" : ""}`}
              onClick={() => setGroupMode("pack")}
            >By Pack</button>
            <button
              className={`sound-browser-tab ${groupMode === "type" ? "active" : ""}`}
              onClick={() => setGroupMode("type")}
            >By Type</button>
          </div>

          <div className="sound-browser-list">
            {/* Metronome (synth presets) — always shown first */}
            <SoundSection
              title="Metronome"
              collapsed={collapsed.has("Metronome")}
              onToggle={() => toggleSection("Metronome")}
              count={SOUND_PRESETS.length}
            >
              {SOUND_PRESETS.map((s) => (
                <SoundChip
                  key={s.value}
                  label={s.label}
                  active={value === s.value}
                  onClick={() => handleSelect(s.value)}
                  onPreview={(e) => handlePreview(e, s.value)}
                />
              ))}
            </SoundSection>

            {groupMode === "pack" ? (
              // Group by pack
              [...samplesByPack.entries()].map(([pack, samples]) => (
                <SoundSection
                  key={pack}
                  title={pack}
                  collapsed={collapsed.has(pack)}
                  onToggle={() => toggleSection(pack)}
                  count={samples.length}
                >
                  {samples.map((s) => (
                    <SoundChip
                      key={s.id}
                      label={s.name}
                      active={value === s.id}
                      onClick={() => handleSelect(s.id)}
                      onPreview={(e) => handlePreview(e, s.id)}
                    />
                  ))}
                </SoundSection>
              ))
            ) : (
              // Group by type
              [...samplesByCategory.entries()].map(([cat, samples]) => (
                <SoundSection
                  key={cat}
                  title={cat}
                  collapsed={collapsed.has(cat)}
                  onToggle={() => toggleSection(cat)}
                  count={samples.length}
                >
                  {samples.map((s) => (
                    <SoundChip
                      key={s.id}
                      label={`${s.pack} ${s.name}`}
                      active={value === s.id}
                      onClick={() => handleSelect(s.id)}
                      onPreview={(e) => handlePreview(e, s.id)}
                    />
                  ))}
                </SoundSection>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SoundSection({
  title,
  collapsed,
  onToggle,
  count,
  children,
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="sound-section">
      <button className="sound-section-header" onClick={onToggle}>
        <span className="sound-section-chevron">{collapsed ? "▸" : "▾"}</span>
        <span className="sound-section-title">{title}</span>
        <span className="sound-section-count">{count}</span>
      </button>
      {!collapsed && <div className="sound-section-items">{children}</div>}
    </div>
  );
}

function SoundChip({
  label,
  active,
  onClick,
  onPreview,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  onPreview: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      className={`sound-chip ${active ? "active" : ""}`}
      onClick={onClick}
      onContextMenu={(e) => { e.preventDefault(); onPreview(e); }}
    >
      {label}
    </button>
  );
}

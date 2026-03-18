import { useState, useEffect, useCallback, useRef, ReactNode } from "react";

interface TransportBarProps {
  isPlaying: boolean;
  tempo: number;
  cycleBeats: number;
  pendingCycleChange: boolean;
  onTogglePlay: () => void;
  onTempoChange: (bpm: number) => void;
  onCycleBeatsChange: (beats: number) => void;
  children?: ReactNode;
}

export function TransportBar({
  isPlaying,
  tempo,
  cycleBeats,
  pendingCycleChange,
  onTogglePlay,
  onTempoChange,
  onCycleBeatsChange,
  children,
}: TransportBarProps) {
  const [tempoText, setTempoText] = useState(String(tempo));
  const [cycleText, setCycleText] = useState(String(cycleBeats));

  useEffect(() => setTempoText(String(tempo)), [tempo]);
  useEffect(() => setCycleText(String(cycleBeats)), [cycleBeats]);

  // ── Tap tempo ──
  const tapTimesRef = useRef<number[]>([]);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleTap = useCallback(() => {
    const now = performance.now();
    const taps = tapTimesRef.current;

    // Reset if last tap was >2s ago
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      taps.length = 0;
    }

    taps.push(now);

    // Keep last 6 taps for averaging
    if (taps.length > 6) taps.shift();

    // Need at least 2 taps to compute BPM
    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60000 / avgMs);
      const clamped = Math.min(500, Math.max(20, bpm));
      onTempoChange(clamped);
    }

    // Clear taps after 2s of no tapping
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => {
      tapTimesRef.current = [];
    }, 2000);
  }, [onTempoChange]);

  const commitTempo = () => {
    const v = parseInt(tempoText);
    if (!isNaN(v) && v >= 20 && v <= 500) {
      onTempoChange(v);
    } else {
      setTempoText(String(tempo));
    }
  };

  const wheelAccRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragTempoRef = useRef(tempo);
  const isDraggingTempoRef = useRef(false);
  const tempoInputRef = useRef<HTMLInputElement>(null);

  const handleTempoWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      wheelAccRef.current += e.deltaY;
      const threshold = 50;
      if (Math.abs(wheelAccRef.current) >= threshold) {
        const steps = Math.trunc(wheelAccRef.current / threshold);
        wheelAccRef.current -= steps * threshold;
        const delta = e.shiftKey ? 5 : 1;
        onTempoChange(Math.min(500, Math.max(20, tempo + steps * delta)));
      }
    },
    [tempo, onTempoChange],
  );

  const [tempoEditing, setTempoEditing] = useState(false);

  const handleTempoPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Don't hijack button clicks
      if ((e.target as HTMLElement).closest("button")) return;
      // If input is in edit mode, let normal text interaction happen
      if (tempoEditing) return;

      e.preventDefault();
      dragStartYRef.current = e.clientY;
      dragTempoRef.current = tempo;
      isDraggingTempoRef.current = false;

      const onMove = (me: PointerEvent) => {
        const dy = dragStartYRef.current - me.clientY;
        const steps = Math.trunc(dy / 4);
        if (steps !== 0) isDraggingTempoRef.current = true;
        // Snap to multiples of 5
        const base = Math.round(dragTempoRef.current / 5) * 5;
        const raw = base + steps * 5;
        const newTempo = Math.min(500, Math.max(20, raw));
        onTempoChange(newTempo);
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [tempo, tempoEditing, onTempoChange],
  );

  const handleTempoDoubleClick = useCallback(() => {
    setTempoEditing(true);
    // Focus after React re-renders with editing=true
    requestAnimationFrame(() => {
      tempoInputRef.current?.focus();
      tempoInputRef.current?.select();
    });
  }, []);

  const commitCycle = () => {
    const v = parseInt(cycleText);
    if (!isNaN(v) && v >= 1 && v <= 32) {
      onCycleBeatsChange(v);
    } else {
      setCycleText(String(cycleBeats));
    }
  };

  return (
    <div className="transport-bar">
      <button
        className={`play-btn ${isPlaying ? "playing" : ""}`}
        onClick={onTogglePlay}
        aria-label={isPlaying ? "Stop" : "Play"}
      >
        {isPlaying ? "■" : "▶"}
      </button>

      <div
        className={`tempo-control ${tempoEditing ? "editing" : ""}`}
        onWheel={handleTempoWheel}
        onPointerDown={handleTempoPointerDown}
        onDoubleClick={handleTempoDoubleClick}
      >
        <button
          className="tempo-nudge"
          onClick={() => onTempoChange(Math.max(20, tempo - 1))}
          aria-label="Decrease tempo"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          ref={tempoInputRef}
          className="tempo-input"
          readOnly={!tempoEditing}
          value={tempoText}
          onChange={(e) => setTempoText(e.target.value)}
          onBlur={() => {
            commitTempo();
            setTempoEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitTempo();
              setTempoEditing(false);
              (e.target as HTMLInputElement).blur();
            } else if (e.key === "Escape") {
              setTempoText(String(tempo));
              setTempoEditing(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <button
          className="tempo-nudge"
          onClick={() => onTempoChange(Math.min(300, tempo + 1))}
          aria-label="Increase tempo"
        >
          +
        </button>
        <span className="tempo-label">bpm</span>
      </div>

      <button className="tap-btn" onClick={handleTap} aria-label="Tap tempo">
        tap
      </button>

      <div className="cycle-control">
        <label className="cycle-label">Cycle</label>
        <button
          className="cycle-btn"
          onClick={() => onCycleBeatsChange(Math.max(1, cycleBeats - 1))}
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          className="cycle-input"
          value={cycleText}
          onChange={(e) => setCycleText(e.target.value)}
          onBlur={commitCycle}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitCycle();
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        <button
          className="cycle-btn"
          onClick={() => onCycleBeatsChange(Math.min(32, cycleBeats + 1))}
        >
          +
        </button>
        <span className="cycle-unit">beats</span>
        {pendingCycleChange && (
          <span className="cycle-pending" title="Waiting for cycle boundary...">
            <span className="cycle-pending-dot" />
          </span>
        )}
      </div>

      <div className="transport-title">
        <span className="title-text">Rhythm Lab</span>
        {children}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef, ReactNode } from "react";

interface TransportBarProps {
  isPlaying: boolean;
  tempo: number;
  cycleBeats: number;
  pendingCycleChange: boolean;
  countdown: 0 | 0.5 | 1 | 2;
  onTogglePlay: () => void;
  onTempoChange: (bpm: number) => void;
  onCycleBeatsChange: (beats: number) => void;
  onCountdownChange: (value: 0 | 0.5 | 1 | 2) => void;
  children?: ReactNode;
}

export function TransportBar({
  isPlaying,
  tempo,
  cycleBeats,
  pendingCycleChange,
  countdown,
  onTogglePlay,
  onTempoChange,
  onCycleBeatsChange,
  onCountdownChange,
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
        {isPlaying ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
            <rect x="1" y="1" width="16" height="16" rx="3" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ marginLeft: 2 }}>
            <path d="M4 2.5a1 1 0 0 1 1.5-.87l12 7a1 1 0 0 1 0 1.74l-12 7A1 1 0 0 1 4 16.5v-14z" />
          </svg>
        )}
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

      <div className="countdown-control" title="Count-in before playback (ping clicks)">
        <span className="countdown-label">Count</span>
        <button
          className={`countdown-option ${countdown === 0 ? "active" : ""}`}
          onClick={() => onCountdownChange(0)}
        >off</button>
        {cycleBeats % 2 === 0 && (
          <button
            className={`countdown-option ${countdown === 0.5 ? "active" : ""}`}
            onClick={() => onCountdownChange(0.5)}
          >½</button>
        )}
        <button
          className={`countdown-option ${countdown === 1 ? "active" : ""}`}
          onClick={() => onCountdownChange(1)}
        >1</button>
        <button
          className={`countdown-option ${countdown === 2 ? "active" : ""}`}
          onClick={() => onCountdownChange(2)}
        >2</button>
      </div>

      <div className="transport-title">
        <span className="title-text">Rhythm Lab</span>
        {children}
      </div>
    </div>
  );
}

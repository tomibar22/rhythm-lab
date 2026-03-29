/**
 * @file CountdownOverlay.tsx
 * Full-screen overlay showing the current count-in beat.
 * Displays a large number that pulses on each beat, fading out
 * when the countdown ends and real playback begins.
 */

import { useEffect, useState } from "react";

interface CountdownOverlayProps {
  /** Current beat info, or null when not counting in. */
  countdownBeat: {
    beat: number;
    totalBeats: number;
    isBarStart: boolean;
  } | null;
  cycleBeats: number;
}

export function CountdownOverlay({ countdownBeat, cycleBeats }: CountdownOverlayProps) {
  // Track a "pulse" key that changes on every beat to retrigger CSS animation
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    if (countdownBeat) {
      setPulseKey((k) => k + 1);
    }
  }, [countdownBeat?.beat]);

  if (!countdownBeat) return null;

  // Show beat-within-cycle (1, 2, 3, 4, 1, 2, 3, 4 — not 1–8)
  const beatInCycle = ((countdownBeat.beat - 1) % cycleBeats) + 1;

  return (
    <div className="countdown-overlay">
      <div
        key={pulseKey}
        className={`countdown-number ${countdownBeat.isBarStart ? "accent" : ""}`}
      >
        {beatInCycle}
      </div>
    </div>
  );
}

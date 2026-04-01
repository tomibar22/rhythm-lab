import { useRef, useEffect, useCallback } from "react";
import { Layer } from "../engine/types";
import { AudioEngine } from "../engine/AudioEngine";
import { getIOIs } from "../engine/RhythmEngine";

interface CircleViewProps {
  layers: Layer[];
  activeSteps: Record<string, number>;
  isPlaying: boolean;
  cycleBeats: number;
  getEngine: () => AudioEngine;
}

/**
 * Circular necklace visualization of rhythmic patterns.
 * Each layer is rendered as a concentric ring with dots at step positions.
 * Filled dots = onsets. A rotating needle shows playback position.
 *
 * Polymetric layers get a traveling dot on their ring that rotates at
 * their own speed, independent of the global needle.
 */
export function CircleView({
  layers,
  activeSteps,
  isPlaying,
  cycleBeats,
  getEngine,
}: CircleViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxRadius = Math.min(cx, cy) - 20;

    // Clear
    ctx.clearRect(0, 0, w, h);

    const visibleLayers = layers.filter((l) => !l.muted);
    if (visibleLayers.length === 0) return;

    // Ring spacing
    const ringWidth = maxRadius / (visibleLayers.length + 1);
    const minRadius = ringWidth * 1.2;

    const engine = getEngine();

    // Draw each layer as a concentric ring
    visibleLayers.forEach((layer, layerIndex) => {
      const radius = minRadius + layerIndex * ringWidth;
      const dotRadius = Math.max(4, Math.min(8, ringWidth * 0.2));
      const isPolymetric = !!layer.polymetric;

      // Draw ring outline — slightly brighter for polymetric layers
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isPolymetric
        ? "rgba(255,255,255,0.14)"
        : "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw steps
      const isRandom = layer.type === "random";
      for (let i = 0; i < layer.steps; i++) {
        // Apply swing to angular position of odd steps (mirrors audio engine)
        let timeFrac = i / layer.steps;
        if (layer.swing !== 0.5 && i % 2 === 1) {
          const pairStart = Math.floor(i / 2) * 2 / layer.steps;
          timeFrac = pairStart + layer.swing * 2 / layer.steps;
        }
        const angle = timeFrac * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;

        const isOn = layer.pattern[i] === 1;
        const isLocked = layer.pattern[i] === 2;
        const isActive = activeSteps[layer.id] === i;

        ctx.beginPath();
        ctx.arc(x, y, isActive ? dotRadius * 1.5 : dotRadius, 0, Math.PI * 2);

        if (isRandom) {
          if (isLocked) {
            // Locked steps: full opacity, solid — always fires
            ctx.fillStyle = isActive ? "#fff" : layer.color;
            ctx.fill();
            if (isActive) {
              ctx.shadowColor = layer.color;
              ctx.shadowBlur = 12;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
            ctx.strokeStyle = layer.color;
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (isOn) {
            // Allowed steps: density-based opacity, flash on active
            const alpha = isActive ? 1.0 : layer.density * 0.5 + 0.15;
            ctx.fillStyle = isActive ? "#fff" : layer.color;
            ctx.globalAlpha = alpha;
            ctx.fill();
            if (isActive) {
              ctx.shadowColor = layer.color;
              ctx.shadowBlur = 12;
              ctx.fill();
              ctx.shadowBlur = 0;
            }
            ctx.globalAlpha = 1;
            ctx.strokeStyle = layer.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = alpha;
            ctx.stroke();
            ctx.globalAlpha = 1;
          } else {
            // Forbidden steps: dim, no layer color
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.15)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        } else if (isOn) {
          ctx.fillStyle = isActive ? "#fff" : layer.color;
          ctx.fill();
          if (isActive) {
            ctx.shadowColor = layer.color;
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
          ctx.strokeStyle = layer.color;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = "rgba(255,255,255,0.1)";
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.15)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Helper: compute swung angle for a step index (fractional OK for midpoints)
      const stepAngle = (step: number): number => {
        let frac = step / layer.steps;
        // Apply swing to odd steps; for fractional midpoints use linear interpolation
        if (layer.swing !== 0.5) {
          const floorStep = Math.floor(step);
          const ceilStep = Math.ceil(step);
          const t = step - floorStep;
          const fracFloor = (() => {
            let f = floorStep / layer.steps;
            if (floorStep % 2 === 1) {
              const ps = Math.floor(floorStep / 2) * 2 / layer.steps;
              f = ps + layer.swing * 2 / layer.steps;
            }
            return f;
          })();
          const fracCeil = (() => {
            const cs = ceilStep % layer.steps;
            let f = cs / layer.steps;
            if (cs % 2 === 1) {
              const ps = Math.floor(cs / 2) * 2 / layer.steps;
              f = ps + layer.swing * 2 / layer.steps;
            }
            if (ceilStep >= layer.steps) f += 1; // wrapped
            return f;
          })();
          frac = fracFloor + t * (fracCeil - fracFloor);
        }
        return frac * Math.PI * 2 - Math.PI / 2;
      };

      // Draw IOI annotations (skip for random layers)
      if (!isRandom && visibleLayers.length <= 4) {
        const iois = getIOIs(layer.pattern as (0 | 1)[]);
        const onsetIndices = layer.pattern
          .map((v, i) => (v === 1 ? i : -1))
          .filter((i) => i >= 0);

        ctx.font = `${Math.max(9, dotRadius * 1.5)}px JetBrains Mono, monospace`;
        ctx.fillStyle = layer.color + "99";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        iois.forEach((ioi, idx) => {
          const startStep = onsetIndices[idx];
          const endStep =
            onsetIndices[(idx + 1) % onsetIndices.length];
          const midStep =
            endStep > startStep
              ? (startStep + endStep) / 2
              : (startStep + (endStep + layer.steps)) / 2;
          const midAngle = stepAngle(midStep);
          const labelRadius = radius + dotRadius * 2.5;
          const lx = cx + Math.cos(midAngle) * labelRadius;
          const ly = cy + Math.sin(midAngle) * labelRadius;

          ctx.fillText(String(ioi), lx, ly);
        });
      }

      // Polymetric traveling dot — shows this layer's own playback position
      if (isPlaying && isPolymetric) {
        // cycleTicks = steps × (PPQ / subdivision)
        const APP_PPQ = 960;
        const layerCycleTicks = Math.round(layer.steps * APP_PPQ / (layer.subdivision ?? 1));
        const layerProgress = engine.getProgressByTicks(layerCycleTicks);
        const dotAngle = layerProgress * Math.PI * 2 - Math.PI / 2;
        const dx = cx + Math.cos(dotAngle) * radius;
        const dy = cy + Math.sin(dotAngle) * radius;
        const travDotSize = dotRadius * 1.8;

        // Glow
        ctx.beginPath();
        ctx.arc(dx, dy, travDotSize, 0, Math.PI * 2);
        ctx.shadowColor = layer.color;
        ctx.shadowBlur = 16;
        ctx.fillStyle = layer.color;
        ctx.globalAlpha = 0.6;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Core dot
        ctx.beginPath();
        ctx.arc(dx, dy, travDotSize * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
      }
    });

    // Draw global playback needle
    if (isPlaying) {
      const progress = engine.getProgress(engine.effectiveCycleBeats);
      const needleAngle = progress * Math.PI * 2 - Math.PI / 2;
      const needleLength = maxRadius + 5;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(needleAngle) * needleLength,
        cy + Math.sin(needleAngle) * needleLength,
      );
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fill();
    }
  }, [layers, activeSteps, isPlaying, cycleBeats, getEngine]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      draw();
      animFrameRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      animate();
    } else {
      draw();
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [draw, isPlaying]);

  return (
    <div className="circle-view">
      <canvas ref={canvasRef} className="circle-canvas" />
    </div>
  );
}

import { useEffect } from "react";
import { useRhythmLab } from "./hooks/useRhythmLab";
import { TransportBar } from "./components/TransportBar";
import { GridEditor } from "./components/GridEditor";
import { CircleView } from "./components/CircleView";
import { PatternBrowser } from "./components/PatternBrowser";
import { TemplateBrowser } from "./components/TemplateBrowser";
import { CountdownOverlay } from "./components/CountdownOverlay";

export default function App() {
  const lab = useRhythmLab();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        lab.togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lab.togglePlay]);

  const selectedLayer = lab.layers.find((l) => l.id === lab.selectedLayerId);

  return (
    <div className="app">
      <CountdownOverlay countdownBeat={lab.countdownBeat} cycleBeats={lab.cycleBeats} />
      <TransportBar
        isPlaying={lab.isPlaying}
        tempo={lab.tempo}
        cycleBeats={lab.cycleBeats}
        pendingCycleChange={lab.pendingCycleChange}
        countdown={lab.countdown}
        onTogglePlay={lab.togglePlay}
        onTempoChange={lab.setTempo}
        onCycleBeatsChange={lab.setCycleBeats}
        onCountdownChange={lab.setCountdown}
      >
        <TemplateBrowser
          layers={lab.layers}
          groups={lab.groups}
          tempo={lab.tempo}
          cycleBeats={lab.cycleBeats}
          onLoadTemplate={lab.loadTemplate}
        />
      </TransportBar>

      <div className="main-content">
        <div className="editor-pane">
          <GridEditor
            layers={lab.layers}
            groups={lab.groups}
            groupActions={lab.groupActions}
            activeSteps={lab.activeSteps}
            selectedLayerId={lab.selectedLayerId}
            cycleBeats={lab.cycleBeats}
            onSetStep={lab.setStep}
            onSelectLayer={lab.setSelectedLayerId}
            onUpdateLayer={lab.updateLayer}
            onToggleMute={lab.toggleMute}
            onToggleSolo={lab.toggleSolo}
            onDuplicateLayer={lab.duplicateLayer}
            onRemoveLayer={lab.removeLayer}
            onAddLayer={lab.addLayer}
            onClearPattern={lab.clearPattern}
            onReorderLayers={lab.reorderLayers}
          />
        </div>

        <div className="circle-pane">
          <CircleView
            layers={lab.layers}
            activeSteps={lab.activeSteps}
            isPlaying={lab.isPlaying}
            cycleBeats={lab.cycleBeats}
            getEngine={lab.getEngine}
          />
        </div>
      </div>

      {selectedLayer && (
        <PatternBrowser
          selectedLayerId={lab.selectedLayerId}
          selectedLayer={selectedLayer}
          onApplyPattern={lab.setLayerPattern}
          onUpdateLayer={lab.updateLayer}
        />
      )}
    </div>
  );
}

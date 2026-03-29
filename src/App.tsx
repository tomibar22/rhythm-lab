import { useEffect } from "react";
import { useRhythmLab } from "./hooks/useRhythmLab";
import { TransportBar } from "./components/TransportBar";
import { GridEditor } from "./components/GridEditor";
import { CircleView } from "./components/CircleView";
import { PatternBrowser } from "./components/PatternBrowser";
import { TemplateBrowser } from "./components/TemplateBrowser";
import { CountdownOverlay } from "./components/CountdownOverlay";
import { ExerciseBrowser } from "./components/ExerciseBrowser";

export default function App() {
  const lab = useRhythmLab();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        lab.togglePlay();
      }
    };
    // Blur buttons and selects after mouse interaction to prevent
    // sticky focus rings. Selects need special handling: we can't blur
    // on the first mousedown/up or the dropdown won't open. Instead we
    // track whether a select was already focused before the click.
    let selectWasFocused: HTMLSelectElement | null = null;
    const handleMouseDown = (e: MouseEvent) => {
      // If a select already has focus when we click, mark it for blur
      if (e.target instanceof HTMLSelectElement && document.activeElement === e.target) {
        selectWasFocused = e.target;
      } else {
        selectWasFocused = null;
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el instanceof HTMLButtonElement) {
        el.blur();
      }
      // Blur a select that was already focused (dropdown was open → now closed)
      if (selectWasFocused) {
        selectWasFocused.blur();
        selectWasFocused = null;
      }
      // Blur any focused select when clicking elsewhere
      const active = document.activeElement;
      if (active instanceof HTMLSelectElement && active !== el) {
        active.blur();
      }
    };
    const handleSelectChange = (e: Event) => {
      if (e.target instanceof HTMLSelectElement) {
        e.target.blur();
        selectWasFocused = null;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("change", handleSelectChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("change", handleSelectChange);
    };
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
          countdown={lab.countdown}
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

      <ExerciseBrowser onLoadTemplate={lab.loadTemplate} />

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

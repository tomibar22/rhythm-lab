/**
 * @file ExerciseBrowser.tsx
 * Collapsible panel for browsing and launching practice exercises.
 */

import { useState } from "react";
import { EXERCISES, Exercise } from "../engine/exercises";
import { SavedTemplate } from "../engine/storage";

interface ExerciseBrowserProps {
  onLoadTemplate: (template: SavedTemplate) => void;
}

export function ExerciseBrowser({ onLoadTemplate }: ExerciseBrowserProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);

  const handleStart = (exercise: Exercise) => {
    onLoadTemplate(exercise.template);
    setActiveExercise(exercise);
  };

  const handleClose = () => {
    setActiveExercise(null);
  };

  return (
    <>
      {/* Active exercise instructions overlay */}
      {activeExercise && (
        <div className="exercise-instructions">
          <div className="exercise-instructions-header">
            <div className="exercise-instructions-title">{activeExercise.name}</div>
            <button className="exercise-close" onClick={handleClose} title="Close">
              &times;
            </button>
          </div>
          <div className="exercise-goal">{activeExercise.goal}</div>
          <ol className="exercise-steps">
            {activeExercise.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          {activeExercise.tip && (
            <div className="exercise-tip">
              <span className="exercise-tip-label">Tip</span> {activeExercise.tip}
            </div>
          )}
        </div>
      )}

      {/* Exercise list panel */}
      <div className="exercise-browser">
        <button
          className="browser-toggle"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>Exercises ({EXERCISES.length})</span>
          <span className="toggle-arrow">{isOpen ? "▼" : "▲"}</span>
        </button>

        {isOpen && (
          <div className="exercise-list">
            {EXERCISES.map((ex) => (
              <button
                key={ex.id}
                className={`exercise-card ${activeExercise?.id === ex.id ? "active" : ""}`}
                onClick={() => handleStart(ex)}
              >
                <div className="exercise-card-name">{ex.name}</div>
                <div className="exercise-card-subtitle">{ex.subtitle}</div>
                <div className="exercise-card-tags">
                  {ex.tags.map((tag) => (
                    <span key={tag} className="exercise-tag">{tag}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

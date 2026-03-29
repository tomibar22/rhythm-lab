/**
 * @file exercises.ts
 * Exercise Cookbook — curated rhythmic practice workflows.
 *
 * Each exercise has a starting template + step-by-step instructions.
 * The template is loaded into the app; the user follows the instructions.
 *
 * To add a new exercise:
 * 1. Experiment in the app until you find a good workflow
 * 2. Describe the exercise, steps, and starting template
 * 3. Add it to the EXERCISES array below
 * 4. Always include `countdown: 1` in the template (1-cycle count-in)
 */

import { SavedTemplate } from "./storage";

export interface Exercise {
  id: string;
  name: string;
  /** One-line summary shown in the list. */
  subtitle: string;
  /** What this exercise trains — shown at the top of the detail view. */
  goal: string;
  /** Step-by-step instructions. Markdown-like: each string is one step. */
  steps: string[];
  /** Optional tip shown at the bottom. */
  tip?: string;
  /** Tags for filtering/grouping. */
  tags: string[];
  /** The template loaded when the user starts this exercise. */
  template: SavedTemplate;
}

export const EXERCISES: Exercise[] = [
  {
    id: "ex:find-the-space",
    name: "Find the Space",
    subtitle: "Hear where the silence falls in a nearly-full bar",
    goal: "Train your ear to instantly recognize which beat is missing from a rhythmic phrase.",
    steps: [
      "Press Play. You'll hear a kick on beat 1 and a random layer playing 7 out of 8 eighth notes — one spot is always empty.",
      "The random pattern repeats once (plays the same pattern twice in a row), so you get two chances to hear it.",
      "Try to clap or tap the missing beat on the second pass.",
      "After you're comfortable, reduce Hits per Cycle to 6, then 5 — more spaces, harder to track.",
      "For an extra challenge, increase the subdivision to ×3 (12 steps) with 11 hits.",
    ],
    tip: "Start slow (80–90 bpm). Speed is not the goal — accuracy of perception is.",
    tags: ["rhythm", "ear-training", "space"],
    template: {
      id: "ex:find-the-space",
      name: "Find the Space",
      tempo: 95,
      cycleBeats: 4,
      countdown: 1,
      layers: [
        { name: "Pulse", type: "manual", steps: 4, pattern: [1, 0, 0, 0], sound: "kick", volume: 0.85, density: 0.5, swing: 0.5 },
        { name: "Phrase", type: "random", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "tap", volume: 0.65, density: 0.5, swing: 0.5, hitsPerCycle: 7, repeatCycles: 1 },
      ],
      savedAt: 0,
    },
  },
  {
    id: "ex:one-note-grows",
    name: "One Note Grows",
    subtitle: "Build density one hit at a time",
    goal: "Experience how adding a single note transforms the rhythmic feel — from sparse to dense.",
    steps: [
      "Press Play. You'll hear a kick on beat 1 and a random layer with just 1 hit per cycle across 8 eighth-note slots.",
      "Listen to where that single hit lands. Feel the space around it.",
      "After a few cycles, increase Hits per Cycle to 2. Notice how the feel shifts.",
      "Keep adding one hit at a time: 3, 4, 5, 6, 7.",
      "At each stage, try to internalize the density — can you sing or clap the rhythm back?",
      "Try the reverse: start at 7 and remove one hit at a time.",
    ],
    tip: "The sweet spot is usually around 3–5 hits — complex enough to be interesting, sparse enough to hear structure.",
    tags: ["rhythm", "density", "feel"],
    template: {
      id: "ex:one-note-grows",
      name: "One Note Grows",
      tempo: 100,
      cycleBeats: 4,
      countdown: 1,
      layers: [
        { name: "Pulse", type: "manual", steps: 4, pattern: [1, 0, 0, 0], sound: "kick", volume: 0.85, density: 0.5, swing: 0.5 },
        { name: "Phrase", type: "random", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "pip", volume: 0.6, density: 0.5, swing: 0.5, hitsPerCycle: 1, repeatCycles: 1 },
      ],
      savedAt: 0,
    },
  },
];

/**
 * @file defaultTemplates.ts
 * Built-in templates that ship with the app. These are always available
 * and cannot be deleted by users. To update: save templates locally,
 * then run `exportTemplatesForBundling()` from the browser console,
 * copy the output, and paste it into the BUILT_IN_TEMPLATES array below.
 */

import { SavedTemplate } from "./storage";

/**
 * Built-in templates — curated by the teacher, bundled with the app.
 * These are always available regardless of localStorage state.
 * IDs are prefixed with "builtin:" so they can be distinguished from user-saved templates.
 */
export const BUILT_IN_TEMPLATES: SavedTemplate[] = [
  {
    id: "builtin:basic-beat",
    name: "Basic Beat",
    tempo: 105,
    cycleBeats: 4,
    layers: [
      { name: "Kick", type: "manual", steps: 4, pattern: [1, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, swing: 0.5 },
      { name: "Random", type: "random", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "pip", volume: 0.55, density: 0.3, swing: 0.5 },
    ],
    savedAt: 0,
  },
  {
    id: "builtin:medium-swing",
    name: "Medium Swing",
    tempo: 120,
    cycleBeats: 8,
    layers: [
      { name: "Kick", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "JAZZ-MULTI/KICK", volume: 1, density: 0.5, swing: 0.5, cyclePattern: [1, 0], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "Random 7", type: "random", steps: 16, pattern: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], sound: "JAZZ-MULTI/KICK", volume: 0.4, density: 0.1, swing: 0.6445000000000001, cyclePattern: [1], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "2&4", type: "manual", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "JAZZ-MULTI/HH CLOSE", volume: 0.2, density: 0.5, swing: 0.5, cyclePattern: [1], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "beats", type: "manual", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "JAZZ-MULTI/RIDE", volume: 0.35, density: 0.5, swing: 0.5085, cyclePattern: [1], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "swing", type: "random", steps: 16, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "JAZZ-MULTI/RIDE", volume: 0.4, density: 0.3, swing: 0.6615, cyclePattern: [1], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "Random 5", type: "random", steps: 16, pattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], sound: "JAZZ-MULTI/XSTICK", volume: 0.5, density: 0.15, swing: 0.67, cyclePattern: [1], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "Random 6", type: "random", steps: 16, pattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], sound: "JAZZ-MULTI/RACK TOM", volume: 0.5, density: 0.05, swing: 0.653, cyclePattern: [1], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
    ],
    groups: [{ id: "02dc14b8-45d2-4450-8788-b2d03d2bc65b", name: "Swing Playback", volume: 1 }],
    savedAt: 0,
  },
  {
    id: "builtin:up-tempo-swing",
    name: "Up-Tempo Swing",
    tempo: 260,
    cycleBeats: 8,
    layers: [
      { name: "Kick", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "JAZZ-MULTI/KICK", volume: 1, density: 0.5, swing: 0.5, cyclePattern: [1, 0], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "Random KICK", type: "random", steps: 8, pattern: [0, 1, 1, 1, 1, 1, 1, 1], sound: "JAZZ-MULTI/KICK", volume: 0.3, density: 0.1, swing: 0.5, cyclePattern: [1], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "2&4", type: "manual", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "JAZZ-MULTI/HH CLOSE", volume: 0.15, density: 0.5, swing: 0.5, cyclePattern: [1], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "RIDE", type: "manual", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "JAZZ-MULTI/RIDE", volume: 0.2, density: 0.5, swing: 0.5085, cyclePattern: [1], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "RIDE off", type: "random", steps: 16, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "JAZZ-MULTI/RIDE", volume: 0.25, density: 0.15, swing: 0.5935, cyclePattern: [1], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "rim", type: "random", steps: 16, pattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], sound: "JAZZ-MULTI/XSTICK", volume: 0.35, density: 0.05, swing: 0.5085, cyclePattern: [1], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "tom", type: "random", steps: 16, pattern: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], sound: "JAZZ-MULTI/RACK TOM", volume: 0.35, density: 0.05, swing: 0.517, cyclePattern: [1], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
    ],
    groups: [{ id: "02dc14b8-45d2-4450-8788-b2d03d2bc65b", name: "Swing Playback", volume: 1 }],
    savedAt: 0,
  },
  {
    id: "builtin:swing-6-2",
    name: "Swing 6-2",
    tempo: 140,
    cycleBeats: 8,
    layers: [
      { name: "Kick", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, playCount: 4, gap: 0, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "Ping", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "ping", volume: 0.15, density: 0.5, playCount: 3, gap: 1, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "2&4", type: "manual", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "dust", volume: 0.3, density: 0.5, playCount: 3, gap: 1, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "beats", type: "manual", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "haze", volume: 0.2, density: 0.5, playCount: 3, gap: 1, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "swing", type: "random", steps: 16, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "mist", volume: 0.1, density: 0.25, playCount: 3, gap: 1, swing: 0.636, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
    ],
    groups: [{ id: "02dc14b8-45d2-4450-8788-b2d03d2bc65b", name: "Swing Playback", volume: 1 }],
    savedAt: 0,
  },
  {
    id: "builtin:swing-4-4",
    name: "Swing 4-4",
    tempo: 140,
    cycleBeats: 8,
    layers: [
      { name: "Kick", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, playCount: 3, gap: 1, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "Ping", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "ping", volume: 0.15, density: 0.5, playCount: 2, gap: 2, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "2&4", type: "manual", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "dust", volume: 0.3, density: 0.5, playCount: 2, gap: 2, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "beats", type: "manual", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "haze", volume: 0.2, density: 0.5, playCount: 2, gap: 2, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "swing", type: "random", steps: 16, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "mist", volume: 0.1, density: 0.25, playCount: 2, gap: 2, swing: 0.636, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
    ],
    groups: [{ id: "02dc14b8-45d2-4450-8788-b2d03d2bc65b", name: "Swing Playback", volume: 1 }],
    savedAt: 0,
  },
  {
    id: "builtin:swing-8-8",
    name: "Swing 8-8",
    tempo: 140,
    cycleBeats: 8,
    layers: [
      { name: "Kick", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, playCount: 5, gap: 3, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "Ping", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "ping", volume: 0.15, density: 0.5, playCount: 5, gap: 3, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "2&4", type: "manual", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "dust", volume: 0.3, density: 0.5, playCount: 4, gap: 4, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "beats", type: "manual", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "haze", volume: 0.2, density: 0.5, playCount: 4, gap: 4, swing: 0.5, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "swing", type: "random", steps: 16, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "mist", volume: 0.1, density: 0.25, playCount: 4, gap: 4, swing: 0.636, groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
    ],
    groups: [{ id: "02dc14b8-45d2-4450-8788-b2d03d2bc65b", name: "Swing Playback", volume: 1 }],
    savedAt: 0,
  },
  {
    id: "builtin:blues-gap-8-4",
    name: "Blues Gap 8-4",
    tempo: 140,
    cycleBeats: 8,
    layers: [
      { name: "Kick", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, swing: 0.5, cyclePattern: [1, 1, 1, 1, 1, 0], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "Ping", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "ping", volume: 0.4, density: 0.5, swing: 0.5, cyclePattern: [1, 1, 1, 1, 0, 0], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "2&4", type: "manual", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "dust", volume: 0.4, density: 0.5, swing: 0.5, cyclePattern: [1, 1, 1, 1, 0, 0], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "beats", type: "manual", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "haze", volume: 0.2, density: 0.5, swing: 0.5, cyclePattern: [1, 1, 1, 1, 0, 0], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "swing", type: "random", steps: 16, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "mist", volume: 0.2, density: 0.25, swing: 0.6275, cyclePattern: [1, 1, 1, 1, 0, 0], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
    ],
    groups: [{ id: "02dc14b8-45d2-4450-8788-b2d03d2bc65b", name: "Swing Playback", volume: 1 }],
    savedAt: 0,
  },
  {
    id: "builtin:blues-gap-4-8",
    name: "Blues Gap 4-8",
    tempo: 140,
    cycleBeats: 8,
    layers: [
      { name: "Kick", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, swing: 0.5, cyclePattern: [1, 1, 1, 0, 0, 0], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "Ping", type: "manual", steps: 8, pattern: [1, 0, 0, 0, 0, 0, 0, 0], sound: "ping", volume: 0.15, density: 0.5, swing: 0.5, cyclePattern: [1, 1, 0, 0, 0, 0], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "2&4", type: "manual", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "dust", volume: 0.3, density: 0.5, swing: 0.5, cyclePattern: [1, 1, 0, 0, 0, 0], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "beats", type: "manual", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "haze", volume: 0.2, density: 0.5, swing: 0.5, cyclePattern: [1, 1, 0, 0, 0, 0], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
      { name: "swing", type: "random", steps: 16, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "mist", volume: 0.1, density: 0.25, swing: 0.6275, cyclePattern: [1, 1, 0, 0, 0, 0], groupId: "02dc14b8-45d2-4450-8788-b2d03d2bc65b" },
    ],
    groups: [{ id: "02dc14b8-45d2-4450-8788-b2d03d2bc65b", name: "Swing Playback", volume: 1 }],
    savedAt: 0,
  },
  {
    id: "builtin:random-beats",
    name: "Random Beats",
    tempo: 120,
    cycleBeats: 4,
    layers: [
      { name: "Kick", type: "manual", steps: 4, pattern: [1, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, gap: 1, swing: 0.5 },
      { name: "Random ", type: "random", steps: 4, pattern: [1, 1, 1, 1], sound: "pip", volume: 0.6, density: 0.35, gap: 0, swing: 0.5 },
    ],
    savedAt: 0,
  },
  {
    id: "builtin:random-8ths",
    name: "Random 8ths",
    tempo: 120,
    cycleBeats: 4,
    layers: [
      { name: "Kick", type: "manual", steps: 4, pattern: [1, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, gap: 1, swing: 0.5 },
      { name: "Random ", type: "random", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "tap", volume: 0.6, density: 0.35, gap: 0, swing: 0.5 },
    ],
    savedAt: 0,
  },
  {
    id: "builtin:random-off-beats",
    name: "Random off-beats",
    tempo: 120,
    cycleBeats: 4,
    layers: [
      { name: "Kick", type: "manual", steps: 4, pattern: [1, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, gap: 1, swing: 0.5 },
      { name: "Random ", type: "random", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "tap", volume: 0.6, density: 0.4, gap: 0, swing: 0.5 },
    ],
    savedAt: 0,
  },
  {
    id: "builtin:random-swing-8ths",
    name: "Random Swing 8ths",
    tempo: 120,
    cycleBeats: 4,
    layers: [
      { name: "Kick", type: "manual", steps: 4, pattern: [1, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, swing: 0.5, cyclePattern: [1, 0] },
      { name: "Random ", type: "random", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "tap", volume: 0.6, density: 0.3, swing: 0.6275, cyclePattern: [1] },
    ],
    savedAt: 0,
  },
  {
    id: "builtin:random-swing-off-beats",
    name: "Random Swing off-beats",
    tempo: 120,
    cycleBeats: 4,
    layers: [
      { name: "Kick", type: "manual", steps: 4, pattern: [1, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, swing: 0.5, cyclePattern: [1, 0] },
      { name: "Random ", type: "random", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "tap", volume: 0.6, density: 0.4, swing: 0.6275, cyclePattern: [1] },
    ],
    savedAt: 0,
  },
  {
    id: "builtin:x2-x3-x4",
    name: "x2, x3, x4",
    tempo: 105,
    cycleBeats: 4,
    layers: [
      { name: "Kick", type: "manual", steps: 4, pattern: [1, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, swing: 0.5, cyclePattern: [1] },
      { name: "Random", type: "random", steps: 8, pattern: [1, 1, 1, 1, 1, 1, 1, 1], sound: "pip", volume: 0.55, density: 0.4, swing: 0.5, cyclePattern: [1, 1, 0, 0, 0, 0], repeatCycles: 1 },
      { name: "Random 3", type: "random", steps: 12, pattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], sound: "tap", volume: 0.55, density: 0.4, swing: 0.5, cyclePattern: [0, 0, 1, 1, 0, 0], repeatCycles: 1 },
      { name: "Random 4", type: "random", steps: 16, pattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], sound: "tick", volume: 0.55, density: 0.4, swing: 0.5, cyclePattern: [0, 0, 0, 0, 1, 1], repeatCycles: 1 },
    ],
    savedAt: 0,
  },
  {
    id: "builtin:7-beats-gap",
    name: "7 beats gap",
    tempo: 170,
    cycleBeats: 7,
    layers: [
      { name: "Kick", type: "manual", steps: 7, pattern: [1, 0, 0, 0, 0, 0, 0], sound: "kick", volume: 0.85, density: 0.5, swing: 0.5, cyclePattern: [1, 1, 1, 1, 1, 0, 0, 0] },
      { name: "Layer 3", type: "manual", steps: 7, pattern: [1, 0, 1, 0, 1, 0, 0], sound: "ping", volume: 0.7, density: 0.5, swing: 0.5, cyclePattern: [1, 1, 1, 1, 0, 0, 0, 0] },
    ],
    savedAt: 0,
  },
  {
    id: "builtin:7-gap-random",
    name: "7 gap+random",
    tempo: 215,
    cycleBeats: 14,
    layers: [
      { name: "Kick", type: "manual", steps: 14, pattern: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sound: "kick", volume: 0.85, density: 0.5, swing: 0.5, cyclePattern: [1] },
      { name: "Layer 3", type: "manual", steps: 14, pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], sound: "tick", volume: 0.15, density: 0.5, swing: 0.5, cyclePattern: [1], groupId: "f3323adc-b5bb-49d1-a3d9-55f0e1522bee" },
      { name: "Layer 5", type: "manual", steps: 14, pattern: [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0], sound: "drop", volume: 0.1, density: 0.5, swing: 0.5, cyclePattern: [1], groupId: "f3323adc-b5bb-49d1-a3d9-55f0e1522bee" },
      { name: "Random 3", type: "random", steps: 14, pattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], sound: "dust", volume: 0.35, density: 0.45, swing: 0.5, cyclePattern: [1] },
      { name: "Random 4", type: "random", steps: 28, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "mist", volume: 0.3, density: 0.25, swing: 0.5, cyclePattern: [1] },
    ],
    groups: [{ id: "f3323adc-b5bb-49d1-a3d9-55f0e1522bee", name: "Group 1", volume: 1, cyclePattern: [1, 0] }],
    savedAt: 0,
  },
  {
    id: "builtin:7-longer-gap",
    name: "7 longer gap",
    tempo: 215,
    cycleBeats: 14,
    layers: [
      { name: "Kick", type: "manual", steps: 14, pattern: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sound: "kick", volume: 0.85, density: 0.5, swing: 0.5, cyclePattern: [1, 1, 0] },
      { name: "Layer 3", type: "manual", steps: 14, pattern: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], sound: "tick", volume: 0.15, density: 0.5, swing: 0.5, cyclePattern: [1], groupId: "f3323adc-b5bb-49d1-a3d9-55f0e1522bee" },
      { name: "Layer 5", type: "manual", steps: 14, pattern: [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0], sound: "drop", volume: 0.1, density: 0.5, swing: 0.5, cyclePattern: [1], groupId: "f3323adc-b5bb-49d1-a3d9-55f0e1522bee" },
      { name: "Random 3", type: "random", steps: 14, pattern: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], sound: "dust", volume: 0.35, density: 0.45, swing: 0.5, cyclePattern: [1] },
      { name: "Random 4", type: "random", steps: 28, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "mist", volume: 0.3, density: 0.25, swing: 0.5, cyclePattern: [1] },
    ],
    groups: [{ id: "f3323adc-b5bb-49d1-a3d9-55f0e1522bee", name: "Group 1", volume: 1, cyclePattern: [1, 0, 0] }],
    savedAt: 0,
  },
  {
    id: "builtin:5",
    name: "5",
    tempo: 110,
    cycleBeats: 5,
    countdown: 2,
    layers: [
      { name: "1 low", type: "manual", steps: 5, pattern: [1, 0, 0, 0, 0], sound: "kick", volume: 0.9, density: 0.5, swing: 0.5, cyclePattern: [1, 0, 1, 0, 0, 0, 0, 0] },
      { name: "1 high", type: "manual", steps: 10, pattern: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0], sound: "ping", volume: 0.15, density: 0.5, swing: 0.5, cyclePattern: [1, 1, 1, 1, 0, 0, 0, 0] },
      { name: "BIG 5", type: "manual", steps: 5, pattern: [0, 1, 1, 1, 1], sound: "drop", volume: 0.2, density: 0.5, swing: 0.5, cyclePattern: [1], polymetric: true, subdivision: 0.5 },
      { name: "5 pattern", type: "manual", steps: 10, pattern: [0, 0, 0, 1, 0, 1, 0, 0, 1, 0], sound: "tick", volume: 0.3, density: 0.5, swing: 0.5, cyclePattern: [1] },
      { name: "x2 fills", type: "random", steps: 10, pattern: [0, 1, 1, 0, 1, 0, 1, 1, 0, 1], sound: "dust", volume: 0.65, density: 0.25, swing: 0.5, cyclePattern: [1] },
      { name: "x4 fills", type: "random", steps: 20, pattern: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1], sound: "mist", volume: 0.25, density: 0.35, swing: 0.5, cyclePattern: [1] },
    ],
    savedAt: 0,
  },
  {
    id: "builtin:groove1",
    name: "Groove1",
    tempo: 150,
    cycleBeats: 4,
    countdown: 2,
    layers: [
      { name: "Kick", type: "manual", steps: 32, pattern: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], sound: "MOONCHILD/KICK1", volume: 0.8, density: 0.5, swing: 0.5, cyclePattern: [0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1], gapMode: "random", gapDensity: 0.5, polymetric: true, subdivision: 4 },
      { name: "Random 5", type: "random", steps: 32, pattern: [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0], sound: "MOONCHILD/KICK1", volume: 0.55, density: 0.15, swing: 0.5, cyclePattern: [1], polymetric: true, subdivision: 4 },
      { name: "Layer 3", type: "manual", steps: 2, pattern: [0, 1], sound: "MOONCHILD/SNARE2", volume: 0.95, density: 0.5, swing: 0.4745, cyclePattern: [1] },
      { name: "Layer 4", type: "manual", steps: 8, pattern: [1, 0, 1, 0, 1, 0, 1, 0], sound: "MOONCHILD/SHAKER IN1", volume: 0.1, density: 0.5, swing: 0.5, cyclePattern: [1] },
      { name: "Layer 4 copy", type: "manual", steps: 8, pattern: [0, 1, 0, 1, 0, 1, 0, 1], sound: "MOONCHILD/SHAKER OUT1", volume: 0.05, density: 0.5, swing: 0.534, cyclePattern: [1] },
    ],
    savedAt: 0,
  },
];

/** Check if a template is built-in (cannot be deleted/renamed by users) */
export function isBuiltIn(templateId: string): boolean {
  return templateId.startsWith("builtin:");
}

/**
 * Call this from the browser console to export ALL templates (built-in + user)
 * in their current display order as code for BUILT_IN_TEMPLATES.
 *
 * Usage (in browser console):
 *   copy(exportTemplatesForBundling())
 *
 * Then paste into the BUILT_IN_TEMPLATES array in this file.
 */
export function exportTemplatesForBundling(): string {
  try {
    const userRaw = localStorage.getItem("rhythm-lab:templates");
    const all: SavedTemplate[] = userRaw ? JSON.parse(userRaw) : [];

    // Apply custom order if set
    const orderRaw = localStorage.getItem("rhythm-lab:template-order");
    let ordered = all;
    if (orderRaw) {
      const order: string[] = JSON.parse(orderRaw);
      const idxMap = new Map(order.map((id, i) => [id, i]));
      ordered = [...all].sort((a, b) => {
        const ai = idxMap.get(a.id) ?? order.length;
        const bi = idxMap.get(b.id) ?? order.length;
        return ai - bi;
      });
    }

    if (ordered.length === 0) return "// No templates found";
    // Remap IDs to builtin: prefix, reset timestamps
    const exported = ordered.map((t) => ({
      ...t,
      id: `builtin:${t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      savedAt: 0,
    }));
    return JSON.stringify(exported, null, 2);
  } catch {
    return "// Error exporting templates";
  }
}

// Expose to window for console access
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).exportTemplatesForBundling = exportTemplatesForBundling;
}

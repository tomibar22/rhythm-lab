# Rhythm Lab — Developer Guide

A multi-layer rhythmic step sequencer with polyrhythm support, circular visualization, and pattern library.

## Quick Start
```bash
pnpm dev  # runs on port 5175
```

## Deployment

- **GitHub**: https://github.com/tomibar22/rhythm-lab
- **Hosting**: Vercel (auto-deploys on push to `main`)
- **Workflow**: edit locally → `git commit` → `git push` → auto-deploys in ~30s
- **Standalone project**: has its own `package.json`, `tsconfig.json`, `vite.config.ts` (no monorepo deps)
- The `vite.config.ts` uses `path.resolve(__dirname)` as `root` so it works both standalone and from the monorepo root via `--config`
- `tsconfig.json` excludes `vite.config.ts` (Vite handles it separately, avoids needing `@types/node`)

## Architecture

```
useRhythmLab (hook)          ← all state + logic
  ├─ AudioEngine             ← Tone.js scheduling, synths, transport
  ├─ RhythmEngine            ← pure math (euclidean, IOI, rotate)
  └─ storage                 ← localStorage CRUD

App.tsx                      ← wires hook → components
  ├─ TransportBar            ← play/tempo/cycle controls
  │  └─ TemplateBrowser      ← save/load full compositions
  ├─ GridEditor              ← layer rows + step grid (main UI)
  ├─ CircleView              ← canvas ring visualization
  └─ PatternBrowser          ← pattern library + euclidean generator
```

## Files

| File | Purpose |
|------|---------|
| `src/engine/types.ts` | `Layer`, `LayerGroup`, `SoundPreset`, `SoundSpec`, `PatternPreset`, `LAYER_COLORS`, `SOUND_PRESETS` |
| `src/engine/RhythmEngine.ts` | `euclidean(k,n)`, `rotate()`, `invert()`, `getIOIs()`, `getPatternLibrary()` |
| `src/engine/AudioEngine.ts` | `AudioEngine` class — Tone.js scheduling, synths, cycle boundaries |
| `src/engine/storage.ts` | `savePattern()`, `saveTemplate()`, `renameTemplate()`, `reorderTemplates()` — localStorage + built-in merge |
| `src/engine/defaultTemplates.ts` | `BUILT_IN_TEMPLATES` array, `isBuiltIn()`, `exportTemplatesForBundling()` |
| `src/hooks/useRhythmLab.ts` | Central state hook — layers, transport, smart rescheduling |
| `src/App.tsx` | Root component, keyboard shortcuts (Space = play) |
| `src/App.css` | All styling (single CSS file) |
| `src/components/GridEditor.tsx` | `GridEditor` + `LayerRow` + `StepButton` |
| `src/components/CircleView.tsx` | Canvas-based concentric ring visualization |
| `src/components/PatternBrowser.tsx` | Collapsible pattern library (saved, presets, euclidean) |
| `src/components/TemplateBrowser.tsx` | Template save/load/overwrite/rename/reorder |
| `src/components/TransportBar.tsx` | Play, tempo (DragValue), tap tempo, cycle beats ±1, pending indicator |

## Data Model

### Layer Groups

Layers can be organized into **groups** — structural containers that overlay mute/solo/volume on their member layers.

```typescript
{
  id: string,
  name: string,
  collapsed: boolean,
  muted: boolean,        // overrides individual layer mute
  solo: boolean,         // overrides individual layer solo
  volume: number,        // 0–1, multiplied on top of layer volume
  gap: number,           // @deprecated — use cyclePattern
  cyclePattern: (0|1)[], // per-cycle play/rest pattern
  gapMode: "manual" | "random",
  gapDensity: number,    // 0–1, probability when gapMode="random"
}
```

**Key design**: Groups are stored in a separate `groups` array. Membership is via `layer.groupId`. Contiguous layers with the same `groupId` render as a visual group section in the GridEditor.

**Engine integration**: `getEngineReadyLayers(layers, groups)` pre-processes layers by baking group effects (mute, solo, volume) into individual layer fields before passing to the AudioEngine. The engine never sees groups directly.

**GroupActions interface** (from `useRhythmLab`):
```typescript
{
  add, remove, update, toggleMute, toggleSolo, clear, duplicate,
  addLayer,           // add a new layer directly into a group
  ungroupLayer,       // remove a layer from its group
  moveLayerToGroup,   // move layer to a group (or ungroup: undefined)
  reorderGroupBlock,  // move entire group's layers as a block
}
```

### Layer
```typescript
{
  id: string,           // unique ID (crypto.randomUUID)
  name: string,         // display name
  type: "manual" | "random",
  steps: number,        // step count (independent per layer → polyrhythm)
  pattern: (0|1)[],     // binary necklace: manual=onsets, random=allowed mask
  velocities: number[], // 0–127 per step (manual only)
  sound: SoundPreset,   // one of 10 preset sounds
  volume: number,       // 0–1
  muted: boolean,
  solo: boolean,
  color: string,        // hex color from LAYER_COLORS
  swing: number,        // 0–1 (0.5=straight, 0.67=triplet)
  density: number,      // 0–1 (random layers only: probability of firing)
  cyclePattern: (0|1)[], // per-cycle play/rest (gap) pattern
  gapMode: "manual"|"random", // manual dots or auto-generated from gapDensity
  gapDensity: number,   // 0–1, probability when gapMode="random"
  groupId?: string,     // optional group membership
}
```

**Manual vs Random layers:**
- Manual: `pattern[i] = 1` means "onset at step i". Deterministic.
- Random: `pattern[i] = 1` means "step i is allowed". Each allowed step fires with probability `density`.

### Sounds
10 presets in two families:
- **Tonal** (sine oscillators, ascending pitch): `kick` (55Hz), `drop` (330Hz), `tap` (700Hz), `pip` (1000Hz), `tick` (1400Hz), `ping` (2200Hz)
- **Noise** (filtered noise, varying color/decay): `brush` (brown, short), `dust` (pink, short), `mist` (pink, medium), `haze` (brown, long)

Each has freq, decay, oscType, isNoise, noiseType. See `SOUND_PRESETS` in `types.ts`.

## Audio Engine Internals

### Scheduling Model
- **Manual layers** → `Tone.Part` (looping, event-list based). Events at exact tick positions.
- **Random layers** → `Tone.Loop` (interval-based). Counter-based step tracking (see Random Layer Step Derivation).
- **PPQ = 960** throughout. All positions in integer ticks.

### Per-Layer Part Tracking
`layerEvents: Map<string, (Part | Loop)[]>` — keyed by layerId. Enables:
- `rescheduleLayer(layer)` — clear + recreate one layer's parts only
- `clearLayerParts(layerId)` — stop + dispose one layer
- `clearAllParts()` — stop + dispose everything

### Master Bus (Signal Chain)
All synths route through a master bus instead of directly to destination:
```
synths → Channel (masterBus) → Compressor → Limiter → destination
```
- **Compressor**: gentle glue (−12 dB threshold, 3:1 ratio, 10 dB soft knee, 5 ms attack, 80 ms release). Tames the sum of multiple layers without squashing dynamics.
- **Limiter**: hard ceiling at −1 dB — safety net for transient peaks.
- Created in `AudioEngine` constructor, disposed in `dispose()`.
- Prevents clipping when many layers hit simultaneously. Don't add per-layer gain staging — the bus handles it.

### Synth Reuse
One synth per `${layerId}:${sound}`. Created on first use, reused across reschedules. Routed to `this.masterBus` (not `toDestination`). Only replaced if the sound type changes.

### Swing
Applied to **odd-numbered steps** only:
```
tickPos = pairStart + swing * 2 * stepTicks
```
swing=0.5 → straight, swing=0.67 → triplet feel.

### Gap (Rest Cycles)
`cyclePattern: (0|1)[]` controls which cycles play (1) and which rest (0). Loops.
- Super-cycle = `cyclePattern.length` cycles. `loopEnd = superCycleTicks`.
- Manual layers: events placed only in play-cycles. Random layers: modular check per step.
- **Manual gap mode** (default): user toggles individual dots via GapControl (+/− buttons to add/remove cycles).
- **Random gap mode** (`gapMode: "random"`): auto-generates a 16-cycle `cyclePattern` from `gapDensity` (0–1 probability). R toggle button switches modes; density is a DragValue control; ↻ rerolls the pattern. The engine sees only the generated `cyclePattern` — no scheduling changes needed.

### Humanization
All humanization is applied at **playback time only** — never stored in pattern data. Four layers work together to break the machine-gun effect:

1. **IOI-based accent weights** (`computeAccentWeights`): notes after longer gaps get more weight. Range: 0.75 (dense consecutive hits) to 1.0 (after a long rest). Naturally accents grouping boundaries in polyrhythms and swing.

2. **Consecutive-hit rolloff**: in runs of 3+ adjacent onsets, inner hits get ~10% attenuation — like a drummer's natural energy sag in the middle of a fast passage. First and last hits of each run keep full weight.

3. **Velocity micro-jitter** (`humanizeVelocity`): ±6% random variation per hit on top of accent weights.

4. **Pitch microvariation** (`triggerSynth`): tonal sounds vary ±1% (~±17 cents) per hit — alive but not detuned. Like a mallet landing on slightly different spots.

5. **Decay microvariation** (`triggerSynth`): envelope decay varies ±12% per hit — breaks identical envelope repetition. Like hitting a drum skin at slightly different tensions.

If you ever hear inconsistent volumes or subtle timbral variation, this is by design — don't "fix" it. Timing is always tight (grid-locked) — humanization is purely in dynamics and timbre.

### alignTick
When parts start mid-transport (e.g., after a deferred cycle change at tick 3840):
- `part.start("3840i")` — Part loops from that tick
- Random loop: counter starts at 0, loop starts at `alignTick` — step 0 is always at the boundary

### Mid-Playback Reschedule (Random Layers)
When a random layer's properties change during playback (e.g., density, pattern), `rescheduleLayer()` computes the current cycle position and passes a correct `startTick` + `initialCounter` so the new loop picks up exactly where the old one was:
```typescript
const cyclePos = ((transport.ticks - cycleAlignTick) % cycleTicks + cycleTicks) % cycleTicks;
const currentStep = Math.floor(cyclePos / stepTicks);
// find next step boundary ≥ transport.ticks, compute initialCounter from it
```

## Deferred Cycle-Length Changes (Critical)

When cycle beats change during playback, the change is **deferred to the next cycle boundary**:

1. `setCycleBeats(n)` → only updates React state + sets `pendingCycleChange = true`
2. `requestCycleChange(n, callback)` → stores pending change in engine
3. **Boundary sentinel** (`scheduleRepeat`) fires at each cycle boundary
4. At boundary: callback runs → `adjustLayersForCycleChange()` + `scheduleLayers()` + `setLayers()`
5. UI and audio change together at the boundary

### Boundary Sentinel
```
scheduleRepeat at interval=cycleTicks, start=alignTick+cycleTicks
```
- Uses **mathematically computed boundary tick** (counter), NOT `transport.ticks` (has main-thread jitter)
- Starts at first **future** boundary (not alignTick itself, which would be a no-op)

### Layer Effect Guard
When a cycle change is pending, the layer-change useEffect **skips rescheduling**:
```typescript
if (engineCycleBeatsRef.current !== cycleBeatsRef.current) {
  prevLayersRef.current = layers;
  return; // boundary callback will do the full reschedule
}
```
Without this guard, changing cycle beats + layers simultaneously causes immediate rescheduling with wrong parameters.

### Step Multiplier Preservation
When cycle beats change (4→3), layers with step counts matching a multiplier (×1, ×2, ×3, etc.) auto-adjust:
- ×2 at 4 beats = 8 steps → ×2 at 3 beats = 6 steps
- Manual: regenerate euclidean with proportional onsets
- Random: resize allowed mask, fill new steps with 1

## Smart Rescheduling

The layer-change useEffect avoids full reschedule on every edit:

1. **Playing set changed** (mute/solo/add/remove) → `scheduleLayers()` (full)
2. **Audio property changed** on individual layer → `rescheduleLayer()` (single)
3. **Non-audio change** (name, color, selection) → no reschedule

Audio-relevant properties: `steps`, `sound`, `volume`, `density`, `swing`, `cyclePattern`, `gapMode`, `gapDensity`, `pattern`, `repeatCycles`, `hitsPerCycle`, `polymetric`, `subdivision`

Helper: `layerAudioChanged(oldLayer, newLayer)` compares these fields.
Helper: `getPlayingIds(layers)` returns Set of IDs that should produce sound (respects mute/solo logic).

## Random Layer Step Derivation

Random layers use a **counter-based** approach: `stepCounter` increments exactly once per `Tone.Loop` callback.
```typescript
let stepCounter = 0;
// inside loop callback:
const superStep = stepCounter % totalStepsPerSuper;
const currentStep = superStep % steps;
stepCounter++;
```
- Counter starts at 0 — loop always starts at the correct `alignTick`
- Loops are always cleared and recreated on reschedule, so counter resets naturally
- **Why not `transport.ticks`?** At high tempos (200+ BPM), main-thread jitter causes `Math.round(ticks / stepTicks)` to land on adjacent steps, triggering forbidden steps

## CircleView

Canvas visualization with concentric rings (one per visible layer):
- Ring dots = steps. Filled = onset/allowed, light = rest/forbidden.
- **Needle** = rotating progress line using `engine.getProgress(engine.effectiveCycleBeats)`
  - Uses `effectiveCycleBeats` (not UI `cycleBeats`) to stay in sync during deferred changes
- IOI labels between onsets (manual layers, ≤4 visible layers)
- HiDPI aware (devicePixelRatio scaling)
- `requestAnimationFrame` loop when playing

## DragValue UX Pattern

All numeric controls (tempo, volume, density) follow the same interaction pattern:

- **`↕` cursor** — hints at drag interaction
- **Click & drag up/down** — adjusts value in steps of 5, snapping to multiples of 5
- **Scroll wheel** — same ±5 per notch (with threshold accumulator to prevent trackpad flooding)
- **Double-click** — enters edit mode: input becomes writable, text is selected
- **Enter** commits, **Escape** cancels, **blur** commits and exits edit mode
- **`readOnly={!editing}`** + `pointer-events: none` on input when not editing — prevents accidental focus

Implementation structure (repeated in TransportBar and GridEditor):
```
state: [text, setText], [editing, setEditing]
refs: inputRef, dragStartY, dragStartValue, wheelAcc, isDragging
handlers: handlePointerDown, handleDoubleClick, handleWheel, commitValue
CSS: .control (ns-resize) + .control.editing (text cursor, pointer-events: auto)
```

**When adding a new numeric control, follow this pattern exactly.** See `handleVolumePointerDown` / `handleDensityPointerDown` / `handleTempoPointerDown` for reference.

## GridEditor / LayerRow

Each layer row has 3 sections:
1. **Top bar**: drag handle (⠿), color dot, RND badge, name input, sound select, gap dots, M/S, volume (DragValue), CLR/× buttons
2. **Step bar**: steps −/+, multiplier pills (×1–×8, highlights active), density DragValue (random only)
3. **Step grid**: clickable step buttons grouped by beat. Manual=toggle onset. Random=toggle allowed. Supports **step painting** (click-drag).

**Drag-and-drop** uses a **custom pointer-event system** (NOT HTML5 DnD, which is unreliable on trackpads):

**How it works:**
1. **`onPointerDown`** on drag handle → stores drag info in `pointerDrag` ref, does NOT activate yet
2. **`onPointerMove`** (document-level) → after 5px threshold, activates drag: creates ghost element, sets `draggingId` state, hit-tests with `elementFromPoint` to find drop targets, stores result in `drag.dropTarget`
3. **`onPointerUp`** (document-level) → executes the drop using `drag.dropTarget` from the last `pointermove` (does NOT re-run `elementFromPoint` — avoids gap/border misses)
4. Ghost element follows cursor, hidden briefly during `elementFromPoint` calls

**Critical design decision**: `onPointerUp` uses the stored `dropTarget` from the last `pointermove`, NOT a fresh `elementFromPoint` hit-test. This ensures the drop goes exactly where the indicator line was showing, even if the cursor is slightly between rows on release.

**Drop targets** are identified by data attributes:
- `data-elem-idx` on layer rows and group containers (unified element index)
- `.top-drop-zone` and `.bottom-drop-zone` for edges
- `.grid-editor` background for ungrouping

**Visual feedback**:
- Source element dims (`opacity: 0.25, transform: scale(0.98)`)
- Drop indicator: neutral gray glowing line (`rgba(255,255,255,0.45)`) with pulse animation
- Custom ghost label follows cursor (layer color background, white text)
- Top/bottom drop zones appear only during drag

**Layer drag handle** (⠿) — reorders individual layers. Can drag layers between groups, into groups, or out of groups.
**Group drag handle** — on group header. Moves entire group block as a unit via `reorderGroupBlock()`.
**Drop into group**: calls `moveLayerToGroup(layerId, groupId)`.
**Drop to ungroup**: dropping outside any group calls `moveLayerToGroup(layerId, undefined)`.

### Step Painting
Click a step and drag across adjacent steps to paint them all ON or OFF:
- `pointerdown` on a step determines paint mode: if step was ON → paint OFF, if OFF → paint ON
- `pointermove` on the `.step-grid` container uses `document.elementFromPoint` + `data-step` attributes to detect which step the pointer is over
- `pointerup` on `document` stops painting
- State: `paintModeRef` (0|1|null), `lastPaintedStepRef` (avoids redundant updates)
- Uses `onSetStep(step, value)` (not `onToggleStep`) for consistent paint direction
- CSS: `touch-action: none; user-select: none` on `.step-grid` prevents scroll/selection during paint

**Why not `setPointerCapture` + `pointerenter`?** Pointer capture locks all events to the captured element — sibling buttons never receive `pointerenter`. The `elementFromPoint` approach works reliably across all browsers.

## Pattern Library

6 categories + custom generator:
- **Saved**: user patterns (localStorage)
- **Euclidean**: E(3,8) tresillo, E(5,8) cinquillo, E(7,12) bell, etc.
- **Clave**: Son 3-2, Rumba, Bossa, Cascara
- **World**: Rupak (7), Keherwa (8), Jhaptal (10)
- **Jazz**: Ride cymbal, Charleston, 2&4 snare
- **Grid**: 4-on-floor, 8th notes, 16th notes, backbeat
- **Custom**: E(k,n) generator with sliders

## Templates

Full composition save/load via "Templates (N)" button:
- Saves: all layers (type, steps, pattern, sound, density, gap, swing), tempo, cycleBeats
- **Overwrite**: type same name or click existing template in save mode to overwrite in-place
- **Rename**: ✎ button → inline input (Enter/blur commits, Escape cancels)
- Drag-to-reorder in dropdown
- Loading stops playback and replaces all state
- Default startup template: "Random 8ths"

### Two-Layer Template System (Built-in + User)

Templates come from two sources, merged at read time:

1. **Built-in templates** (`src/engine/defaultTemplates.ts` → `BUILT_IN_TEMPLATES` array)
   - Baked into the app code, always available to all users
   - IDs prefixed with `builtin:` — cannot be deleted, renamed, or overwritten
   - Teacher-curated: add/update by editing the array and pushing to GitHub

2. **User templates** (browser `localStorage` under `rhythm-lab:templates`)
   - Private to each user's device/browser
   - Can be created, renamed, deleted, reordered freely
   - Appear after built-in templates in the list

**How `getSavedTemplates()` works**: returns `[...BUILT_IN_TEMPLATES, ...getUserTemplates()]`. All mutation functions (`saveTemplate`, `deleteTemplate`, `renameTemplate`, `reorderTemplates`) only operate on the user portion. `isBuiltIn(id)` guards all mutations.

### Shipping Templates to Students
1. Save templates locally in the app (they go to your browser's localStorage)
2. Open browser console → run `copy(exportTemplatesForBundling())`
3. Paste output into the `BUILT_IN_TEMPLATES` array in `src/engine/defaultTemplates.ts`
4. Commit and push → Vercel auto-deploys → students see templates immediately

## Color Scheme

Warm neutral charcoal — like a dimly lit recording studio. **Not cold blue-black.**

| Token | Value | Purpose |
|-------|-------|---------|
| `--bg-deep` | `#141416` | Page background |
| `--bg-surface` | `#1c1c1f` | Layer rows, panels |
| `--bg-elevated` | `#252528` | Controls, inputs |
| `--bg-hover` | `#2e2e32` | Hover states |
| `--border` | `rgba(255,255,255, 0.07)` | Subtle edges |
| `--text-primary` | `#e4e4e8` | Off-white (no glare) |
| `--text-secondary` | `#9b9ba8` | Secondary labels |
| `--text-muted` | `#5e5e6a` | Hints, icons |
| `--accent` | `#7b6cf0` | Warm blue-violet |

**Layer colors** are slightly desaturated (coral, sage, dusty rose) — rich enough to distinguish, soft enough not to scream against the dark background.

Design principles:
- Elevation through brightness steps, not color shifts
- Low-contrast borders — elements float rather than being boxed in
- Empty step cells: nearly transparent (`rgba 0.02`) — active steps pop by contrast
- Never pure black or pure white
- **Groups use warm white/neutral styling** (`rgba(255, 255, 255, ...)` tints), NOT the purple accent. Groups are subtle structural containers — they should not compete with selection/accent highlights. Border-left: `rgba(255,255,255, 0.15)`, background: `rgba(255,255,255, 0.02)`, drag-target outline: `rgba(255,255,255, 0.25)`.

## Critical Invariants

1. **Never use `transport.ticks` for boundary alignment** — use mathematically computed ticks
2. **Skip layer rescheduling when cycle change is pending** — check `engineCycleBeatsRef !== cycleBeatsRef`
3. **Random layers use a step counter**, not `transport.ticks` derivation (jitter at high tempos)
4. **Drag-and-drop uses pointer events**, not HTML5 DnD (unreliable on trackpads). `onPointerUp` must use stored `dropTarget` from last `pointermove`, never re-run `elementFromPoint`.
5. **PPQ = 960** everywhere, no floating-point beat positions
6. **Patterns are 0-indexed `(0|1)[]`** (binary necklace format)
7. **One synth per layer+sound** — reused, not recreated on each reschedule
8. **`prevLayersRef.current` must be updated** whenever layers change outside the normal effect flow (e.g., in boundary callbacks) to prevent double rescheduling
9. **Humanized velocity is playback-only** — never modify stored velocity/pattern data to "humanize." The `humanizeVelocity()` function handles this at trigger time.
10. **All numeric controls use the DragValue pattern** — drag/scroll/double-click-to-type. Don't add raw sliders or plain inputs for numeric values.
11. **Step painting uses `elementFromPoint`**, not `setPointerCapture` (which breaks sibling `pointerenter` events).
12. **Group styling is warm white/neutral**, never purple accent — groups are structural, not expressive.
13. **`getEngineReadyLayers()` bakes group effects** into layers before the engine sees them — the AudioEngine never knows about groups.

## Adding a New Feature — Checklist

### New layer property
1. Add to `Layer` type in `types.ts`
2. Set default in `addLayer()` in `useRhythmLab.ts`
3. If audio-relevant: add to `layerAudioChanged()` comparison
4. Add UI control in `LayerRow` in `GridEditor.tsx`
5. If affects scheduling: handle in `scheduleManualLayer()` / `scheduleRandomLayer()` in `AudioEngine.ts`
6. If saved: add to `SavedPattern` / `SavedTemplateLayer` in `storage.ts`

### New sound preset
1. Add to `SoundPreset` union type in `types.ts`
2. Add spec to `SOUND_PRESETS` array in `types.ts`
3. AudioEngine handles it automatically via `getSpec()` + `triggerSynth()`

### New pattern preset
1. Add to `getPatternLibrary()` in `RhythmEngine.ts`
2. Set appropriate `category` — will appear in PatternBrowser automatically

### New group property
1. Add to `LayerGroup` type in `types.ts`
2. Set default in `addGroup()` in `useRhythmLab.ts`
3. If affects audio: apply in `getEngineReadyLayers()` (bake into layer fields)
4. Add UI control in group header section of `GridEditor.tsx`
5. If saved: add to `SavedTemplateGroup` in `storage.ts`

### New numeric control (on a layer or transport)
1. Follow the **DragValue UX pattern** (see section above) — never use a raw slider or plain input
2. Add state: `[text, setText]`, `[editing, setEditing]`, refs for input/drag/wheel
3. Add handlers: `handlePointerDown`, `handleDoubleClick`, `handleWheel`, `commitValue`
4. Wire to `onUpdateLayer({ property: value })`
5. Style: `.control` with `cursor: ns-resize`, `.control.editing` with `cursor: text`
6. Add `onClick={e => e.stopPropagation()}` to prevent layer selection on interaction
7. Copy the pattern from `handleVolumePointerDown` in `GridEditor.tsx` as reference

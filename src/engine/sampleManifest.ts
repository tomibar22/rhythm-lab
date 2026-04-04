/**
 * @file sampleManifest.ts
 * Registry of all sample packs and their samples.
 *
 * To add a new pack:
 *   1. Drop the folder into public/samples/{PackName}/
 *   2. Add an entry to SAMPLE_PACKS below with each filename (without .wav)
 *   3. That's it — the sound browser and audio engine pick it up automatically.
 *
 * Sample IDs follow the format "pack/FILENAME" (e.g. "TIGRAN/KICK1").
 * Category is auto-derived from the filename prefix (KICK, SNARE, HIHAT, etc.).
 */

export interface SampleEntry {
  /** Unique ID: "pack/name" */
  id: string;
  /** Display name (e.g. "KICK1") */
  name: string;
  /** Pack name (e.g. "TIGRAN") */
  pack: string;
  /** Auto-derived category (e.g. "KICK", "SNARE", "HIHAT") */
  category: string;
  /** URL path to the .wav file */
  url: string;
}

export interface SamplePack {
  name: string;
  samples: string[]; // filenames without .wav
}

/**
 * All sample packs. Add new packs here.
 * Filenames should NOT include the .wav extension.
 */
export const SAMPLE_PACKS: SamplePack[] = [
  {
    name: "KENDRICK",
    samples: [
      "KICK1", "KICK2", "KICK3",
      "SNARE1", "SNARE2", "SNARE3", "SNARE+CLAP",
      "SNAP1",
      "HIHAT1", "HIHAT2",
    ],
  },
  {
    name: "MOONCHILD",
    samples: [
      "KICK1", "KICK2", "KICK3", "KICK4", "KICK5",
      "SNARE1", "SNARE2", "SNARE3", "SNARE4", "SNARE+SNAP",
      "HIHAT1",
      "SHAKER IN1", "SHAKER IN2", "SHAKER OUT1", "SHAKER OUT2",
      "PERC1", "PERC2",
    ],
  },
  {
    name: "SLUM",
    samples: [
      "KICK1", "KICK2", "KICK3",
      "SNARE1", "SNARE2", "SNARE3",
      "HIHAT1", "HIHAT2", "HIHAT3",
    ],
  },
  {
    name: "TIGRAN",
    samples: [
      "KICK1", "KICK2", "KICK3", "KICK4", "KICK5", "KICK6", "KICK7",
      "SNARE1", "SNARE2", "SNARE3", "SNARE4", "SNARE5", "SNARE6", "SNARE7", "SNARE8",
      "HIHAT1", "HIHAT2", "HIHAT3", "HIHAT4", "HIHAT5", "HIHAT6", "HIHAT7", "HIHAT8", "HIHAT9", "HIHAT10",
      "HIHAT OPEN1", "HIHAT OPEN2",
      "CYM1", "CYM2",
      "PERC1", "PERC2", "PERC3", "PERC4", "PERC5",
    ],
  },
];

/** Derive category from a sample filename (e.g. "KICK1" → "KICK", "SNARE+CLAP" → "SNARE"). */
function deriveCategory(name: string): string {
  // Strip trailing digits
  const base = name.replace(/\d+$/, "").trim();
  // Take the first word before "+" or " " as the primary category
  const primary = base.split(/[+ ]/)[0];
  return primary || "OTHER";
}

/** All known sample categories, in display order. */
export const SAMPLE_CATEGORIES = [
  "KICK", "SNARE", "HIHAT", "CYM", "PERC", "SNAP", "SHAKER",
] as const;

/** Build the flat list of all sample entries from SAMPLE_PACKS. */
function buildSampleEntries(): SampleEntry[] {
  const entries: SampleEntry[] = [];
  for (const pack of SAMPLE_PACKS) {
    for (const name of pack.samples) {
      entries.push({
        id: `${pack.name}/${name}`,
        name,
        pack: pack.name,
        category: deriveCategory(name),
        url: `/samples/${encodeURIComponent(pack.name)}/${encodeURIComponent(name)}.wav`,
      });
    }
  }
  return entries;
}

/** All sample entries (computed once). */
export const ALL_SAMPLES: SampleEntry[] = buildSampleEntries();

/** Get samples grouped by pack name. */
export function getSamplesByPack(): Map<string, SampleEntry[]> {
  const map = new Map<string, SampleEntry[]>();
  for (const entry of ALL_SAMPLES) {
    const list = map.get(entry.pack) ?? [];
    list.push(entry);
    map.set(entry.pack, list);
  }
  return map;
}

/** Get samples grouped by category. */
export function getSamplesByCategory(): Map<string, SampleEntry[]> {
  const map = new Map<string, SampleEntry[]>();
  for (const entry of ALL_SAMPLES) {
    const list = map.get(entry.category) ?? [];
    list.push(entry);
    map.set(entry.category, list);
  }
  // Sort by canonical order, unknown categories at end
  const ordered = new Map<string, SampleEntry[]>();
  for (const cat of SAMPLE_CATEGORIES) {
    const list = map.get(cat);
    if (list) ordered.set(cat, list);
  }
  for (const [cat, list] of map) {
    if (!ordered.has(cat)) ordered.set(cat, list);
  }
  return ordered;
}

/** Check if a sound ID refers to a sample (vs a synth preset). */
export function isSampleSound(soundId: string): boolean {
  return soundId.includes("/");
}

/** Get the display label for any sound ID. */
export function getSoundLabel(soundId: string): string {
  if (!isSampleSound(soundId)) return soundId;
  const entry = ALL_SAMPLES.find((s) => s.id === soundId);
  return entry ? entry.name : soundId.split("/").pop() ?? soundId;
}

/** Get the pack label for a sample sound ID. */
export function getSoundPackLabel(soundId: string): string {
  if (!isSampleSound(soundId)) return "Metronome";
  return soundId.split("/")[0];
}

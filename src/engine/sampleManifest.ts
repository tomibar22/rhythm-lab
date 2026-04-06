/**
 * @file sampleManifest.ts
 * Registry of all sample packs and their samples.
 *
 * To add a new pack:
 *   1. Drop the folder into public/samples/{PackName}/
 *   2. Add an entry to SAMPLE_PACKS below with each filename (without .wav)
 *   3. That's it — the sound browser and audio engine pick it up automatically.
 *
 * For multi-sample packs (round-robin variations), use the `multiSamples` field
 * instead of `samples`. Each entry defines a display name, file prefix, and count.
 * The engine loads all variations and randomly picks one per trigger for natural feel.
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
  /** URL path to the .wav file (first variant for multi-samples) */
  url: string;
  /** All variant URLs for multi-sample entries. Undefined for single-sample. */
  variantUrls?: string[];
}

export interface SamplePack {
  name: string;
  /** Single-file samples — filenames without .wav */
  samples: string[];
  /** Multi-sample entries — each name maps to multiple variation files */
  multiSamples?: MultiSampleDef[];
}

/** A multi-sample instrument: one sound ID backed by multiple .wav variations. */
export interface MultiSampleDef {
  /** Display name and sound ID suffix (e.g. "RIDE") */
  name: string;
  /** Filename prefix in public/samples/ (e.g. "ride" → "ride - 1.wav", "ride - 2.wav", ...) */
  filePrefix: string;
  /** Number of variations (files numbered 1 through count) */
  count: number;
}

/**
 * All sample packs. Add new packs here.
 * Filenames should NOT include the .wav extension.
 */
export const SAMPLE_PACKS: SamplePack[] = [
  {
    name: "JAZZ-MULTI",
    samples: [],
    multiSamples: [
      // Kicks
      { name: "KICK",              filePrefix: "kick - snares on",         count: 6  },
      { name: "KICK SNROFF",       filePrefix: "kick - snares off",        count: 5  },
      { name: "BOP KICK",          filePrefix: "bop kick - snares on",     count: 10 },
      { name: "BOP KICK SNROFF",   filePrefix: "bop kick - snares off",    count: 6  },
      // Snares
      { name: "SNARE",             filePrefix: "snare - snares on",        count: 16 },
      { name: "SNARE SNROFF",      filePrefix: "snare - snares off",       count: 6  },
      { name: "RIMSHOT",           filePrefix: "rimshot - snares on",      count: 9  },
      { name: "RIMSHOT SNROFF",    filePrefix: "rimshot - snares off",     count: 6  },
      { name: "STICKSHOT",         filePrefix: "stickshot - snares on",    count: 8  },
      { name: "STICKSHOT SNROFF",  filePrefix: "stickshot - snares off",   count: 6  },
      { name: "XSTICK",            filePrefix: "xstick - snares on",       count: 8  },
      { name: "XSTICK SNROFF",     filePrefix: "xstick - snares off",      count: 7  },
      // Hihats
      { name: "HH CLOSE",         filePrefix: "hihat - close",            count: 7  },
      { name: "HH CLOSED",        filePrefix: "hihat - closed",           count: 8  },
      { name: "HH CLOSED SIDE",   filePrefix: "hihat - closed side",      count: 5  },
      { name: "HH OPEN",          filePrefix: "hihat - open",             count: 3  },
      { name: "HH OPENED1",       filePrefix: "hihat - opened 1",         count: 8  },
      { name: "HH OPENED2",       filePrefix: "hihat - opened 2",         count: 7  },
      { name: "HH OPENED3",       filePrefix: "hihat - opened 3",         count: 9  },
      { name: "HH OPENED4",       filePrefix: "hihat - opened 4",         count: 6  },
      { name: "HH OPENED5",       filePrefix: "hihat - opened 5",         count: 4  },
      // Ride
      { name: "RIDE",              filePrefix: "ride",                     count: 5  },
      { name: "RIDE BELL",         filePrefix: "ride - bell",              count: 3  },
      { name: "RIDE CRASH",        filePrefix: "ride - crash",             count: 5  },
      { name: "FLAT RIDE",         filePrefix: "flat ride",                count: 7  },
      { name: "FLAT RIDE CRASH",   filePrefix: "flat ride - crash",        count: 2  },
      // Toms
      { name: "RACK TOM",         filePrefix: "rack tom - snares on",     count: 9  },
      { name: "RACK TOM SNROFF",  filePrefix: "rack tom - snares off",    count: 8  },
      { name: "FLOOR TOM",        filePrefix: "floor tom - snares on",    count: 8  },
      { name: "FLOOR TOM SNROFF", filePrefix: "floor tom - snares off",   count: 7  },
    ],
  },
  {
    name: "JAZZ",
    samples: [
      "KICK1", "KICK2",
      "SNARE1", "SNARE2", "SNARE3", "SNARE4", "SNARE5",
      "HIHAT1", "HIHAT2",
      "BRUSH1", "BRUSH2",
      "PERC1", "PERC2", "PERC3", "PERC4", "PERC5", "PERC6",
    ],
  },
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
      "KICK1", "KICK2", "KICK3", "KICK5", "KICK7",
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
  "KICK", "SNARE", "RIMSHOT", "STICKSHOT", "XSTICK",
  "HIHAT", "HH", "RIDE", "FLAT", "CYM",
  "RACK", "FLOOR", "TOM", "BOP",
  "BRUSH", "PERC", "SNAP", "SHAKER",
] as const;

/** Build the flat list of all sample entries from SAMPLE_PACKS. */
function buildSampleEntries(): SampleEntry[] {
  const entries: SampleEntry[] = [];
  for (const pack of SAMPLE_PACKS) {
    // Single-file samples
    for (const name of pack.samples) {
      entries.push({
        id: `${pack.name}/${name}`,
        name,
        pack: pack.name,
        category: deriveCategory(name),
        url: `/samples/${encodeURIComponent(pack.name)}/${encodeURIComponent(name)}.wav`,
      });
    }
    // Multi-sample entries (round-robin variations)
    if (pack.multiSamples) {
      for (const ms of pack.multiSamples) {
        const urls: string[] = [];
        for (let i = 1; i <= ms.count; i++) {
          urls.push(`/samples/${encodeURIComponent(pack.name)}/${encodeURIComponent(ms.filePrefix + " - " + i)}.wav`);
        }
        entries.push({
          id: `${pack.name}/${ms.name}`,
          name: ms.name,
          pack: pack.name,
          category: deriveCategory(ms.name),
          url: urls[0],
          variantUrls: urls,
        });
      }
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

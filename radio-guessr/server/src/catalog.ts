// Builds the pool of songs the radio draws from.
//
// Primary source: the iTunes Search API (free, no key, 30s preview clips).
// Fallback: a self-contained "demo" catalog of synthesized tones, so the game
// still runs with zero internet access (e.g. a locked-down sandbox or offline
// dev). The demo audio is generated on disk at startup — see tones.ts.

import { generateDemoTones, DEMO_TONES } from "./tones.js";

export type Track = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  previewUrl: string;
  artworkUrl?: string;
};

// Seed terms spread across genres/eras so decoys feel plausible and the pool
// is varied. iTunes returns up to `limit` tracks per term.
const SEED_TERMS = [
  "Daft Punk",
  "The Weeknd",
  "Taylor Swift",
  "Kendrick Lamar",
  "Fleetwood Mac",
  "Queen",
  "Billie Eilish",
  "Tame Impala",
  "Drake",
  "Arctic Monkeys",
  "Beyonce",
  "Radiohead",
  "Dua Lipa",
  "Michael Jackson",
  "Kanye West",
  "Coldplay",
  "Rihanna",
  "Nirvana",
  "Frank Ocean",
  "ABBA",
];

type ItunesResult = {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  primaryGenreName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
};

async function fetchTerm(term: string, limit: number): Promise<Track[]> {
  const url =
    "https://itunes.apple.com/search?" +
    new URLSearchParams({
      term,
      media: "music",
      entity: "song",
      limit: String(limit),
    });
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`iTunes ${res.status} for "${term}"`);
  const data = (await res.json()) as { results: ItunesResult[] };
  return data.results
    .filter((r) => r.previewUrl && r.trackName && r.artistName)
    .map((r) => ({
      id: String(r.trackId),
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName,
      genre: r.primaryGenreName,
      previewUrl: r.previewUrl!,
      // Bump artwork to a crisper size.
      artworkUrl: r.artworkUrl100?.replace("100x100", "300x300"),
    }));
}

async function fetchItunesCatalog(): Promise<Track[]> {
  const lists = await Promise.all(
    SEED_TERMS.map((t) =>
      fetchTerm(t, 12).catch((e) => {
        console.warn(`  catalog: term "${t}" failed: ${e.message}`);
        return [] as Track[];
      })
    )
  );
  const byId = new Map<string, Track>();
  for (const list of lists) for (const t of list) byId.set(t.id, t);
  return [...byId.values()];
}

// A deterministic, colorful cover for each demo track (no real artwork
// offline). Hue follows the tone's pitch so each track gets a distinct look.
function demoCover(tone: { freq: number }): string {
  const h = Math.round(tone.freq * 1.4) % 360;
  const c1 = `hsl(${h} 70% 56%)`;
  const c2 = `hsl(${(h + 45) % 360} 72% 40%)`;
  const c3 = `hsl(${(h + 190) % 360} 85% 66%)`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
    `<rect width="100" height="100" fill="url(#g)"/>` +
    `<circle cx="68" cy="32" r="30" fill="${c3}" opacity="0.55"/>` +
    `<rect y="72" width="100" height="28" fill="#000" opacity="0.16"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function demoCatalog(publicDir: string): Track[] {
  generateDemoTones(publicDir);
  return DEMO_TONES.map((tone) => ({
    id: tone.id,
    title: tone.title,
    artist: tone.artist,
    album: "Mixtape Demo",
    genre: "Demo",
    previewUrl: `/demo/${tone.id}.wav`,
    artworkUrl: demoCover(tone),
  }));
}

/**
 * Build the catalog, preferring iTunes and falling back to demo tones.
 * `publicDir` is where demo audio is written for static serving.
 */
export async function buildCatalog(publicDir: string): Promise<{
  tracks: Track[];
  mode: "itunes" | "demo";
}> {
  try {
    const tracks = await fetchItunesCatalog();
    // Need at least 4 tracks to form a round (1 answer + 3 decoys).
    if (tracks.length >= 8) {
      console.log(`  catalog: loaded ${tracks.length} tracks from iTunes`);
      return { tracks, mode: "itunes" };
    }
    console.warn(
      `  catalog: iTunes returned only ${tracks.length} tracks, using demo`
    );
  } catch (e) {
    console.warn(`  catalog: iTunes unreachable (${(e as Error).message}), using demo`);
  }
  const tracks = demoCatalog(publicDir);
  return { tracks, mode: "demo" };
}

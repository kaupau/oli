// Build "open this song" links for the major streaming services from a
// title + artist. We don't have service-specific track IDs (the catalog comes
// from the iTunes Search API), so these are search deep-links — they land the
// player on the song's search results, which is reliable across regions.

export function appleMusicUrl(title: string, artist: string): string {
  const term = encodeURIComponent(`${title} ${artist}`);
  return `https://music.apple.com/search?term=${term}`;
}

export function spotifyUrl(title: string, artist: string): string {
  const term = encodeURIComponent(`${title} ${artist}`);
  return `https://open.spotify.com/search/${term}`;
}

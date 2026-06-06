import { appleMusicUrl, spotifyUrl } from "../lib/links";

/**
 * Tiny "open in Apple Music / Spotify" pair. Shown once a track is revealed and
 * in the recently-played list, so players can go listen to the full song.
 * `compact` renders icon-only pills for the dense list rows.
 */
export function ServiceLinks({
  title,
  artist,
  compact,
}: {
  title: string;
  artist: string;
  compact?: boolean;
}) {
  return (
    <span className={`svc ${compact ? "svc-compact" : ""}`}>
      <a
        className="svc-link svc-apple"
        href={appleMusicUrl(title, artist)}
        target="_blank"
        rel="noopener noreferrer"
        title={`Add “${title}” on Apple Music`}
        onClick={(e) => e.stopPropagation()}
      >
        <AppleIcon />
        {!compact && <span>Add to Apple Music</span>}
      </a>
      <a
        className="svc-link svc-spotify"
        href={spotifyUrl(title, artist)}
        target="_blank"
        rel="noopener noreferrer"
        title={`Add “${title}” on Spotify`}
        onClick={(e) => e.stopPropagation()}
      >
        <SpotifyIcon />
        {!compact && <span>Add to Spotify</span>}
      </a>
    </span>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.12 2.98-.84.96-2.2 1.7-3.34 1.6-.14-1.1.44-2.27 1.1-3.01.76-.86 2.1-1.51 3.36-1.57zM20.5 17.06c-.55 1.27-.82 1.84-1.53 2.96-.99 1.57-2.39 3.52-4.12 3.54-1.54.01-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.02-3.05-1.79-4.04-3.36C-.05 16.7-.37 11.5 1.4 8.74c1.04-1.62 2.69-2.57 4.24-2.57 1.58 0 2.57 1 3.87 1 1.26 0 2.03-1 3.86-1 1.38 0 2.84.75 3.88 2.05-3.41 1.87-2.86 6.74.85 8.84z" />
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.5 17.32a.75.75 0 01-1.03.25c-2.82-1.72-6.36-2.11-10.54-1.16a.75.75 0 11-.33-1.46c4.57-1.04 8.5-.59 11.65 1.34.36.22.47.69.25 1.03zm1.47-3.27a.94.94 0 01-1.29.31c-3.23-1.99-8.15-2.56-11.97-1.4a.94.94 0 11-.54-1.8c4.37-1.32 9.79-.68 13.49 1.6.44.27.58.85.31 1.29zm.13-3.4C15.73 8.28 8.9 8.05 5.02 9.23a1.12 1.12 0 11-.65-2.15c4.45-1.35 11.99-1.09 16.18 1.4a1.12 1.12 0 01-1.15 1.92z" />
    </svg>
  );
}

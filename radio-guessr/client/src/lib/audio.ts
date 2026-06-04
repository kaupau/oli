// Keeps an <audio> element locked to the radio timeline: the same clip plays at
// the same position for everyone, derived from server time. Also preloads the
// next round's clip so transitions are seamless.
//
// Browsers block autoplay until a user gesture, so playback must be "armed"
// once via a tap/click (see arm()).

import { useEffect, useRef, useState } from "react";
import type { RoundPublic } from "../protocol";

const DRIFT_TOLERANCE_SEC = 0.35;

export function useSyncedAudio(
  current: RoundPublic | null,
  next: RoundPublic | null,
  serverNow: () => number,
  muted: boolean
) {
  const [armed, setArmed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);

  // Lazily create the audio elements.
  if (typeof window !== "undefined" && !audioRef.current) {
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
    preloadRef.current = new Audio();
    preloadRef.current.preload = "auto";
  }

  const arm = () => {
    const a = audioRef.current;
    if (!a) return;
    // A muted play()/pause() inside the gesture unlocks future playback.
    a.muted = true;
    a.play().then(() => a.pause()).catch(() => {});
    a.muted = false;
    setArmed(true);
  };

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  // Preload the upcoming clip.
  useEffect(() => {
    const p = preloadRef.current;
    if (p && next && p.src !== absolute(next.clipUrl)) {
      p.src = next.clipUrl;
      p.load();
    }
  }, [next]);

  // The sync loop.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current || !armed) return;

    if (a.src !== absolute(current.clipUrl)) {
      a.src = current.clipUrl;
      a.load();
    }

    let raf = 0;
    const tick = () => {
      const now = serverNow();
      const listenEnd = current.startAt + current.listenMs;
      const elapsedSec = (now - current.startAt) / 1000;

      if (now < current.startAt) {
        // Pre-roll: park at the clip start, silent until the window opens.
        if (!a.paused) a.pause();
      } else if (now <= listenEnd) {
        const target = current.clipStartSec + elapsedSec;
        if (Math.abs(a.currentTime - target) > DRIFT_TOLERANCE_SEC) {
          try {
            a.currentTime = target;
          } catch {
            /* not seekable yet */
          }
        }
        if (a.paused) a.play().catch(() => {});
      } else {
        // Reveal window: stop the music.
        if (!a.paused) a.pause();
      }
      raf = window.setTimeout(tick, 200);
    };
    tick();

    return () => {
      window.clearTimeout(raf);
      a.pause();
    };
  }, [current, armed, serverNow]);

  return { armed, arm };
}

function absolute(url: string): string {
  try {
    return new URL(url, location.href).href;
  } catch {
    return url;
  }
}

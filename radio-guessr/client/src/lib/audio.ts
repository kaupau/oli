// Keeps an <audio> element locked to the radio timeline: the same clip plays at
// the same position for everyone, derived from server time.
//
// Two audio elements are kept in an A/B pair: while one plays the current clip,
// the other preloads the next round's clip. On a round change we simply switch
// to whichever element already holds the upcoming clip, so there's no network
// load gap and transitions are seamless.
//
// All playback is routed through a small Web Audio graph
//   sourceA ─┬─► analyser            (tap, used by the ASCII visualizer)
//   sourceB ─┘
//            └─► gain ─► destination (audible output; mute = gain 0)
// The analyser taps the signal *before* the gain, so the visualizer keeps
// reacting to the music even while the player has the sound muted.
//
// Browsers block autoplay until a user gesture, so playback must be "armed"
// once via a tap/click (see arm()).

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoundPublic } from "../protocol";

// Only a genuinely jarring desync warrants a hard seek. Seeking on mobile forces
// a re-buffer, so a low threshold creates a stutter loop (seek → rebuffer → drift
// → seek). Normal timer jitter stays well under this, so we almost never seek.
const HARD_SEEK_SEC = 1.0;
// Below this we treat the clip as perfectly in sync and leave it alone.
const SOFT_SYNC_SEC = 0.25;
const FADE_SEC = 0.18;

export function useSyncedAudio(
  current: RoundPublic | null,
  next: RoundPublic | null,
  serverNow: () => number,
  muted: boolean
) {
  const [armed, setArmed] = useState(false);
  const slotsRef = useRef<HTMLAudioElement[]>([]);
  const activeRef = useRef<HTMLAudioElement | null>(null);

  // Web Audio graph (built lazily on the arming gesture).
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const wiredRef = useRef<WeakSet<HTMLAudioElement>>(new WeakSet());

  // Lazily create the two audio elements (A/B for seamless swaps).
  if (typeof window !== "undefined" && slotsRef.current.length === 0) {
    for (let i = 0; i < 2; i++) {
      const a = new Audio();
      a.preload = "auto";
      a.crossOrigin = "anonymous"; // iTunes previews allow CORS; demo clips are same-origin.
      slotsRef.current.push(a);
    }
  }

  const ensureGraph = () => {
    if (ctxRef.current) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      const gain = ctx.createGain();
      gain.gain.value = muted ? 0 : 1;
      gain.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      gainRef.current = gain;
    } catch {
      /* Web Audio unavailable — audio still plays via the element directly. */
    }
  };

  const wire = (el: HTMLAudioElement) => {
    const ctx = ctxRef.current;
    const analyser = analyserRef.current;
    const gain = gainRef.current;
    if (!ctx || !analyser || !gain || wiredRef.current.has(el)) return;
    try {
      const src = ctx.createMediaElementSource(el);
      src.connect(analyser); // visual tap (pre-gain, survives muting)
      src.connect(gain); // audible path
      wiredRef.current.add(el);
    } catch {
      /* already routed, or element not eligible — ignore. */
    }
  };

  const arm = () => {
    ensureGraph();
    ctxRef.current?.resume().catch(() => {});
    const a = slotsRef.current[0];
    if (!a) return;
    slotsRef.current.forEach(wire);
    // A muted play()/pause() inside the gesture unlocks future playback.
    a.muted = true;
    a.play().then(() => a.pause()).catch(() => {});
    a.muted = false;
    setArmed(true);
  };

  // Mute via the gain node when the graph exists (so the analyser still sees
  // audio); fall back to element.muted before the graph is built.
  useEffect(() => {
    const ctx = ctxRef.current;
    const gain = gainRef.current;
    if (ctx && gain) {
      gain.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.04);
      slotsRef.current.forEach((a) => (a.muted = false));
    } else {
      slotsRef.current.forEach((a) => (a.muted = muted));
    }
  }, [muted]);

  // Preload the upcoming clip into whichever element isn't currently active.
  useEffect(() => {
    if (!next) return;
    const slot = slotsRef.current.find((s) => s !== activeRef.current) ?? slotsRef.current[1];
    if (slot && slot.src !== absolute(next.clipUrl)) {
      slot.src = next.clipUrl;
      slot.load();
    }
  }, [next]);

  // The sync loop: keep the active element locked to the radio timeline.
  useEffect(() => {
    if (!current || !armed) return;
    const slots = slotsRef.current;

    // Prefer the element that already holds this clip (preloaded last round);
    // only load fresh if neither does.
    let a = slots.find((s) => s.src === absolute(current.clipUrl));
    if (!a) {
      a = slots.find((s) => s !== activeRef.current) ?? slots[0];
      if (a.src !== absolute(current.clipUrl)) {
        a.src = current.clipUrl;
        a.load();
      }
    }
    const el = a;
    activeRef.current = el;
    wire(el);
    // Park the other element so two clips never overlap.
    slots.forEach((s) => s !== el && !s.paused && s.pause());

    const fadeIn = () => {
      const ctx = ctxRef.current;
      const gain = gainRef.current;
      if (!ctx || !gain || muted) return;
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + FADE_SEC);
    };

    const seekTo = (sec: number) => {
      try {
        el.currentTime = sec;
      } catch {
        /* not seekable yet */
      }
    };

    let timer = 0;
    const tick = () => {
      const now = serverNow();
      const listenEnd = current.startAt + current.listenMs;
      const roundEnd = listenEnd + current.revealMs;
      const elapsedSec = (now - current.startAt) / 1000;

      if (now < current.startAt) {
        // Pre-roll: hold silent until the listen window opens.
        if (!el.paused) el.pause();
        el.playbackRate = 1;
      } else if (now <= roundEnd) {
        // Listen *and* reveal: keep the clip playing straight through so there's
        // no dead air while the answer is shown — the song just keeps going.
        const target = current.clipStartSec + elapsedSec;

        // Phones suspend the audio graph when the tab is backgrounded or the
        // screen locks; nudge it back awake each tick so sound returns on focus.
        if (!muted) ctxRef.current?.resume?.().catch(() => {});

        if (el.paused) {
          // (Re)starting: land near the right spot, then play.
          if (el.readyState >= 1 && Math.abs(el.currentTime - target) > HARD_SEEK_SEC) {
            seekTo(target);
          }
          el.playbackRate = 1;
          fadeIn();
          el.play().catch(() => {});
        } else if (!el.seeking && el.readyState >= 3) {
          // Only correct while we actually have buffered audio and aren't already
          // seeking — otherwise a correction just kicks off another rebuffer.
          const drift = el.currentTime - target; // +ve = running ahead
          const ad = Math.abs(drift);
          if (ad > HARD_SEEK_SEC) {
            // Big jump (e.g. returning from a locked screen): seek once.
            el.playbackRate = 1;
            seekTo(target);
          } else if (ad > SOFT_SYNC_SEC) {
            // Small drift: glide back by nudging the rate — inaudible, no stutter.
            el.playbackRate = drift > 0 ? 0.97 : 1.03;
          } else {
            el.playbackRate = 1;
          }
        }
      } else {
        // Round fully over: stop before the swap to the next clip.
        if (!el.paused) el.pause();
        el.playbackRate = 1;
      }
      timer = window.setTimeout(tick, 250);
    };
    tick();

    // Re-sync immediately when the tab regains focus rather than waiting for the
    // next tick — the gap after a phone unlock can be large.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        if (!muted) ctxRef.current?.resume?.().catch(() => {});
        window.clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      el.playbackRate = 1;
    };
  }, [current, armed, serverNow, muted]);

  const getAnalyser = useCallback(() => analyserRef.current, []);

  return { armed, arm, getAnalyser };
}

function absolute(url: string): string {
  try {
    return new URL(url, location.href).href;
  } catch {
    return url;
  }
}

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

const DRIFT_TOLERANCE_SEC = 0.35;
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

    let timer = 0;
    const tick = () => {
      const now = serverNow();
      const listenEnd = current.startAt + current.listenMs;
      const elapsedSec = (now - current.startAt) / 1000;

      if (now < current.startAt) {
        // Pre-roll: hold silent until the listen window opens.
        if (!el.paused) el.pause();
      } else if (now <= listenEnd) {
        const target = current.clipStartSec + elapsedSec;
        if (Math.abs(el.currentTime - target) > DRIFT_TOLERANCE_SEC) {
          try {
            el.currentTime = target;
          } catch {
            /* not seekable yet */
          }
        }
        if (el.paused) {
          fadeIn();
          el.play().catch(() => {});
        }
      } else {
        // Reveal window: stop the music.
        if (!el.paused) el.pause();
      }
      timer = window.setTimeout(tick, 200);
    };
    tick();

    return () => window.clearTimeout(timer);
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

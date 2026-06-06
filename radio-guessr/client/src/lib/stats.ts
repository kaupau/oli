// Per-browser streaks & stats, persisted in localStorage. No accounts needed.

import { useCallback, useEffect, useState } from "react";

/** Outcome of a single round from this player's point of view. */
export type PlayResult = "win" | "miss" | "skip";

/** One past round, for the "recently played" history. */
export type Play = {
  title: string;
  artist: string;
  result: PlayResult;
  at: number;
};

export type Stats = {
  played: number;
  correct: number;
  currentStreak: number;
  bestStreak: number;
  /** Distribution of streak lengths achieved (for a wordle-style bar chart). */
  history: number[]; // last N results, 1 = correct, 0 = wrong
  /** Recently played rounds (oldest first), capped. */
  plays: Play[];
};

const KEY = "radioguessr.stats.v1";
const MAX_PLAYS = 100;

const EMPTY: Stats = {
  played: 0,
  correct: 0,
  currentStreak: 0,
  bestStreak: 0,
  history: [],
  plays: [],
};

function load(): Stats {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return EMPTY;
  }
}

function persist(s: Stats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function useStats() {
  const [stats, setStats] = useState<Stats>(load);

  // Persist whenever stats change. Keeping this out of the setState updaters
  // means those stay pure reducers (no double-write under StrictMode, no I/O
  // mid-render).
  useEffect(() => {
    persist(stats);
  }, [stats]);

  // Score a guess (win/miss). Skipped rounds don't call this, so they never
  // break a streak — the streak counts consecutive *correct guesses*, and
  // rounds you didn't answer are simply not counted either way.
  const record = useCallback((correct: boolean) => {
    setStats((prev) => ({
      ...prev,
      played: prev.played + 1,
      correct: prev.correct + (correct ? 1 : 0),
      currentStreak: correct ? prev.currentStreak + 1 : 0,
      bestStreak: correct
        ? Math.max(prev.bestStreak, prev.currentStreak + 1)
        : prev.bestStreak,
      history: [...prev.history, correct ? 1 : 0].slice(-50),
    }));
  }, []);

  // Append a round to the "recently played" history (every round, including
  // ones the player didn't guess).
  const logPlay = useCallback((play: Omit<Play, "at">) => {
    setStats((prev) => ({
      ...prev,
      plays: [...prev.plays, { ...play, at: Date.now() }].slice(-MAX_PLAYS),
    }));
  }, []);

  return { stats, record, logPlay };
}

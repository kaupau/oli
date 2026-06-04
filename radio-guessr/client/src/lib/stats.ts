// Per-browser streaks & stats, persisted in localStorage. No accounts needed.

import { useCallback, useState } from "react";

export type Stats = {
  played: number;
  correct: number;
  currentStreak: number;
  bestStreak: number;
  /** Distribution of streak lengths achieved (for a wordle-style bar chart). */
  history: number[]; // last N results, 1 = correct, 0 = wrong
};

const KEY = "radioguessr.stats.v1";

const EMPTY: Stats = {
  played: 0,
  correct: 0,
  currentStreak: 0,
  bestStreak: 0,
  history: [],
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

export function useStats() {
  const [stats, setStats] = useState<Stats>(load);

  const record = useCallback((correct: boolean) => {
    setStats((prev) => {
      const next: Stats = {
        played: prev.played + 1,
        correct: prev.correct + (correct ? 1 : 0),
        currentStreak: correct ? prev.currentStreak + 1 : 0,
        bestStreak: correct
          ? Math.max(prev.bestStreak, prev.currentStreak + 1)
          : prev.bestStreak,
        history: [...prev.history, correct ? 1 : 0].slice(-50),
      };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore quota / privacy mode */
      }
      return next;
    });
  }, []);

  return { stats, record };
}

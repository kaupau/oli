// The radio: a single global timeline of rounds that every connected client
// sees identically. A round has a "listen" window (audio plays, guesses open)
// followed by a "reveal" window (answer + how everyone voted). The server is
// the single source of truth for timing and for the correct answer.

import { randomUUID } from "node:crypto";
import type { Track } from "./catalog.js";
import type { RoundPublic, Reveal, Choice } from "./protocol.js";

export type RadioOptions = {
  listenMs: number;
  revealMs: number;
  choiceCount: number;
  /** How far ahead of "now" the very first round starts. */
  leadMs: number;
};

type RoundState = {
  pub: RoundPublic;
  correctChoiceId: string;
  album?: string;
  artworkUrl?: string;
  /** choiceId -> count */
  tally: Map<string, number>;
  /** connection ids that already guessed (one guess per round). */
  guessers: Set<string>;
  revealed: boolean;
};

export type RadioHandlers = {
  onRound: (current: RoundPublic, next: RoundPublic | null) => void;
  onReveal: (reveal: Reveal) => void;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Radio {
  private current!: RoundState;
  private next!: RoundState;
  private index = 0;
  private timers: NodeJS.Timeout[] = [];

  constructor(
    private tracks: Track[],
    private opts: RadioOptions,
    private handlers: RadioHandlers
  ) {}

  start() {
    const startAt = Date.now() + this.opts.leadMs;
    this.current = this.makeRound(this.index++, startAt);
    this.next = this.makeRound(this.index++, this.roundEnd(this.current));
    this.scheduleCurrent();
  }

  stop() {
    for (const tm of this.timers) clearTimeout(tm);
    this.timers = [];
  }

  // --- public state for joiners ---

  currentPublic(): RoundPublic {
    return this.current.pub;
  }
  nextPublic(): RoundPublic {
    return this.next.pub;
  }
  /** Reveal payload if the current round is already in its reveal window. */
  currentRevealIfActive(): Reveal | undefined {
    return this.current.revealed ? this.buildReveal(this.current) : undefined;
  }

  /**
   * Record a guess. Returns `{ accepted }` true when the guess is valid (correct
   * round, first guess from this connection, still within the listen window),
   * along with `correct` so the player gets instant feedback on their own pick.
   * Telling a player whether their single locked-in guess was right does not
   * leak anything exploitable — they cannot guess again this round.
   */
  recordGuess(
    connId: string,
    roundId: string,
    choiceId: string
  ): { accepted: boolean; correct: boolean } {
    const reject = { accepted: false, correct: false };
    const r = this.current;
    if (r.pub.id !== roundId || r.revealed) return reject;
    if (Date.now() > r.pub.startAt + r.pub.listenMs) return reject;
    if (r.guessers.has(connId)) return reject;
    if (!r.pub.choices.some((c) => c.id === choiceId)) return reject;
    r.guessers.add(connId);
    r.tally.set(choiceId, (r.tally.get(choiceId) ?? 0) + 1);
    return { accepted: true, correct: choiceId === r.correctChoiceId };
  }

  // --- internals ---

  private roundEnd(r: RoundState): number {
    return r.pub.startAt + r.pub.listenMs + r.pub.revealMs;
  }

  private makeRound(index: number, startAt: number): RoundState {
    const answer = this.tracks[Math.floor(Math.random() * this.tracks.length)];

    // Prefer decoys from the same genre for a fairer challenge; top up with
    // random tracks if the genre is thin.
    const sameGenre = this.tracks.filter(
      (t) => t.id !== answer.id && t.genre && t.genre === answer.genre
    );
    const others = this.tracks.filter((t) => t.id !== answer.id);
    const pool = shuffle(sameGenre.length >= this.opts.choiceCount - 1 ? sameGenre : others);

    const decoys: Track[] = [];
    const seen = new Set<string>([answer.id]);
    for (const t of pool) {
      if (decoys.length >= this.opts.choiceCount - 1) break;
      // Avoid a decoy that is literally the same title+artist.
      const key = `${t.title}|${t.artist}`.toLowerCase();
      if (key === `${answer.title}|${answer.artist}`.toLowerCase()) continue;
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      decoys.push(t);
    }

    const choices: Choice[] = shuffle(
      [answer, ...decoys].map((t) => ({ id: t.id, title: t.title, artist: t.artist }))
    );

    const clipDurationSec = Math.round(this.opts.listenMs / 1000);
    // Start a little way into the preview for variety; keep within ~30s clips.
    const maxStart = Math.max(0, 28 - clipDurationSec);
    const clipStartSec = Math.floor(Math.random() * (maxStart + 1));

    const pub: RoundPublic = {
      id: randomUUID(),
      index,
      startAt,
      listenMs: this.opts.listenMs,
      revealMs: this.opts.revealMs,
      clipUrl: answer.previewUrl,
      clipStartSec,
      clipDurationSec,
      artworkUrl: answer.artworkUrl,
      choices,
    };

    return {
      pub,
      correctChoiceId: answer.id,
      album: answer.album,
      artworkUrl: answer.artworkUrl,
      tally: new Map(),
      guessers: new Set(),
      revealed: false,
    };
  }

  private buildReveal(r: RoundState): Reveal {
    let total = 0;
    const tally: Record<string, number> = {};
    for (const [k, v] of r.tally) {
      tally[k] = v;
      total += v;
    }
    return {
      roundId: r.pub.id,
      correctChoiceId: r.correctChoiceId,
      tally,
      totalGuesses: total,
      album: r.album,
      artworkUrl: r.artworkUrl,
    };
  }

  private scheduleCurrent() {
    const r = this.current;
    const revealAt = r.pub.startAt + r.pub.listenMs;
    const endAt = revealAt + r.pub.revealMs;

    this.timers.push(
      setTimeout(() => {
        r.revealed = true;
        this.handlers.onReveal(this.buildReveal(r));
      }, Math.max(0, revealAt - Date.now()))
    );

    this.timers.push(
      setTimeout(() => {
        this.advance();
      }, Math.max(0, endAt - Date.now()))
    );
  }

  private advance() {
    this.current = this.next;
    this.next = this.makeRound(this.index++, this.roundEnd(this.current));
    this.handlers.onRound(this.current.pub, this.next.pub);
    this.scheduleCurrent();
  }
}

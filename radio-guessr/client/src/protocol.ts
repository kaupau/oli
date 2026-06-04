// Wire protocol shared between server and client.
// Keep this file identical to client/src/protocol.ts.

export type Choice = { id: string; title: string; artist: string };

/** A round as the client is allowed to see it (correct answer withheld). */
export type RoundPublic = {
  id: string;
  index: number;
  /** Server epoch ms when the listening window opens. */
  startAt: number;
  listenMs: number;
  revealMs: number;
  clipUrl: string;
  clipStartSec: number;
  clipDurationSec: number;
  artworkUrl?: string;
  choices: Choice[];
};

export type Reveal = {
  roundId: string;
  correctChoiceId: string;
  /** choiceId -> number of players who picked it. */
  tally: Record<string, number>;
  totalGuesses: number;
  album?: string;
  artworkUrl?: string;
};

/** Server -> client messages. */
export type ServerMsg =
  | {
      t: "welcome";
      serverTime: number;
      listeners: number;
      current: RoundPublic;
      next: RoundPublic | null;
      /** Present when the client joins during a reveal window. */
      reveal?: Reveal;
    }
  | { t: "round"; current: RoundPublic; next: RoundPublic | null }
  | { t: "reveal"; reveal: Reveal }
  | { t: "listeners"; count: number }
  | { t: "pong"; t0: number; ts: number }
  | { t: "guessAck"; roundId: string; choiceId: string };

/** Client -> server messages. */
export type ClientMsg =
  | { t: "ping"; t0: number }
  | { t: "guess"; roundId: string; choiceId: string };

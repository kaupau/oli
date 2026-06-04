import { useEffect, useMemo, useRef, useState } from "react";
import { useRadio } from "./lib/ws";
import { useSyncedAudio } from "./lib/audio";
import { useStats } from "./lib/stats";
import { Choices } from "./components/Choices";
import { StatsModal } from "./components/StatsModal";
import { Disc } from "./components/Disc";
import { Cover } from "./components/Cover";
import { burstConfetti } from "./lib/confetti";

type Phase = "preroll" | "listen" | "reveal";

export default function App() {
  const radio = useRadio();
  const { stats, record } = useStats();
  const [muted, setMuted] = useState(false);
  const { armed, arm } = useSyncedAudio(radio.current, radio.next, radio.serverNow, muted);

  const [showStats, setShowStats] = useState(false);
  const [myChoice, setMyChoice] = useState<{ roundId: string; choiceId: string } | null>(null);
  const scoredRef = useRef<string | null>(null);

  // Re-render at ~10fps to drive the countdown smoothly.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  const current = radio.current;
  const reveal = radio.reveal;
  const myChoiceId = myChoice && current && myChoice.roundId === current.id ? myChoice.choiceId : null;

  // Phase + countdown derived from synced server time.
  const { phase, secondsLeft, progress, playing } = useMemo(() => {
    if (!current) return { phase: "preroll" as Phase, secondsLeft: 0, progress: 0, playing: false };
    const now = radio.serverNow();
    const listenEnd = current.startAt + current.listenMs;
    const roundEnd = listenEnd + current.revealMs;
    if (now < current.startAt) {
      return {
        phase: "preroll" as Phase,
        secondsLeft: Math.ceil((current.startAt - now) / 1000),
        progress: 0,
        playing: false,
      };
    }
    if (now <= listenEnd) {
      return {
        phase: "listen" as Phase,
        secondsLeft: Math.max(0, Math.ceil((listenEnd - now) / 1000)),
        progress: (now - current.startAt) / current.listenMs,
        playing: true,
      };
    }
    return {
      phase: "reveal" as Phase,
      secondsLeft: Math.max(0, Math.ceil((roundEnd - now) / 1000)),
      progress: (now - listenEnd) / current.revealMs,
      playing: false,
    };
  }, [current, radio.serverNow, reveal]);

  // Score the round once, when the answer is revealed and the player guessed.
  useEffect(() => {
    if (!reveal) return;
    if (scoredRef.current === reveal.roundId) return;
    if (myChoice && myChoice.roundId === reveal.roundId) {
      scoredRef.current = reveal.roundId;
      const correct = myChoice.choiceId === reveal.correctChoiceId;
      record(correct);
      if (correct) burstConfetti();
    }
  }, [reveal, myChoice, record]);

  const pick = (choiceId: string) => {
    if (!current || phase !== "listen" || myChoiceId) return;
    setMyChoice({ roundId: current.id, choiceId });
    radio.guess(current.id, choiceId);
  };

  const correctChoice =
    reveal && current ? current.choices.find((c) => c.id === reveal.correctChoiceId) : null;
  const wasCorrect = reveal && myChoiceId ? myChoiceId === reveal.correctChoiceId : null;

  const totalSec =
    phase === "reveal"
      ? Math.round((current?.revealMs ?? 0) / 1000)
      : Math.round((current?.listenMs ?? 0) / 1000);

  return (
    <div className="desktop">
      <div className="win">
        <div className="titlebar-mac">
          <div className="traffic">
            <span className="dot r" />
            <span className="dot y" />
            <span className="dot g" />
          </div>
          <div className="tt">
            <Disc size={14} />
            Mixtape
          </div>
        </div>

        <div className="px-4 pt-4 pb-3">
          <PlayerStrip
            phase={phase}
            progress={progress}
            secondsLeft={secondsLeft}
            totalSec={totalSec}
            playing={playing && !muted}
            title={correctChoice?.title}
            artist={correctChoice?.artist}
            album={reveal?.album}
            coverUrl={phase === "reveal" ? reveal?.artworkUrl : current?.artworkUrl}
            wasCorrect={wasCorrect}
            guessed={myChoiceId !== null}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            onShowStats={() => setShowStats(true)}
          />

          <div className="mt-3.5">
            {current ? (
              <Choices
                choices={current.choices}
                phase={phase}
                myChoiceId={myChoiceId}
                reveal={reveal}
                onPick={pick}
              />
            ) : (
              <div className="list px-4 py-8 text-center soft">Connecting to the station…</div>
            )}
          </div>
        </div>

        <div className="statusbar">
          <span className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${radio.status === "open" ? "pulse" : ""}`}
              style={{ background: radio.status === "open" ? "#28c840" : "#b8bcc4" }}
            />
            {radio.status === "open" ? "Live" : "Off air"} · {radio.listeners} listening
          </span>
          <span>Round {current ? current.index + 1 : "—"}</span>
        </div>
      </div>

      {!armed && current && <ArmOverlay onArm={arm} />}
      {showStats && <StatsModal stats={stats} onClose={() => setShowStats(false)} />}
    </div>
  );
}

/* ----------------------------------------------------------------- */

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function PlayerStrip({
  phase,
  progress,
  secondsLeft,
  totalSec,
  playing,
  title,
  artist,
  album,
  coverUrl,
  wasCorrect,
  guessed,
  muted,
  onToggleMute,
  onShowStats,
}: {
  phase: Phase;
  progress: number;
  secondsLeft: number;
  totalSec: number;
  playing: boolean;
  title?: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
  wasCorrect: boolean | null;
  guessed: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onShowStats: () => void;
}) {
  const pct = Math.min(100, Math.max(0, progress * 100));
  const elapsed = Math.min(totalSec, Math.max(0, progress * totalSec));
  const low = phase !== "reveal" && secondsLeft <= 5;

  const status =
    phase === "reveal" ? (
      title ? (
        <span key={title} className="fade-up">
          <span className="font-semibold">{title}</span>
          <span className="soft"> — {artist}</span>
          {album ? <span className="faint"> · {album}</span> : null}
        </span>
      ) : (
        "—"
      )
    ) : phase === "preroll" ? (
      "Up next…"
    ) : (
      "Guess the track — A, B, C or D?"
    );

  return (
    <div className="flex items-center gap-3">
      <Cover src={coverUrl} revealed={phase === "reveal"} playing={playing} size={58} />

      <div className="display min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-[12.5px] leading-tight">{status}</div>
          {phase === "reveal" && guessed && (
            <span className={`shrink-0 text-[11px] font-semibold ${wasCorrect ? "accent" : "bad-t"}`}>
              {wasCorrect ? "✓ Correct" : "✗ Missed"}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="tnum soft w-7 shrink-0 text-[11px]">{fmt(elapsed)}</span>
          <div className="aqua-track flex-1">
            <span style={{ width: `${pct}%` }} />
          </div>
          <span
            className={`tnum w-9 shrink-0 text-right text-[12px] font-semibold ${
              low ? "bad-t" : "accent"
            }`}
          >
            −{fmt(secondsLeft)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1.5">
        <button className="aqua-btn" onClick={onShowStats}>
          Stats
        </button>
        <button className="aqua-btn" onClick={onToggleMute}>
          {muted ? "Unmute" : "Sound"}
        </button>
      </div>
    </div>
  );
}

function ArmOverlay({ onArm }: { onArm: () => void }) {
  return (
    <div className="overlay" onClick={onArm}>
      <div
        className="win fade-up max-w-[380px] p-6"
        onClick={(e) => e.stopPropagation()}
        style={{ borderRadius: 12 }}
      >
        <div className="flex gap-4">
          <Disc size={56} />
          <div className="min-w-0">
            <div className="text-[15px] font-semibold">Welcome to Mixtape</div>
            <p className="soft mt-1.5 text-[12.5px] leading-relaxed">
              A short clip plays for everyone at once. Guess the track before time runs out. This
              page plays audio — please turn your sound on.
            </p>
            <div className="mt-4 flex justify-end">
              <button onClick={onArm} className="aqua-btn aqua-btn-blue px-6 py-1.5 text-[13px]">
                Enter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

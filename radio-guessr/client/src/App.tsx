import { useEffect, useRef, useState } from "react";
import { useRadio } from "./lib/ws";
import { useSyncedAudio } from "./lib/audio";
import { useStats } from "./lib/stats";
import { Choices } from "./components/Choices";
import { StatsModal } from "./components/StatsModal";
import { Disc } from "./components/Disc";
import { Cover } from "./components/Cover";
import { Visualizer } from "./components/Visualizer";
import { ServiceLinks } from "./components/ServiceLinks";
import { burstConfetti } from "./lib/confetti";

type Phase = "preroll" | "listen" | "reveal";

export default function App() {
  const radio = useRadio();
  const { stats, record, logPlay } = useStats();
  const [muted, setMuted] = useState(false);
  const { armed, arm, getAnalyser } = useSyncedAudio(
    radio.current,
    radio.next,
    radio.serverNow,
    muted
  );

  const [showStats, setShowStats] = useState(false);
  const [myChoice, setMyChoice] = useState<{ roundId: string; choiceId: string } | null>(null);
  const scoredRef = useRef<string | null>(null);
  const loggedRef = useRef<string | null>(null);
  // Seed from the persisted streak so reloading a page mid-streak (e.g. a saved
  // streak of 5) doesn't fire milestone confetti on mount.
  const milestoneRef = useRef(stats.currentStreak);

  // Re-render at ~10fps to drive the countdown smoothly.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  const current = radio.current;
  const reveal = radio.reveal;
  const myChoiceId = myChoice && current && myChoice.roundId === current.id ? myChoice.choiceId : null;
  // Server's verdict on our pick this round, the instant the ack arrives.
  const myResult =
    radio.lastAck && current && radio.lastAck.roundId === current.id ? radio.lastAck.correct : null;

  // Phase + countdown + progress from synced server time. Recomputed every
  // render — the ~10fps tick above drives it. Must NOT be useMemo'd: current and
  // serverNow are stable within a round, so memoizing would freeze the bar.
  const { phase, secondsLeft, progress, playing } = (() => {
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
      // The clip keeps playing through the reveal, so the disc + visualizer
      // should stay alive too.
      playing: true,
    };
  })();

  // Score the round once, the instant the server acks our guess — so the
  // stats update and the confetti fire immediately on a correct pick rather
  // than waiting for the reveal window.
  useEffect(() => {
    const ack = radio.lastAck;
    if (!ack) return;
    if (scoredRef.current === ack.roundId) return;
    scoredRef.current = ack.roundId;
    record(ack.correct);
    if (ack.correct) burstConfetti();
  }, [radio.lastAck, record]);

  // Log every round to "recently played" at reveal — including ones we didn't
  // guess — capturing the actual track so players can browse what they've seen.
  useEffect(() => {
    if (!reveal || !current || reveal.roundId !== current.id) return;
    if (loggedRef.current === reveal.roundId) return;
    const answer = current.choices.find((c) => c.id === reveal.correctChoiceId);
    if (!answer) return;
    loggedRef.current = reveal.roundId;
    const guessedThis = myChoice?.roundId === reveal.roundId;
    const result = guessedThis
      ? myChoice!.choiceId === reveal.correctChoiceId
        ? "win"
        : "miss"
      : "skip";
    logPlay({ title: answer.title, artist: answer.artist, result });
  }, [reveal, current, myChoice, logPlay]);

  // Extra celebration when the streak crosses a milestone (every 5 in a row).
  useEffect(() => {
    const s = stats.currentStreak;
    if (s > milestoneRef.current && s > 0 && s % 5 === 0) {
      burstConfetti();
      setTimeout(burstConfetti, 180);
    }
    milestoneRef.current = s;
  }, [stats.currentStreak]);

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
      <Visualizer getAnalyser={getAnalyser} active={playing} />
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
          <button className="titlebar-btn" onClick={() => setShowStats(true)}>
            Stats
          </button>
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
          />

          <div className="mt-3.5">
            {current ? (
              <Choices
                choices={current.choices}
                phase={phase}
                myChoiceId={myChoiceId}
                myResult={myResult}
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
          {stats.currentStreak > 0 && (
            <span
              key={stats.currentStreak}
              className="streak"
              title={`${stats.currentStreak} correct in a row`}
            >
              <span className="flame">🔥</span>
              <span className="tnum">{stats.currentStreak}</span>
              {stats.currentStreak >= 3 && <span className="streak-hot"> on fire!</span>}
            </span>
          )}
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
    <div className="flex items-stretch gap-3">
      <Cover src={coverUrl} revealed={phase === "reveal"} playing={playing} size={64} />

      <div className="display flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-[12.5px] leading-tight">{status}</div>
          {phase === "reveal" && title && (
            <div className="flex shrink-0 items-center gap-2.5 fade-up">
              {guessed && (
                <span className={`text-[11px] font-semibold ${wasCorrect ? "accent" : "bad-t"}`}>
                  {wasCorrect ? "✓ Correct" : "✗ Missed"}
                </span>
              )}
              <ServiceLinks title={title} artist={artist ?? ""} compact />
            </div>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
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
          <button
            className="mute-btn shrink-0"
            onClick={onToggleMute}
            title={muted ? "Unmute" : "Mute"}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            <SpeakerIcon muted={muted} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true">
      <path
        d="M4 9v6h4l5 4V5L8 9H4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {muted ? (
        <path
          d="M17 9l4 6M21 9l-4 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
    </svg>
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

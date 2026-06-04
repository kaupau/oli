import { useEffect, useMemo, useRef, useState } from "react";
import { useRadio } from "./lib/ws";
import { useSyncedAudio } from "./lib/audio";
import { useStats } from "./lib/stats";
import { Equalizer } from "./components/Equalizer";
import { Choices } from "./components/Choices";
import { StatsModal } from "./components/StatsModal";
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

  const mm = Math.floor(secondsLeft / 60);
  const timeStr = `${mm}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-col gap-7 px-5 py-9 sm:py-12">
      <Header
        listeners={radio.listeners}
        streak={stats.currentStreak}
        status={radio.status}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onShowStats={() => setShowStats(true)}
      />

      <Player
        phase={phase}
        timeStr={timeStr}
        progress={progress}
        playing={playing && !muted}
        title={correctChoice?.title}
        artist={correctChoice?.artist}
        artworkUrl={reveal?.artworkUrl}
        wasCorrect={wasCorrect}
        guessed={myChoiceId !== null}
      />

      {current ? (
        <Choices
          choices={current.choices}
          phase={phase}
          myChoiceId={myChoiceId}
          reveal={reveal}
          onPick={pick}
        />
      ) : (
        <div className="panel px-4 py-8 text-center muted">Connecting to the station…</div>
      )}

      <FooterMini roundIndex={current ? current.index + 1 : null} />

      {!armed && current && <ArmOverlay onArm={arm} />}
      {showStats && <StatsModal stats={stats} onClose={() => setShowStats(false)} />}
    </div>
  );
}

/* ----------------------------------------------------------------- */

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold ${className}`} style={{ letterSpacing: "0.3em" }}>
      MIXTAPE
    </span>
  );
}

function Header({
  listeners,
  streak,
  status,
  muted,
  onToggleMute,
  onShowStats,
}: {
  listeners: number;
  streak: number;
  status: string;
  muted: boolean;
  onToggleMute: () => void;
  onShowStats: () => void;
}) {
  const live = status === "open";
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div>
        <Wordmark className="text-[15px]" />
        <div className="label mt-1.5">98.7 FM</div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="muted flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${live ? "pulse" : ""}`}
            style={{ background: live ? "var(--accent)" : "var(--faint)" }}
          />
          {live ? "Live" : "Off air"}
        </span>
        <span className="muted">· {listeners} listening</span>
        {streak > 0 && <span className="accent">· streak {streak}</span>}
        <button className="btn-ghost ml-1 px-2.5 py-1" onClick={onToggleMute}>
          {muted ? "Muted" : "Sound"}
        </button>
        <button className="btn-ghost px-2.5 py-1" onClick={onShowStats}>
          Stats
        </button>
      </div>
    </header>
  );
}

function Player({
  phase,
  timeStr,
  progress,
  playing,
  title,
  artist,
  artworkUrl,
  wasCorrect,
  guessed,
}: {
  phase: Phase;
  timeStr: string;
  progress: number;
  playing: boolean;
  title?: string;
  artist?: string;
  artworkUrl?: string;
  wasCorrect: boolean | null;
  guessed: boolean;
}) {
  const pct = Math.min(100, Math.max(0, progress * 100));
  const heading =
    phase === "reveal" ? "Now playing" : phase === "preroll" ? "Get ready" : "Guess the track";
  const timerLabel = phase === "reveal" ? "Next in" : phase === "preroll" ? "Starts in" : "Time left";

  return (
    <section className="panel flex flex-col gap-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="label pt-1">{heading}</div>
        <div className="text-right leading-none">
          <div className="label">{timerLabel}</div>
          <div className="accent tnum mt-1.5 text-[30px] font-semibold leading-none">{timeStr}</div>
        </div>
      </div>

      {/* Center: spectrum while listening, the revealed track on reveal. */}
      <div className="flex min-h-[52px] items-center">
        {phase === "reveal" ? (
          <div key={title} className="fade-up flex w-full items-center gap-3">
            {artworkUrl ? (
              <img src={artworkUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
            ) : (
              <div
                className="accent grid h-12 w-12 place-items-center rounded-md text-lg"
                style={{ background: "var(--surface-2)" }}
              >
                ♪
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px]">{title ?? "—"}</div>
              <div className="muted truncate text-xs">{artist}</div>
            </div>
            <div className="shrink-0 text-xs">
              {guessed ? (
                wasCorrect ? (
                  <span className="accent">✓ You got it</span>
                ) : (
                  <span className="bad">✗ Missed</span>
                )
              ) : (
                <span className="faint">no guess</span>
              )}
            </div>
          </div>
        ) : (
          <Equalizer playing={playing} />
        )}
      </div>

      <div className="track">
        <span style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}

function FooterMini({ roundIndex }: { roundIndex: number | null }) {
  return (
    <footer className="text-center text-xs muted">
      Round {roundIndex ?? "—"} · the same song plays for everyone, everywhere.
    </footer>
  );
}

function ArmOverlay({ onArm }: { onArm: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center px-6"
      style={{ background: "rgba(10,9,7,0.78)", backdropFilter: "blur(4px)" }}
      onClick={onArm}
    >
      <div
        className="panel fade-up w-full max-w-sm p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Wordmark className="text-xl" />
        <div className="label mt-2">98.7 FM</div>
        <p className="mt-6 text-sm leading-relaxed">
          A short clip plays for everyone at once. Guess the track before time runs out.
        </p>
        <p className="faint mt-3 text-xs">Plays audio — turn your sound on.</p>
        <button onClick={onArm} className="btn-accent mt-7 w-full py-3 text-sm">
          Enter
        </button>
      </div>
    </div>
  );
}

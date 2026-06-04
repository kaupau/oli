import { useEffect, useMemo, useRef, useState } from "react";
import { useRadio } from "./lib/ws";
import { useSyncedAudio } from "./lib/audio";
import { useStats } from "./lib/stats";
import { burstConfetti } from "./lib/confetti";
import { Equalizer } from "./components/Equalizer";
import { Choices } from "./components/Choices";
import { StatsModal } from "./components/StatsModal";

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

  return (
    <div className="relative mx-auto flex min-h-full max-w-xl flex-col px-4 pb-12 pt-5">
      <Header
        listeners={radio.listeners}
        status={radio.status}
        rtt={radio.rtt}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onShowStats={() => setShowStats(true)}
        streak={stats.currentStreak}
      />

      <main className="mt-5 flex flex-1 flex-col">
        {/* Now-playing card */}
        <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(80,60,160,0.18)]">
          {phase === "reveal" && correctChoice ? (
            <RevealInfo
              key={reveal!.roundId}
              title={correctChoice.title}
              artist={correctChoice.artist}
              album={reveal?.album}
              artworkUrl={reveal?.artworkUrl}
              wasCorrect={wasCorrect}
              didGuess={!!myChoiceId}
              secondsLeft={secondsLeft}
            />
          ) : (
            <div className="flex items-center gap-5">
              <MysteryDisc spinning={playing && !muted} />
              <div className="min-w-0 flex-1">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                    phase === "preroll"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-rose-100 text-rose-600"
                  }`}
                >
                  {phase === "preroll" ? "🍿 Up next" : "🔴 On air now"}
                </span>
                <p className="mt-2 text-2xl font-extrabold leading-tight text-zinc-800">
                  {phase === "preroll" ? "Get ready…" : "🎵 What's this track?"}
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <Equalizer playing={playing && !muted} />
                  <span className="ml-auto flex items-baseline gap-1 text-zinc-400">
                    <span className="text-3xl font-extrabold tabular-nums text-violet-600">
                      {secondsLeft}
                    </span>
                    <span className="text-sm font-semibold">s</span>
                  </span>
                </div>
                <ProgressBar progress={progress} />
              </div>
            </div>
          )}
        </section>

        {/* Choices */}
        <div className="mt-4">
          {current ? (
            <Choices
              choices={current.choices}
              phase={phase}
              myChoiceId={myChoiceId}
              reveal={reveal}
              onPick={pick}
            />
          ) : (
            <p className="py-10 text-center text-zinc-400">🎧 Tuning in…</p>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-zinc-400">
          Round #{current ? current.index + 1 : "—"} · 🌍 the same song is playing for everyone right now
        </p>
      </main>

      {!armed && current && <ArmOverlay onArm={arm} />}
      {showStats && <StatsModal stats={stats} onClose={() => setShowStats(false)} />}
    </div>
  );
}

/** Thin gradient progress bar under the now-playing info. */
function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400 transition-all duration-200 ease-linear"
        style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
      />
    </div>
  );
}

/** Square mystery cover with a spinning disc + question mark. */
function MysteryDisc({ spinning }: { spinning: boolean }) {
  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100">
      <span
        className="text-5xl"
        style={{ animation: spinning ? "spin-slow 3s linear infinite" : "none" }}
      >
        💿
      </span>
      <span className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-violet-600 text-sm font-black text-white shadow">
        ?
      </span>
    </div>
  );
}

function Header({
  listeners,
  status,
  rtt,
  muted,
  onToggleMute,
  onShowStats,
  streak,
}: {
  listeners: number;
  status: string;
  rtt: number;
  muted: boolean;
  onToggleMute: () => void;
  onShowStats: () => void;
  streak: number;
}) {
  const syncColor =
    status !== "open" ? "bg-rose-400" : rtt < 120 ? "bg-emerald-400" : "bg-amber-400";
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-2xl">📻</span>
        <span className="text-lg font-extrabold tracking-tight text-zinc-800">
          Radio<span className="text-violet-600">Guessr</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm">
          <span className={`h-2 w-2 rounded-full ${syncColor}`} />
          🎧 {listeners}
        </span>
        {streak > 0 && (
          <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-bold text-orange-600 shadow-sm">
            🔥 {streak}
          </span>
        )}
        <IconButton label={muted ? "Unmute" : "Mute"} onClick={onToggleMute}>
          {muted ? "🔇" : "🔊"}
        </IconButton>
        <IconButton label="Stats" onClick={onShowStats}>
          📊
        </IconButton>
      </div>
    </header>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="grid h-8 w-8 place-items-center rounded-full border border-zinc-200 bg-white text-sm shadow-sm transition hover:bg-zinc-50 active:scale-95"
    >
      {children}
    </button>
  );
}

function RevealInfo({
  title,
  artist,
  album,
  artworkUrl,
  wasCorrect,
  didGuess,
  secondsLeft,
}: {
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  wasCorrect: boolean | null;
  didGuess: boolean;
  secondsLeft: number;
}) {
  const status = !didGuess
    ? { emoji: "🎶", text: "The answer was", cls: "bg-zinc-100 text-zinc-500" }
    : wasCorrect
      ? { emoji: "✅", text: "Nailed it!", cls: "bg-emerald-100 text-emerald-700" }
      : { emoji: "❌", text: "So close!", cls: "bg-rose-100 text-rose-600" };

  return (
    <div className="animate-pop flex items-start gap-4">
      <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 shadow-sm">
        {artworkUrl ? (
          <img src={artworkUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-3xl">🎵</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${status.cls}`}
          >
            {status.emoji} {status.text}
          </span>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-500">
            ⏱️ {secondsLeft}s
          </span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-xl font-extrabold leading-snug text-zinc-800">
          {title}
        </p>
        <p className="mt-0.5 truncate text-sm text-zinc-500">
          {artist}
          {album ? ` · ${album}` : ""}
        </p>
      </div>
    </div>
  );
}

function ArmOverlay({ onArm }: { onArm: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#f7f7f5]/80 px-6 backdrop-blur-md"
      onClick={onArm}
    >
      <div className="text-7xl" style={{ animation: "bob 3s ease-in-out infinite" }}>
        📻
      </div>
      <h1 className="mt-5 text-4xl font-black tracking-tight text-zinc-800">
        Radio<span className="text-violet-600">Guessr</span>
      </h1>
      <p className="mt-3 max-w-xs text-center text-zinc-500">
        🎧 A short clip plays for <b className="text-zinc-700">everyone at once</b>.
        Guess the track before the timer runs out!
      </p>
      <button
        onClick={onArm}
        className="mt-8 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 px-9 py-3.5 text-lg font-bold text-white shadow-lg shadow-violet-500/30 transition hover:scale-[1.03] active:scale-95"
      >
        🎧 Tune in
      </button>
      <p className="mt-4 text-xs text-zinc-400">Tip: open in two tabs to feel the sync ✨</p>
    </div>
  );
}

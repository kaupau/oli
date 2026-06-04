import { useEffect, useMemo, useRef, useState } from "react";
import { useRadio } from "./lib/ws";
import { useSyncedAudio } from "./lib/audio";
import { useStats } from "./lib/stats";
import { RingTimer } from "./components/RingTimer";
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
      record(myChoice.choiceId === reveal.correctChoiceId);
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
    <div className="relative mx-auto flex min-h-full max-w-2xl flex-col px-4 pb-10 pt-5">
      <Header
        listeners={radio.listeners}
        status={radio.status}
        rtt={radio.rtt}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onShowStats={() => setShowStats(true)}
        streak={stats.currentStreak}
      />

      <main className="mt-6 flex flex-1 flex-col">
        {/* Now-playing card */}
        <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-6">
          <div className="flex items-center gap-6">
            <RingTimer
              progress={progress}
              secondsLeft={secondsLeft}
              label={phase === "listen" ? "listen" : phase === "reveal" ? "next in" : "starting"}
              accent={phase === "reveal" ? "#34d399" : "#e879f9"}
            />
            <div className="min-w-0 flex-1">
              {phase === "reveal" && correctChoice ? (
                <RevealInfo
                  title={correctChoice.title}
                  artist={correctChoice.artist}
                  album={reveal?.album}
                  artworkUrl={reveal?.artworkUrl}
                  wasCorrect={wasCorrect}
                  didGuess={!!myChoiceId}
                />
              ) : (
                <div>
                  <p className="text-xs uppercase tracking-widest text-fuchsia-300/80">
                    {phase === "preroll" ? "Up next" : "On air now"}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {phase === "preroll" ? "Get ready…" : "What's this track?"}
                  </p>
                  <div className="mt-4">
                    <Equalizer playing={playing && !muted} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Choices */}
        <div className="mt-5">
          {current ? (
            <Choices
              choices={current.choices}
              phase={phase}
              myChoiceId={myChoiceId}
              reveal={reveal}
              onPick={pick}
            />
          ) : (
            <p className="py-10 text-center text-white/40">Tuning in…</p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-white/30">
          Round #{current ? current.index + 1 : "—"} · the same song is playing for everyone right now
        </p>
      </main>

      {!armed && current && <ArmOverlay onArm={arm} />}
      {showStats && <StatsModal stats={stats} onClose={() => setShowStats(false)} />}
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
      <div className="flex items-center gap-2.5">
        <span className="text-xl">📻</span>
        <span className="text-lg font-extrabold tracking-tight text-white">
          Radio<span className="text-fuchsia-400">Guessr</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/60">
          <span className={`h-2 w-2 rounded-full ${syncColor}`} />
          {listeners} live
        </span>
        {streak > 0 && (
          <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-2.5 py-1 text-xs font-semibold text-fuchsia-200">
            🔥 {streak}
          </span>
        )}
        <button
          onClick={onToggleMute}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-sm hover:bg-white/10"
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <button
          onClick={onShowStats}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-sm hover:bg-white/10"
          title="Stats"
        >
          📊
        </button>
      </div>
    </header>
  );
}

function RevealInfo({
  title,
  artist,
  album,
  artworkUrl,
  wasCorrect,
  didGuess,
}: {
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  wasCorrect: boolean | null;
  didGuess: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white/10">
        {artworkUrl ? (
          <img src={artworkUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">🎵</div>
        )}
      </div>
      <div className="min-w-0">
        <p
          className={`text-xs font-bold uppercase tracking-widest ${
            !didGuess ? "text-white/40" : wasCorrect ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {!didGuess ? "The answer was" : wasCorrect ? "✓ Nailed it" : "✗ Missed"}
        </p>
        <p className="mt-0.5 truncate text-xl font-bold text-white">{title}</p>
        <p className="truncate text-sm text-white/50">
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
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#07070c]/90 backdrop-blur-sm"
      onClick={onArm}
    >
      <div className="text-6xl">📻</div>
      <h1 className="mt-4 text-3xl font-extrabold text-white">
        Radio<span className="text-fuchsia-400">Guessr</span>
      </h1>
      <p className="mt-2 max-w-xs text-center text-white/50">
        A 20-second clip plays for everyone at once. Guess the track before the
        timer runs out.
      </p>
      <button
        onClick={onArm}
        className="mt-8 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-8 py-3 text-lg font-bold text-black shadow-lg shadow-fuchsia-500/20 transition hover:scale-105"
      >
        Tune in ▶
      </button>
    </div>
  );
}

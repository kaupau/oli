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
  const [visitorNo] = useState(() => 31000 + Math.floor(Math.random() * 9000));

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

  // Marquee + readout text per phase.
  const mm = Math.floor(secondsLeft / 60);
  const timeStr = `${mm}:${String(secondsLeft % 60).padStart(2, "0")}`;
  const tickerText =
    phase === "reveal" && correctChoice
      ? `♪ NOW PLAYING:  ${correctChoice.title.toUpperCase()} — ${correctChoice.artist.toUpperCase()}${
          reveal?.album ? `  ·  ${reveal.album.toUpperCase()}` : ""
        }  ♪   ${myChoiceId ? (wasCorrect ? "*** YOU GOT IT! ***" : "*** BETTER LUCK NEXT TIME ***") : ""}`
      : phase === "preroll"
        ? "GET READY...  NEXT TRACK STARTING SOON  ►►►  TURN UP YOUR SPEAKERS"
        : "◄◄  NAME THAT TUNE — IS IT A, B, C OR D ?  ◄◄  GUESS BEFORE THE TIMER HITS ZERO  ►►►";

  return (
    <div className="mx-auto w-full max-w-[640px] px-3 py-4">
      <NewsTicker />
      <SiteBanner
        listeners={radio.listeners}
        streak={stats.currentStreak}
        status={radio.status}
        muted={muted}
        onToggleMute={() => setMuted((m) => !m)}
        onShowStats={() => setShowStats(true)}
      />

      <PlayerPanel
        phase={phase}
        timeStr={timeStr}
        tickerText={tickerText}
        progress={progress}
        playing={playing && !muted}
        artworkUrl={phase === "reveal" ? reveal?.artworkUrl : undefined}
      />

      <div className="mt-3">
        {current ? (
          <Choices
            choices={current.choices}
            phase={phase}
            myChoiceId={myChoiceId}
            reveal={reveal}
            onPick={pick}
          />
        ) : (
          <div className="bevel-in p-4 text-center text-black">
            <span className="lcd lcd-amber blink font-bold">CONNECTING TO STATION…</span>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-base tracking-wide text-white/55">
        » ROUND #{current ? current.index + 1 : "—"} · the same song is on every radio right now «
      </p>

      <Footer visitorNo={visitorNo} listeners={radio.listeners} rtt={radio.rtt} status={radio.status} />

      {!armed && current && <ArmOverlay onArm={arm} visitorNo={visitorNo} />}
      {showStats && <StatsModal stats={stats} onClose={() => setShowStats(false)} />}
    </div>
  );
}

/* ----------------------------------------------------------------- */

function NewsTicker() {
  const text =
    "★ WELCOME TO RADIOGUESSR 98.7 FM ★ THE #1 NAME-THAT-TUNE STATION ON THE WORLD WIDE WEB ★ NOW WITH 100% MORE SOUND ★ SIGN OUR GUESTBOOK ★ TELL A FRIEND ★";
  return (
    <div className="bevel-in mb-2 overflow-hidden bg-black px-0 py-1" style={{ background: "#07140a" }}>
      <div className="marquee marquee-fast lcd text-base">{text}</div>
    </div>
  );
}

function SiteBanner({
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
  return (
    <header className="bevel-out flex flex-wrap items-center gap-3 p-2">
      <div
        className="bevel-in scanlines flex items-center gap-2.5 px-2.5 py-1.5"
        style={{ background: "#07140a" }}
      >
        <span className="lcd text-3xl leading-none">((•))</span>
        <div className="leading-none">
          <div className="rainbow font-display text-[15px] leading-none">RadioGuessr</div>
          <div className="lcd mt-2 text-[13px] leading-none tracking-[0.12em]">
            98.7 FM · NAME THAT TUNE
          </div>
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <OnAir status={status} />
        <Readout label="TUNED IN" value={listeners} />
        {streak > 0 && <Readout label="STREAK" value={streak} amber />}
        <button
          className="btn95 px-2.5 py-1.5 text-base leading-none"
          onClick={onToggleMute}
          title={muted ? "Sound off" : "Sound on"}
        >
          <span>{muted ? "♪̶ OFF" : "♪ ON"}</span>
        </button>
        <button className="btn95 px-2.5 py-1.5 leading-none" onClick={onShowStats}>
          <span className="font-display text-[9px]">STATS</span>
        </button>
      </div>
    </header>
  );
}

function OnAir({ status }: { status: string }) {
  const live = status === "open";
  return (
    <div className="bevel-in flex items-center gap-1.5 px-2 py-1" style={{ background: "#07140a" }}>
      <span
        className={`h-2.5 w-2.5 rounded-full ${live ? "blink bg-red-500" : "bg-zinc-600"}`}
        style={live ? { boxShadow: "0 0 6px 1px #ff2d2d" } : undefined}
      />
      <span className={`lcd lcd-amber font-display text-[9px] ${live ? "" : "opacity-60"}`}>
        {live ? "ON AIR" : "…"}
      </span>
    </div>
  );
}

function Readout({ label, value, amber }: { label: string; value: number; amber?: boolean }) {
  return (
    <div className="bevel-in px-2 py-1 text-center" style={{ background: "#07140a" }}>
      <div className="font-display text-[6px] leading-none text-white/40">{label}</div>
      <div className={`lcd ${amber ? "lcd-amber" : ""} mt-1 text-lg leading-none tabular-nums`}>
        {String(value).padStart(4, "0")}
      </div>
    </div>
  );
}

function PlayerPanel({
  phase,
  timeStr,
  tickerText,
  progress,
  playing,
  artworkUrl,
}: {
  phase: Phase;
  timeStr: string;
  tickerText: string;
  progress: number;
  playing: boolean;
  artworkUrl?: string;
}) {
  const pct = Math.min(100, Math.max(0, progress * 100));
  return (
    <section className="bevel-out mt-2 p-1">
      {/* Title bar */}
      <div className="titlebar flex items-center justify-between px-2 py-1 text-[15px] leading-none">
        <span className="truncate">♪ RadioGuessr — NowPlaying.mp3</span>
        <span className="flex gap-1">
          {["_", "□", "×"].map((c, i) => (
            <span
              key={i}
              className="bevel-out grid h-4 w-4 place-items-center text-[10px] leading-none text-black"
            >
              {c}
            </span>
          ))}
        </span>
      </div>

      {/* Body */}
      <div className="flex gap-2 p-2">
        {/* Album / mystery well */}
        <div
          key={phase === "reveal" ? "reveal" : "wait"}
          className={`bevel-in scanlines grid h-[92px] w-[92px] shrink-0 place-items-center overflow-hidden ${
            phase === "reveal" ? "flip-in" : ""
          }`}
          style={{ background: "#07140a" }}
        >
          {phase === "reveal" && artworkUrl ? (
            <img src={artworkUrl} alt="" className="h-full w-full object-cover" />
          ) : phase === "reveal" ? (
            <span className="lcd text-5xl">♪</span>
          ) : (
            <span className="lcd blink text-6xl">?</span>
          )}
        </div>

        {/* Readouts */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-stretch gap-2">
            {/* Big time */}
            <div
              className="bevel-in scanlines flex flex-col justify-center px-2.5 py-1 text-center"
              style={{ background: "#07140a" }}
            >
              <span className="font-display text-[6px] leading-none text-white/40">
                {phase === "reveal" ? "NEXT IN" : "TIME"}
              </span>
              <span className="lcd mt-1 text-3xl tabular-nums leading-none">{timeStr}</span>
            </div>
            {/* Scrolling track marquee */}
            <div
              className="bevel-in scanlines flex flex-1 items-center overflow-hidden px-1"
              style={{ background: "#07140a" }}
            >
              <span className="marquee lcd text-lg">{tickerText}</span>
            </div>
          </div>

          {/* Spectrum analyzer */}
          <div className="mt-2 h-9">
            <Equalizer playing={playing} />
          </div>

          {/* Seek bar */}
          <div
            className="bevel-in scanlines relative mt-2 h-4 overflow-hidden"
            style={{ background: "#07140a" }}
          >
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${pct}%`,
                background: "linear-gradient(to right, #1f8f3a, #36ff7a)",
              }}
            />
            <div
              className="bevel-out absolute top-1/2 h-5 w-2.5 -translate-y-1/2"
              style={{ left: `calc(${pct}% - 5px)` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({
  visitorNo,
  listeners,
  rtt,
  status,
}: {
  visitorNo: number;
  listeners: number;
  rtt: number;
  status: string;
}) {
  const sync = status !== "open" ? "OFFLINE" : rtt < 120 ? "EXCELLENT" : "OK";
  return (
    <footer className="mt-5 space-y-2 text-center text-base text-white/55">
      <div className="tracking-wide">
        «{" "}
        <a className="text-cyan-300 underline hover:text-cyan-200" href="#" onClick={(e) => e.preventDefault()}>
          PREV
        </a>{" "}
        |{" "}
        <a className="text-cyan-300 underline hover:text-cyan-200" href="#" onClick={(e) => e.preventDefault()}>
          RANDOM STATION
        </a>{" "}
        |{" "}
        <a className="text-cyan-300 underline hover:text-cyan-200" href="#" onClick={(e) => e.preventDefault()}>
          NEXT
        </a>{" "}
        »
      </div>

      <div className="flex items-center justify-center gap-2">
        <span>You are listener #</span>
        <span className="bevel-in inline-flex gap-px px-1 py-0.5" style={{ background: "#07140a" }}>
          {String(visitorNo).padStart(6, "0").split("").map((d, i) => (
            <span key={i} className="lcd px-1 text-base leading-none tabular-nums">
              {d}
            </span>
          ))}
        </span>
      </div>

      <div className="text-sm text-white/40">
        SIGNAL: {sync} · {listeners} tuned in · best viewed in Netscape Navigator 4.0 @ 800×600
      </div>
      <div className="text-sm text-white/35">
        ★ Made with Notepad ★ © 2003 RadioGuessr ★ This page is under construction ★
      </div>
    </footer>
  );
}

function ArmOverlay({ onArm, visitorNo }: { onArm: () => void; visitorNo: number }) {
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center px-4"
      style={{ background: "rgba(5,5,15,0.82)", backdropFilter: "blur(2px)" }}
      onClick={onArm}
    >
      <div className="bevel-out w-full max-w-sm p-1 text-black" onClick={(e) => e.stopPropagation()}>
        <div className="titlebar flex items-center justify-between px-2 py-1 text-sm leading-none">
          <span>★ Welcome — RadioGuessr.html</span>
          <span className="bevel-out grid h-4 w-4 place-items-center text-[10px] text-black">×</span>
        </div>
        <div className="px-5 py-6 text-center">
          <div className="text-5xl" style={{ animation: "bob 3s ease-in-out infinite" }}>
            📻
          </div>
          <div className="rainbow font-display mt-4 text-2xl leading-none">RadioGuessr</div>
          <div className="font-display mt-2 text-[10px] tracking-widest text-black/60">98.7 FM</div>

          <div className="bevel-in mt-5 overflow-hidden py-1.5" style={{ background: "#07140a" }}>
            <span className="marquee lcd text-base">
              ♪ A SHORT CLIP PLAYS FOR EVERYONE AT ONCE — GUESS THE TRACK BEFORE TIME RUNS OUT ♪
            </span>
          </div>

          <p className="mt-5 text-lg leading-tight text-black/80">
            ⚠ This site plays <b>AUDIO</b>. Please turn your speakers <b>ON</b>.
          </p>

          <button onClick={onArm} className="btn95 mt-5 px-7 py-4">
            <span className="font-display text-sm leading-none">► ENTER SITE ◄</span>
          </button>

          <p className="mt-5 text-base leading-tight text-black/50">
            You are visitor #{String(visitorNo).padStart(6, "0")}
            <br />tip: open in two tabs to feel the sync
          </p>
        </div>
      </div>
    </div>
  );
}

import type { Stats } from "../lib/stats";

export function StatsModal({
  stats,
  onClose,
}: {
  stats: Stats;
  onClose: () => void;
}) {
  const accuracy = stats.played > 0 ? Math.round((stats.correct / stats.played) * 100) : 0;
  const last = stats.history.slice(-20);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/30 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-pop w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-zinc-800">📊 Your stats</h2>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2.5 text-center">
          <Stat emoji="🎧" label="Played" value={stats.played} />
          <Stat emoji="🎯" label="Accuracy" value={`${accuracy}%`} />
          <Stat emoji="🔥" label="Streak" value={stats.currentStreak} />
          <Stat emoji="🏆" label="Best" value={stats.bestStreak} />
        </div>

        {last.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Recent rounds
            </p>
            <div className="flex flex-wrap gap-1.5">
              {last.map((r, i) => (
                <span
                  key={i}
                  title={r ? "Correct" : "Missed"}
                  className={`grid h-6 w-6 place-items-center rounded-lg text-[11px] ${
                    r ? "bg-emerald-100" : "bg-rose-100"
                  }`}
                >
                  {r ? "✅" : "❌"}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-zinc-400">
          🔒 Stats are saved only in this browser.
        </p>
      </div>
    </div>
  );
}

function Stat({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 py-3">
      <div className="text-base">{emoji}</div>
      <div className="mt-0.5 text-2xl font-extrabold tabular-nums text-zinc-800">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </div>
    </div>
  );
}

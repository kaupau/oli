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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d16] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Your stats</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-white/40 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 text-center">
          <Stat label="Played" value={stats.played} />
          <Stat label="Accuracy" value={`${accuracy}%`} />
          <Stat label="Streak" value={stats.currentStreak} />
          <Stat label="Best" value={stats.bestStreak} />
        </div>

        {last.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-xs uppercase tracking-widest text-white/40">
              Recent
            </p>
            <div className="flex flex-wrap gap-1.5">
              {last.map((r, i) => (
                <span
                  key={i}
                  title={r ? "Correct" : "Missed"}
                  className={`h-5 w-5 rounded ${
                    r ? "bg-emerald-400/80" : "bg-rose-400/70"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-white/30">
          Stats are stored only in this browser.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] py-3">
      <div className="text-2xl font-bold tabular-nums text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/40">
        {label}
      </div>
    </div>
  );
}

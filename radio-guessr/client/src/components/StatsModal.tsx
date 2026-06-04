import type { Stats } from "../lib/stats";

export function StatsModal({
  stats,
  onClose,
}: {
  stats: Stats;
  onClose: () => void;
}) {
  const accuracy = stats.played > 0 ? Math.round((stats.correct / stats.played) * 100) : 0;
  const last = stats.history.slice(-32);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center px-6"
      style={{ background: "rgba(10,9,7,0.78)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="panel fade-up w-full max-w-sm p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="label">Your stats</span>
          <button onClick={onClose} className="btn-ghost px-2.5 py-1 text-xs">
            Close
          </button>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          <Stat label="Played" value={stats.played} />
          <Stat label="Accuracy" value={`${accuracy}%`} />
          <Stat label="Streak" value={stats.currentStreak} accent />
          <Stat label="Best" value={stats.bestStreak} accent />
        </div>

        {last.length > 0 && (
          <div className="mt-6">
            <div className="label mb-2.5">Recent rounds</div>
            <div className="flex flex-wrap gap-1.5">
              {last.map((r, i) => (
                <span
                  key={i}
                  title={r ? "Correct" : "Missed"}
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: r ? "var(--accent)" : "var(--faint)" }}
                />
              ))}
            </div>
          </div>
        )}

        <p className="faint mt-6 text-xs">Saved on this device only.</p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        className={`tnum text-2xl font-semibold leading-none ${accent ? "accent" : ""}`}
      >
        {value}
      </div>
      <div className="label mt-1.5">{label}</div>
    </div>
  );
}

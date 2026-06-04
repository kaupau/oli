import type { Stats } from "../lib/stats";

export function StatsModal({
  stats,
  onClose,
}: {
  stats: Stats;
  onClose: () => void;
}) {
  const accuracy = stats.played > 0 ? Math.round((stats.correct / stats.played) * 100) : 0;
  const last = stats.history.slice(-40);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="win fade-up max-w-[380px]" onClick={(e) => e.stopPropagation()}>
        <div className="titlebar-mac">
          <div className="traffic">
            <span className="dot r" onClick={onClose} style={{ cursor: "pointer" }} />
            <span className="dot y" />
            <span className="dot g" />
          </div>
          <div className="tt">Your Stats</div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-4 gap-3 text-center">
            <Stat label="Played" value={stats.played} />
            <Stat label="Accuracy" value={`${accuracy}%`} />
            <Stat label="Streak" value={stats.currentStreak} accent />
            <Stat label="Best" value={stats.bestStreak} accent />
          </div>

          {last.length > 0 && (
            <div className="mt-5">
              <div className="soft mb-2 text-[11px]">Recent rounds</div>
              <div className="flex flex-wrap gap-1.5">
                {last.map((r, i) => (
                  <span
                    key={i}
                    title={r ? "Correct" : "Missed"}
                    className="h-3 w-3 rounded-full"
                    style={{ background: r ? "#2f6fe0" : "#cdd2da" }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <span className="faint text-[11px]">Saved on this device only.</span>
            <button onClick={onClose} className="aqua-btn aqua-btn-blue px-6 py-1.5">
              OK
            </button>
          </div>
        </div>
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
      <div className={`tnum text-2xl font-semibold leading-none ${accent ? "accent" : ""}`}>
        {value}
      </div>
      <div className="soft mt-1.5 text-[11px]">{label}</div>
    </div>
  );
}

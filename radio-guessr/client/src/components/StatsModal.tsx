import type { Stats } from "../lib/stats";

export function StatsModal({
  stats,
  onClose,
}: {
  stats: Stats;
  onClose: () => void;
}) {
  const accuracy = stats.played > 0 ? Math.round((stats.correct / stats.played) * 100) : 0;
  const last = stats.history.slice(-24);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center px-4"
      style={{ background: "rgba(5,5,15,0.7)" }}
      onClick={onClose}
    >
      <div className="bevel-out w-full max-w-md p-1 text-black" onClick={(e) => e.stopPropagation()}>
        {/* Title bar */}
        <div className="titlebar flex items-center justify-between px-2 py-0.5 text-[11px]">
          <span>📊 Your Stats — RadioGuessr</span>
          <button
            onClick={onClose}
            className="bevel-out grid h-4 w-4 place-items-center text-[9px] font-bold text-black"
          >
            ×
          </button>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-4 gap-2">
            <Stat label="PLAYED" value={stats.played} />
            <Stat label="ACCURACY" value={`${accuracy}%`} />
            <Stat label="STREAK" value={stats.currentStreak} amber />
            <Stat label="BEST" value={stats.bestStreak} amber />
          </div>

          {last.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-[10px] font-bold tracking-widest text-black/60">
                RECENT ROUNDS
              </div>
              <div
                className="bevel-in flex flex-wrap gap-1 p-2"
                style={{ background: "#07140a" }}
              >
                {last.map((r, i) => (
                  <span
                    key={i}
                    title={r ? "Correct" : "Missed"}
                    className={`grid h-5 w-5 place-items-center border border-black/40 font-mono text-xs font-bold ${
                      r ? "bg-[#0c2a12] text-[#36ff7a]" : "bg-[#2a0c0c] text-[#ff5a5a]"
                    }`}
                    style={{ textShadow: "0 0 4px currentColor" }}
                  >
                    {r ? "✓" : "✗"}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-black/50">⌐ Saved on this computer only.</span>
            <button onClick={onClose} className="btn95 px-5 py-1 text-sm font-bold">
              <span>OK</span>
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
  amber,
}: {
  label: string;
  value: string | number;
  amber?: boolean;
}) {
  return (
    <div className="bevel-in px-1 py-2 text-center" style={{ background: "#07140a" }}>
      <div className={`lcd ${amber ? "lcd-amber" : ""} text-xl font-bold tabular-nums`}>{value}</div>
      <div className="mt-0.5 text-[8px] font-bold tracking-widest text-white/40">{label}</div>
    </div>
  );
}

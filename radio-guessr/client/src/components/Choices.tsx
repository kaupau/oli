import type { Choice, Reveal } from "../protocol";

type Phase = "preroll" | "listen" | "reveal";

export function Choices({
  choices,
  phase,
  myChoiceId,
  reveal,
  onPick,
}: {
  choices: Choice[];
  phase: Phase;
  myChoiceId: string | null;
  reveal: Reveal | null;
  onPick: (id: string) => void;
}) {
  const revealing = phase === "reveal" && reveal;
  const total = reveal?.totalGuesses ?? 0;

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {choices.map((c, i) => {
        const isMine = myChoiceId === c.id;
        const isCorrect = revealing && reveal!.correctChoiceId === c.id;
        const isWrongPick = revealing && isMine && !isCorrect;
        const votes = reveal?.tally?.[c.id] ?? 0;
        const pct = total > 0 ? Math.round((votes / total) * 100) : 0;

        // Base (light Notion card) + per-state styling.
        let cls =
          "border-zinc-200 bg-white hover:border-violet-300 hover:shadow-md hover:-translate-y-0.5";
        let badgeCls = "bg-zinc-100 text-zinc-500";
        let corner = "";
        if (revealing) {
          if (isCorrect) {
            cls = "border-emerald-300 bg-emerald-50";
            badgeCls = "bg-emerald-500 text-white";
            corner = "✅";
          } else if (isWrongPick) {
            cls = "border-rose-300 bg-rose-50";
            badgeCls = "bg-rose-500 text-white";
            corner = "❌";
          } else {
            cls = "border-zinc-200 bg-white opacity-60";
          }
        } else if (isMine) {
          cls = "border-violet-400 bg-violet-50 shadow-sm";
          badgeCls = "bg-violet-600 text-white";
        }

        return (
          <button
            key={c.id}
            disabled={phase !== "listen" || (myChoiceId !== null && !isMine)}
            onClick={() => onPick(c.id)}
            className={`group relative overflow-hidden rounded-2xl border px-3.5 py-3 text-left shadow-sm transition-all duration-150 disabled:cursor-default ${cls}`}
          >
            {/* Vote share fill (reveal only). */}
            {revealing && (
              <span
                className={`absolute inset-y-0 left-0 z-0 transition-all duration-700 ${
                  isCorrect ? "bg-emerald-200/40" : "bg-zinc-200/40"
                }`}
                style={{ width: `${pct}%` }}
              />
            )}
            <div className="relative z-10 flex items-center gap-3">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold transition ${badgeCls}`}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-zinc-800">{c.title}</span>
                <span className="block truncate text-sm text-zinc-400">{c.artist}</span>
              </span>
              {revealing ? (
                <span className="relative z-10 flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums text-zinc-500">
                  {corner}
                  {pct}%
                </span>
              ) : isMine ? (
                <span className="shrink-0 text-base">👈</span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

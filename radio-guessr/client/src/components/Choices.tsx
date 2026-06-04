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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {choices.map((c, i) => {
        const isMine = myChoiceId === c.id;
        const isCorrect = revealing && reveal!.correctChoiceId === c.id;
        const isWrongPick = revealing && isMine && !isCorrect;
        const votes = reveal?.tally?.[c.id] ?? 0;
        const pct = total > 0 ? Math.round((votes / total) * 100) : 0;

        let cls =
          "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]";
        if (revealing) {
          if (isCorrect) cls = "border-emerald-400/70 bg-emerald-400/10";
          else if (isWrongPick) cls = "border-rose-400/70 bg-rose-400/10";
          else cls = "border-white/5 bg-white/[0.02] opacity-70";
        } else if (isMine) {
          cls = "border-fuchsia-400/70 bg-fuchsia-400/10";
        }

        return (
          <button
            key={c.id}
            disabled={phase !== "listen" || (myChoiceId !== null && !isMine)}
            onClick={() => onPick(c.id)}
            className={`group relative overflow-hidden rounded-xl border px-4 py-3 text-left transition-all disabled:cursor-default ${cls}`}
          >
            {/* Vote share bar (reveal only). */}
            {revealing && (
              <span
                className={`absolute inset-y-0 left-0 -z-0 transition-all duration-700 ${
                  isCorrect ? "bg-emerald-400/15" : "bg-white/5"
                }`}
                style={{ width: `${pct}%` }}
              />
            )}
            <div className="relative z-10 flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-xs font-bold text-white/60">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-white">
                  {c.title}
                </span>
                <span className="block truncate text-sm text-white/50">
                  {c.artist}
                </span>
              </span>
              {revealing && (
                <span className="relative z-10 shrink-0 text-sm font-semibold tabular-nums text-white/60">
                  {pct}%
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

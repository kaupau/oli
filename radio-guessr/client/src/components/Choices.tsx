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
    <div className="list">
      <div className="lhead">
        <span className="w-[22px] shrink-0 text-center">#</span>
        <span className="flex-1">Song</span>
        <span className="w-12 shrink-0 text-right">{revealing ? "Votes" : ""}</span>
      </div>

      {choices.map((c, i) => {
        const isMine = myChoiceId === c.id;
        const isCorrect = !!revealing && reveal!.correctChoiceId === c.id;
        const isWrongPick = !!revealing && isMine && !isCorrect;
        const votes = reveal?.tally?.[c.id] ?? 0;
        const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
        const disabled = phase !== "listen" || (myChoiceId !== null && !isMine);

        const cls = revealing
          ? isCorrect
            ? "sel"
            : isWrongPick
              ? "bad"
              : "dim"
          : isMine
            ? "sel"
            : i % 2 === 1
              ? "stripe"
              : "";

        return (
          <button
            key={c.id}
            disabled={disabled}
            onClick={() => onPick(c.id)}
            className={`trow ${cls}`}
          >
            <span className="badge">{String.fromCharCode(65 + i)}</span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13.5px]">{c.title}</span>
              <span className="sub soft block truncate text-[11.5px]">{c.artist}</span>
            </span>
            <span className="tnum w-12 shrink-0 text-right text-[12px]">
              {revealing ? (
                <>
                  {isCorrect ? "✓ " : isWrongPick ? "✗ " : ""}
                  {pct}%
                </>
              ) : isMine ? (
                "♪"
              ) : (
                ""
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

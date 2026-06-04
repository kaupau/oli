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
    <div className="flex flex-col gap-2.5">
      {choices.map((c, i) => {
        const isMine = myChoiceId === c.id;
        const isCorrect = !!revealing && reveal!.correctChoiceId === c.id;
        const isWrongPick = !!revealing && isMine && !isCorrect;
        const votes = reveal?.tally?.[c.id] ?? 0;
        const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
        const disabled = phase !== "listen" || (myChoiceId !== null && !isMine);

        const state = revealing
          ? isCorrect
            ? "is-correct"
            : isWrongPick
              ? "is-wrong"
              : "is-dim"
          : isMine
            ? "is-mine"
            : "";

        return (
          <button
            key={c.id}
            disabled={disabled}
            onClick={() => onPick(c.id)}
            className={`choice ${state}`}
          >
            <span className="choice-letter">{String.fromCharCode(65 + i)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] leading-tight">{c.title}</span>
              <span className="muted block truncate text-xs leading-tight">{c.artist}</span>
            </span>

            {revealing ? (
              <span className="tnum shrink-0 text-xs">
                {isCorrect ? "✓ " : isWrongPick ? "✗ " : ""}
                {pct}%
              </span>
            ) : isMine ? (
              <span className="accent shrink-0 text-xs">your pick</span>
            ) : null}

            {revealing && (
              <span className="choice-bar" style={{ width: `${pct}%` }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

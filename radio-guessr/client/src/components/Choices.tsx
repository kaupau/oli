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
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {choices.map((c, i) => {
        const isMine = myChoiceId === c.id;
        const isCorrect = revealing && reveal!.correctChoiceId === c.id;
        const isWrongPick = revealing && isMine && !isCorrect;
        const votes = reveal?.tally?.[c.id] ?? 0;
        const pct = total > 0 ? Math.round((votes / total) * 100) : 0;
        const disabled = phase !== "listen" || (myChoiceId !== null && !isMine);

        // The picked / correct buttons sit "pressed" (inset).
        const pressed = isMine || isCorrect;

        // LED color of the letter chip.
        let chip = "bg-[#07140a] text-[#36ff7a]"; // idle green LCD
        if (revealing) {
          if (isCorrect) chip = "bg-[#0c2a12] text-[#36ff7a]";
          else if (isWrongPick) chip = "bg-[#2a0c0c] text-[#ff5a5a]";
          else chip = "bg-[#07140a] text-white/30";
        } else if (isMine) {
          chip = "bg-[#2a200c] text-[#ffb43a]";
        }

        return (
          <button
            key={c.id}
            disabled={disabled}
            onClick={() => onPick(c.id)}
            className={`btn95 ${pressed ? "is-pressed" : ""} relative overflow-hidden px-2 py-2 text-left ${
              revealing && !isCorrect && !isWrongPick ? "opacity-70" : ""
            }`}
            style={
              isCorrect
                ? { outline: "2px solid #2bff5e", outlineOffset: "-2px" }
                : isWrongPick
                  ? { outline: "2px solid #ff5a3a", outlineOffset: "-2px" }
                  : undefined
            }
          >
            {/* Vote share fill on reveal */}
            {revealing && (
              <span
                className="absolute inset-y-0 left-0 z-0"
                style={{
                  width: `${pct}%`,
                  background: isCorrect ? "rgba(54,255,122,0.20)" : "rgba(0,0,0,0.12)",
                }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2 text-black">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center border border-black/40 font-mono text-base font-bold ${chip}`}
                style={{ textShadow: "0 0 4px currentColor" }}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate font-bold">{c.title}</span>
                <span className="block truncate text-[11px] text-black/60">{c.artist}</span>
              </span>
              {revealing ? (
                <span className="flex shrink-0 items-center gap-1 font-mono text-xs font-bold">
                  {isCorrect ? "✓" : isWrongPick ? "✗" : ""}
                  {pct}%
                </span>
              ) : isMine ? (
                <span className="shrink-0 text-xs font-bold">◄ YOU</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// A quiet row of thin bars that breathe while audio plays, and rest flat
// when it's not. One accent color — no traffic-light gradient.

export function Equalizer({ playing }: { playing: boolean }) {
  const bars = Array.from({ length: 28 }, (_, i) => i);
  return (
    <div className="flex h-9 w-full items-end gap-[3px]">
      {bars.map((i) => (
        <span
          key={i}
          className="flex-1 rounded-full"
          style={{
            height: "100%",
            transformOrigin: "bottom",
            background: "var(--accent)",
            opacity: playing ? 0.75 : 0.28,
            transform: playing ? undefined : "scaleY(0.18)",
            animation: playing
              ? `eq ${0.7 + ((i * 7) % 5) * 0.16}s ease-in-out ${(i % 7) * 0.07}s infinite`
              : "none",
          }}
        />
      ))}
    </div>
  );
}

// Animated bars suggesting "live audio". Freezes when not playing.

export function Equalizer({ playing }: { playing: boolean }) {
  const bars = [0, 1, 2, 3, 4, 5, 6];
  return (
    <div className="flex h-9 items-end gap-1">
      {bars.map((i) => (
        <span
          key={i}
          className="w-1.5 rounded-full bg-gradient-to-t from-violet-500 to-indigo-400"
          style={{
            height: "100%",
            transformOrigin: "bottom",
            animation: playing
              ? `eq ${0.7 + (i % 4) * 0.18}s ease-in-out ${i * 0.07}s infinite`
              : "none",
            transform: playing ? undefined : "scaleY(0.25)",
            opacity: playing ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  );
}

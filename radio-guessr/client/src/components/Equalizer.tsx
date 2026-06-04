// Classic media-player spectrum analyzer: green->yellow->red bars in an LCD
// well. Freezes when audio isn't playing.

export function Equalizer({ playing }: { playing: boolean }) {
  const bars = Array.from({ length: 14 }, (_, i) => i);
  return (
    <div className="bevel-in scanlines flex h-full items-end gap-[2px] bg-[#07140a] p-1">
      {bars.map((i) => (
        <span
          key={i}
          className="flex-1"
          style={{
            height: "100%",
            transformOrigin: "bottom",
            background:
              "linear-gradient(to top, #2bff5e 0%, #2bff5e 45%, #ffe23a 70%, #ff5a3a 100%)",
            imageRendering: "pixelated",
            animation: playing
              ? `eq ${0.55 + ((i * 7) % 5) * 0.13}s ease-in-out ${(i % 6) * 0.06}s infinite`
              : "none",
            transform: playing ? undefined : "scaleY(0.12)",
            opacity: playing ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

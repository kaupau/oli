import { useEffect, useRef } from "react";
import { Disc } from "./Disc";

// The now-playing cover. While guessing it's drawn into a tiny canvas and
// scaled up (genuine chunky pixels) plus a light blur, so players get the
// general colors/shape as a hint but not the actual cover. On reveal it
// swaps to the crisp image. Falls back to a spinning CD when there's no art.

const LORES = 14; // internal canvas resolution while hidden

export function Cover({
  src,
  revealed,
  playing = false,
  size = 58,
  fill = false,
}: {
  src?: string;
  revealed: boolean;
  playing?: boolean;
  size?: number;
  /** Stretch to a square matching the parent's height instead of a fixed size. */
  fill?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!src || revealed) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const img = new Image();
    img.onload = () => {
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, LORES, LORES);
      ctx.drawImage(img, 0, 0, LORES, LORES); // downsample to a few pixels
    };
    img.src = src;
  }, [src, revealed]);

  if (!src)
    return fill ? (
      <div className="grid aspect-square shrink-0 self-stretch place-items-center">
        <Disc size={size} spinning={playing} />
      </div>
    ) : (
      <Disc size={size} spinning={playing} />
    );

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md ${
        fill ? "aspect-square self-stretch" : ""
      }`}
      style={
        fill
          ? { boxShadow: "0 1px 3px rgba(0,0,0,0.3)", background: "#cdd3dc" }
          : { width: size, height: size, boxShadow: "0 1px 3px rgba(0,0,0,0.3)", background: "#cdd3dc" }
      }
    >
      {revealed ? (
        <img src={src} alt="" className="fade-up h-full w-full object-cover" />
      ) : (
        <>
          <canvas
            ref={canvasRef}
            width={LORES}
            height={LORES}
            style={{
              width: "100%",
              height: "100%",
              imageRendering: "pixelated",
              filter: "blur(1.5px) saturate(1.2)",
              display: "block",
            }}
          />
          <span
            className="absolute inset-0 grid place-items-center font-bold text-white"
            style={{ fontSize: fill ? 22 : size * 0.4, textShadow: "0 1px 4px rgba(0,0,0,0.55)" }}
          >
            ?
          </span>
        </>
      )}
    </div>
  );
}

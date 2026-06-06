// Full-screen ASCII spectrum that lives behind the window and reacts to the
// music in real time. It reads frequency data straight off the radio's Web
// Audio AnalyserNode (see lib/audio.ts). When nothing is playing it falls back
// to a slow, calm idle wave so the backdrop never goes dead.

import { useEffect, useRef } from "react";

// Density ramp from empty to solid.
const RAMP = " .·:-=+*#%@";

export function Visualizer({
  getAnalyser,
  active,
}: {
  getAnalyser: () => AnalyserNode | null;
  /** True while a clip is actually playing (listen window). */
  active: boolean;
}) {
  const preRef = useRef<HTMLPreElement | null>(null);
  // Keep the latest `active`/`getAnalyser` available to the rAF loop without
  // restarting it every render.
  const activeRef = useRef(active);
  activeRef.current = active;
  const getAnalyserRef = useRef(getAnalyser);
  getAnalyserRef.current = getAnalyser;

  useEffect(() => {
    let raf = 0;
    let cols = 0;
    let rows = 0;
    const measure = () => {
      // Roughly one glyph per 9px wide / 15px tall at our font size.
      cols = Math.min(150, Math.max(24, Math.floor(window.innerWidth / 9)));
      rows = Math.min(54, Math.max(12, Math.floor(window.innerHeight / 15)));
    };
    measure();
    window.addEventListener("resize", measure);

    const freq = new Uint8Array(1024);
    const heights = new Float32Array(200); // smoothed per-column heights

    const draw = (t: number) => {
      const pre = preRef.current;
      if (pre) {
        const analyser = getAnalyserRef.current();
        if (analyser && activeRef.current) {
          const n = Math.min(analyser.frequencyBinCount, freq.length);
          analyser.getByteFrequencyData(freq.subarray(0, n));
          for (let c = 0; c < cols; c++) {
            // Bias toward the low/mid bins (where most musical energy sits).
            const frac = c / cols;
            const idx = Math.min(n - 1, Math.floor(frac * frac * n * 0.9));
            const v = freq[idx] / 255;
            heights[c] = heights[c] * 0.6 + v * 0.4;
          }
        } else {
          // Idle: two lazy sine waves drifting against each other.
          for (let c = 0; c < cols; c++) {
            const v =
              0.16 +
              0.1 * Math.sin(c * 0.22 + t * 0.0014) * Math.sin(c * 0.05 - t * 0.0008);
            heights[c] = heights[c] * 0.9 + Math.max(0, v) * 0.1;
          }
        }

        let out = "";
        for (let r = 0; r < rows; r++) {
          const rowFromBottom = rows - r;
          for (let c = 0; c < cols; c++) {
            const remainder = heights[c] * rows - (rowFromBottom - 1);
            if (remainder <= 0) {
              out += " ";
            } else {
              const lvl = Math.min(
                RAMP.length - 1,
                Math.max(1, Math.round(Math.min(1, remainder) * (RAMP.length - 1)))
              );
              out += RAMP[lvl];
            }
          }
          out += "\n";
        }
        pre.textContent = out;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return <pre className="viz" ref={preRef} aria-hidden="true" />;
}

// Offline demo audio. Generates a handful of distinct, recognizable musical
// loops as WAV files so the game is fully playable with no internet access.
// Each "track" is a different pitch + timbre so players can actually guess.

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type DemoTone = {
  id: string;
  title: string;
  artist: string;
  freq: number;
  wave: "sine" | "square" | "triangle" | "saw";
};

// A small but musically-spread set. Titles double as the multiple-choice text.
export const DEMO_TONES: DemoTone[] = [
  { id: "tone-a", title: "Mellow Sine in A", artist: "The Oscillators", freq: 220.0, wave: "sine" },
  { id: "tone-b", title: "Buzzy Square in D", artist: "The Oscillators", freq: 293.66, wave: "square" },
  { id: "tone-c", title: "Bright Saw in E", artist: "Wave Theory", freq: 329.63, wave: "saw" },
  { id: "tone-d", title: "Soft Triangle in G", artist: "Wave Theory", freq: 392.0, wave: "triangle" },
  { id: "tone-e", title: "High Sine in C", artist: "Night Synth", freq: 523.25, wave: "sine" },
  { id: "tone-f", title: "Fat Saw in F", artist: "Night Synth", freq: 174.61, wave: "saw" },
  { id: "tone-g", title: "Hollow Square in B", artist: "Modular Co.", freq: 246.94, wave: "square" },
  { id: "tone-h", title: "Warm Triangle in C", artist: "Modular Co.", freq: 261.63, wave: "triangle" },
];

const SAMPLE_RATE = 44100;
const DURATION_SEC = 30; // long enough to seek a random clip window into

function sample(wave: DemoTone["wave"], phase: number): number {
  // phase in [0,1)
  switch (wave) {
    case "sine":
      return Math.sin(phase * 2 * Math.PI);
    case "square":
      return phase < 0.5 ? 1 : -1;
    case "triangle":
      return 4 * Math.abs(phase - 0.5) - 1;
    case "saw":
      return 2 * phase - 1;
  }
}

function renderWav(tone: DemoTone): Buffer {
  const n = SAMPLE_RATE * DURATION_SEC;
  const bytesPerSample = 2;
  const dataSize = n * bytesPerSample;
  const buf = Buffer.alloc(44 + dataSize);

  // WAV header (PCM, mono, 16-bit).
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28);
  buf.writeUInt16LE(bytesPerSample, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);

  // A gentle 2nd-harmonic + slow tremolo gives each waveform some character
  // without being unpleasant on a loop.
  let phase = 0;
  const inc = tone.freq / SAMPLE_RATE;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const tremolo = 0.85 + 0.15 * Math.sin(2 * Math.PI * 5 * t);
    const fundamental = sample(tone.wave, phase);
    const harmonic = 0.25 * sample(tone.wave, (phase * 2) % 1);
    let v = (fundamental + harmonic) * 0.32 * tremolo;
    // Short fade at the very start to avoid a click.
    if (t < 0.02) v *= t / 0.02;
    const s = Math.max(-1, Math.min(1, v));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * bytesPerSample);
    phase = (phase + inc) % 1;
  }
  return buf;
}

/** Write any missing demo WAVs into `<publicDir>/demo`. Cheap + idempotent. */
export function generateDemoTones(publicDir: string): void {
  const dir = join(publicDir, "demo");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  for (const tone of DEMO_TONES) {
    const file = join(dir, `${tone.id}.wav`);
    if (existsSync(file)) continue;
    writeFileSync(file, renderWav(tone));
  }
}

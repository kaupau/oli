import * as Tone from 'tone'
import { webaudioRepl } from '@strudel/webaudio'
import { registerSynthSounds, registerZZFXSounds, samples, initAudio as initSuperdough } from 'superdough'
import type { SoundBank } from '../stores/app'

let isInitialized = false
let strudelRepl: any = null

// For visualization
let analyser: Tone.Analyser | null = null
let waveformAnalyser: Tone.Analyser | null = null

export async function initAudio() {
  if (isInitialized) return

  // Initialize Tone.js for visualization
  await Tone.start()

  // Setup analyzers for visualization
  analyser = new Tone.Analyser('fft', 256)
  waveformAnalyser = new Tone.Analyser('waveform', 512)
  analyser.connect(waveformAnalyser)
  waveformAnalyser.toDestination()

  // Initialize superdough audio
  await initSuperdough()

  // Register built-in synth sounds (sawtooth, sine, square, triangle, etc.)
  registerSynthSounds()
  registerZZFXSounds()

  // Create the webaudio REPL
  strudelRepl = webaudioRepl({
    onError: (err: Error) => {
      console.error('[strudel] Error:', err.message)
    }
  })

  isInitialized = true
  console.log('[audio] Strudel initialized')
}

export function getFrequencyData(): Float32Array {
  if (!analyser) return new Float32Array(256)
  const data = analyser.getValue() as Float32Array
  const normalized = new Float32Array(data.length)
  for (let i = 0; i < data.length; i++) {
    const db = Math.max(-80, data[i])
    normalized[i] = Math.max(0, Math.min(1, (db + 80) / 80))
  }
  return normalized
}

export function getWaveformData(): Float32Array {
  if (!waveformAnalyser) return new Float32Array(512)
  return waveformAnalyser.getValue() as Float32Array
}

export async function loadSoundBanks(banks: SoundBank[]) {
  console.log(`[audio] Loading ${banks.length} sound banks...`)

  // Build sample map for Strudel
  const sampleMap: Record<string, string | string[] | Record<string, string>> = {}

  for (const bank of banks) {
    if (!bank.files || bank.files.length === 0) continue

    const bankSamples: Record<string, string> = {}

    for (const file of bank.files) {
      const sampleName = file.name.replace(/\.(wav|mp3|ogg|flac)$/i, '')
      const url = `/uploads/${encodeURIComponent(file.filename)}`

      // Add to bank
      bankSamples[sampleName] = url

      // Also register as standalone
      sampleMap[sampleName] = url
    }

    // Register the bank
    sampleMap[bank.name] = bankSamples
  }

  // Register with Strudel's sample system
  if (Object.keys(sampleMap).length > 0) {
    try {
      await samples(sampleMap, '', { tag: 'user' })
      console.log(`[audio] Registered ${Object.keys(sampleMap).length} samples`)
    } catch (err) {
      console.warn('[audio] Failed to register samples:', err)
    }
  }
}

export async function playPattern(code: string) {
  if (!isInitialized) {
    await initAudio()
  }

  // Stop any existing playback
  stopPlayback()

  console.log(`[audio] Playing pattern...`)

  try {
    // evaluate() auto-starts playback by default
    await strudelRepl.evaluate(code)
    console.log('[audio] Playback started')
  } catch (err: any) {
    console.error('[audio] Playback error:', err)
    throw new Error(err.message || 'Failed to evaluate pattern')
  }
}

export function stopPlayback() {
  if (strudelRepl) {
    try {
      strudelRepl.stop()
    } catch {
      // Ignore
    }
  }
}

export function setTempo(bpm: number) {
  // Tempo is handled by setcpm() in the code
  console.log(`[audio] UI tempo: ${bpm} BPM`)
}

export function isAudioInitialized() {
  return isInitialized
}

export function getLoadedSamples(): string[] {
  return []
}

// Preview a single sample
let previewPlayer: Tone.Player | null = null

export async function previewSample(filename: string) {
  if (previewPlayer) {
    previewPlayer.stop()
    previewPlayer.dispose()
    previewPlayer = null
  }

  await initAudio()

  const url = `/uploads/${encodeURIComponent(filename)}`

  previewPlayer = new Tone.Player({
    url,
    onload: () => {
      if (previewPlayer) {
        previewPlayer.toDestination()
        previewPlayer.start()
      }
    },
    onerror: (err) => {
      console.warn(`[audio] Failed to load preview: ${err}`)
    }
  })
}

export function stopPreview() {
  if (previewPlayer) {
    previewPlayer.stop()
    previewPlayer.dispose()
    previewPlayer = null
  }
}

import * as Tone from 'tone'
import { webaudioRepl } from '@strudel/webaudio'
import * as strudel from '@strudel/core'
import { miniAllStrings } from '@strudel/mini'
import { registerSynthSounds, registerZZFXSounds, samples, initAudio as initSuperdough, getAudioContext, getSuperdoughAudioController } from 'superdough'
import type { SoundBank } from '../stores/app'

let isInitialized = false
let strudelRepl: any = null

// For visualization - use Web Audio API analyzers connected to superdough output
let fftAnalyser: AnalyserNode | null = null
let waveformAnalyser: AnalyserNode | null = null
let fftData: Float32Array | null = null
let waveformData: Float32Array | null = null

export async function initAudio() {
  if (isInitialized) return

  // Initialize Tone.js (needed for sample preview)
  await Tone.start()

  // Initialize superdough audio
  await initSuperdough()

  // Register built-in synth sounds (sawtooth, sine, square, triangle, etc.)
  registerSynthSounds()
  registerZZFXSounds()

  // Enable mini-notation parsing for string patterns
  // This makes sound("bd sd") work instead of needing mini`bd sd`
  miniAllStrings()

  // Register all Strudel functions in the global scope
  // This makes functions like sound(), note(), stack() available
  await strudel.evalScope(strudel, import('@strudel/webaudio'), import('superdough'), import('@strudel/mini'))

  // Create the webaudio REPL
  strudelRepl = webaudioRepl({
    onEvalError: (err: Error) => {
      console.error('[strudel] Eval error:', err.message)
    }
  })

  // Setup analyzers for visualization - connect to superdough's output
  const audioContext = getAudioContext()
  const controller = getSuperdoughAudioController()

  // Create FFT analyzer
  fftAnalyser = audioContext.createAnalyser()
  fftAnalyser.fftSize = 512
  fftAnalyser.smoothingTimeConstant = 0.8
  fftData = new Float32Array(fftAnalyser.frequencyBinCount)

  // Create waveform analyzer
  waveformAnalyser = audioContext.createAnalyser()
  waveformAnalyser.fftSize = 1024
  waveformData = new Float32Array(waveformAnalyser.fftSize)

  // Connect superdough's output to our analyzers
  // The destinationGain is the last node before speakers
  controller.output.destinationGain.connect(fftAnalyser)
  controller.output.destinationGain.connect(waveformAnalyser)

  console.log('[audio] Analyzers connected to superdough output')

  isInitialized = true
  console.log('[audio] Strudel initialized')
}

export function getFrequencyData(): Float32Array {
  if (!fftAnalyser || !fftData) return new Float32Array(256)

  // Get frequency data in dB
  fftAnalyser.getFloatFrequencyData(fftData as Float32Array<ArrayBuffer>)

  // Normalize to 0-1 range
  const normalized = new Float32Array(fftData.length)
  for (let i = 0; i < fftData.length; i++) {
    // fftData values are in dB, typically -100 to 0
    const db = Math.max(-100, fftData[i])
    normalized[i] = Math.max(0, Math.min(1, (db + 100) / 100))
  }
  return normalized
}

export function getWaveformData(): Float32Array {
  if (!waveformAnalyser || !waveformData) return new Float32Array(512)

  // Get time domain data (-1 to 1 range)
  waveformAnalyser.getFloatTimeDomainData(waveformData as Float32Array<ArrayBuffer>)
  return waveformData
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

// Preprocess code to ensure it's valid Strudel code
function preprocessCode(code: string): string {
  // Check if code already has setcpm and stack structure (AI-generated proper format)
  // This handles multi-line code like: setcpm(120/4)\nstack(\n  sound(...),\n  note(...)\n)
  const hasSetcpm = /setcpm\s*\(/.test(code)
  const hasStack = /\bstack\s*\(/.test(code)

  if (hasSetcpm && hasStack) {
    // Code has both but needs to be combined into a single expression
    // Extract setcpm call
    const setcpmMatch = code.match(/setcpm\s*\([^)]+\)/)
    if (setcpmMatch) {
      // Remove setcpm and strip comments
      const cleanCode = code
        .replace(/setcpm\s*\([^)]+\)\s*\n?/, '') // Remove setcpm line
        .split('\n')
        .map(line => line.replace(/\/\/.*$/, '')) // Remove inline comments
        .join('\n')
        .trim()

      // Combine as comma expression: (setcpm(...), stack(...))
      const combined = `(${setcpmMatch[0]}, ${cleanCode})`
      console.log('[audio] Combined setcpm+stack into single expression')
      return combined
    }
  }

  // Remove comments and empty lines for analysis
  const lines = code.split('\n')
    .map(line => line.replace(/\/\/.*$/, '').trim())
    .filter(line => line.length > 0)

  // Check if code uses $: syntax (Strudel REPL syntax for multiple patterns)
  const usesDollarSyntax = lines.some(line => line.startsWith('$:'))
  if (usesDollarSyntax) {
    return code // $: syntax is handled by REPL
  }

  // Check if we have multiple sound() or note() statements that need stacking
  const patternLines = lines.filter(line =>
    /^(sound|note|s|n)\s*\(/.test(line) ||
    /^(sound|note|s|n)\s*`/.test(line)
  )

  if (patternLines.length >= 1) {
    // Extract setcpm if present
    const setcpmMatch = code.match(/setcpm\s*\([^)]+\)/)
    const setcpm = setcpmMatch ? setcpmMatch[0] : 'setcpm(120/4)'

    // Remove setcpm from lines if present
    const filteredCode = code.replace(/setcpm\s*\([^)]+\)\s*\n?/, '')

    // Get pattern lines, strip inline comments, and wrap them in stack()
    const codeLines = filteredCode.split('\n')
      .map(line => line.replace(/\/\/.*$/, '').trim()) // Remove inline comments
      .filter(line => line.length > 0)

    // Use comma operator to combine setcpm and stack into a single expression
    // This is valid JavaScript: (expr1, expr2) returns expr2 after evaluating expr1
    const stackedCode = `(${setcpm}, stack(\n  ${codeLines.join(',\n  ')}\n))`
    console.log('[audio] Preprocessed code to use stack()')
    return stackedCode
  }

  // Single pattern - combine with setcpm using comma operator
  if (!code.includes('setcpm')) {
    return `(setcpm(120/4), ${code.trim()})`
  }

  return code
}

export async function playPattern(code: string) {
  if (!isInitialized) {
    await initAudio()
  }

  // Stop any existing playback
  stopPlayback()

  // Preprocess code to ensure valid format
  const processedCode = preprocessCode(code)
  console.log(`[audio] Playing pattern...`)
  console.log(`[audio] Code:\n${processedCode}`)

  try {
    // evaluate() auto-starts playback by default
    await strudelRepl.evaluate(processedCode)
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

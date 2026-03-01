import * as Tone from 'tone'
import type { SoundBank } from '../stores/app'

let isInitialized = false

// Sample URLs for loading
const sampleUrls: Map<string, string> = new Map()

// Normalized lookup: lowercase key -> original key
const normalizedKeys: Map<string, string> = new Map()

// Master chain: gain -> analyser -> limiter -> destination
let masterGain: Tone.Gain | null = null
let masterLimiter: Tone.Limiter | null = null
let analyser: Tone.Analyser | null = null
let waveformAnalyser: Tone.Analyser | null = null

// Single players instance for samples
let activePlayers: Tone.Players | null = null

function getMasterOutput(): Tone.Gain {
  if (!masterGain) {
    analyser = new Tone.Analyser('fft', 256)
    waveformAnalyser = new Tone.Analyser('waveform', 512)
    masterLimiter = new Tone.Limiter(-1).toDestination()
    masterGain = new Tone.Gain(0.7)

    masterGain.connect(analyser)
    analyser.connect(waveformAnalyser)
    waveformAnalyser.connect(masterLimiter)
  }
  return masterGain
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

export async function initAudio() {
  if (isInitialized) return
  await Tone.start()
  getMasterOutput()
  isInitialized = true
}

function isAudioFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop() || ''
  return ['wav', 'mp3', 'ogg', 'flac', 'aiff', 'aif', 'm4a', 'webm'].includes(ext)
}

export async function loadSoundBanks(banks: SoundBank[]) {
  console.log(`[audio] Loading ${banks.length} sound banks...`)

  sampleUrls.clear()
  normalizedKeys.clear()

  for (const bank of banks) {
    if (!bank.files || bank.files.length === 0) continue

    let audioFileCount = 0
    for (const file of bank.files) {
      if (!isAudioFile(file.filename)) continue

      audioFileCount++
      const sampleName = stripExt(file.name)
      const bankKey = `${bank.name}:${sampleName}`
      const url = `/uploads/${encodeURIComponent(file.filename)}`

      sampleUrls.set(bankKey, url)
      if (!sampleUrls.has(sampleName)) {
        sampleUrls.set(sampleName, url)
      }
    }

    if (audioFileCount > 0) {
      console.log(`[audio] Bank "${bank.name}": ${audioFileCount} audio files`)
    }
  }

  for (const key of sampleUrls.keys()) {
    normalizedKeys.set(normalize(key), key)
  }

  console.log(`[audio] Registered ${sampleUrls.size} sample URLs`)
}

function stripExt(name: string): string {
  return name.replace(/\.(wav|mp3|ogg|flac)$/i, '')
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

function findSampleUrl(name: string): string | null {
  if (!name) return null

  if (sampleUrls.has(name)) return sampleUrls.get(name)!

  const stripped = stripExt(name)
  if (sampleUrls.has(stripped)) return sampleUrls.get(stripped)!

  const norm = normalize(stripped)
  const normKey = normalizedKeys.get(norm)
  if (normKey) return sampleUrls.get(normKey)!

  if (stripped.includes(':')) {
    const samplePart = stripped.split(':').slice(1).join(':').trim()
    if (samplePart) {
      const found = findSampleUrl(samplePart)
      if (found) return found
    }
  }

  if (norm.length >= 3) {
    for (const [key, url] of sampleUrls) {
      const keyNorm = normalize(key)
      if (keyNorm.endsWith(':' + norm)) return url
      if (keyNorm.endsWith('_' + norm) || keyNorm.endsWith('-' + norm)) return url
      const parts = keyNorm.split(/[:\s_-]/)
      if (parts.includes(norm)) return url
    }
  }

  console.warn(`[audio] Sample not found: "${name}"`)
  return null
}

let activeSequences: Tone.Sequence[] = []
let activeSynths: Tone.PolySynth[] = []

export async function playPattern(code: string) {
  stopPlayback()

  console.log(`[audio] Playing pattern from code (${code.length} chars)`)

  // Parse sound() and s() patterns
  const soundMatches = code.match(/sound\(["']([^"']+)["']\)/g) || []
  const sMatches = code.match(/(?<![a-zA-Z])s\(["']([^"']+)["']\)/g) || []
  const noteMatches = code.match(/note\(["']([^"']+)["']\)/g) || []

  const allSoundMatches = [...soundMatches, ...sMatches]

  if (allSoundMatches.length > 0) {
    const allTokens: Set<string> = new Set()
    for (const match of allSoundMatches) {
      const inner = match.match(/(?:sound|s)\(["']([^"']+)["']\)/)?.[1]
      if (!inner) continue
      const subPatterns = inner.split(',')
      for (const sub of subPatterns) {
        const tokens = parseMiniNotation(sub.trim())
        tokens.forEach(t => { if (t !== '~' && t !== '_') allTokens.add(t) })
      }
    }

    const urls: Record<string, string> = {}
    for (const token of allTokens) {
      const url = findSampleUrl(token)
      if (url) {
        urls[token] = url
      }
    }

    if (Object.keys(urls).length > 0) {
      activePlayers = new Tone.Players(urls, () => {
        console.log(`[audio] Loaded ${Object.keys(urls).length} samples`)
      }).connect(getMasterOutput())
      activePlayers.volume.value = -6

      await new Promise(resolve => setTimeout(resolve, 300))

      for (const match of allSoundMatches) {
        const inner = match.match(/(?:sound|s)\(["']([^"']+)["']\)/)?.[1]
        if (!inner) continue

        const subPatterns = inner.split(',')
        for (const sub of subPatterns) {
          const tokens = parseMiniNotation(sub.trim())
          if (tokens.length > 0) {
            console.log(`[audio] Sequence: [${tokens.join(', ')}]`)
            playSequence(tokens)
          }
        }
      }
    }
  }

  // Handle note patterns with synth
  if (noteMatches.length > 0) {
    const synth = new Tone.PolySynth(Tone.Synth, {
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.1 }
    }).connect(getMasterOutput())
    synth.volume.value = -12
    activeSynths.push(synth)

    for (const match of noteMatches) {
      const inner = match.match(/note\(["']([^"']+)["']\)/)?.[1]
      if (!inner) continue

      const subPatterns = inner.split(',')
      for (const sub of subPatterns) {
        const notes = parseMiniNotation(sub.trim()).filter(n => n !== '~' && n !== '_')
        if (notes.length === 0) continue
        const seq = new Tone.Sequence(
          (time, note) => {
            if (note && note !== '~' && note !== '_') {
              synth.triggerAttackRelease(note, '16n', time)
            }
          },
          notes,
          '8n'
        )
        seq.start(0)
        activeSequences.push(seq)
      }
    }
  }

  // Fallback if no patterns found
  if (allSoundMatches.length === 0 && noteMatches.length === 0) {
    console.log('[audio] No patterns found, trying fallback')
    const fallbackNames: string[] = []
    for (const key of sampleUrls.keys()) {
      if (!key.includes(':')) {
        const lower = key.toLowerCase()
        if (lower.includes('kick') || lower.includes('bd')) fallbackNames[0] = key
        else if (lower.includes('snare') || lower.includes('sd')) fallbackNames[1] = key
        else if (lower.includes('hat') || lower.includes('hh')) fallbackNames[2] = key
      }
    }
    const tokens = fallbackNames.filter(Boolean)
    if (tokens.length > 0) {
      const urls: Record<string, string> = {}
      tokens.forEach(t => {
        const url = findSampleUrl(t)
        if (url) urls[t] = url
      })
      if (Object.keys(urls).length > 0) {
        activePlayers = new Tone.Players(urls).connect(getMasterOutput())
        activePlayers.volume.value = -6
        await new Promise(resolve => setTimeout(resolve, 300))
        playSequence(tokens)
      }
    }
  }

  Tone.Transport.bpm.value = 120
  Tone.Transport.start()
}

function playSequence(tokens: string[]) {
  if (!activePlayers) return
  if (tokens.length === 0) return

  let paddedTokens = [...tokens]
  let targetLength: number
  let subdivision: Tone.Unit.Time

  const len = tokens.length

  if (len <= 4) {
    targetLength = 4
    subdivision = '4n'
  } else if (len <= 8) {
    targetLength = 8
    subdivision = '8n'
  } else if (len <= 16) {
    targetLength = 16
    subdivision = '16n'
  } else {
    targetLength = 32
    subdivision = '32n'
  }

  while (paddedTokens.length < targetLength) {
    paddedTokens.push('~')
  }

  const seq = new Tone.Sequence(
    (time, token) => {
      if (!token || token === '~' || token === '_') return
      if (!activePlayers) return

      try {
        const player = activePlayers.player(token)
        if (player && player.loaded) {
          player.start(time)
        }
      } catch {
        // Sample not found
      }
    },
    paddedTokens,
    subdivision
  )
  seq.start(0)
  activeSequences.push(seq)
}

function parseMiniNotation(pattern: string): string[] {
  const tokens: string[] = []

  if (pattern.includes('::')) {
    const segments = pattern.split(/(\s*~\s*)/)

    for (const segment of segments) {
      const trimmed = segment.trim()
      if (!trimmed) continue

      if (trimmed === '~') {
        tokens.push('~')
        continue
      }

      const samplePatterns = trimmed
        .split(/(?=(?:^|\s)[a-zA-Z0-9_-]+\s*::)/)
        .map(s => s.trim())
        .filter(Boolean)

      for (const sample of samplePatterns) {
        processToken(sample, tokens)
      }
    }
  } else {
    const parts = pattern.split(/\s+/)
    for (const part of parts) {
      if (part) processToken(part, tokens)
    }
  }

  return tokens
}

function processToken(token: string, tokens: string[]) {
  if (!token) return

  const repeatMatch = token.match(/^(.+)\*(\d+)$/)
  if (repeatMatch) {
    const name = repeatMatch[1].replace(/[\[\]<>]/g, '').trim()
    const count = parseInt(repeatMatch[2])
    for (let i = 0; i < count; i++) {
      tokens.push(name)
    }
    return
  }

  const euclidMatch = token.match(/^([^(]+)\((\d+),(\d+)\)$/)
  if (euclidMatch) {
    tokens.push(euclidMatch[1].replace(/[\[\]<>]/g, '').trim())
    return
  }

  const altMatch = token.match(/^<(.+)>$/)
  if (altMatch) {
    const alts = altMatch[1].split(/\s+/)
    if (alts[0]) tokens.push(alts[0].replace(/[\[\]<>]/g, ''))
    return
  }

  const condMatch = token.match(/^(.+)\?$/)
  if (condMatch) {
    tokens.push(condMatch[1].replace(/[\[\]<>]/g, '').trim())
    return
  }

  const weightMatch = token.match(/^(.+)@\d+$/)
  if (weightMatch) {
    tokens.push(weightMatch[1].replace(/[\[\]<>]/g, '').trim())
    return
  }

  const cleaned = token.replace(/[\[\]<>]/g, '').trim()
  if (cleaned) {
    tokens.push(cleaned)
  }
}

export function stopPlayback() {
  Tone.Transport.stop()
  Tone.Transport.cancel()

  for (const seq of activeSequences) {
    seq.dispose()
  }
  activeSequences = []

  for (const synth of activeSynths) {
    synth.dispose()
  }
  activeSynths = []

  if (activePlayers) {
    activePlayers.stopAll()
    activePlayers.dispose()
    activePlayers = null
  }
}

export function isAudioInitialized() {
  return isInitialized
}

export function getLoadedSamples(): string[] {
  return Array.from(sampleUrls.keys())
}

import { spawn, ChildProcess } from 'child_process'
import { platform } from 'os'
import { getUploadUrl, type SoundBank } from './api.js'
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import https from 'https'
import http from 'http'

const cacheDir = join(tmpdir(), 'oli-cache')
if (!existsSync(cacheDir)) {
  mkdirSync(cacheDir, { recursive: true })
}

let currentProcess: ChildProcess | null = null
let isPlaying = false
let currentPattern: string[] = []
let patternIndex = 0
let tempo = 120
let loopTimeout: NodeJS.Timeout | null = null
let soundBanks: SoundBank[] = []

export function setSoundBanks(banks: SoundBank[]) {
  soundBanks = banks
}

export function setTempo(bpm: number) {
  tempo = Math.max(40, Math.min(300, bpm))
}

export function getTempo(): number {
  return tempo
}

export function getIsPlaying(): boolean {
  return isPlaying
}

async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest)
    const protocol = url.startsWith('https') ? https : http

    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location
        if (redirectUrl) {
          downloadFile(redirectUrl, dest).then(resolve).catch(reject)
          return
        }
      }
      response.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      reject(err)
    })
  })
}

function findSample(name: string): SoundBank['files'][0] | null {
  for (const bank of soundBanks) {
    if (!bank.files) continue
    for (const file of bank.files) {
      const sampleName = file.name.replace(/\.(wav|mp3|ogg|flac)$/i, '')
      if (sampleName === name || file.name === name) {
        return file
      }
      if (`${bank.name}:${sampleName}` === name) {
        return file
      }
    }
  }
  return null
}

async function getCachedPath(file: { filename: string }): Promise<string | null> {
  const cachePath = join(cacheDir, file.filename)

  if (existsSync(cachePath)) {
    return cachePath
  }

  try {
    const url = getUploadUrl(file.filename)
    await downloadFile(url, cachePath)
    return cachePath
  } catch {
    return null
  }
}

function playFile(filePath: string): ChildProcess | null {
  const os = platform()

  let cmd: string
  let args: string[]

  if (os === 'darwin') {
    cmd = 'afplay'
    args = [filePath]
  } else if (os === 'linux') {
    cmd = 'aplay'
    args = ['-q', filePath]
  } else if (os === 'win32') {
    cmd = 'powershell'
    args = ['-c', `(New-Object Media.SoundPlayer '${filePath}').PlaySync()`]
  } else {
    return null
  }

  return spawn(cmd, args, { stdio: 'ignore' })
}

export async function previewSample(filename: string): Promise<void> {
  stopPlayback()

  const file = { filename }
  const path = await getCachedPath(file)
  if (path) {
    currentProcess = playFile(path)
  }
}

export function parsePattern(code: string): string[] {
  // Extract sound() or s() patterns
  const match = code.match(/(?:sound|s)\(["']([^"']+)["']\)/)
  if (!match) return []

  const pattern = match[1]
  const tokens = pattern.split(/\s+/).filter(t => t && t !== '~')
  return tokens
}

async function playNextInPattern() {
  if (!isPlaying || currentPattern.length === 0) return

  const token = currentPattern[patternIndex % currentPattern.length]
  const sample = findSample(token)

  if (sample) {
    const path = await getCachedPath(sample)
    if (path && isPlaying) {
      playFile(path)
    }
  }

  patternIndex++

  // Schedule next beat
  const msPerBeat = (60 / tempo) * 1000 / 2 // 8th notes
  loopTimeout = setTimeout(playNextInPattern, msPerBeat)
}

export async function playPattern(code: string): Promise<void> {
  stopPlayback()

  currentPattern = parsePattern(code)
  if (currentPattern.length === 0) return

  isPlaying = true
  patternIndex = 0

  playNextInPattern()
}

export function stopPlayback(): void {
  isPlaying = false

  if (loopTimeout) {
    clearTimeout(loopTimeout)
    loopTimeout = null
  }

  if (currentProcess) {
    currentProcess.kill()
    currentProcess = null
  }
}

export function togglePlayback(code: string): boolean {
  if (isPlaying) {
    stopPlayback()
    return false
  } else {
    playPattern(code)
    return true
  }
}

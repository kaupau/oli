import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getShare, forkShare, type Share } from '../lib/api'
import { initAudio, playPattern, stopPlayback, getFrequencyData, getWaveformData } from '../lib/audio'

export function ShareView() {
  const { shareId } = useParams<{ shareId: string }>()
  const [share, setShare] = useState<Share | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [forked, setForked] = useState(false)
  const [ascii, setAscii] = useState('')

  const frameRef = useRef(0)
  const barsRef = useRef<number[]>([])
  const peaksRef = useRef<number[]>([])
  const peakHoldRef = useRef<number[]>([])

  // Fetch share on mount
  useEffect(() => {
    if (!shareId) return

    setLoading(true)
    getShare(shareId)
      .then(s => {
        setShare(s)
        setError(null)
      })
      .catch(() => setError('Share not found'))
      .finally(() => setLoading(false))
  }, [shareId])

  // Handle play/stop
  const handlePlay = async () => {
    if (!share) return

    try {
      await initAudio()
      if (isPlaying) {
        stopPlayback()
        setIsPlaying(false)
      } else {
        await playPattern(share.code)
        setIsPlaying(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to play')
    }
  }

  // Handle fork
  const handleFork = async () => {
    if (!shareId) return

    try {
      await forkShare(shareId)
      setForked(true)
    } catch (err: any) {
      setError(err.message || 'Failed to fork')
    }
  }

  // Visualizer loop
  useEffect(() => {
    const cols = window.innerWidth < 768 ? 32 : 48
    const rows = window.innerWidth < 768 ? 10 : 16

    if (barsRef.current.length !== cols) {
      barsRef.current = Array(cols).fill(0)
      peaksRef.current = Array(cols).fill(0)
      peakHoldRef.current = Array(cols).fill(0)
    }

    const interval = setInterval(() => {
      frameRef.current++

      const freqData = getFrequencyData()
      const waveData = getWaveformData()

      const bars: number[] = []

      // Map frequency bins to display columns
      for (let i = 0; i < cols; i++) {
        const logMin = Math.log(1)
        const logMax = Math.log(Math.max(1, freqData.length - 1))
        const logIndex = logMin + (i / cols) * (logMax - logMin)
        const freqIndex = Math.min(Math.floor(Math.exp(logIndex)), freqData.length - 1)

        let sum = 0
        let count = 0
        const range = Math.max(1, Math.floor(freqData.length / cols / 2))
        for (let j = -range; j <= range; j++) {
          const idx = freqIndex + j
          if (idx >= 0 && idx < freqData.length) {
            sum += freqData[idx]
            count++
          }
        }
        let val = count > 0 ? sum / count : 0

        const freqBoost = 1 + (1 - i / cols) * 0.8
        val = Math.pow(val, 0.6) * freqBoost * 2

        const prevBar = barsRef.current[i] || 0
        if (val > prevBar) {
          bars[i] = prevBar + (val - prevBar) * 0.6
        } else {
          bars[i] = prevBar * 0.9
        }
      }

      barsRef.current = bars

      peaksRef.current = bars.map((bar, i) => {
        const currentPeak = peaksRef.current[i] || 0
        const holdTime = peakHoldRef.current[i] || 0

        if (bar > currentPeak) {
          peakHoldRef.current[i] = 12
          return bar
        } else if (holdTime > 0) {
          peakHoldRef.current[i] = holdTime - 1
          return currentPeak
        } else {
          return Math.max(0, currentPeak - 0.03)
        }
      })

      // Render ASCII
      let lines: string[] = []

      const statusIcon = isPlaying ? '▶' : '○'
      const name = share?.name || 'shared beat'
      const truncName = name.length > cols - 10 ? name.slice(0, cols - 13) + '...' : name
      const headerPad = Math.max(0, cols - truncName.length - 4)

      lines.push(`┌${'─'.repeat(cols + 2)}┐`)
      lines.push(`│ ${truncName}${' '.repeat(headerPad)}${statusIcon}  │`)
      lines.push(`├${'─'.repeat(cols + 2)}┤`)

      // EQ Bars
      for (let y = 0; y < rows; y++) {
        let line = '│ '
        const rowLevel = 1 - y / rows

        for (let x = 0; x < cols; x++) {
          const barVal = Math.min(1, bars[x] || 0)
          const peakVal = peaksRef.current[x] || 0

          if (!isPlaying) {
            line += (y % 4 === 0 && x % 8 === 0) ? '·' : ' '
          } else if (Math.abs(rowLevel - peakVal) < 0.04 && peakVal > 0.05) {
            line += '▔'
          } else if (rowLevel <= barVal) {
            const rel = rowLevel / Math.max(barVal, 0.01)
            if (rel > 0.85) line += '█'
            else if (rel > 0.65) line += '▓'
            else if (rel > 0.4) line += '▒'
            else if (rel > 0.15) line += '░'
            else line += '·'
          } else {
            line += ' '
          }
        }
        line += ' │'
        lines.push(line)
      }

      // Waveform
      lines.push(`├${'─'.repeat(cols + 2)}┤`)

      const waveRows = 3
      for (let wy = 0; wy < waveRows; wy++) {
        let line = '│ '
        const rowCenter = Math.floor(waveRows / 2)

        for (let x = 0; x < cols; x++) {
          const waveIndex = Math.floor((x / cols) * waveData.length)
          const waveVal = waveData[waveIndex] || 0
          const waveRow = Math.floor((waveVal + 1) / 2 * waveRows)

          if (!isPlaying) {
            line += wy === rowCenter ? '─' : ' '
          } else if (waveRow === wy) {
            if (Math.abs(waveVal) > 0.5) line += '█'
            else if (Math.abs(waveVal) > 0.25) line += '▓'
            else line += '░'
          } else if (wy === rowCenter) {
            line += '─'
          } else {
            line += ' '
          }
        }
        line += ' │'
        lines.push(line)
      }

      lines.push(`└${'─'.repeat(cols + 2)}┘`)

      setAscii(lines.join('\n'))
    }, 25)

    return () => clearInterval(interval)
  }, [isPlaying, share])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-[#666] font-mono">
        loading...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <div className="text-[#f87171] font-mono">{error}</div>
        <Link to="/" className="text-[#a78bfa] hover:underline font-mono text-sm">
          ← back to oli
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
      {/* Visualizer */}
      <pre
        className="font-mono text-[10px] sm:text-[12px] leading-[1.15] tracking-[0.02em] whitespace-pre mb-6"
        style={{
          color: isPlaying ? '#a78bfa' : '#555',
          textShadow: isPlaying ? '0 0 20px #7c3aed55, 0 0 8px #7c3aed33' : 'none',
          transition: 'color 0.3s, text-shadow 0.3s',
        }}
      >
        {ascii}
      </pre>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={handlePlay}
          className={`px-6 py-2 rounded font-mono text-sm transition-colors ${
            isPlaying
              ? 'text-[#f87171] bg-[#f8717115] hover:bg-[#f8717125]'
              : 'text-[#4ade80] bg-[#4ade8015] hover:bg-[#4ade8025]'
          }`}
        >
          {isPlaying ? 'stop' : 'play'}
        </button>

        {forked ? (
          <Link
            to="/"
            className="px-4 py-2 rounded font-mono text-sm text-[#a78bfa] bg-[#a78bfa15] hover:bg-[#a78bfa25] transition-colors"
          >
            open in oli →
          </Link>
        ) : (
          <button
            onClick={handleFork}
            className="px-4 py-2 rounded font-mono text-sm text-[#888] hover:text-[#ccc] transition-colors"
          >
            fork to my projects
          </button>
        )}
      </div>

      {/* Back link */}
      <Link
        to="/"
        className="mt-8 text-[#555] hover:text-[#888] font-mono text-xs transition-colors"
      >
        ← create your own on oli
      </Link>
    </div>
  )
}

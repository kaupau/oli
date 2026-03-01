import { useEffect, useRef, useState } from 'react'
import { useStore } from '../stores/app'
import { getFrequencyData, getWaveformData } from '../lib/audio'

// Check if mobile
const isMobile = () => window.innerWidth < 768

export function Visualizer() {
  const { isPlaying, isAdvancedMode } = useStore()
  const frameRef = useRef(0)
  const [cols, setCols] = useState(isMobile() ? 32 : 64)
  const barsRef = useRef<number[]>([])
  const peaksRef = useRef<number[]>([])
  const peakHoldRef = useRef<number[]>([])
  const [ascii, setAscii] = useState('')

  // Handle resize and reset refs when cols change
  useEffect(() => {
    const handleResize = () => {
      const newCols = isMobile() ? 32 : 64
      if (newCols !== cols) {
        setCols(newCols)
        // Reset refs for new column count
        barsRef.current = Array(newCols).fill(0)
        peaksRef.current = Array(newCols).fill(0)
        peakHoldRef.current = Array(newCols).fill(0)
      }
    }
    // Initialize refs on mount
    if (barsRef.current.length !== cols) {
      barsRef.current = Array(cols).fill(0)
      peaksRef.current = Array(cols).fill(0)
      peakHoldRef.current = Array(cols).fill(0)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [cols])

  useEffect(() => {
    if (isAdvancedMode) return

    const interval = setInterval(() => {
      frameRef.current++
      const t = frameRef.current

      const freqData = getFrequencyData()
      const waveData = getWaveformData()

      const rows = isMobile() ? 12 : 20
      const bars: number[] = []

      // Map frequency bins to display columns with logarithmic scaling
      for (let i = 0; i < cols; i++) {
        const logMin = Math.log(1)
        const logMax = Math.log(Math.max(1, freqData.length - 1))
        const logIndex = logMin + (i / cols) * (logMax - logMin)
        const freqIndex = Math.min(Math.floor(Math.exp(logIndex)), freqData.length - 1)

        // Average nearby bins
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

        // Frequency-dependent boost
        const freqBoost = 1 + (1 - i / cols) * 0.8
        val = Math.pow(val, 0.6) * freqBoost * 2

        // Smooth attack/decay
        const prevBar = barsRef.current[i] || 0
        if (val > prevBar) {
          bars[i] = prevBar + (val - prevBar) * 0.6
        } else {
          bars[i] = prevBar * 0.9
        }
      }

      barsRef.current = bars

      // Update peaks with hold
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

      // Header
      const statusIcon = isPlaying ? '▶' : '○'
      const statusText = isPlaying ? 'PLAY' : 'IDLE'
      const bpmText = isPlaying ? '120' : ''
      const headerPad = Math.max(0, cols - 4 - statusText.length - bpmText.length - (bpmText ? 3 : 0) - 2)
      lines.push(`  ┌${'─'.repeat(cols)}┐`)
      lines.push(`  │ oli${' '.repeat(headerPad)}${bpmText}${bpmText ? ' ' : ''}${statusIcon} ${statusText} │`)
      lines.push(`  ├${'─'.repeat(cols)}┤`)

      // EQ Bars
      for (let y = 0; y < rows; y++) {
        let line = '  │'
        const rowLevel = 1 - y / rows

        for (let x = 0; x < cols; x++) {
          const barVal = Math.min(1, bars[x] || 0)
          const peakVal = peaksRef.current[x] || 0

          if (!isPlaying) {
            line += (y % 4 === 0 && x % 8 === 0) ? '·' : ' '
          } else if (Math.abs(rowLevel - peakVal) < 0.035 && peakVal > 0.05) {
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
        line += '│'
        lines.push(line)
      }

      // Frequency labels
      lines.push(`  ├${'─'.repeat(cols)}┤`)
      const labelPad = Math.max(0, Math.floor((cols - 16) / 3))
      lines.push(`  │ BASS${' '.repeat(labelPad)}MID${' '.repeat(labelPad)}HIGH${' '.repeat(Math.max(0, cols - 12 - labelPad * 2))}│`)

      // Waveform
      lines.push(`  ├${'─'.repeat(cols)}┤`)

      const waveRows = 5
      for (let wy = 0; wy < waveRows; wy++) {
        let line = '  │'
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
        line += '│'
        lines.push(line)
      }

      // Beat indicator
      lines.push(`  ├${'─'.repeat(cols)}┤`)

      if (isPlaying) {
        const beatPos = Math.floor(t / 15) % 4
        let beatLine = '  │'
        const segWidth = Math.floor(cols / 4)
        for (let i = 0; i < 4; i++) {
          const pad = Math.floor((segWidth - 1) / 2)
          beatLine += ' '.repeat(pad) + (i === beatPos ? '●' : '○') + ' '.repeat(segWidth - pad - 1)
        }
        beatLine = beatLine.substring(0, 2 + cols + 1) + '│'
        lines.push(beatLine)
      } else {
        lines.push(`  │${' '.repeat(cols)}│`)
      }

      lines.push(`  └${'─'.repeat(cols)}┘`)

      setAscii(lines.join('\n'))
    }, 25)

    return () => clearInterval(interval)
  }, [isPlaying, isAdvancedMode, cols])

  if (isAdvancedMode) return null

  return (
    <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] overflow-hidden select-none p-2">
      <pre
        className="font-mono text-[9px] sm:text-[11px] leading-[1.15] tracking-[0.02em] whitespace-pre"
        style={{
          background: 'transparent',
          color: isPlaying ? '#a78bfa' : '#444',
          textShadow: isPlaying ? '0 0 20px #7c3aed55, 0 0 8px #7c3aed33' : 'none',
          transition: 'color 0.3s, text-shadow 0.3s',
        }}
      >
        {ascii}
      </pre>
    </div>
  )
}

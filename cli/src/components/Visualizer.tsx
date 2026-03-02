import React, { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import { store } from '../store.js'
import { getIsPlaying, getTempo } from '../audio.js'

export function Visualizer() {
  const [frame, setFrame] = useState(0)
  const [bars, setBars] = useState<number[]>(Array(32).fill(0))

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame(f => f + 1)

      if (getIsPlaying()) {
        // Simulate audio visualization
        setBars(prev => prev.map(() => {
          const base = Math.random() * 0.7 + 0.1
          return base * (0.5 + Math.random() * 0.5)
        }))
      } else {
        setBars(prev => prev.map(v => v * 0.9))
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const state = store.getState()
  const cols = 48
  const rows = 12
  const isPlaying = getIsPlaying()
  const tempo = getTempo()

  // Build ASCII frame
  const lines: string[] = []

  // Header
  const statusIcon = isPlaying ? '▶' : '○'
  const statusText = isPlaying ? 'PLAY' : 'IDLE'
  const bpmText = isPlaying ? String(tempo) : ''
  const headerPad = Math.max(0, cols - 4 - statusText.length - bpmText.length - (bpmText ? 4 : 0) - 2)

  lines.push(`┌${'─'.repeat(cols)}┐`)
  lines.push(`│ oli${' '.repeat(headerPad)}${bpmText}${bpmText ? ' bpm ' : ''}${statusIcon} ${statusText} │`)
  lines.push(`├${'─'.repeat(cols)}┤`)

  // EQ Bars
  for (let y = 0; y < rows; y++) {
    let line = '│'
    const rowLevel = 1 - y / rows

    for (let x = 0; x < cols; x++) {
      const barIndex = Math.floor(x / (cols / bars.length))
      const barVal = bars[barIndex] || 0

      if (!isPlaying) {
        line += (y % 3 === 0 && x % 6 === 0) ? '·' : ' '
      } else if (rowLevel <= barVal) {
        if (rowLevel > 0.8) line += '█'
        else if (rowLevel > 0.5) line += '▓'
        else line += '░'
      } else {
        line += ' '
      }
    }
    line += '│'
    lines.push(line)
  }

  // Footer
  lines.push(`├${'─'.repeat(cols)}┤`)

  // Show current code snippet
  const codePreview = state.code.length > cols - 4
    ? state.code.substring(0, cols - 7) + '...'
    : state.code
  const codePad = cols - codePreview.length - 2
  lines.push(`│ ${codePreview}${' '.repeat(Math.max(0, codePad))}│`)

  lines.push(`└${'─'.repeat(cols)}┘`)

  // Help line
  const helpText = '[space] play/stop  [←→] panels  [t] tempo  [q] quit'

  return (
    <Box flexDirection="column">
      <Text color="green">{lines.join('\n')}</Text>
      <Text color="gray" dimColor>{helpText}</Text>
    </Box>
  )
}

import React, { useState, useEffect } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import { Visualizer } from './Visualizer.js'
import { Chat } from './Chat.js'
import { Sounds } from './Sounds.js'
import { Projects } from './Projects.js'
import { store, type Panel } from '../store.js'
import { togglePlayback, setTempo, getTempo, stopPlayback } from '../audio.js'
import { fetchSoundBanks } from '../api.js'
import { setSoundBanks } from '../audio.js'

const panels: Panel[] = ['sounds', 'visualizer', 'chat', 'projects']

export function App() {
  const { exit } = useApp()
  const [panel, setPanel] = useState<Panel>('visualizer')
  const [tempo, setTempoState] = useState(120)
  const [isPlaying, setIsPlaying] = useState(false)
  const [editingTempo, setEditingTempo] = useState(false)
  const [tempoInput, setTempoInput] = useState('120')
  const [, forceUpdate] = useState(0)

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const banks = await fetchSoundBanks()
      store.setState({ soundBanks: banks })
      setSoundBanks(banks)
    } catch {
      // Backend not running
    }
  }

  // Update store when panel changes
  useEffect(() => {
    store.setState({ panel })
  }, [panel])

  useInput((input, key) => {
    if (editingTempo) {
      if (key.return) {
        const newTempo = parseInt(tempoInput) || 120
        const clamped = Math.max(40, Math.min(300, newTempo))
        setTempoState(clamped)
        setTempo(clamped)
        setTempoInput(String(clamped))
        setEditingTempo(false)
      } else if (key.escape) {
        setTempoInput(String(tempo))
        setEditingTempo(false)
      } else if (key.backspace || key.delete) {
        setTempoInput(s => s.slice(0, -1))
      } else if (/^\d$/.test(input)) {
        setTempoInput(s => s + input)
      }
      return
    }

    // Global shortcuts
    if (input === 'q') {
      stopPlayback()
      exit()
    } else if (input === ' ') {
      const state = store.getState()
      const playing = togglePlayback(state.code)
      setIsPlaying(playing)
      store.setState({ isPlaying: playing })
    } else if (input === 't') {
      setEditingTempo(true)
    } else if (input === '-') {
      const newTempo = Math.max(40, tempo - 5)
      setTempoState(newTempo)
      setTempo(newTempo)
      setTempoInput(String(newTempo))
    } else if (input === '=' || input === '+') {
      const newTempo = Math.min(300, tempo + 5)
      setTempoState(newTempo)
      setTempo(newTempo)
      setTempoInput(String(newTempo))
    } else if (key.leftArrow && !key.ctrl) {
      const idx = panels.indexOf(panel)
      const newIdx = (idx - 1 + panels.length) % panels.length
      setPanel(panels[newIdx])
    } else if (key.rightArrow && !key.ctrl) {
      const idx = panels.indexOf(panel)
      const newIdx = (idx + 1) % panels.length
      setPanel(panels[newIdx])
    } else if (input === '1') {
      setPanel('sounds')
    } else if (input === '2') {
      setPanel('visualizer')
    } else if (input === '3') {
      setPanel('chat')
    } else if (input === '4') {
      setPanel('projects')
    }

    forceUpdate(n => n + 1)
  })

  const renderPanel = () => {
    switch (panel) {
      case 'sounds':
        return <Sounds />
      case 'visualizer':
        return <Visualizer />
      case 'chat':
        return <Chat />
      case 'projects':
        return <Projects />
      default:
        return <Visualizer />
    }
  }

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box>
        <Text color="magenta" bold> oli </Text>
        <Text color="gray">│ </Text>
        <Text color={panel === 'sounds' ? 'yellow' : 'gray'}>1:sounds </Text>
        <Text color={panel === 'visualizer' ? 'green' : 'gray'}>2:play </Text>
        <Text color={panel === 'chat' ? 'magenta' : 'gray'}>3:ai </Text>
        <Text color={panel === 'projects' ? 'cyan' : 'gray'}>4:proj </Text>
        <Text color="gray">│ </Text>
        {editingTempo ? (
          <Text color="cyan">{tempoInput}_ bpm</Text>
        ) : (
          <Text color="gray">{tempo} bpm </Text>
        )}
        <Text color="gray">│ </Text>
        <Text color={isPlaying ? 'green' : 'gray'}>{isPlaying ? '▶ playing' : '○ stopped'}</Text>
      </Box>

      <Text color="gray">{'─'.repeat(60)}</Text>

      {/* Main content */}
      <Box marginTop={1}>
        {renderPanel()}
      </Box>

      {/* Status bar */}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          oli v1.0 │ {panel} │ {isPlaying ? 'playing' : 'idle'} │ [q]uit
        </Text>
      </Box>
    </Box>
  )
}

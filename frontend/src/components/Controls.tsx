import { useState } from 'react'
import { useStore } from '../stores/app'
import { initAudio, playPattern, stopPlayback, setTempo as setAudioTempo } from '../lib/audio'

export function Controls() {
  const { isPlaying, setIsPlaying, isAdvancedMode, setIsAdvancedMode, code, setError, tempo, setTempo } = useStore()
  const [editingTempo, setEditingTempo] = useState(false)
  const [tempoInput, setTempoInput] = useState(String(tempo))

  const handlePlay = async () => {
    try {
      await initAudio()
      if (isPlaying) {
        stopPlayback()
        setIsPlaying(false)
      } else {
        setAudioTempo(tempo)
        playPattern(code)
        setIsPlaying(true)
      }
    } catch {
      setError('Failed to initialize audio')
    }
  }

  const handleTempoChange = (value: string) => {
    setTempoInput(value)
  }

  const handleTempoSubmit = () => {
    const newTempo = parseInt(tempoInput) || 120
    const clampedTempo = Math.max(40, Math.min(300, newTempo))
    setTempo(clampedTempo)
    setTempoInput(String(clampedTempo))
    setAudioTempo(clampedTempo)
    setEditingTempo(false)
  }

  const handleTempoKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTempoSubmit()
    } else if (e.key === 'Escape') {
      setTempoInput(String(tempo))
      setEditingTempo(false)
    }
  }

  const adjustTempo = (delta: number) => {
    const newTempo = Math.max(40, Math.min(300, tempo + delta))
    setTempo(newTempo)
    setTempoInput(String(newTempo))
    setAudioTempo(newTempo)
  }

  return (
    <div className="flex items-center gap-2 text-[11px]">
      {/* Tempo control */}
      <div className="flex items-center gap-1 text-[#555]">
        <button
          onClick={() => adjustTempo(-5)}
          className="hover:text-[#888] px-1"
        >
          -
        </button>
        {editingTempo ? (
          <input
            type="text"
            value={tempoInput}
            onChange={(e) => handleTempoChange(e.target.value)}
            onBlur={handleTempoSubmit}
            onKeyDown={handleTempoKeyDown}
            className="w-8 bg-[#111] border border-[#333] rounded px-1 text-center text-[#ccc] outline-none"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditingTempo(true)}
            className="hover:text-[#ccc] min-w-[32px] text-center"
          >
            {tempo}
          </button>
        )}
        <span className="text-[#444]">bpm</span>
        <button
          onClick={() => adjustTempo(5)}
          className="hover:text-[#888] px-1"
        >
          +
        </button>
      </div>

      <span className="text-[#333]">│</span>

      {/* Code toggle */}
      <button
        onClick={() => setIsAdvancedMode(!isAdvancedMode)}
        className={`px-2 py-1 rounded transition-colors ${
          isAdvancedMode
            ? 'text-[#fbbf24] bg-[#fbbf2415]'
            : 'text-[#555] hover:text-[#888]'
        }`}
      >
        code
      </button>

      {/* Play / Stop */}
      <button
        onClick={handlePlay}
        className={`px-3 py-1 rounded transition-colors ${
          isPlaying
            ? 'text-[#f87171] bg-[#f8717115]'
            : 'text-[#4ade80] bg-[#4ade8015] hover:bg-[#4ade8025]'
        }`}
      >
        {isPlaying ? 'stop' : 'play'}
      </button>
    </div>
  )
}

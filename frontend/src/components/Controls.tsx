import { useState } from 'react'
import { useStore } from '../stores/app'
import { initAudio, playPattern, stopPlayback, setTempo as setAudioTempo } from '../lib/audio'

function IconRewind({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="3" width="2" height="10" rx="0.5" />
      <path d="M14 3.5v9a.5.5 0 01-.8.4L7.5 8.4a.5.5 0 010-.8l5.7-4.5a.5.5 0 01.8.4z" />
    </svg>
  )
}

function IconPlay({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 2.5v11a.75.75 0 001.15.63l8.5-5.5a.75.75 0 000-1.26l-8.5-5.5A.75.75 0 004 2.5z" />
    </svg>
  )
}

function IconPause({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <rect x="3" y="2" width="3.5" height="12" rx="0.75" />
      <rect x="9.5" y="2" width="3.5" height="12" rx="0.75" />
    </svg>
  )
}

function IconStop({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <rect x="3" y="3" width="10" height="10" rx="1" />
    </svg>
  )
}

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

  const handleStop = async () => {
    stopPlayback()
    setIsPlaying(false)
  }

  const handleRestart = async () => {
    try {
      await initAudio()
      stopPlayback()
      setAudioTempo(tempo)
      playPattern(code)
      setIsPlaying(true)
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

  const transportBtn = "w-7 h-7 flex items-center justify-center rounded transition-all duration-100"

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

      <span className="text-[#333]">│</span>

      {/* DAW Transport Controls */}
      <div className="flex items-center gap-0.5 bg-[#111] rounded-md border border-[#222] px-0.5 py-0.5">
        {/* Rewind / Return to start */}
        <button
          onClick={handleRestart}
          title="Restart"
          className={`${transportBtn} ${
            isPlaying
              ? 'text-[#888] hover:text-[#ccc] hover:bg-[#ffffff0a]'
              : 'text-[#555] hover:text-[#888] hover:bg-[#ffffff0a]'
          }`}
        >
          <IconRewind size={12} />
        </button>

        {/* Play / Pause */}
        <button
          onClick={handlePlay}
          title={isPlaying ? 'Pause' : 'Play'}
          className={`${transportBtn} ${
            isPlaying
              ? 'text-[#4ade80] bg-[#4ade8018] hover:bg-[#4ade8028]'
              : 'text-[#4ade80] hover:bg-[#4ade8018]'
          }`}
        >
          {isPlaying ? <IconPause size={12} /> : <IconPlay size={12} />}
        </button>

        {/* Stop */}
        <button
          onClick={handleStop}
          title="Stop"
          className={`${transportBtn} ${
            isPlaying
              ? 'text-[#888] hover:text-[#f87171] hover:bg-[#f8717112]'
              : 'text-[#444]'
          }`}
          disabled={!isPlaying}
        >
          <IconStop size={11} />
        </button>
      </div>
    </div>
  )
}

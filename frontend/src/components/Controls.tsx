import { useStore } from '../stores/app'
import { initAudio, playPattern, stopPlayback } from '../lib/audio'

export function Controls() {
  const { isPlaying, setIsPlaying, isAdvancedMode, setIsAdvancedMode, code, setError } = useStore()

  const handlePlay = async () => {
    try {
      await initAudio()
      if (isPlaying) {
        stopPlayback()
        setIsPlaying(false)
      } else {
        playPattern(code)
        setIsPlaying(true)
      }
    } catch {
      setError('Failed to initialize audio')
    }
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Code toggle */}
      <button
        onClick={() => setIsAdvancedMode(!isAdvancedMode)}
        className={`px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px] transition-all border flex items-center gap-1 sm:gap-1.5 ${
          isAdvancedMode
            ? 'border-[#f59e0b50] text-[#fbbf24] bg-[#f59e0b10]'
            : 'border-[#333] text-[#555] hover:text-[#888] hover:border-[#444]'
        }`}
      >
        <span className={isAdvancedMode ? 'text-[#fbbf24]' : 'text-[#444]'}>●</span>
        <span className="hidden sm:inline">code</span>
      </button>

      <span className="text-[#333] hidden sm:inline">│</span>

      {/* Play / Stop */}
      <button
        onClick={handlePlay}
        className={`px-2 sm:px-3 py-1 text-[10px] sm:text-[11px] font-medium transition-all border ${
          isPlaying
            ? 'border-[#ef444450] text-[#f87171] bg-[#ef444410] hover:bg-[#ef444420]'
            : 'border-[#22c55e50] text-[#4ade80] bg-[#22c55e10] hover:bg-[#22c55e20]'
        }`}
      >
        {isPlaying ? '■' : '▶'}<span className="hidden sm:inline"> {isPlaying ? 'stop' : 'play'}</span>
      </button>
    </div>
  )
}

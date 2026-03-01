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
    <div className="flex items-center gap-1 sm:gap-2 text-[11px]">
      {/* Code toggle */}
      <button
        onClick={() => setIsAdvancedMode(!isAdvancedMode)}
        className={`px-1.5 py-0.5 transition-colors ${
          isAdvancedMode
            ? 'text-[#fbbf24]'
            : 'text-[#555] hover:text-[#888]'
        }`}
      >
        --{isAdvancedMode ? 'code' : 'viz'}
      </button>

      <span className="text-[#333]">|</span>

      {/* Play / Stop */}
      <button
        onClick={handlePlay}
        className={`px-1.5 py-0.5 transition-colors ${
          isPlaying
            ? 'text-[#f87171]'
            : 'text-[#4ade80] hover:text-[#86efac]'
        }`}
      >
        {isPlaying ? '^C kill' : './run'}
      </button>
    </div>
  )
}

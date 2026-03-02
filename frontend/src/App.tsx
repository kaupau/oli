import { useState, useEffect } from 'react'
import { useStore } from './stores/app'
import { Visualizer } from './components/Visualizer'
import { CodeEditor } from './components/CodeEditor'
import { Controls } from './components/Controls'
import { SoundBanksSidebar } from './components/SoundBanks'
import { Projects } from './components/Projects'
import { AISidebar } from './components/AIChat'

type MobileTab = 'visualizer' | 'ai' | 'sounds'

function App() {
  const { error, setError, isAdvancedMode, focusedPanel, cycleFocus, setFocusedPanel } = useStore()
  const [mobileTab, setMobileTab] = useState<MobileTab>('visualizer')

  // Keyboard shortcuts for panel focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      // Ctrl/Cmd + Arrow keys to switch panels
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
        e.preventDefault()
        cycleFocus('left')
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
        e.preventDefault()
        cycleFocus('right')
      }
      // Number keys 1-3 to jump to panel
      else if (e.key === '1' && !e.ctrlKey && !e.metaKey) {
        setFocusedPanel('sounds')
      } else if (e.key === '2' && !e.ctrlKey && !e.metaKey) {
        setFocusedPanel('main')
      } else if (e.key === '3' && !e.ctrlKey && !e.metaKey) {
        setFocusedPanel('ai')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cycleFocus, setFocusedPanel])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0a0a0a]">
      {/* Header */}
      <header className="h-9 bg-[#0a0a0a] border-b border-[#333] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-[#a78bfa] font-medium">oli</span>
          <Projects />
        </div>
        <div className="flex items-center gap-3">
          <Controls />
          {/* Focus indicator - desktop only */}
          <div className="hidden md:flex items-center gap-1 text-[10px] text-[#444]">
            <span className={focusedPanel === 'sounds' ? 'text-[#fbbf24]' : ''}>1</span>
            <span className={focusedPanel === 'main' ? 'text-[#4ade80]' : ''}>2</span>
            <span className={focusedPanel === 'ai' ? 'text-[#a78bfa]' : ''}>3</span>
          </div>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="bg-[#1a0a0a] border-b border-[#ef444440] px-3 py-1.5 text-[11px] flex items-center justify-between shrink-0">
          <span className="text-[#f87171] truncate">{error}</span>
          <button onClick={() => setError(null)} className="text-[#555] hover:text-[#f87171] shrink-0 ml-2">×</button>
        </div>
      )}

      {/* Body - Desktop */}
      <div className="flex-1 hidden md:flex overflow-hidden">
        <div
          className={`h-full transition-all ${focusedPanel === 'sounds' ? 'ring-1 ring-[#fbbf24] ring-inset' : ''}`}
          onClick={() => setFocusedPanel('sounds')}
        >
          <SoundBanksSidebar />
        </div>

        <main
          className={`flex-1 flex overflow-hidden ${isAdvancedMode ? 'flex-row' : 'flex-col'} ${focusedPanel === 'main' ? 'ring-1 ring-[#4ade80] ring-inset' : ''}`}
          onClick={() => setFocusedPanel('main')}
        >
          {isAdvancedMode && <CodeEditor />}
          <Visualizer />
        </main>

        <div
          className={`h-full transition-all ${focusedPanel === 'ai' ? 'ring-1 ring-[#a78bfa] ring-inset' : ''}`}
          onClick={() => setFocusedPanel('ai')}
        >
          <AISidebar />
        </div>
      </div>

      {/* Body - Mobile */}
      <div className="flex-1 flex flex-col md:hidden overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {mobileTab === 'visualizer' && (
            <main className="h-full flex flex-col">
              {isAdvancedMode && <CodeEditor />}
              <Visualizer />
            </main>
          )}
          {mobileTab === 'ai' && <AISidebar mobile />}
          {mobileTab === 'sounds' && <SoundBanksSidebar mobile />}
        </div>

        {/* Mobile tab bar */}
        <nav className="h-11 bg-[#0a0a0a] border-t border-[#333] flex items-center justify-around shrink-0">
          <button
            onClick={() => setMobileTab('visualizer')}
            className={`flex-1 h-full flex items-center justify-center gap-1.5 text-[11px] transition-colors ${
              mobileTab === 'visualizer' ? 'text-[#4ade80]' : 'text-[#555]'
            }`}
          >
            <span>▶</span>
            <span>play</span>
          </button>
          <div className="w-px h-5 bg-[#333]" />
          <button
            onClick={() => setMobileTab('ai')}
            className={`flex-1 h-full flex items-center justify-center gap-1.5 text-[11px] transition-colors ${
              mobileTab === 'ai' ? 'text-[#a78bfa]' : 'text-[#555]'
            }`}
          >
            <span>●</span>
            <span>ai</span>
          </button>
          <div className="w-px h-5 bg-[#333]" />
          <button
            onClick={() => setMobileTab('sounds')}
            className={`flex-1 h-full flex items-center justify-center gap-1.5 text-[11px] transition-colors ${
              mobileTab === 'sounds' ? 'text-[#fbbf24]' : 'text-[#555]'
            }`}
          >
            <span>♪</span>
            <span>sounds</span>
          </button>
        </nav>
      </div>
    </div>
  )
}

export default App

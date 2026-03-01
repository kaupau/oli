import { useState } from 'react'
import { useStore } from './stores/app'
import { Visualizer } from './components/Visualizer'
import { CodeEditor } from './components/CodeEditor'
import { Controls } from './components/Controls'
import { SoundBanksSidebar } from './components/SoundBanks'
import { Projects } from './components/Projects'
import { AISidebar } from './components/AIChat'

type MobileTab = 'visualizer' | 'ai' | 'sounds'

function App() {
  const { error, setError, isAdvancedMode } = useStore()
  const [mobileTab, setMobileTab] = useState<MobileTab>('visualizer')

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#0a0a0a]">
      {/* Header - Terminal style */}
      <header className="h-10 bg-[#111] border-b border-[#333] flex items-center justify-between px-2 sm:px-3 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Logo */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[#a78bfa]">◉</span>
            <span className="text-[12px] sm:text-[13px] font-semibold text-[#888]">oli</span>
            <span className="text-[#333] hidden sm:inline">│</span>
            <span className="text-[9px] sm:text-[10px] text-[#555] hidden sm:inline">strudel-live</span>
          </div>
          <div className="hidden sm:block">
            <Projects />
          </div>
        </div>
        <Controls />
      </header>

      {/* Error - Terminal style */}
      {error && (
        <div className="bg-[#1a0a0a] border-b border-[#ef444440] text-[#f87171] px-3 sm:px-4 py-1.5 text-[10px] sm:text-[11px] flex items-center justify-between shrink-0">
          <span className="truncate">
            <span className="text-[#ef4444] mr-2">error:</span>
            {error}
          </span>
          <button onClick={() => setError(null)} className="text-[#666] hover:text-[#999] shrink-0 ml-2">[x]</button>
        </div>
      )}

      {/* Body - Desktop */}
      <div className="flex-1 hidden md:flex overflow-hidden">
        <SoundBanksSidebar />

        <main className={`flex-1 flex overflow-hidden ${isAdvancedMode ? 'flex-row' : 'flex-col'}`}>
          {isAdvancedMode && <CodeEditor />}
          <Visualizer />
        </main>

        <AISidebar />
      </div>

      {/* Body - Mobile */}
      <div className="flex-1 flex flex-col md:hidden overflow-hidden">
        {/* Mobile content based on tab */}
        <div className="flex-1 overflow-hidden">
          {mobileTab === 'visualizer' && (
            <main className="h-full flex flex-col">
              {isAdvancedMode && <CodeEditor />}
              <Visualizer />
            </main>
          )}
          {mobileTab === 'ai' && (
            <AISidebar mobile />
          )}
          {mobileTab === 'sounds' && (
            <SoundBanksSidebar mobile />
          )}
        </div>

        {/* Mobile tab bar */}
        <nav className="h-12 bg-[#111] border-t border-[#333] flex items-center justify-around shrink-0">
          <button
            onClick={() => setMobileTab('visualizer')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
              mobileTab === 'visualizer' ? 'text-[#a78bfa]' : 'text-[#555]'
            }`}
          >
            <span className="text-lg">◎</span>
            <span className="text-[9px]">play</span>
          </button>
          <button
            onClick={() => setMobileTab('ai')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
              mobileTab === 'ai' ? 'text-[#a78bfa]' : 'text-[#555]'
            }`}
          >
            <span className="text-lg">◐</span>
            <span className="text-[9px]">ai</span>
          </button>
          <button
            onClick={() => setMobileTab('sounds')}
            className={`flex-1 h-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
              mobileTab === 'sounds' ? 'text-[#a78bfa]' : 'text-[#555]'
            }`}
          >
            <span className="text-lg">♪</span>
            <span className="text-[9px]">sounds</span>
          </button>
        </nav>
      </div>
    </div>
  )
}

export default App

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
      {/* Header - Terminal title bar */}
      <header className="bg-[#0a0a0a] border-b border-[#333] shrink-0">
        <div className="flex items-center justify-between px-1 sm:px-2 py-1">
          <div className="flex items-center gap-2 sm:gap-3 text-[11px]">
            <span className="text-[#555]">┌──</span>
            <span className="text-[#a78bfa]">[</span>
            <span className="text-[#888]">oli</span>
            <span className="text-[#a78bfa]">]</span>
            <span className="text-[#333]">─</span>
            <span className="text-[#555] hidden sm:inline">~/strudel</span>
            <Projects />
          </div>
          <div className="flex items-center gap-2">
            <Controls />
            <span className="text-[#555] hidden sm:inline">──┐</span>
          </div>
        </div>
      </header>

      {/* Error - stderr style */}
      {error && (
        <div className="bg-[#0a0a0a] border-b border-[#333] px-2 py-1 text-[11px] flex items-center justify-between shrink-0">
          <span className="truncate">
            <span className="text-[#ef4444]">stderr:</span>
            <span className="text-[#f87171] ml-2">{error}</span>
          </span>
          <button onClick={() => setError(null)} className="text-[#555] hover:text-[#f87171] shrink-0 ml-2">^C</button>
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

        {/* Mobile tab bar - CLI style */}
        <nav className="h-10 bg-[#0a0a0a] border-t border-[#333] flex items-center px-2 shrink-0 text-[11px]">
          <span className="text-[#555]">$</span>
          <button
            onClick={() => setMobileTab('visualizer')}
            className={`px-2 py-1 transition-colors ${
              mobileTab === 'visualizer' ? 'text-[#4ade80]' : 'text-[#555] hover:text-[#888]'
            }`}
          >
            {mobileTab === 'visualizer' ? '>' : ' '}play
          </button>
          <span className="text-[#333]">|</span>
          <button
            onClick={() => setMobileTab('ai')}
            className={`px-2 py-1 transition-colors ${
              mobileTab === 'ai' ? 'text-[#a78bfa]' : 'text-[#555] hover:text-[#888]'
            }`}
          >
            {mobileTab === 'ai' ? '>' : ' '}ai
          </button>
          <span className="text-[#333]">|</span>
          <button
            onClick={() => setMobileTab('sounds')}
            className={`px-2 py-1 transition-colors ${
              mobileTab === 'sounds' ? 'text-[#fbbf24]' : 'text-[#555] hover:text-[#888]'
            }`}
          >
            {mobileTab === 'sounds' ? '>' : ' '}ls
          </button>
        </nav>
      </div>
    </div>
  )
}

export default App

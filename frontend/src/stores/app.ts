import { create } from 'zustand'

export interface SoundFile {
  id: number
  sound_bank_id: number
  name: string
  filename: string
  created_at: string
}

export interface SoundBank {
  id: number
  name: string
  description: string
  is_default: boolean
  created_at: string
  files: SoundFile[]
}

export interface Project {
  id: number
  name: string
  code: string
  created_at: string
  updated_at: string
}

export type FocusPanel = 'sounds' | 'main' | 'ai'

interface AppState {
  soundBanks: SoundBank[]
  projects: Project[]
  currentProject: Project | null
  isPlaying: boolean
  isAdvancedMode: boolean
  isAIOpen: boolean
  code: string
  error: string | null
  focusedPanel: FocusPanel
  tempo: number

  setSoundBanks: (banks: SoundBank[]) => void
  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
  setIsPlaying: (playing: boolean) => void
  setIsAdvancedMode: (mode: boolean) => void
  setIsAIOpen: (open: boolean) => void
  setCode: (code: string) => void
  setError: (error: string | null) => void
  setFocusedPanel: (panel: FocusPanel) => void
  cycleFocus: (direction: 'left' | 'right') => void
  setTempo: (tempo: number) => void
}

const panelOrder: FocusPanel[] = ['sounds', 'main', 'ai']

export const useStore = create<AppState>((set) => ({
  soundBanks: [],
  projects: [],
  currentProject: null,
  isPlaying: false,
  isAdvancedMode: false,
  isAIOpen: false,
  code: '// Welcome to oli\nsound("test_kick test_hihat test_kick test_hihat")\n',
  error: null,
  focusedPanel: 'main',
  tempo: 120,

  setSoundBanks: (soundBanks) => set({ soundBanks }),
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (currentProject) => set({ currentProject, code: currentProject?.code || '' }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setIsAdvancedMode: (isAdvancedMode) => set({ isAdvancedMode }),
  setIsAIOpen: (isAIOpen) => set({ isAIOpen }),
  setCode: (code) => set({ code }),
  setError: (error) => set({ error }),
  setFocusedPanel: (focusedPanel) => set({ focusedPanel }),
  cycleFocus: (direction) => set((state) => {
    const idx = panelOrder.indexOf(state.focusedPanel)
    const newIdx = direction === 'right'
      ? (idx + 1) % panelOrder.length
      : (idx - 1 + panelOrder.length) % panelOrder.length
    return { focusedPanel: panelOrder[newIdx] }
  }),
  setTempo: (tempo) => set({ tempo }),
}))

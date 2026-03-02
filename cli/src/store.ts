import { type SoundBank, type Project, type ChatMsg } from './api.js'

export type Panel = 'visualizer' | 'chat' | 'sounds' | 'projects'
export type Mode = 'normal' | 'insert' | 'command'

export interface AppState {
  panel: Panel
  mode: Mode
  soundBanks: SoundBank[]
  projects: Project[]
  currentProject: Project | null
  code: string
  tempo: number
  isPlaying: boolean
  chatMessages: ChatMsg[]
  chatInput: string
  chatLoading: boolean
  selectedBankIndex: number
  selectedFileIndex: number
  expandedBanks: Set<number>
  commandInput: string
  error: string | null
}

const initialState: AppState = {
  panel: 'visualizer',
  mode: 'normal',
  soundBanks: [],
  projects: [],
  currentProject: null,
  code: 'sound("kick snare kick snare")',
  tempo: 120,
  isPlaying: false,
  chatMessages: [],
  chatInput: '',
  chatLoading: false,
  selectedBankIndex: 0,
  selectedFileIndex: -1,
  expandedBanks: new Set(),
  commandInput: '',
  error: null,
}

type Listener = (state: AppState) => void

class Store {
  private state: AppState = { ...initialState }
  private listeners: Set<Listener> = new Set()

  getState(): AppState {
    return this.state
  }

  setState(partial: Partial<AppState>): void {
    this.state = { ...this.state, ...partial }
    this.notify()
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state)
    }
  }
}

export const store = new Store()

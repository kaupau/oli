const API_BASE = process.env.OLI_API || 'http://localhost:8080/api'

export interface SoundFile {
  id: number
  sound_bank_id: number
  name: string
  filename: string
}

export interface SoundBank {
  id: number
  name: string
  description: string
  is_default: boolean
  files: SoundFile[]
}

export interface Project {
  id: number
  name: string
  code: string
  created_at: string
  updated_at: string
}

export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

export async function fetchSoundBanks(): Promise<SoundBank[]> {
  const res = await fetch(`${API_BASE}/soundbanks`)
  return res.json()
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/projects`)
  return res.json()
}

export async function createProject(name: string, code?: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, code }),
  })
  return res.json()
}

export async function getProject(id: number): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${id}`)
  return res.json()
}

export async function updateProject(id: number, name: string, code: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, code }),
  })
  return res.json()
}

export async function deleteProject(id: number): Promise<void> {
  await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' })
}

export async function chat(message: string, history: ChatMsg[], soundBanks: string[]): Promise<string> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, sound_banks: soundBanks }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.response
}

export function getUploadUrl(filename: string): string {
  const base = process.env.OLI_API || 'http://localhost:8080'
  return `${base.replace('/api', '')}/uploads/${encodeURIComponent(filename)}`
}

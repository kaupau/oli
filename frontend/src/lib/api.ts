const API_BASE = '/api'

export async function fetchSoundBanks() {
  const res = await fetch(`${API_BASE}/soundbanks`)
  return res.json()
}

export async function createSoundBank(name: string, description: string) {
  const res = await fetch(`${API_BASE}/soundbanks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  })
  return res.json()
}

export async function deleteSoundBank(id: number) {
  await fetch(`${API_BASE}/soundbanks/${id}`, { method: 'DELETE' })
}

export async function uploadSoundFile(bankId: number, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/soundbanks/${bankId}/files`, {
    method: 'POST',
    body: formData,
  })
  return res.json()
}

export async function deleteSoundFile(fileId: number) {
  await fetch(`${API_BASE}/soundbanks/files/${fileId}`, { method: 'DELETE' })
}

export async function uploadFolder(bankId: number, files: FileList) {
  const formData = new FormData()
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i])
  }
  const res = await fetch(`${API_BASE}/soundbanks/${bankId}/folder`, {
    method: 'POST',
    body: formData,
  })
  return res.json()
}

export async function fetchProjects() {
  const res = await fetch(`${API_BASE}/projects`)
  return res.json()
}

export async function createProject(name: string, code?: string) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, code }),
  })
  return res.json()
}

export async function getProject(id: number) {
  const res = await fetch(`${API_BASE}/projects/${id}`)
  return res.json()
}

export async function updateProject(id: number, name: string, code: string) {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, code }),
  })
  return res.json()
}

export async function deleteProject(id: number) {
  await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' })
}

export async function duplicateProject(id: number) {
  const res = await fetch(`${API_BASE}/projects/${id}/duplicate`, { method: 'POST' })
  return res.json()
}

export async function renameProject(id: number, name: string) {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  return res.json()
}

export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
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

// Share API

export interface Share {
  id: string
  code: string
  name: string
  created_at: string
}

export async function createShare(code: string, name: string): Promise<Share> {
  const res = await fetch(`${API_BASE}/shares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, name }),
  })
  if (!res.ok) throw new Error('Failed to create share')
  return res.json()
}

export async function getShare(id: string): Promise<Share> {
  const res = await fetch(`${API_BASE}/public/shares/${id}`)
  if (!res.ok) throw new Error('Share not found')
  return res.json()
}

export async function forkShare(id: string, name?: string) {
  const res = await fetch(`${API_BASE}/shares/${id}/fork`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error('Failed to fork share')
  return res.json()
}

import { useState, useEffect } from 'react'
import { useStore, type SoundBank } from '../stores/app'
import { fetchSoundBanks, uploadSoundFile, uploadFolder, deleteSoundBank, deleteSoundFile, createSoundBank } from '../lib/api'
import { loadSoundBanks as loadAudioBanks } from '../lib/audio'

export function SoundBanksSidebar({ mobile = false }: { mobile?: boolean }) {
  const { soundBanks, setSoundBanks, setError } = useStore()
  const [isOpen, setIsOpen] = useState(true)
  const [newBankName, setNewBankName] = useState('')
  const [showNewBank, setShowNewBank] = useState(false)
  const [uploading, setUploading] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSoundBanks()
  }, [])

  useEffect(() => {
    if (soundBanks.length > 0) {
      loadAudioBanks(soundBanks)
    }
  }, [soundBanks])

  const loadSoundBanks = async () => {
    try {
      setLoading(true)
      const banks = await fetchSoundBanks()
      setSoundBanks(banks)
    } catch (e: any) {
      setError(`Failed to load sound banks: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (bankId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(bankId)
    try {
      if (files.length === 1) {
        await uploadSoundFile(bankId, files[0])
      } else {
        await uploadFolder(bankId, files)
      }
      await loadSoundBanks()
    } catch (e: any) {
      setError(`Upload failed: ${e.message}`)
    } finally {
      setUploading(null)
      e.target.value = ''
    }
  }

  const handleFolderUpload = async (bankId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(bankId)
    try {
      await uploadFolder(bankId, files)
      await loadSoundBanks()
    } catch (e: any) {
      setError(`Folder upload failed: ${e.message}`)
    } finally {
      setUploading(null)
      e.target.value = ''
    }
  }

  const handleDrop = async (bankId: number, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const items = e.dataTransfer.items
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file && /\.(wav|mp3|ogg|flac)$/i.test(file.name)) {
          files.push(file)
        }
      }
    }
    if (files.length === 0) return
    setUploading(bankId)
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))
      const res = await fetch(`/api/soundbanks/${bankId}/folder`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      await loadSoundBanks()
    } catch (e: any) {
      setError(`Drop upload failed: ${e.message}`)
    } finally {
      setUploading(null)
    }
  }

  const handleCreateBank = async () => {
    if (!newBankName.trim()) return
    try {
      await createSoundBank(newBankName, '')
      setNewBankName('')
      setShowNewBank(false)
      await loadSoundBanks()
    } catch (e: any) {
      setError(`Failed to create bank: ${e.message}`)
    }
  }

  const handleDeleteBank = async (id: number, name: string) => {
    if (!confirm(`Delete sound bank "${name}" and all its files?`)) return
    try {
      await deleteSoundBank(id)
      await loadSoundBanks()
    } catch (e: any) {
      setError(`Failed to delete bank: ${e.message}`)
    }
  }

  const handleDeleteFile = async (fileId: number, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return
    try {
      await deleteSoundFile(fileId)
      await loadSoundBanks()
    } catch (e: any) {
      setError(`Failed to delete file: ${e.message}`)
    }
  }

  // Mobile mode - full width, no toggle
  if (mobile) {
    return (
      <div className="bg-[#0a0a0a] flex flex-col h-full w-full text-[11px]">
        <div className="flex-1 overflow-y-auto p-2">
          {/* Header */}
          <div className="text-[#555] px-1 py-1 mb-2">
            <span className="text-[#4ade80]">$</span> ls -la ~/samples/
          </div>

          {loading ? (
            <div className="text-[#555] px-1 py-2">
              <span className="cursor-blink">_</span>
            </div>
          ) : soundBanks.length === 0 ? (
            <div className="text-[#444] px-1 py-2">total 0</div>
          ) : soundBanks.map((bank, index) => (
            <BankItem
              key={bank.id}
              bank={bank}
              isLast={index === soundBanks.length - 1}
              uploading={uploading === bank.id}
              onUpload={(e) => handleUpload(bank.id, e)}
              onFolderUpload={(e) => handleFolderUpload(bank.id, e)}
              onDrop={(e) => handleDrop(bank.id, e)}
              onDelete={() => handleDeleteBank(bank.id, bank.name)}
              onDeleteFile={(fileId, fileName) => handleDeleteFile(fileId, fileName)}
            />
          ))}

          {/* New Bank */}
          {showNewBank ? (
            <div className="mt-2 px-1">
              <div className="flex items-center gap-1 text-[#555]">
                <span className="text-[#4ade80]">$</span>
                <span>mkdir</span>
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="dirname"
                  className="flex-1 bg-transparent outline-none text-[#888] placeholder:text-[#444]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateBank()
                    if (e.key === 'Escape') setShowNewBank(false)
                  }}
                />
                <button onClick={handleCreateBank} className="text-[#4ade80] hover:text-[#86efac]">⏎</button>
                <button onClick={() => setShowNewBank(false)} className="text-[#555] hover:text-[#f87171]">^C</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewBank(true)}
              className="mt-2 px-1 text-[#555] hover:text-[#888] transition-colors text-left"
            >
              <span className="text-[#333]">$</span> mkdir _
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-[#0a0a0a] border-r border-[#333] flex flex-col transition-all text-[11px] ${isOpen ? 'w-56' : 'w-8'}`}>
      {/* Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 flex items-center justify-center hover:bg-[#111] text-[#555] shrink-0 border-b border-[#333]"
      >
        {isOpen ? '« ls' : '»'}
      </button>

      {isOpen && (
        <div className="flex-1 overflow-y-auto p-2">
          {/* Header */}
          <div className="text-[#555] px-1 py-1 mb-1">
            <span className="text-[#4ade80]">$</span> ls ~/samples/
          </div>

          {loading ? (
            <div className="text-[#555] px-1 py-2">
              <span className="cursor-blink">_</span>
            </div>
          ) : soundBanks.length === 0 ? (
            <div className="text-[#444] px-1 py-2">total 0</div>
          ) : soundBanks.map((bank, index) => (
            <BankItem
              key={bank.id}
              bank={bank}
              isLast={index === soundBanks.length - 1}
              uploading={uploading === bank.id}
              onUpload={(e) => handleUpload(bank.id, e)}
              onFolderUpload={(e) => handleFolderUpload(bank.id, e)}
              onDrop={(e) => handleDrop(bank.id, e)}
              onDelete={() => handleDeleteBank(bank.id, bank.name)}
              onDeleteFile={(fileId, fileName) => handleDeleteFile(fileId, fileName)}
            />
          ))}

          {/* New Bank */}
          {showNewBank ? (
            <div className="mt-2 px-1">
              <div className="flex items-center gap-1 text-[#555]">
                <span className="text-[#4ade80]">$</span>
                <span>mkdir</span>
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="name"
                  className="flex-1 bg-transparent outline-none text-[#888] placeholder:text-[#444] w-16"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateBank()
                    if (e.key === 'Escape') setShowNewBank(false)
                  }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewBank(true)}
              className="mt-2 px-1 text-[#444] hover:text-[#888] transition-colors text-left"
            >
              $ mkdir _
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function BankItem({ bank, isLast, uploading, onUpload, onFolderUpload, onDrop, onDelete, onDeleteFile }: {
  bank: SoundBank
  isLast: boolean
  uploading: boolean
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onFolderUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: React.DragEvent) => void
  onDelete: () => void
  onDeleteFile: (id: number, name: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const fileCount = bank.files?.length || 0

  return (
    <div
      className={`transition-colors ${dragOver ? 'bg-[#1a1a2a]' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { setDragOver(false); onDrop(e) }}
    >
      {/* Bank header - ls -la style */}
      <div className="flex items-center group px-1 py-0.5 hover:bg-[#111]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center gap-2 text-left"
        >
          <span className="text-[#7dd3fc]">drwxr-x</span>
          <span className="text-[#fbbf24]">{bank.name}/</span>
          <span className="text-[#555]">{fileCount}</span>
        </button>
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
          {!bank.is_default && (
            <button onClick={onDelete} className="text-[#555] hover:text-[#f87171]">rm</button>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="ml-2 pl-2 border-l border-[#333]">
          {/* File list */}
          {bank.files && bank.files.length > 0 && (
            <div className="max-h-36 overflow-auto">
              {bank.files.map((f) => (
                <div key={f.id} className="flex items-center group py-0.5 px-1 hover:bg-[#111]">
                  <span className="text-[#555] mr-2">-rw-r--</span>
                  <span className="text-[#888] truncate flex-1" title={f.name}>{f.name}</span>
                  <button
                    onClick={() => onDeleteFile(f.id, f.name)}
                    className="text-[#444] hover:text-[#f87171] opacity-0 group-hover:opacity-100 ml-1"
                  >
                    rm
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload */}
          <div className="mt-1 py-1 border-t border-[#222]">
            {uploading ? (
              <div className="text-[#a78bfa] px-1">scp<span className="cursor-blink">_</span></div>
            ) : (
              <div className="flex gap-3 px-1">
                <label className="cursor-pointer text-[#555] hover:text-[#4ade80] transition-colors">
                  cp +file
                  <input type="file" accept=".wav,.mp3,.ogg,.flac" multiple className="hidden" onChange={onUpload} />
                </label>
                <label className="cursor-pointer text-[#555] hover:text-[#4ade80] transition-colors">
                  cp -r
                  <input type="file" className="hidden" onChange={onFolderUpload} {...({ webkitdirectory: "", directory: "" } as any)} />
                </label>
              </div>
            )}
          </div>

          {dragOver && (
            <div className="text-[#a78bfa] px-1 mt-1">drop: scp *.wav {bank.name}/</div>
          )}
        </div>
      )}
    </div>
  )
}

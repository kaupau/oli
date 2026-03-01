import { useState, useEffect } from 'react'
import { useStore, type SoundBank } from '../stores/app'
import { fetchSoundBanks, uploadSoundFile, uploadFolder, deleteSoundBank, deleteSoundFile, createSoundBank } from '../lib/api'
import { loadSoundBanks as loadAudioBanks } from '../lib/audio'

export function SoundBanksSidebar({ mobile = false }: { mobile?: boolean }) {
  const { soundBanks, setSoundBanks } = useStore()
  const [isOpen, setIsOpen] = useState(true)
  const [newBankName, setNewBankName] = useState('')
  const [showNewBank, setShowNewBank] = useState(false)
  const [uploading, setUploading] = useState<number | null>(null)

  useEffect(() => {
    loadSoundBanks()
  }, [])

  useEffect(() => {
    if (soundBanks.length > 0) {
      loadAudioBanks(soundBanks)
    }
  }, [soundBanks])

  const loadSoundBanks = async () => {
    const banks = await fetchSoundBanks()
    setSoundBanks(banks)
  }

  const handleUpload = async (bankId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(bankId)
    if (files.length === 1) {
      await uploadSoundFile(bankId, files[0])
    } else {
      await uploadFolder(bankId, files)
    }
    setUploading(null)
    await loadSoundBanks()
    e.target.value = ''
  }

  const handleFolderUpload = async (bankId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(bankId)
    await uploadFolder(bankId, files)
    setUploading(null)
    await loadSoundBanks()
    e.target.value = ''
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
    const formData = new FormData()
    files.forEach(f => formData.append('files', f))
    await fetch(`/api/soundbanks/${bankId}/folder`, { method: 'POST', body: formData })
    setUploading(null)
    await loadSoundBanks()
  }

  const handleCreateBank = async () => {
    if (!newBankName.trim()) return
    await createSoundBank(newBankName, '')
    setNewBankName('')
    setShowNewBank(false)
    await loadSoundBanks()
  }

  const handleDeleteBank = async (id: number) => {
    await deleteSoundBank(id)
    await loadSoundBanks()
  }

  const handleDeleteFile = async (fileId: number) => {
    await deleteSoundFile(fileId)
    await loadSoundBanks()
  }

  // Mobile mode - full width, no toggle
  if (mobile) {
    return (
      <div className="bg-[#0c0c0c] flex flex-col h-full w-full">
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Header */}
          <div className="text-[11px] text-[#555] px-2 py-2 border-b border-[#222] mb-3">
            ~/samples/
          </div>

          {soundBanks.map((bank, index) => (
            <BankItem
              key={bank.id}
              bank={bank}
              isLast={index === soundBanks.length - 1}
              uploading={uploading === bank.id}
              onUpload={(e) => handleUpload(bank.id, e)}
              onFolderUpload={(e) => handleFolderUpload(bank.id, e)}
              onDrop={(e) => handleDrop(bank.id, e)}
              onDelete={() => handleDeleteBank(bank.id)}
              onDeleteFile={handleDeleteFile}
            />
          ))}

          {/* New Bank */}
          {showNewBank ? (
            <div className="border border-[#333] bg-[#111] p-3 mt-3">
              <div className="text-[11px] text-[#555] mb-2">mkdir:</div>
              <input
                type="text"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="bank-name"
                className="bg-[#0a0a0a] border border-[#333] px-3 py-2 text-[12px] w-full mb-3 outline-none focus:border-[#555] text-[#888]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateBank()
                  if (e.key === 'Escape') setShowNewBank(false)
                }}
              />
              <div className="flex gap-2">
                <button onClick={handleCreateBank} className="term-btn term-btn-success text-[11px] px-3 py-1.5">create</button>
                <button onClick={() => setShowNewBank(false)} className="term-btn text-[11px] px-3 py-1.5">cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewBank(true)}
              className="w-full border border-dashed border-[#333] p-3 text-[12px] text-[#555] hover:border-[#555] hover:text-[#888] transition-colors text-left mt-3"
            >
              + mkdir new-bank
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-[#0c0c0c] border-r border-[#333] flex flex-col transition-all ${isOpen ? 'w-60' : 'w-10'}`}>
      {/* Toggle - Terminal style */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 flex items-center justify-center hover:bg-[#161616] text-[#555] text-[11px] shrink-0 border-b border-[#333]"
      >
        {isOpen ? '◂ sounds' : '▸'}
      </button>

      {isOpen && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Header */}
          <div className="text-[10px] text-[#444] px-2 py-1 border-b border-[#222] mb-2">
            ~/samples/
          </div>

          {soundBanks.map((bank, index) => (
            <BankItem
              key={bank.id}
              bank={bank}
              isLast={index === soundBanks.length - 1}
              uploading={uploading === bank.id}
              onUpload={(e) => handleUpload(bank.id, e)}
              onFolderUpload={(e) => handleFolderUpload(bank.id, e)}
              onDrop={(e) => handleDrop(bank.id, e)}
              onDelete={() => handleDeleteBank(bank.id)}
              onDeleteFile={handleDeleteFile}
            />
          ))}

          {/* New Bank */}
          {showNewBank ? (
            <div className="border border-[#333] bg-[#111] p-2 mt-2">
              <div className="text-[10px] text-[#555] mb-1">mkdir:</div>
              <input
                type="text"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="bank-name"
                className="bg-[#0a0a0a] border border-[#333] px-2 py-1 text-[11px] w-full mb-2 outline-none focus:border-[#555] text-[#888]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateBank()
                  if (e.key === 'Escape') setShowNewBank(false)
                }}
              />
              <div className="flex gap-2">
                <button onClick={handleCreateBank} className="term-btn term-btn-success text-[10px]">create</button>
                <button onClick={() => setShowNewBank(false)} className="term-btn text-[10px]">cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewBank(true)}
              className="w-full border border-dashed border-[#333] p-2 text-[11px] text-[#555] hover:border-[#555] hover:text-[#888] transition-colors text-left"
            >
              + mkdir new-bank
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
  onDeleteFile: (id: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const treeChar = isLast ? '└' : '├'
  const fileCount = bank.files?.length || 0

  return (
    <div
      className={`transition-colors ${dragOver ? 'bg-[#1a1a2a]' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { setDragOver(false); onDrop(e) }}
    >
      {/* Bank header */}
      <div className="flex items-center group">
        <span className="text-[#333] text-[11px] w-4">{treeChar}</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center gap-1.5 text-[11px] py-1 hover:text-[#ccc] text-left"
        >
          <span className="text-[#f59e0b]">{expanded ? '▼' : '▶'}</span>
          <span className="text-[#888]">{bank.name}/</span>
          <span className="text-[#444]">({fileCount})</span>
        </button>
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
          {bank.is_default ? (
            <span className="text-[9px] text-[#555]">def</span>
          ) : (
            <button onClick={onDelete} className="text-[#555] hover:text-[#f87171] text-[10px]">×</button>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="ml-4 pl-2 border-l border-[#222]">
          {/* File list */}
          {bank.files && bank.files.length > 0 && (
            <div className="max-h-40 overflow-auto">
              {bank.files.map((f, idx) => (
                <div key={f.id} className="flex items-center group text-[10px] py-0.5">
                  <span className="text-[#333] w-3">{idx === bank.files!.length - 1 ? '└' : '├'}</span>
                  <span className="text-[#4ade80] mr-1">♪</span>
                  <span className="text-[#666] truncate flex-1" title={f.name}>{f.name}</span>
                  <button
                    onClick={() => onDeleteFile(f.id)}
                    className="text-[#444] hover:text-[#f87171] opacity-0 group-hover:opacity-100 ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload buttons */}
          <div className="mt-1 pt-1 border-t border-[#222]">
            {uploading ? (
              <div className="text-[10px] text-[#a78bfa]">uploading<span className="cursor-blink">_</span></div>
            ) : (
              <div className="flex gap-2">
                <label className="cursor-pointer text-[10px] text-[#555] hover:text-[#888] transition-colors">
                  [+files]
                  <input type="file" accept=".wav,.mp3,.ogg,.flac" multiple className="hidden" onChange={onUpload} />
                </label>
                <label className="cursor-pointer text-[10px] text-[#555] hover:text-[#888] transition-colors">
                  [+folder]
                  <input type="file" className="hidden" onChange={onFolderUpload} {...({ webkitdirectory: "", directory: "" } as any)} />
                </label>
              </div>
            )}
          </div>

          {dragOver && (
            <div className="text-[10px] text-[#a78bfa] mt-1">drop files here...</div>
          )}
        </div>
      )}
    </div>
  )
}

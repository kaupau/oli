import { useState, useEffect, useCallback } from 'react'
import { useStore, type SoundBank } from '../stores/app'
import { fetchSoundBanks, uploadSoundFile, uploadFolder, deleteSoundBank, deleteSoundFile, createSoundBank } from '../lib/api'
import { loadSoundBanks as loadAudioBanks, previewSample } from '../lib/audio'

type SelectionPath = { type: 'bank', bankIndex: number } | { type: 'file', bankIndex: number, fileIndex: number }

export function SoundBanksSidebar({ mobile = false }: { mobile?: boolean }) {
  const { soundBanks, setSoundBanks, setError, focusedPanel } = useStore()
  const [isOpen, setIsOpen] = useState(true)
  const [newBankName, setNewBankName] = useState('')
  const [showNewBank, setShowNewBank] = useState(false)
  const [uploading, setUploading] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [selection, setSelection] = useState<SelectionPath>({ type: 'bank', bankIndex: 0 })
  const [expandedBanks, setExpandedBanks] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadSoundBanks()
  }, [])

  useEffect(() => {
    if (soundBanks.length > 0) {
      loadAudioBanks(soundBanks)
    }
  }, [soundBanks])

  // Play sample when file is selected
  const playSelectedSample = useCallback((bankIndex: number, fileIndex: number) => {
    const bank = soundBanks[bankIndex]
    const file = bank?.files?.[fileIndex]
    if (file) {
      previewSample(file.filename)
    }
  }, [soundBanks])

  // Keyboard navigation when sounds panel is focused
  useEffect(() => {
    if (focusedPanel !== 'sounds') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        setSelection(prev => {
          if (prev.type === 'bank') {
            const bank = soundBanks[prev.bankIndex]
            // If bank is expanded and has files, move into files
            if (bank && expandedBanks.has(bank.id) && bank.files && bank.files.length > 0) {
              const newSel = { type: 'file' as const, bankIndex: prev.bankIndex, fileIndex: 0 }
              playSelectedSample(prev.bankIndex, 0)
              return newSel
            }
            // Otherwise move to next bank
            if (prev.bankIndex < soundBanks.length - 1) {
              return { type: 'bank', bankIndex: prev.bankIndex + 1 }
            }
          } else {
            const bank = soundBanks[prev.bankIndex]
            // Move to next file in bank
            if (bank?.files && prev.fileIndex < bank.files.length - 1) {
              const newSel = { type: 'file' as const, bankIndex: prev.bankIndex, fileIndex: prev.fileIndex + 1 }
              playSelectedSample(prev.bankIndex, prev.fileIndex + 1)
              return newSel
            }
            // Move to next bank
            if (prev.bankIndex < soundBanks.length - 1) {
              return { type: 'bank', bankIndex: prev.bankIndex + 1 }
            }
          }
          return prev
        })
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        setSelection(prev => {
          if (prev.type === 'file') {
            // Move to previous file or back to bank
            if (prev.fileIndex > 0) {
              const newSel = { type: 'file' as const, bankIndex: prev.bankIndex, fileIndex: prev.fileIndex - 1 }
              playSelectedSample(prev.bankIndex, prev.fileIndex - 1)
              return newSel
            }
            return { type: 'bank', bankIndex: prev.bankIndex }
          } else {
            // Move to previous bank
            if (prev.bankIndex > 0) {
              const prevBank = soundBanks[prev.bankIndex - 1]
              // If previous bank is expanded, go to its last file
              if (prevBank && expandedBanks.has(prevBank.id) && prevBank.files && prevBank.files.length > 0) {
                const lastFileIndex = prevBank.files.length - 1
                const newSel = { type: 'file' as const, bankIndex: prev.bankIndex - 1, fileIndex: lastFileIndex }
                playSelectedSample(prev.bankIndex - 1, lastFileIndex)
                return newSel
              }
              return { type: 'bank', bankIndex: prev.bankIndex - 1 }
            }
          }
          return prev
        })
      } else if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault()
        if (selection.type === 'bank') {
          const bank = soundBanks[selection.bankIndex]
          if (bank) {
            setExpandedBanks(prev => {
              const next = new Set(prev)
              if (next.has(bank.id)) next.delete(bank.id)
              else next.add(bank.id)
              return next
            })
          }
        } else {
          // Play sample on enter when file is selected
          playSelectedSample(selection.bankIndex, selection.fileIndex)
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'h') {
        e.preventDefault()
        if (selection.type === 'file') {
          // Go back to bank
          setSelection({ type: 'bank', bankIndex: selection.bankIndex })
        } else {
          const bank = soundBanks[selection.bankIndex]
          if (bank && expandedBanks.has(bank.id)) {
            setExpandedBanks(prev => {
              const next = new Set(prev)
              next.delete(bank.id)
              return next
            })
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedPanel, soundBanks, selection, expandedBanks, playSelectedSample])

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
    if (!confirm(`Delete "${name}" and all files?`)) return
    try {
      await deleteSoundBank(id)
      await loadSoundBanks()
    } catch (e: any) {
      setError(`Failed to delete: ${e.message}`)
    }
  }

  const handleDeleteFile = async (fileId: number, fileName: string) => {
    if (!confirm(`Delete "${fileName}"?`)) return
    try {
      await deleteSoundFile(fileId)
      await loadSoundBanks()
    } catch (e: any) {
      setError(`Failed to delete: ${e.message}`)
    }
  }

  const toggleExpand = (bankId: number) => {
    setExpandedBanks(prev => {
      const next = new Set(prev)
      if (next.has(bankId)) next.delete(bankId)
      else next.add(bankId)
      return next
    })
  }

  const renderBankList = () => (
    <>
      {loading ? (
        <div className="text-[#555] px-2 py-3">loading...</div>
      ) : soundBanks.length === 0 ? (
        <div className="text-[#444] px-2 py-3">no sounds yet</div>
      ) : (
        <div className="space-y-0.5">
          {soundBanks.map((bank, index) => (
            <BankItem
              key={bank.id}
              bank={bank}
              isBankSelected={focusedPanel === 'sounds' && selection.type === 'bank' && selection.bankIndex === index}
              selectedFileIndex={focusedPanel === 'sounds' && selection.type === 'file' && selection.bankIndex === index ? selection.fileIndex : null}
              isExpanded={expandedBanks.has(bank.id)}
              uploading={uploading === bank.id}
              onToggle={() => { setSelection({ type: 'bank', bankIndex: index }); toggleExpand(bank.id) }}
              onSelectBank={() => setSelection({ type: 'bank', bankIndex: index })}
              onSelectFile={(fileIndex) => {
                setSelection({ type: 'file', bankIndex: index, fileIndex })
                playSelectedSample(index, fileIndex)
              }}
              onUpload={(e) => handleUpload(bank.id, e)}
              onFolderUpload={(e) => handleFolderUpload(bank.id, e)}
              onDrop={(e) => handleDrop(bank.id, e)}
              onDelete={() => handleDeleteBank(bank.id, bank.name)}
              onDeleteFile={(fileId, fileName) => handleDeleteFile(fileId, fileName)}
            />
          ))}
        </div>
      )}

      {/* New Bank */}
      {showNewBank ? (
        <div className="mt-2 p-2 bg-[#111] rounded">
          <input
            type="text"
            value={newBankName}
            onChange={(e) => setNewBankName(e.target.value)}
            placeholder="folder name..."
            className="w-full bg-[#0a0a0a] border border-[#333] rounded px-2 py-1 text-[#888] placeholder:text-[#444] outline-none focus:border-[#555]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateBank()
              if (e.key === 'Escape') setShowNewBank(false)
            }}
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleCreateBank} className="text-[#4ade80] hover:text-[#86efac]">create</button>
            <button onClick={() => setShowNewBank(false)} className="text-[#555] hover:text-[#888]">cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNewBank(true)}
          className="mt-2 px-2 py-1 text-[#555] hover:text-[#888] transition-colors"
        >
          + new folder
        </button>
      )}
    </>
  )

  // Mobile mode
  if (mobile) {
    return (
      <div className="bg-[#0a0a0a] flex flex-col h-full w-full text-[11px]">
        <div className="px-3 py-2 border-b border-[#333]">
          <span className="text-[#fbbf24]">sounds</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {renderBankList()}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-[#0a0a0a] border-r border-[#333] flex flex-col transition-all text-[11px] ${isOpen ? 'w-52' : 'w-8'}`}>
      {/* Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 flex items-center justify-center hover:bg-[#111] text-[#555] shrink-0 border-b border-[#333]"
      >
        {isOpen ? '◂' : '▸'}
      </button>

      {isOpen && (
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-[#fbbf24] px-1 mb-2">sounds</div>
          {renderBankList()}
        </div>
      )}
    </div>
  )
}

function BankItem({ bank, isBankSelected, selectedFileIndex, isExpanded, uploading, onToggle, onSelectBank, onSelectFile, onUpload, onFolderUpload, onDrop, onDelete, onDeleteFile }: {
  bank: SoundBank
  isBankSelected: boolean
  selectedFileIndex: number | null
  isExpanded: boolean
  uploading: boolean
  onToggle: () => void
  onSelectBank: () => void
  onSelectFile: (index: number) => void
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onFolderUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDrop: (e: React.DragEvent) => void
  onDelete: () => void
  onDeleteFile: (id: number, name: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const fileCount = bank.files?.length || 0

  return (
    <div
      className={`transition-colors rounded ${dragOver ? 'bg-[#1a1a2a]' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { setDragOver(false); onDrop(e) }}
    >
      {/* Bank header */}
      <div
        className={`flex items-center group px-2 py-1 rounded cursor-pointer transition-colors ${
          isBankSelected ? 'bg-[#1a1a1a] text-[#fff]' : 'hover:bg-[#111]'
        }`}
        onClick={onToggle}
        onMouseEnter={onSelectBank}
      >
        <span className="text-[#555] mr-1.5">{isExpanded ? '▼' : '▶'}</span>
        <span className={isBankSelected ? 'text-[#fbbf24]' : 'text-[#888]'}>{bank.name}</span>
        <span className="text-[#555] ml-1">({fileCount})</span>
        {!bank.is_default && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="ml-auto text-[#444] hover:text-[#f87171] opacity-0 group-hover:opacity-100"
          >
            ×
          </button>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="ml-4 pl-2 border-l border-[#333] mt-1">
          {bank.files && bank.files.length > 0 && (
            <div className="max-h-32 overflow-auto space-y-0.5">
              {bank.files.map((f, fileIndex) => (
                <div
                  key={f.id}
                  className={`flex items-center group py-0.5 px-1 rounded cursor-pointer transition-colors ${
                    selectedFileIndex === fileIndex ? 'bg-[#1a1a1a] text-[#fff]' : 'hover:bg-[#111]'
                  }`}
                  onClick={() => onSelectFile(fileIndex)}
                >
                  <span className={selectedFileIndex === fileIndex ? 'text-[#4ade80]' : 'text-[#4ade80]/50'}>♪</span>
                  <span className={`truncate flex-1 ml-1.5 ${selectedFileIndex === fileIndex ? 'text-[#4ade80]' : 'text-[#666]'}`} title={f.name}>{f.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteFile(f.id, f.name) }}
                    className="text-[#444] hover:text-[#f87171] opacity-0 group-hover:opacity-100 ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload */}
          <div className="mt-1 pt-1 border-t border-[#222] flex gap-2">
            {uploading ? (
              <span className="text-[#a78bfa]">uploading...</span>
            ) : (
              <>
                <label className="cursor-pointer text-[#555] hover:text-[#888]">
                  + files
                  <input type="file" accept=".wav,.mp3,.ogg,.flac" multiple className="hidden" onChange={onUpload} />
                </label>
                <label className="cursor-pointer text-[#555] hover:text-[#888]">
                  + folder
                  <input type="file" className="hidden" onChange={onFolderUpload} {...({ webkitdirectory: "", directory: "" } as any)} />
                </label>
              </>
            )}
          </div>

          {dragOver && (
            <div className="text-[#a78bfa] mt-1">drop files here</div>
          )}
        </div>
      )}
    </div>
  )
}

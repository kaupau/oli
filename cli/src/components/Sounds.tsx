import React, { useState, useEffect } from 'react'
import { Box, Text, useInput } from 'ink'
import { store } from '../store.js'
import { fetchSoundBanks, type SoundBank } from '../api.js'
import { previewSample, setSoundBanks } from '../audio.js'

export function Sounds() {
  const [banks, setBanks] = useState<SoundBank[]>([])
  const [selectedBank, setSelectedBank] = useState(0)
  const [selectedFile, setSelectedFile] = useState(-1)
  const [expandedBanks, setExpandedBanks] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBanks()
  }, [])

  const loadBanks = async () => {
    try {
      const data = await fetchSoundBanks()
      setBanks(data)
      setSoundBanks(data)
      store.setState({ soundBanks: data })
    } catch {
      // Failed to load
    } finally {
      setLoading(false)
    }
  }

  useInput((input, key) => {
    const state = store.getState()
    if (state.panel !== 'sounds') return

    const bank = banks[selectedBank]

    if (key.downArrow || input === 'j') {
      if (selectedFile >= 0 && bank?.files) {
        // In files
        if (selectedFile < bank.files.length - 1) {
          const newIdx = selectedFile + 1
          setSelectedFile(newIdx)
          previewSample(bank.files[newIdx].filename)
        } else if (selectedBank < banks.length - 1) {
          setSelectedBank(s => s + 1)
          setSelectedFile(-1)
        }
      } else {
        // In banks
        if (bank && expandedBanks.has(bank.id) && bank.files?.length) {
          setSelectedFile(0)
          previewSample(bank.files[0].filename)
        } else if (selectedBank < banks.length - 1) {
          setSelectedBank(s => s + 1)
        }
      }
    } else if (key.upArrow || input === 'k') {
      if (selectedFile > 0) {
        const newIdx = selectedFile - 1
        setSelectedFile(newIdx)
        if (bank?.files) {
          previewSample(bank.files[newIdx].filename)
        }
      } else if (selectedFile === 0) {
        setSelectedFile(-1)
      } else if (selectedBank > 0) {
        const prevBank = banks[selectedBank - 1]
        setSelectedBank(s => s - 1)
        if (prevBank && expandedBanks.has(prevBank.id) && prevBank.files?.length) {
          setSelectedFile(prevBank.files.length - 1)
          previewSample(prevBank.files[prevBank.files.length - 1].filename)
        }
      }
    } else if (key.return || key.rightArrow || input === 'l') {
      if (bank && selectedFile === -1) {
        setExpandedBanks(prev => {
          const next = new Set(prev)
          if (next.has(bank.id)) next.delete(bank.id)
          else next.add(bank.id)
          return next
        })
      } else if (selectedFile >= 0 && bank?.files) {
        previewSample(bank.files[selectedFile].filename)
      }
    } else if (key.leftArrow || input === 'h') {
      if (selectedFile >= 0) {
        setSelectedFile(-1)
      } else if (bank && expandedBanks.has(bank.id)) {
        setExpandedBanks(prev => {
          const next = new Set(prev)
          next.delete(bank.id)
          return next
        })
      }
    }
  })

  const cols = 30
  const maxVisible = 12

  // Build visible items list
  const items: { type: 'bank' | 'file', bankIdx: number, fileIdx?: number, name: string, count?: number }[] = []
  banks.forEach((bank, bankIdx) => {
    items.push({ type: 'bank', bankIdx, name: bank.name, count: bank.files?.length || 0 })
    if (expandedBanks.has(bank.id) && bank.files) {
      bank.files.forEach((file, fileIdx) => {
        items.push({ type: 'file', bankIdx, fileIdx, name: file.name })
      })
    }
  })

  // Find current selection in items
  let selectedItemIdx = items.findIndex(item => {
    if (selectedFile === -1) {
      return item.type === 'bank' && item.bankIdx === selectedBank
    } else {
      return item.type === 'file' && item.bankIdx === selectedBank && item.fileIdx === selectedFile
    }
  })

  // Calculate visible window
  const start = Math.max(0, Math.min(selectedItemIdx - 4, items.length - maxVisible))
  const visibleItems = items.slice(start, start + maxVisible)

  return (
    <Box flexDirection="column" width={cols + 4}>
      {/* Header */}
      <Text color="yellow">┌{'─'.repeat(cols)}┐</Text>
      <Text color="yellow">│ sounds{' '.repeat(cols - 7)}│</Text>
      <Text color="yellow">├{'─'.repeat(cols)}┤</Text>

      {/* Content */}
      {loading ? (
        <Text color="gray">│ loading...{' '.repeat(cols - 11)}│</Text>
      ) : banks.length === 0 ? (
        <Text color="gray">│ no sounds yet{' '.repeat(cols - 14)}│</Text>
      ) : (
        visibleItems.map((item, i) => {
          const actualIdx = start + i
          const isSelected = actualIdx === selectedItemIdx

          if (item.type === 'bank') {
            const bank = banks[item.bankIdx]
            const expanded = expandedBanks.has(bank.id)
            const icon = expanded ? '▼' : '▶'
            const text = `${icon} ${item.name} (${item.count})`
            const pad = cols - text.length - 1

            return (
              <Text key={`bank-${item.bankIdx}`} color={isSelected ? 'yellow' : 'white'} inverse={isSelected}>
                │ {text}{' '.repeat(Math.max(0, pad))}│
              </Text>
            )
          } else {
            const text = `  ♪ ${item.name}`
            const truncated = text.length > cols - 2 ? text.substring(0, cols - 5) + '...' : text
            const pad = cols - truncated.length - 1

            return (
              <Text key={`file-${item.bankIdx}-${item.fileIdx}`} color={isSelected ? 'green' : 'gray'} inverse={isSelected}>
                │ {truncated}{' '.repeat(Math.max(0, pad))}│
              </Text>
            )
          }
        })
      )}

      {/* Fill remaining space */}
      {Array(Math.max(0, maxVisible - visibleItems.length)).fill(0).map((_, i) => (
        <Text key={`empty-${i}`} color="yellow">│{' '.repeat(cols)}│</Text>
      ))}

      {/* Footer */}
      <Text color="yellow">└{'─'.repeat(cols)}┘</Text>

      {/* Help */}
      <Text color="gray" dimColor>
        [↑↓] navigate  [enter] expand  [←] collapse
      </Text>
    </Box>
  )
}

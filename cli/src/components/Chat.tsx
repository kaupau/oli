import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { store } from '../store.js'
import { chat, type ChatMsg } from '../api.js'
import { playPattern } from '../audio.js'

export function Chat() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMsg, setSelectedMsg] = useState(-1)

  const state = store.getState()

  useInput((input, key) => {
    if (state.mode !== 'normal') return

    if (key.upArrow && selectedMsg > 0) {
      setSelectedMsg(s => s - 1)
    } else if (key.downArrow && selectedMsg < messages.length - 1) {
      setSelectedMsg(s => s + 1)
    } else if (input === 'p' && selectedMsg >= 0) {
      // Play selected message's code
      const msg = messages[selectedMsg]
      if (msg?.role === 'assistant') {
        const code = extractCode(msg.content)
        if (code) {
          store.setState({ code })
          playPattern(code)
        }
      }
    } else if (input === 's' && selectedMsg >= 0) {
      // Save selected message's code
      const msg = messages[selectedMsg]
      if (msg?.role === 'assistant') {
        const code = extractCode(msg.content)
        if (code) {
          store.setState({ code })
        }
      }
    }
  })

  const extractCode = (text: string): string | null => {
    const blockMatch = text.match(/```(?:js|javascript|strudel)?\n?([\s\S]*?)```/)
    if (blockMatch) return blockMatch[1].trim()
    return text.trim()
  }

  const handleSubmit = async (value: string) => {
    if (!value.trim() || loading) return

    const userMsg: ChatMsg = { role: 'user', content: value }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const bankNames = state.soundBanks.map(b => b.name)
      const response = await chat(value, messages, bankNames)
      const assistantMsg: ChatMsg = { role: 'assistant', content: response }
      setMessages([...newMessages, assistantMsg])
      setSelectedMsg(newMessages.length)
    } catch (e: any) {
      const errMsg: ChatMsg = { role: 'assistant', content: `Error: ${e.message}` }
      setMessages([...newMessages, errMsg])
    } finally {
      setLoading(false)
    }
  }

  const cols = 50
  const maxVisible = 8

  const visibleMessages = messages.slice(-maxVisible)
  const startIdx = Math.max(0, messages.length - maxVisible)

  return (
    <Box flexDirection="column" width={cols + 4}>
      {/* Header */}
      <Text color="magenta">┌{'─'.repeat(cols)}┐</Text>
      <Text color="magenta">│ oli ai{' '.repeat(cols - 8)}│</Text>
      <Text color="magenta">├{'─'.repeat(cols)}┤</Text>

      {/* Messages */}
      {messages.length === 0 ? (
        <Box flexDirection="column">
          <Text color="gray">│ describe a beat and i'll generate it{' '.repeat(cols - 38)}│</Text>
          <Text color="gray">│{' '.repeat(cols)}│</Text>
          <Text color="gray">│ try: "chill lo-fi beat"{' '.repeat(cols - 24)}│</Text>
          <Text color="gray">│      "hard trap with 808s"{' '.repeat(cols - 27)}│</Text>
          <Text color="gray">│      "house groove"{' '.repeat(cols - 20)}│</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {visibleMessages.map((msg, i) => {
            const actualIdx = startIdx + i
            const isSelected = actualIdx === selectedMsg
            const prefix = msg.role === 'user' ? 'you: ' : 'oli: '
            const color = msg.role === 'user' ? 'cyan' : 'magenta'

            // Truncate long messages
            let content = msg.content.replace(/```[\s\S]*?```/g, '[code]')
            if (content.length > cols - 8) {
              content = content.substring(0, cols - 11) + '...'
            }

            return (
              <Text key={i} color={isSelected ? 'yellow' : color} inverse={isSelected}>
                │ {prefix}{content}{' '.repeat(Math.max(0, cols - prefix.length - content.length - 1))}│
              </Text>
            )
          })}
        </Box>
      )}

      {/* Loading indicator */}
      {loading && (
        <Text color="magenta">│ oli: ...{' '.repeat(cols - 9)}│</Text>
      )}

      {/* Footer */}
      <Text color="magenta">├{'─'.repeat(cols)}┤</Text>

      {/* Input */}
      <Box>
        <Text color="green">│ › </Text>
        <Box width={cols - 4}>
          <TextInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            placeholder="describe a beat..."
          />
        </Box>
        <Text color="magenta"> │</Text>
      </Box>

      <Text color="magenta">└{'─'.repeat(cols)}┘</Text>

      {/* Help */}
      <Text color="gray" dimColor>
        [enter] send  [↑↓] select  [p] play  [s] save
      </Text>
    </Box>
  )
}

import { useState, useRef, useEffect } from 'react'
import { useStore } from '../stores/app'
import { chat, type ChatMsg } from '../lib/api'
import { initAudio, playPattern, stopPlayback } from '../lib/audio'

export function AISidebar({ mobile = false }: { mobile?: boolean }) {
  const { soundBanks, setCode, setIsPlaying, code, setError } = useStore()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMsg: ChatMsg = { role: 'user', content: input }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const bankNames = soundBanks.map(b => b.name)
      const response = await chat(input, messages, bankNames)
      const assistantMsg: ChatMsg = { role: 'assistant', content: response }
      setMessages([...newMessages, assistantMsg])
    } catch (e: any) {
      const errMsg: ChatMsg = { role: 'assistant', content: `Error: ${e.message}` }
      setMessages([...newMessages, errMsg])
    } finally {
      setLoading(false)
    }
  }

  const extractCode = (text: string): string | null => {
    const blockMatch = text.match(/```(?:js|javascript|strudel)?\n?([\s\S]*?)```/)
    if (blockMatch) return blockMatch[1].trim()

    const lines = text.split('\n')
    const codeLines = lines.filter(l => {
      const t = l.trim()
      return (
        t.startsWith('sound(') || t.startsWith('note(') || t.startsWith('stack(') ||
        t.startsWith('s(') || t.startsWith('n(') || t.startsWith('.') ||
        t.startsWith('//') || t === ')' || t === '),' ||
        t.match(/^\w+\(/) || t.match(/^\)\./)
      )
    })

    if (codeLines.length > 0 && codeLines.length >= lines.filter(l => l.trim()).length * 0.5) {
      return text.trim()
    }
    return null
  }

  const handleApply = (text: string) => {
    const extracted = extractCode(text) || text.trim()
    setCode(extracted)
  }

  const handleApplyAndPlay = async (text: string) => {
    const extracted = extractCode(text) || text.trim()
    setCode(extracted)
    try {
      await initAudio()
      stopPlayback()
      playPattern(extracted)
      setIsPlaying(true)
    } catch (e: any) {
      setError(`Playback failed: ${e.message || 'Unknown error'}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggestions = [
    'chill lo-fi beat',
    'hard trap with 808s',
    'house groove',
    'add variation',
  ]

  return (
    <div className={`bg-[#0a0a0a] flex flex-col text-[11px] ${mobile ? 'w-full h-full' : 'w-80 h-full border-l border-[#333] shrink-0'}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#333] flex items-center justify-between">
        <span className="text-[#a78bfa]">oli ai</span>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-[#444] hover:text-[#888] transition-colors"
          >
            clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <div className="text-[#666]">
              describe a beat and i'll generate it
            </div>
            <div className="space-y-1">
              <div className="text-[#444] text-[10px] mb-1">try:</div>
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="block w-full text-left text-[#555] hover:text-[#a78bfa] py-1 px-2 hover:bg-[#111] transition-colors rounded"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === 'user' ? (
                  <div className="text-[#888]">
                    <span className="text-[#7dd3fc]">you:</span>
                    <span className="ml-2">{msg.content}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-[#a78bfa]">oli:</div>
                    <div className="pl-3 border-l-2 border-[#333]">
                      <pre className="text-[#888] whitespace-pre-wrap leading-relaxed">
                        {formatResponse(msg.content)}
                      </pre>
                      {!msg.content.startsWith('Error:') && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleApply(msg.content)}
                            className="px-2 py-1 text-[#888] hover:text-[#fff] bg-[#1a1a1a] hover:bg-[#252525] transition-colors rounded"
                          >
                            save
                          </button>
                          <button
                            onClick={() => handleApplyAndPlay(msg.content)}
                            className="px-2 py-1 text-[#4ade80] hover:text-[#86efac] bg-[#1a1a1a] hover:bg-[#252525] transition-colors rounded"
                          >
                            ▶ play
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div>
                <span className="text-[#a78bfa]">oli:</span>
                <span className="ml-2 text-[#555] cursor-blink">_</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Buffer indicator */}
      {code && messages.length > 0 && (
        <div className="px-3 py-1.5 border-t border-[#222] text-[#444] truncate">
          {code.split('\n').length} lines loaded
        </div>
      )}

      {/* Input */}
      <div className="border-t border-[#333] bg-[#111]">
        <div className="flex items-end">
          <span className="text-[#4ade80] pl-3 pb-2.5 select-none">›</span>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={handleKeyDown}
            placeholder="describe a beat..."
            rows={1}
            className="flex-1 bg-transparent px-2 py-2.5 outline-none text-[#ccc] placeholder:text-[#555] resize-none min-h-[40px] max-h-[120px] leading-relaxed"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-3 pb-2.5 text-[#555] hover:text-[#4ade80] disabled:text-[#333] disabled:cursor-not-allowed transition-colors"
          >
            ⏎
          </button>
        </div>
      </div>
    </div>
  )
}

// Format response with syntax highlighting for code blocks
function formatResponse(content: string): React.ReactNode {
  const parts = content.split(/(```[\s\S]*?```)/g)

  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const code = part.replace(/```(?:js|javascript|strudel)?\n?/, '').replace(/```$/, '')
      return (
        <code key={i} className="block text-[#4ade80] bg-[#0a0a0a] p-2 my-2 border-l-2 border-[#4ade80] rounded-r">
          {code}
        </code>
      )
    }
    return <span key={i}>{part}</span>
  })
}

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
    'dark trap with 808s',
    'ambient soundscape',
    'add more drums',
  ]

  return (
    <div className={`bg-[#0c0c0c] flex flex-col ${mobile ? 'w-full h-full' : 'w-96 border-l border-[#333] shrink-0'}`}>
      {/* Header - Terminal style */}
      <div className="px-3 py-2 border-b border-[#333] flex items-center justify-between bg-[#111]">
        <div className="flex items-center gap-2">
          <span className="text-[#a78bfa]">◐</span>
          <span className="text-[11px] text-[#888]">claude</span>
          <span className="text-[#333]">│</span>
          <span className="text-[10px] text-[#555]">strudel-assistant</span>
        </div>
        <button
          onClick={() => setMessages([])}
          className="text-[10px] text-[#555] hover:text-[#888] transition-colors"
        >
          [clear]
        </button>
      </div>

      {/* Messages - CLI style */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <div className="text-[11px] text-[#555]">
              <span className="text-[#4ade80]">$</span> describe music to generate strudel patterns
            </div>
            <div className="border border-[#222] bg-[#0a0a0a] p-2">
              <div className="text-[10px] text-[#555] mb-2">suggestions:</div>
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="block w-full text-left text-[11px] text-[#666] px-2 py-1 hover:bg-[#161616] hover:text-[#999] transition-colors"
                >
                  <span className="text-[#525252] mr-2">{i + 1}.</span>
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
                  <div className="flex gap-2">
                    <span className="text-[#7dd3fc] shrink-0">&gt;</span>
                    <span className="text-[11px] text-[#999]">{msg.content}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <span className="text-[#a78bfa] shrink-0">◐</span>
                      <span className="text-[10px] text-[#555]">assistant</span>
                    </div>
                    <div className="ml-4 border border-[#222] bg-[#0a0a0a]">
                      <pre className="p-3 text-[11px] text-[#888] whitespace-pre-wrap leading-relaxed overflow-x-auto">
                        {formatResponse(msg.content)}
                      </pre>
                      {!msg.content.startsWith('Error:') && (
                        <div className="flex gap-2 px-3 py-2 border-t border-[#222] bg-[#0c0c0c]">
                          <button
                            onClick={() => handleApply(msg.content)}
                            className="term-btn text-[10px]"
                          >
                            apply
                          </button>
                          <button
                            onClick={() => handleApplyAndPlay(msg.content)}
                            className="term-btn term-btn-success text-[10px]"
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
              <div className="flex gap-2 items-center">
                <span className="text-[#a78bfa]">◐</span>
                <span className="text-[11px] text-[#555]">
                  generating<span className="cursor-blink">_</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context indicator */}
      {code && messages.length > 0 && (
        <div className="px-3 py-1.5 border-t border-[#222] bg-[#0a0a0a]">
          <div className="text-[10px] text-[#444] truncate">
            <span className="text-[#525252]">current:</span>{' '}
            <span className="text-[#666]">
              {code.split('\n')[0].slice(0, 40)}{code.split('\n')[0].length > 40 || code.split('\n').length > 1 ? '...' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Input - CLI style */}
      <div className="p-3 border-t border-[#333] bg-[#111]">
        <div className="flex gap-2 items-start">
          <span className="text-[#7dd3fc] mt-1.5">&gt;</span>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="describe music..."
            rows={1}
            className="flex-1 bg-transparent border-none outline-none text-[11px] text-[#999] placeholder:text-[#444] resize-none min-h-[20px] max-h-[80px]"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="text-[#555] hover:text-[#888] disabled:text-[#333] disabled:cursor-not-allowed transition-colors text-xs"
          >
            [send]
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
        <code key={i} className="block text-[#4ade80] bg-[#111] p-2 my-1 border-l-2 border-[#4ade80]">
          {code}
        </code>
      )
    }
    return <span key={i}>{part}</span>
  })
}

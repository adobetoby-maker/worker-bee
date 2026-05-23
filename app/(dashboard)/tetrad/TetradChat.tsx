'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Globe, ChevronDown } from 'lucide-react'

// ── Bot definitions ──────────────────────────────────────────────────────────
type BotId = 'architect' | 'sentinel' | 'polaris' | 'nexus'

const BOTS: { id: BotId; name: string; god: string; icon: string; color: string; tagline: string }[] = [
  { id: 'architect', name: 'Athena',  god: 'Design',    icon: '🏛️', color: '#818cf8', tagline: 'Prompt engineering · UI/UX · Components' },
  { id: 'sentinel',  name: 'Ares',    god: 'Security',  icon: '⚔️', color: '#f87171', tagline: 'Code audit · OWASP · Auth hardening' },
  { id: 'polaris',   name: 'Apollo',  god: 'Quality',   icon: '☀️', color: '#fbbf24', tagline: 'Live site audit · SEO · Performance' },
  { id: 'nexus',     name: 'Hermes',  god: 'Ops',       icon: '🪽', color: '#34d399', tagline: 'Research · Data · Automation' },
]

const PLATFORMS = [
  { id: 'claude_code', label: 'Claude Code',  ctx: 'The user is building with Claude Code and Next.js App Router. Generate prompts and code for Next.js 16, Tailwind v4, TypeScript, Supabase.' },
  { id: 'lovable',     label: 'Lovable',       ctx: 'The user is building with Lovable (React + Vite + Tailwind + Supabase). Use shadcn/ui components. All code should be TypeScript React.' },
  { id: 'nextjs',      label: 'Next.js',       ctx: 'The user is building with Next.js. Provide advice for React Server Components, App Router, API routes, and Next.js best practices.' },
  { id: 'wordpress',   label: 'WordPress',     ctx: 'The user is building with WordPress. Provide advice for themes, plugins, PHP, Gutenberg blocks, and WooCommerce.' },
  { id: 'shopify',     label: 'Shopify',       ctx: 'The user is building with Shopify. Provide advice for Liquid templates, Shopify APIs, and theme development.' },
  { id: 'html',        label: 'HTML/CSS/JS',   ctx: 'The user is building with vanilla HTML, CSS, and JavaScript. Provide clean, standards-compliant code without frameworks.' },
]

// ── Types ────────────────────────────────────────────────────────────────────
interface Msg { id: string; role: 'user' | 'assistant'; botId?: BotId; content: string; ts: number }

// ── Main component ───────────────────────────────────────────────────────────
export default function TetradChat() {
  const [activeBotId, setActiveBotId] = useState<BotId>('architect')
  const [platformId, setPlatformId] = useState('claude_code')
  const [showPlatformPicker, setShowPlatformPicker] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [auditUrl, setAuditUrl] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeBot = BOTS.find(b => b.id === activeBotId)!
  const activePlatform = PLATFORMS.find(p => p.id === platformId)!

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Reset URL input when switching bots
  useEffect(() => {
    setShowUrlInput(false)
    setAuditUrl('')
  }, [activeBotId])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }, [input])

  const send = useCallback(async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim()
    if (!text || streaming) return

    setInput('')
    setStreaming(true)

    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', content: text, ts: Date.now() }
    setMessages(prev => [...prev, userMsg])

    // Build API message history
    const history = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }))

    // Inject platform context as first user message
    const platformContext = `[PLATFORM CONTEXT]: ${activePlatform.ctx}`
    const apiMessages = [{ role: 'user', content: platformContext }, ...history]

    // Streaming assistant message placeholder
    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', botId: activeBotId, content: '', ts: Date.now() }])

    try {
      const res = await fetch('/api/triad-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, botId: activeBotId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' })) as { error: string }
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: `⚠️ ${err.error}` } : m))
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        let nl: number
        while ((nl = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, nl).trimEnd()
          buf = buf.slice(nl + 1)
          if (!line.startsWith('data: ')) continue
          const json = line.slice(6).trim()
          if (json === '[DONE]') break
          try {
            const parsed = JSON.parse(json) as { choices: [{ delta: { content?: string } }] }
            const chunk = parsed.choices?.[0]?.delta?.content
            if (chunk) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m,
              ))
            }
          } catch { /* partial chunk, re-buffer */ buf = line + '\n' + buf; break }
        }
      }
    } catch (e) {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: `⚠️ Network error: ${String(e)}` } : m,
      ))
    } finally {
      setStreaming(false)
    }
  }, [input, messages, streaming, activeBotId, activePlatform])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const submitSiteUrl = () => {
    if (!auditUrl.trim()) return
    const url = auditUrl.trim().startsWith('http') ? auditUrl.trim() : `https://${auditUrl.trim()}`
    setShowUrlInput(false)
    setAuditUrl('')
    const msg = activeBotId === 'sentinel'
      ? `Run a full security audit of this site — identify every vulnerability, map to OWASP, and give me exact fixes: ${url}`
      : `Audit this site and give me a full breakdown: ${url}`
    send(msg)
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--background)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 border-b flex items-center justify-between"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wide text-sm">TETRAD</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono"
              style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>WAR ROOM</span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Four gods. One pantheon. Built with Claude.</div>
        </div>

        {/* Platform picker */}
        <div className="relative">
          <button
            onClick={() => setShowPlatformPicker(p => !p)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}>
            {activePlatform.label}
            <ChevronDown size={11} />
          </button>
          {showPlatformPicker && (
            <div className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-2xl"
              style={{ background: '#1e2235', border: '1px solid var(--border)', minWidth: 160 }}>
              {PLATFORMS.map(p => (
                <button key={p.id}
                  onClick={() => { setPlatformId(p.id); setShowPlatformPicker(false) }}
                  className="w-full text-left px-3 py-2 text-xs font-medium transition-colors"
                  style={{
                    color: p.id === platformId ? '#a5b4fc' : 'var(--muted-light)',
                    background: p.id === platformId ? 'rgba(99,102,241,0.15)' : 'transparent',
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bot tabs ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex border-b px-2 pt-2 gap-1 overflow-x-auto"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {BOTS.map(bot => {
          const active = bot.id === activeBotId
          return (
            <button key={bot.id}
              onClick={() => setActiveBotId(bot.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-semibold whitespace-nowrap transition-all relative shrink-0"
              style={{
                color: active ? bot.color : 'var(--muted)',
                background: active ? 'var(--background)' : 'transparent',
                borderBottom: active ? `2px solid ${bot.color}` : '2px solid transparent',
                marginBottom: -1,
              }}>
              <span>{bot.icon}</span>
              <span>{bot.name}</span>
              <span className="hidden sm:inline text-[10px] font-normal opacity-60">· {bot.god}</span>
            </button>
          )
        })}
      </div>

      {/* ── Bot info bar ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-2 flex items-center justify-between"
        style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
        <div className="text-xs" style={{ color: 'var(--muted)' }}>
          <span style={{ color: activeBot.color }}>{activeBot.name}</span>
          {' · '}{activeBot.tagline}
        </div>
        {(activeBotId === 'polaris' || activeBotId === 'sentinel') && (() => {
          const isAres = activeBotId === 'sentinel'
          const c = isAres ? '#f87171' : '#fbbf24'
          return (
            <button
              onClick={() => setShowUrlInput(v => !v)}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all"
              style={{ color: c, background: `${c}1e`, border: `1px solid ${c}33` }}>
              <Globe size={11} />
              {isAres ? 'Security scan' : 'Audit a site'}
            </button>
          )
        })()}
      </div>

      {/* ── Site URL input (Apollo + Ares) ──────────────────────────────────── */}
      {showUrlInput && (activeBotId === 'polaris' || activeBotId === 'sentinel') && (() => {
        const isAres = activeBotId === 'sentinel'
        const c = isAres ? '#f87171' : '#fbbf24'
        return (
          <div className="shrink-0 px-4 py-2 flex gap-2"
            style={{ background: `${c}0f`, borderBottom: `1px solid ${c}26` }}>
            <input
              value={auditUrl}
              onChange={e => setAuditUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitSiteUrl() }}
              placeholder="https://example.com"
              className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
              style={{ background: 'rgba(0,0,0,0.3)', color: 'white', border: `1px solid ${c}4d` }}
              autoFocus
            />
            <button onClick={submitSiteUrl}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: c, color: isAres ? '#fff' : '#000' }}>
              {isAres ? 'Scan →' : 'Audit →'}
            </button>
          </div>
        )
      })()}

      {/* ── Messages ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center pt-16">
            <div className="text-4xl mb-3">{activeBot.icon}</div>
            <div className="font-bold text-white mb-1">{activeBot.name}</div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>{activeBot.tagline}</div>
            {activeBotId === 'polaris' && (
              <div className="mt-4 text-xs" style={{ color: 'var(--muted)' }}>
                Paste a URL in your message or click "Audit a site" for a structured review.
              </div>
            )}
            {activeBotId === 'sentinel' && (
              <div className="mt-4 text-xs" style={{ color: 'var(--muted)' }}>
                Paste a URL in your message or click "Security scan" for a full OWASP vulnerability report.
              </div>
            )}
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-base mt-0.5"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)' }}>
                {BOTS.find(b => b.id === msg.botId)?.icon ?? '🤖'}
              </div>
            )}

            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'rounded-tr-sm'
                : 'rounded-tl-sm'
            }`}
              style={msg.role === 'user'
                ? { background: 'rgba(99,102,241,0.2)', color: '#e0e7ff', border: '1px solid rgba(99,102,241,0.3)' }
                : { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }
              }>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm prose-invert max-w-none
                  prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10
                  prose-code:text-indigo-300 prose-code:bg-black/30 prose-code:px-1 prose-code:rounded
                  prose-a:text-indigo-400 prose-headings:text-white">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content || '▊'}
                  </ReactMarkdown>
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ─────────────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex gap-2 items-end rounded-xl px-3 py-2"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${activeBot.name}… (Shift+Enter for new line)`}
            rows={1}
            disabled={streaming}
            className="flex-1 bg-transparent text-sm outline-none resize-none"
            style={{ color: 'var(--text)', minHeight: 24, maxHeight: 160 }}
          />
          <button
            onClick={() => send()}
            disabled={streaming || !input.trim()}
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: streaming || !input.trim() ? 'rgba(99,102,241,0.2)' : '#6366f1',
              color: streaming || !input.trim() ? 'rgba(129,140,248,0.4)' : 'white',
            }}>
            <Send size={14} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
            Platform: <span style={{ color: '#818cf8' }}>{activePlatform.label}</span>
          </span>
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
            Powered by claude-sonnet-4-6
          </span>
        </div>
      </div>

    </div>
  )
}

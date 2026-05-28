'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { SITE_MONETIZATION } from '@/lib/monetization'

// Quick commands that can be injected into the terminal
const QUICK_CMDS = [
  { label: 'claude', cmd: 'claude\n', color: '#818cf8' },
  { label: 'npm dev', cmd: 'npm run dev -H 0.0.0.0\n', color: '#34d399' },
  { label: 'build', cmd: 'npm run build\n', color: '#f59e0b' },
  { label: 'tsc', cmd: 'npx tsc --noEmit\n', color: '#60a5fa' },
  { label: 'git status', cmd: 'git status\n', color: '#94a3b8' },
  { label: 'ssh mac', cmd: 'ssh 100.117.143.57\n', color: '#e879f9' },
  { label: 'cls', cmd: 'clear\n', color: '#475569' },
]

const SSH_URL = 'ssh://drive@100.117.143.57'

const SITE_OPTIONS = SITE_MONETIZATION.map(s => ({ key: s.siteKey, name: s.siteName, url: s.siteUrl }))

declare global {
  interface Window {
    Terminal: new (opts: object) => XTerm
    FitAddon: { FitAddon: new () => FitAddonInstance }
  }
}

interface XTerm {
  loadAddon(addon: FitAddonInstance): void
  open(el: HTMLElement): void
  write(data: string): void
  onData(cb: (data: string) => void): void
  dispose(): void
  cols: number
  rows: number
}

interface FitAddonInstance {
  fit(): void
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export default function BuildStudioClient() {
  const termRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitRef = useRef<FitAddonInstance | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [previewUrl, setPreviewUrl] = useState('http://100.117.143.57:3007')
  const [frameUrl, setFrameUrl] = useState('')
  const [selectedSite, setSelectedSite] = useState('')
  const [wsUrl, setWsUrl] = useState('')
  const [customWs, setCustomWs] = useState(false)
  const [wsInput, setWsInput] = useState('ws://100.117.143.57:3333')

  // Detect host on mount — prefer tunnel WSS so HTTPS pages work
  useEffect(() => {
    const proto = window.location.protocol
    const host = window.location.hostname

    // If on local network (HTTP), connect directly; otherwise use CF tunnel (WSS)
    const isLocal = proto === 'http:' || host === '100.117.143.57' || host === 'localhost'
    const wsDefault = isLocal ? `ws://${host}:3333` : 'wss://devtools.tobyandertonmd.com'
    const previewDefault = isLocal ? `http://${host}:3007` : 'http://100.117.143.57:3007'

    setWsUrl(wsDefault)
    setWsInput(wsDefault)
    setPreviewUrl(previewDefault)
    loadXterm(wsDefault)
  }, [])

  function loadXterm(socketUrl: string) {
    setLoadState('loading')

    // Load xterm.js from CDN if not already loaded
    const load = (src: string) =>
      new Promise<void>((res, rej) => {
        if (document.querySelector(`script[src="${src}"]`)) { res(); return }
        const s = document.createElement('script')
        s.src = src
        s.onload = () => res()
        s.onerror = () => rej(new Error(`Failed to load ${src}`))
        document.head.appendChild(s)
      })

    const loadCss = (href: string) => {
      if (document.querySelector(`link[href="${href}"]`)) return
      const l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = href
      document.head.appendChild(l)
    }

    loadCss('https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.min.css')

    load('https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js')
      .then(() => load('https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.min.js'))
      .then(() => initTerm(socketUrl))
      .catch(() => setLoadState('error'))
  }

  function initTerm(socketUrl: string) {
    if (!termRef.current) return

    const term = new window.Terminal({
      theme: {
        background: '#0a0a0f',
        foreground: '#d4d4d4',
        cursor: '#818cf8',
        selectionBackground: 'rgba(129,140,248,0.25)',
        black: '#1e1e1e', brightBlack: '#555',
        red: '#f44747', green: '#6a9955', yellow: '#dcdcaa',
        blue: '#569cd6', magenta: '#c586c0', cyan: '#4ec9b0', white: '#d4d4d4',
        brightRed: '#f97583', brightGreen: '#4ec9b0', brightYellow: '#ffec99',
        brightBlue: '#9cdcfe', brightMagenta: '#d7ba7d', brightCyan: '#4fc1ff', brightWhite: '#fff',
      },
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
      fontSize: 13,
      lineHeight: 1.35,
      cursorBlink: true,
      scrollback: 2000,
    })

    const fitAddon = new window.FitAddon.FitAddon()
    term.loadAddon(fitAddon)
    term.open(termRef.current)
    fitAddon.fit()

    xtermRef.current = term
    fitRef.current = fitAddon

    connectWs(socketUrl, term, fitAddon)
    setLoadState('ready')

    const ro = new ResizeObserver(() => {
      try { fitAddon.fit() } catch {}
      sendResize(wsRef.current, term)
    })
    if (termRef.current) ro.observe(termRef.current)
  }

  function connectWs(url: string, term: XTerm, fitAddon: FitAddonInstance) {
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      term.write('\r\n \x1b[32m✓\x1b[0m connected to ' + url + '\r\n\r\n')
      fitAddon.fit()
      sendResize(ws, term)
    }
    ws.onclose = () => {
      term.write('\r\n\x1b[31m✗ disconnected\x1b[0m — reconnecting in 2s…\r\n')
      setTimeout(() => connectWs(url, term, fitAddon), 2000)
    }
    ws.onerror = () => ws.close()
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string)
        if (msg.type === 'output') term.write(msg.data as string)
      } catch {}
    }

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'input', data }))
    })
  }

  function sendResize(ws: WebSocket | null, term: XTerm) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
    }
  }

  function injectCmd(cmd: string) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', data: cmd }))
    }
  }

  function loadPreview() {
    setFrameUrl(previewUrl)
  }

  function handleSiteChange(key: string) {
    setSelectedSite(key)
    const site = SITE_OPTIONS.find(s => s.key === key)
    if (site) setPreviewUrl(site.url)
  }

  function applyCustomWs() {
    setCustomWs(false)
    if (xtermRef.current) xtermRef.current.dispose()
    wsRef.current?.close()
    setWsUrl(wsInput)
    loadXterm(wsInput)
  }

  // ── Touch swipe detection ────────────────────────────────────────────────────

  const touchStartX = useRef(0)
  const [mobilePane, setMobilePane] = useState<'terminal' | 'preview'>('terminal')

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) < 50) return
    setMobilePane(dx < 0 ? 'preview' : 'terminal')
  }

  // ── Main layout ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 4rem)', minHeight: 0 }}>

      {/* ── Top bar (desktop) ────────────────────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-2 pb-3 flex-wrap" style={{ flexShrink: 0 }}>
        {/* Site selector */}
        <select
          value={selectedSite}
          onChange={e => handleSiteChange(e.target.value)}
          className="text-xs rounded-lg px-3 py-1.5 border"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'var(--border)', color: 'white', minWidth: 140 }}
        >
          <option value="">Select site…</option>
          {SITE_OPTIONS.map(s => (
            <option key={s.key} value={s.key}>{s.name}</option>
          ))}
        </select>

        {/* Quick commands */}
        <div className="flex gap-1.5 flex-wrap">
          {QUICK_CMDS.map(({ label, cmd, color }) => (
            <button
              key={label}
              onClick={() => injectCmd(cmd)}
              className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
              style={{ background: color + '18', color, border: `1px solid ${color}30` }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* SSH deep-link */}
        <a
          href={SSH_URL}
          className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5"
          style={{ background: '#e879f910', color: '#e879f9', border: '1px solid #e879f930', textDecoration: 'none' }}
          title="Open SSH session to Mac (opens Terminal / iTerm2)"
        >
          ⬡ SSH
        </a>

        {/* WS config */}
        <div className="ml-auto flex items-center gap-2">
          {customWs ? (
            <>
              <input
                value={wsInput}
                onChange={e => setWsInput(e.target.value)}
                className="text-xs rounded-lg px-2 py-1 border w-56"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'var(--border)', color: 'white' }}
              />
              <button onClick={applyCustomWs} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: '#6366f1', color: 'white' }}>
                Connect
              </button>
              <button onClick={() => setCustomWs(false)} className="text-xs px-2 py-1" style={{ color: 'var(--muted)' }}>✕</button>
            </>
          ) : (
            <button
              onClick={() => setCustomWs(true)}
              className="text-xs px-2.5 py-1 rounded-lg transition-colors"
              style={{ color: 'var(--muted)', border: '1px solid var(--border)', background: 'transparent' }}
            >
              {wsUrl || 'Configure tunnel'}
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile tab bar ───────────────────────────────────────────────────── */}
      <div className="flex md:hidden items-center gap-1 pb-2 flex-shrink-0">
        {(['terminal', 'preview'] as const).map(pane => (
          <button
            key={pane}
            onClick={() => setMobilePane(pane)}
            className="flex-1 py-2 text-xs font-semibold rounded-lg transition-colors"
            style={mobilePane === pane
              ? { background: pane === 'terminal' ? '#34d39920' : '#818cf820', color: pane === 'terminal' ? '#34d399' : '#818cf8' }
              : { background: 'rgba(255,255,255,0.03)', color: 'var(--muted)' }
            }
          >
            {pane === 'terminal' ? '⌨ Terminal' : '🌐 Preview'}
          </button>
        ))}
        <select
          value={selectedSite}
          onChange={e => handleSiteChange(e.target.value)}
          className="text-xs rounded-lg px-2 py-2 border ml-1"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'var(--border)', color: 'white', maxWidth: 110 }}
        >
          <option value="">Site…</option>
          {SITE_OPTIONS.map(s => (
            <option key={s.key} value={s.key}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* ── Desktop: 30/70 split ─────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-1 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)', minHeight: 0 }}>

        {/* Terminal — 30% */}
        <div className="flex flex-col" style={{ width: '30%', background: '#0a0a0f', borderRight: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 px-3 py-2 text-xs flex-shrink-0" style={{ background: '#0f0f16', borderBottom: '1px solid var(--border)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: '#34d399', boxShadow: '0 0 4px #34d399' }} />
            <span style={{ color: '#4ade80', fontFamily: 'monospace' }}>terminal</span>
            <span className="ml-auto text-[10px]" style={{ color: '#374151' }}>
              {loadState === 'loading' ? 'connecting…' : loadState === 'ready' ? 'connected' : ''}
            </span>
          </div>
          <div ref={termRef} className="flex-1" style={{ padding: '4px 2px', minHeight: 0 }} />
          {loadState === 'loading' && (
            <div className="flex items-center justify-center flex-1 text-sm" style={{ color: 'var(--muted)' }}>
              Loading terminal…
            </div>
          )}
        </div>

        {/* Preview — 70% */}
        <div className="flex flex-col" style={{ width: '70%', background: '#000', minHeight: 0 }}>
          <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0" style={{ background: '#0f0f16', borderBottom: '1px solid var(--border)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#818cf8' }} />
            <input
              value={previewUrl}
              onChange={e => setPreviewUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadPreview()}
              className="flex-1 text-xs rounded px-2 py-0.5 border min-w-0"
              style={{ background: '#111', borderColor: '#222', color: '#ccc', fontFamily: 'monospace' }}
              placeholder="http://100.117.143.57:3007"
            />
            <button onClick={loadPreview} className="text-xs px-2 py-0.5 rounded" style={{ background: '#1e1e2e', color: '#818cf8', border: '1px solid #333' }}>↺</button>
          </div>
          {frameUrl ? (
            <iframe src={frameUrl} className="flex-1 border-0 w-full" style={{ minHeight: 0 }} title="Site preview" />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: 'var(--muted)' }}>
              <span className="text-3xl opacity-20">⚡</span>
              <div className="text-sm text-center">
                <div className="mb-1">Preview pane</div>
                <div className="text-xs opacity-60">Select a site or enter a URL above</div>
              </div>
              {selectedSite && (
                <button onClick={loadPreview} className="text-xs px-4 py-1.5 rounded-lg" style={{ background: '#6366f1', color: 'white' }}>
                  Load {SITE_OPTIONS.find(s => s.key === selectedSite)?.name}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile: sliding panes ────────────────────────────────────────────── */}
      <div
        className="md:hidden flex-1 relative overflow-hidden rounded-xl border"
        style={{ borderColor: 'var(--border)', minHeight: 0 }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Slide wrapper — moves both panes together */}
        <div
          className="absolute inset-0 flex"
          style={{
            width: '200%',
            transform: mobilePane === 'terminal' ? 'translateX(0)' : 'translateX(-50%)',
            transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
            willChange: 'transform',
          }}
        >
          {/* Terminal — left slide */}
          <div className="flex flex-col" style={{ width: '50%', background: '#0a0a0f', borderRight: '1px solid var(--border)', minHeight: 0 }}>
            <div className="flex items-center gap-2 px-3 py-2 text-xs flex-shrink-0" style={{ background: '#0f0f16', borderBottom: '1px solid var(--border)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: '#34d399', boxShadow: '0 0 4px #34d399' }} />
              <span style={{ color: '#4ade80', fontFamily: 'monospace' }}>terminal</span>
              <div className="ml-auto flex gap-1.5">
                {QUICK_CMDS.slice(0, 3).map(({ label, cmd, color }) => (
                  <button key={label} onClick={() => injectCmd(cmd)} className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: color + '20', color }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {/* Terminal mounts here on mobile too — keep ref on this div */}
            <div className="flex-1" style={{ padding: '4px 2px', minHeight: 0, position: 'relative' }}>
              <div className="absolute inset-0" id="mobile-term-mount" />
            </div>
          </div>

          {/* Preview — right slide */}
          <div className="flex flex-col" style={{ width: '50%', background: '#000', minHeight: 0 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0" style={{ background: '#0f0f16', borderBottom: '1px solid var(--border)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#818cf8' }} />
              <input
                value={previewUrl}
                onChange={e => setPreviewUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadPreview()}
                className="flex-1 text-[11px] rounded px-2 py-0.5 border min-w-0"
                style={{ background: '#111', borderColor: '#222', color: '#ccc', fontFamily: 'monospace' }}
                placeholder="Enter URL…"
              />
              <button onClick={loadPreview} className="text-xs px-2 py-0.5 rounded flex-shrink-0" style={{ background: '#1e1e2e', color: '#818cf8', border: '1px solid #333' }}>↺</button>
            </div>
            {frameUrl ? (
              <iframe src={frameUrl} className="flex-1 border-0 w-full" style={{ minHeight: 0 }} title="Site preview" />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: 'var(--muted)' }}>
                <span className="text-3xl opacity-20">⚡</span>
                <p className="text-xs text-center px-4" style={{ color: 'var(--muted)' }}>Swipe left to preview · enter URL above</p>
                {selectedSite && (
                  <button onClick={loadPreview} className="text-xs px-4 py-1.5 rounded-lg" style={{ background: '#6366f1', color: 'white' }}>
                    Load {SITE_OPTIONS.find(s => s.key === selectedSite)?.name}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Swipe hint dots (mobile) */}
      <div className="flex md:hidden justify-center gap-2 pt-2 flex-shrink-0">
        {(['terminal', 'preview'] as const).map(p => (
          <button
            key={p}
            onClick={() => setMobilePane(p)}
            style={{
              width: mobilePane === p ? 20 : 6,
              height: 6,
              borderRadius: 3,
              background: mobilePane === p ? (p === 'terminal' ? '#34d399' : '#818cf8') : 'rgba(255,255,255,0.15)',
              transition: 'all 0.25s ease',
              border: 'none',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>

    </div>
  )
}

'use client'
import { useState, useRef } from 'react'
import { Terminal, X, Minus, Maximize2, ExternalLink, Copy, Check } from 'lucide-react'

// The terminal URL can be set per-device via NEXT_PUBLIC_TERMINAL_URL.
// On the Mac: run `ttyd --ssl --ssl-cert <cert> --ssl-key <key> -p 7681 -W bash`
// Then set NEXT_PUBLIC_TERMINAL_URL=https://<tailscale-hostname>:7681
const TERMINAL_URL = process.env.NEXT_PUBLIC_TERMINAL_URL ?? ''

const SETUP_STEPS = `# Mac Setup (one-time)
brew install ttyd

# Get your Tailscale hostname + TLS cert
HOSTNAME=$(tailscale status --json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['Self']['DNSName'].rstrip('.'))")
tailscale cert "$HOSTNAME"

# Start ttyd (add to launchd for persistence)
ttyd --ssl \\
  --ssl-cert ~/.config/tailscale/certs/$HOSTNAME.crt \\
  --ssl-key ~/.config/tailscale/certs/$HOSTNAME.key \\
  -p 7681 -W bash

# Then set in Vercel env:
# NEXT_PUBLIC_TERMINAL_URL=https://$HOSTNAME:7681`

export default function TerminalDrawer() {
  const [open, setOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const drawerHeight = fullscreen ? 'calc(100vh - 56px)' : 300
  const spacerHeight = open ? (fullscreen ? 'calc(100vh - 56px)' : 332) : 36

  function copySetup() {
    navigator.clipboard.writeText(SETUP_STEPS)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Spacer — keeps scroll content from hiding behind the fixed drawer */}
      <div style={{ height: spacerHeight, flexShrink: 0 }} />

      {/* Fixed drawer panel — offset left by sidebar width (w-52 = 208px) */}
      <div
        className="fixed bottom-0 right-0 z-40 flex flex-col border-t"
        style={{
          left: 208,
          background: '#0d0d0f',
          borderColor: 'rgba(255,255,255,0.08)',
          transition: 'height 200ms ease',
        }}
      >
        {/* ── Tab bar ── */}
        <div
          className="flex items-center gap-2 px-3 shrink-0 cursor-pointer select-none"
          style={{ height: 36, borderBottom: open ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
          onClick={() => setOpen(o => !o)}
        >
          <Terminal size={12} style={{ color: '#34d399' }} />
          <span className="text-xs font-mono font-semibold" style={{ color: '#34d399' }}>
            TERMINAL
          </span>
          {TERMINAL_URL ? (
            <span className="text-xs font-mono ml-1" style={{ color: 'rgba(52,211,153,0.5)', fontSize: 10 }}>
              {TERMINAL_URL.replace(/^https?:\/\//, '').replace(/:7681$/, '')}
            </span>
          ) : (
            <span className="text-xs ml-1 px-1.5 py-0.5 rounded" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontSize: 10 }}>
              setup required
            </span>
          )}

          <div className="ml-auto flex items-center gap-1" onClick={e => e.stopPropagation()}>
            {open && TERMINAL_URL && (
              <>
                <a
                  href={TERMINAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  style={{ color: 'var(--muted)' }}
                  title="Open in new tab"
                >
                  <ExternalLink size={11} />
                </a>
                <button
                  onClick={() => setFullscreen(f => !f)}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  style={{ color: 'var(--muted)' }}
                  title={fullscreen ? 'Restore' : 'Fullscreen'}
                >
                  <Maximize2 size={11} />
                </button>
              </>
            )}
            <button
              onClick={() => setOpen(o => !o)}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              style={{ color: 'var(--muted)' }}
              title={open ? 'Collapse' : 'Expand'}
            >
              {open ? <Minus size={11} /> : <Terminal size={11} />}
            </button>
            {open && (
              <button
                onClick={() => { setOpen(false); setFullscreen(false) }}
                className="p-1 rounded hover:bg-red-500/20 transition-colors"
                style={{ color: 'var(--muted)' }}
                title="Close"
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* ── Terminal body ── */}
        {open && (
          <div className="flex-1 overflow-hidden" style={{ height: drawerHeight }}>
            {TERMINAL_URL ? (
              <iframe
                ref={iframeRef}
                src={TERMINAL_URL}
                className="w-full h-full border-none"
                allow="clipboard-read; clipboard-write"
                title="Remote terminal"
              />
            ) : (
              /* Setup instructions */
              <div className="h-full overflow-y-auto p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">Terminal Setup Required</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      Run <code className="font-mono">ttyd</code> on your Mac with a Tailscale TLS cert, then set{' '}
                      <code className="font-mono text-emerald-400">NEXT_PUBLIC_TERMINAL_URL</code> in Vercel.
                    </p>
                  </div>
                  <button onClick={copySetup}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border transition-colors shrink-0"
                    style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--muted-light)' }}>
                    {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="text-xs font-mono rounded p-3 overflow-x-auto"
                  style={{ background: 'rgba(0,0,0,0.4)', color: '#a3e635', lineHeight: 1.6 }}>
                  {SETUP_STEPS}
                </pre>
                <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
                  After setup, add <code className="font-mono text-emerald-400">NEXT_PUBLIC_TERMINAL_URL</code> to Vercel
                  and redeploy. The terminal will connect automatically when you're on Tailscale.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

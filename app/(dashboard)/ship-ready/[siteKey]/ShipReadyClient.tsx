'use client'

import { useState } from 'react'
import {
  CheckCircle, XCircle, AlertCircle, Loader2, ExternalLink,
  Search, Shield, Users, Hammer, ArrowRight,
} from 'lucide-react'

interface SeoResult { pass: boolean; label: string; value?: string }
interface CsoItem { pass: boolean | null; label: string; note?: string }

interface ShipReadyClientProps {
  siteKey: string
  siteName: string
  siteUrl: string
}

function ResultIcon({ pass }: { pass: boolean | null }) {
  if (pass === null) return <AlertCircle size={14} style={{ color: '#f59e0b' }} />
  if (pass) return <CheckCircle size={14} style={{ color: '#34d399' }} />
  return <XCircle size={14} style={{ color: '#f87171' }} />
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 8 ? '#34d399' : score >= 5 ? '#f59e0b' : '#f87171'
  return (
    <span
      className="text-lg font-bold font-mono"
      style={{ color }}
    >
      {score}/10
    </span>
  )
}

// ── SEO panel ─────────────────────────────────────────────────────────────────

function SeoPanel({ url }: { url: string }) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SeoResult[] | null>(null)
  const [score, setScore] = useState<number | null>(null)

  async function run() {
    setLoading(true)
    try {
      const res = await fetch(`/api/ship-check/seo?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      setResults(data.results)
      setScore(data.score)
    } catch {
      setResults([{ pass: false, label: 'Failed to run check', value: 'Network error' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search size={15} style={{ color: '#60a5fa' }} />
          <span className="font-semibold text-white">SEO Audit</span>
        </div>
        {score !== null && <ScorePill score={score} />}
      </div>
      {results ? (
        <div className="space-y-2">
          {results.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <ResultIcon pass={r.pass} />
              <div className="flex-1 min-w-0">
                <span style={{ color: 'var(--muted-light)' }}>{r.label}</span>
                {r.value && (
                  <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{r.value}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium w-full justify-center transition-colors"
          style={{ background: '#60a5fa18', color: '#60a5fa', border: '1px solid #60a5fa30' }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {loading ? 'Running SEO checks…' : 'Run SEO Audit'}
        </button>
      )}
    </div>
  )
}

// ── CSO / Security panel ───────────────────────────────────────────────────────

const CSO_CHECKLIST: CsoItem[] = [
  { pass: null, label: 'HTTPS enforced (no HTTP redirect loops)', note: 'curl -sI http://... → redirects to https://' },
  { pass: null, label: 'No .env files committed', note: 'git log --all --oneline -- "*.env"' },
  { pass: null, label: 'Content-Security-Policy header present', note: 'curl -sI <url> | grep -i content-security' },
  { pass: null, label: 'No console.log of sensitive data', note: 'Search source for console.log(token|key|pass|secret)' },
  { pass: null, label: 'API routes validate input / auth', note: 'Every route has auth check before DB query' },
  { pass: null, label: 'Supabase RLS enabled on all tables', note: 'Check Supabase dashboard → Table Editor → RLS column' },
  { pass: null, label: 'No service role key in client bundle', note: 'Bundle does not contain SUPABASE_SERVICE_ROLE_KEY' },
  { pass: null, label: 'Vercel project has no public env var leaks', note: 'Only NEXT_PUBLIC_ vars exposed to browser' },
]

function CsoPanel() {
  const [items, setItems] = useState<CsoItem[]>(CSO_CHECKLIST)
  const passed = items.filter(i => i.pass === true).length
  const score = Math.round((passed / items.length) * 10)

  function toggle(idx: number) {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, pass: item.pass === true ? false : item.pass === false ? null : true } : item
    ))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={15} style={{ color: '#a78bfa' }} />
          <span className="font-semibold text-white">Security (CSO)</span>
        </div>
        <ScorePill score={score} />
      </div>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        Click each item to mark pass / fail / unknown. Run the suggested commands in Build Studio.
      </p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className="w-full flex items-start gap-2 text-left text-sm rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
          >
            <ResultIcon pass={item.pass} />
            <div className="flex-1 min-w-0">
              <div style={{ color: 'var(--muted-light)' }}>{item.label}</div>
              <div className="text-xs font-mono mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{item.note}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── CEO Review panel ───────────────────────────────────────────────────────────

function CeoPanel({ siteName, siteUrl }: { siteName: string; siteUrl: string }) {
  const [loading, setLoading] = useState(false)
  const [review, setReview] = useState<string | null>(null)
  const [score, setScore] = useState<number | null>(null)

  async function run() {
    setLoading(true)
    try {
      const res = await fetch('/api/ship-check/ceo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ siteName, siteUrl }),
      })
      const data = await res.json()
      setReview(data.review)
      setScore(data.score)
    } catch {
      setReview('Failed to generate review.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={15} style={{ color: '#f59e0b' }} />
          <span className="font-semibold text-white">CEO Review</span>
        </div>
        {score !== null && <ScorePill score={score} />}
      </div>
      {review ? (
        <div
          className="text-sm leading-relaxed rounded-xl p-4"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid #f59e0b22', color: 'var(--muted-light)', whiteSpace: 'pre-wrap' }}
        >
          {review}
        </div>
      ) : (
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium w-full justify-center transition-colors"
          style={{ background: '#f59e0b18', color: '#f59e0b', border: '1px solid #f59e0b30' }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
          {loading ? 'Running CEO review…' : 'Run CEO Review'}
        </button>
      )}
    </div>
  )
}

// ── Gate checklist ─────────────────────────────────────────────────────────────

const GATES = [
  { id: 'seo',   label: 'SEO metadata present', note: 'title, description, canonical, OG, JSON-LD' },
  { id: 'https', label: 'HTTPS live — curl returns 200', note: 'curl -sI <url> | head -1' },
  { id: 'build', label: 'Build passes (zero TS errors)', note: 'npx tsc --noEmit && npm run build' },
  { id: 'visual',label: 'Visual gate passed (screenshot + video)', note: 'All 4 viewports. No overlaps. Footer visible.' },
  { id: 'mobile',label: 'Mobile experience verified', note: 'node ~/record.js <port> --mobile' },
  { id: 'form',  label: 'Contact form submits and arrives', note: 'Submit from browser, confirm in inbox' },
  { id: 'analytics', label: 'Analytics wired', note: 'GA4 or Vercel Analytics in layout.tsx' },
  { id: 'content',   label: 'Zero [DEMO] tags remaining', note: 'grep -rn "[DEMO]" app/ | wc -l → 0' },
]

function GatesPanel({ siteKey }: { siteKey: string }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const passed = Object.values(checked).filter(Boolean).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Ship Gates
        </span>
        <span className="text-xs font-mono" style={{ color: passed === GATES.length ? '#34d399' : 'var(--muted)' }}>
          {passed}/{GATES.length}
        </span>
      </div>
      {GATES.map(g => (
        <label key={g.id} className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={!!checked[g.id]}
            onChange={e => setChecked(p => ({ ...p, [g.id]: e.target.checked }))}
            className="mt-0.5 h-3.5 w-3.5 rounded"
            style={{ accentColor: '#34d399' }}
          />
          <div className="flex-1 min-w-0">
            <div
              className="text-xs font-medium"
              style={{ color: checked[g.id] ? '#34d399' : 'var(--muted-light)', textDecoration: checked[g.id] ? 'line-through' : 'none' }}
            >
              {g.label}
            </div>
            <div className="text-[11px] font-mono mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
              {g.note}
            </div>
          </div>
        </label>
      ))}

      {passed === GATES.length && (
        <div
          className="mt-4 rounded-xl p-4 text-center"
          style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid #34d39930' }}
        >
          <div className="text-sm font-bold mb-1" style={{ color: '#34d399' }}>✓ Ready to ship</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>All gates passed. Point the domain and go live.</div>
        </div>
      )}
    </div>
  )
}

// ── Root component ─────────────────────────────────────────────────────────────

export default function ShipReadyClient({ siteKey, siteName, siteUrl }: ShipReadyClientProps) {
  const [tab, setTab] = useState<'seo' | 'cso' | 'ceo' | 'gates'>('gates')
  const [frameUrl, setFrameUrl] = useState(siteUrl)
  const buildStudioUrl = `/build-studio?url=${encodeURIComponent(siteUrl)}`

  const TABS = [
    { id: 'gates' as const, label: 'Ship Gates', icon: CheckCircle, color: '#34d399' },
    { id: 'seo'   as const, label: 'SEO Audit',  icon: Search,       color: '#60a5fa' },
    { id: 'cso'   as const, label: 'Security',   icon: Shield,       color: '#a78bfa' },
    { id: 'ceo'   as const, label: 'CEO Review',  icon: Users,        color: '#f59e0b' },
  ]

  return (
    <div className="flex gap-4 flex-col md:flex-row" style={{ height: 'calc(100vh - 10rem)', minHeight: 0 }}>

      {/* ── Left: review panels ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:w-96 shrink-0" style={{ minHeight: 0 }}>

        {/* Tab bar */}
        <div className="flex gap-1 mb-4 border-b pb-2" style={{ borderColor: 'var(--border)', flexShrink: 0 }}>
          {TABS.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={tab === id
                ? { background: color + '18', color, border: `1px solid ${color}30` }
                : { color: 'var(--muted)', border: '1px solid transparent' }
              }
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)', minHeight: 0 }}>
          {tab === 'gates' && <GatesPanel siteKey={siteKey} />}
          {tab === 'seo'   && <SeoPanel url={siteUrl} />}
          {tab === 'cso'   && <CsoPanel />}
          {tab === 'ceo'   && <CeoPanel siteName={siteName} siteUrl={siteUrl} />}
        </div>

        {/* Launch to Build Studio */}
        <a
          href={buildStudioUrl}
          className="mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shrink-0"
          style={{ background: '#6366f1', color: 'white' }}
        >
          <Hammer size={14} />
          Open in Build Studio
          <ArrowRight size={13} />
        </a>
      </div>

      {/* ── Right: live site preview ────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)', minHeight: 0 }}>
        <div
          className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0"
          style={{ background: '#0f0f16', borderBottom: '1px solid var(--border)' }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#34d399' }} />
          <input
            value={frameUrl}
            onChange={e => setFrameUrl(e.target.value)}
            className="flex-1 text-xs rounded px-2 py-0.5 border min-w-0 font-mono"
            style={{ background: '#111', borderColor: '#222', color: '#ccc' }}
          />
          <a
            href={frameUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
            style={{ background: '#1e1e2e', color: '#818cf8', border: '1px solid #333', whiteSpace: 'nowrap' }}
          >
            <ExternalLink size={11} /> Open
          </a>
        </div>
        <iframe
          src={frameUrl}
          className="flex-1 w-full border-0"
          style={{ minHeight: 0, background: '#fff' }}
          title={`${siteName} preview`}
        />
      </div>
    </div>
  )
}

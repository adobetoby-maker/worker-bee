'use client'

import { useState } from 'react'
import { Eye, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface ScoreResult {
  scores: { typography: number; whitespace: number; color: number; motion: number; mobile: number }
  total: number
  worst_issue: string
  fix: string
  positives: string[]
  screenshots: string[]
  iteration: number
}

interface QAResult {
  url: string
  target: number
  passed: boolean
  final_score: number
  iterations: ScoreResult[]
}

const DIM_LABELS: Record<string, string> = {
  typography: 'Typography',
  whitespace: 'Whitespace',
  color: 'Color',
  motion: 'Motion',
  mobile: 'Mobile',
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 20) * 100
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-24 shrink-0" style={{ color: 'var(--muted)' }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono w-6 text-right" style={{ color }}>{score}</span>
    </div>
  )
}

export default function VisualQACard({ siteUrl }: { siteUrl: string }) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<QAResult | null>(null)
  const [error, setError] = useState('')
  const [activeShot, setActiveShot] = useState(0)

  async function runQA() {
    setStatus('running')
    setResult(null)
    setError('')
    try {
      const res = await fetch('/api/visual-qa', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: siteUrl, target: 85 }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data: QAResult = await res.json()
      setResult(data)
      setStatus('done')
    } catch (e) {
      setError((e as Error).message)
      setStatus('error')
    }
  }

  const latest = result?.iterations[result.iterations.length - 1]

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg,#c9a84c,#f2dc80)', flexShrink: 0 }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Visual QA</span>
        {result && (
          <span
            className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              background: result.passed ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
              color: result.passed ? '#10b981' : '#f59e0b',
            }}
          >
            {result.final_score}/100
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Idle state */}
        {status === 'idle' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Eye size={24} style={{ color: 'var(--muted)', opacity: 0.4 }} />
            <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
              Score typography, whitespace, color, motion, and mobile — against Apple.com quality.
            </p>
            <button
              onClick={runQA}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg,#c9a84c,#f2dc80)', color: '#000' }}
            >
              Run Visual QA
            </button>
          </div>
        )}

        {/* Running */}
        {status === 'running' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 size={22} className="animate-spin" style={{ color: '#c9a84c' }} />
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Screenshotting + scoring…</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs" style={{ color: '#ef4444' }}>
              <AlertCircle size={14} /> {error}
            </div>
            <button onClick={runQA} className="text-xs underline" style={{ color: 'var(--muted)' }}>Retry</button>
          </div>
        )}

        {/* Results */}
        {status === 'done' && latest && (
          <div className="flex flex-col gap-4">
            {/* Score breakdown */}
            <div className="flex flex-col gap-2">
              {Object.entries(latest.scores).map(([key, val]) => (
                <ScoreBar key={key} label={DIM_LABELS[key] ?? key} score={val} />
              ))}
            </div>

            {/* Worst issue + fix */}
            <div className="rounded-xl p-3 flex flex-col gap-1.5" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-xs font-semibold" style={{ color: '#ef4444' }}>Biggest gap</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-light)' }}>{latest.worst_issue}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Fix: {latest.fix}</p>
            </div>

            {/* Positives */}
            {latest.positives?.length > 0 && (
              <div className="flex flex-col gap-1">
                {latest.positives.map((p, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs" style={{ color: '#10b981' }}>
                    <CheckCircle size={11} className="mt-0.5 shrink-0" /> {p}
                  </div>
                ))}
              </div>
            )}

            {/* Screenshots */}
            {latest.screenshots?.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-1.5">
                  {latest.screenshots.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveShot(i)}
                      className="text-xs px-2 py-0.5 rounded-md transition-all"
                      style={{
                        background: activeShot === i ? '#c9a84c' : 'var(--border)',
                        color: activeShot === i ? '#000' : 'var(--muted)',
                      }}
                    >
                      {i === 0 ? 'Top' : `+${[500, 1000][i - 1]}px`}
                    </button>
                  ))}
                </div>
                <img
                  src={latest.screenshots[activeShot]}
                  alt={`Screenshot at position ${activeShot}`}
                  className="rounded-lg w-full"
                  style={{ border: '1px solid var(--border)' }}
                />
              </div>
            )}

            {/* Re-run */}
            <button
              onClick={runQA}
              className="text-xs underline self-start"
              style={{ color: 'var(--muted)' }}
            >
              Re-run
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

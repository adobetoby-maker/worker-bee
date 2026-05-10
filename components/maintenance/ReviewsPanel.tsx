'use client'

import { useState, useEffect, useCallback } from 'react'
import { GitPullRequest, CheckCircle2, RotateCcw, Loader2, RefreshCw, ExternalLink, Clock, ChevronDown } from 'lucide-react'

interface PR {
  id: string
  prNumber: number
  title: string
  url: string
  branch: string
  sha: string
  repo: string
  siteId: string
  siteName: string
  siteUrl: string | null
  author: string
  createdAt: string
  body: string | null
}

export function ReviewsPanel() {
  const [prs, setPrs] = useState<PR[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [clientEmail, setClientEmail] = useState<Record<string, string>>({})
  const [acting, setActing] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, { ok: boolean; action: 'merged' | 'rolled_back'; error?: string }>>({})

  const fetchPRs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/maintenance/reviews')
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? `GitHub API error ${res.status}`)
        return
      }
      const d = await res.json() as { prs: PR[] }
      setPrs(d.prs ?? [])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPRs() }, [fetchPRs])

  async function mergePR(pr: PR) {
    setActing(pr.id)
    try {
      const res = await fetch('/api/maintenance/reviews/merge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          repo: pr.repo,
          prNumber: pr.prNumber,
          siteName: pr.siteName,
          siteUrl: pr.siteUrl ?? '',
          prTitle: pr.title,
          clientEmail: clientEmail[pr.id] ?? '',
        }),
      })
      const d = await res.json() as { ok: boolean; sha?: string; error?: string }
      setResults(prev => ({ ...prev, [pr.id]: { ok: d.ok, action: 'merged', error: d.error } }))
      if (d.ok) setPrs(prev => prev.filter(p => p.id !== pr.id))
    } finally {
      setActing(null)
    }
  }

  async function rollbackPR(pr: PR) {
    if (!confirm(`Roll back "${pr.title}"? A revert PR will be opened for review.`)) return
    setActing(pr.id)
    try {
      const res = await fetch('/api/maintenance/reviews/rollback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          repo: pr.repo,
          siteId: pr.siteId,
          siteName: pr.siteName,
          siteUrl: pr.siteUrl ?? '',
          sha: pr.sha,
          prTitle: pr.title,
          clientEmail: clientEmail[pr.id] ?? '',
        }),
      })
      const d = await res.json() as { ok: boolean; error?: string }
      setResults(prev => ({ ...prev, [pr.id]: { ok: d.ok, action: 'rolled_back', error: d.error } }))
    } finally {
      setActing(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2 text-sm">
        <Loader2 size={14} className="animate-spin" /> Fetching open PRs…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <p className="text-sm font-semibold text-red-400 mb-1">{error.includes('GITHUB_TOKEN') ? 'GitHub not configured' : 'GitHub error'}</p>
        <p className="text-xs text-slate-500">{error.includes('GITHUB_TOKEN') ? 'Add GITHUB_TOKEN to Vercel env vars.' : error}</p>
        <button onClick={fetchPRs} className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mx-auto transition-colors">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    )
  }

  if (!prs.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle2 size={36} className="text-slate-700 mb-4" />
        <p className="text-sm font-semibold text-slate-500">No open maintenance PRs</p>
        <p className="text-xs text-slate-600 mt-1">Branches from maintenance/, fix/, and build/ dispatches appear here.</p>
        <button onClick={fetchPRs} className="mt-4 flex items-center gap-1.5 text-xs text-slate-600 hover:text-white transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500">{prs.length} open PR{prs.length > 1 ? 's' : ''} awaiting review</p>
        <button onClick={fetchPRs} className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors">
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      <div className="space-y-2">
        {prs.map(pr => {
          const result = results[pr.id]
          const isExpanded = expanded === pr.id

          return (
            <div key={pr.id} className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              {/* PR row */}
              <button
                onClick={() => setExpanded(isExpanded ? null : pr.id)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
              >
                <GitPullRequest size={14} className="text-indigo-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{pr.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {pr.siteName} · {pr.branch} · #{pr.prNumber}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock size={10} />{new Date(pr.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <a href={pr.url} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-slate-600 hover:text-indigo-400 transition-colors">
                    <ExternalLink size={12} />
                  </a>
                  <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Expanded: review actions */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
                  {result ? (
                    <div className={`rounded-lg px-3 py-2 text-xs ${result.ok
                      ? 'text-emerald-400 border border-emerald-900 bg-emerald-950/40'
                      : 'text-red-400 border border-red-900 bg-red-950/40'}`}>
                      {result.ok
                        ? result.action === 'merged'
                          ? '✓ Merged and deployed. Team and client notified.'
                          : '✓ Rollback PR dispatched. Team and client notified.'
                        : `Error: ${result.error}`}
                    </div>
                  ) : (
                    <>
                      {pr.body && (
                        <div className="rounded-lg px-3 py-2 text-xs text-slate-400 leading-relaxed"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                          {pr.body.slice(0, 300)}{pr.body.length > 300 ? '…' : ''}
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Client email <span className="font-normal text-slate-600 normal-case">(for merge/rollback notification)</span>
                        </label>
                        <input
                          type="email"
                          value={clientEmail[pr.id] ?? ''}
                          onChange={e => setClientEmail(prev => ({ ...prev, [pr.id]: e.target.value }))}
                          placeholder="client@example.com"
                          className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => mergePR(pr)}
                          disabled={acting === pr.id}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                          style={{
                            background: acting === pr.id ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg,#10b981,#059669)',
                            color: acting === pr.id ? '#34d399' : 'white',
                          }}
                        >
                          {acting === pr.id
                            ? <><Loader2 size={12} className="animate-spin" /> Merging…</>
                            : <><CheckCircle2 size={12} /> Approve &amp; Merge</>}
                        </button>
                        <button
                          onClick={() => rollbackPR(pr)}
                          disabled={acting === pr.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                          <RotateCcw size={12} /> Rollback
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

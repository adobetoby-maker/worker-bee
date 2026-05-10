'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Zap, Loader2, RefreshCw, ExternalLink, CheckCircle2, ChevronDown } from 'lucide-react'

interface Site {
  id: string
  name: string
  url: string | null
  github_repo: string | null
}

interface SentryIssue {
  id: string
  title: string
  culprit: string
  level: string
  status: string
  count: string
  userCount: number
  lastSeen: string
  firstSeen: string
  permalink: string
  project: { slug: string; name: string }
}

interface FixResult {
  issueId: string
  ok: boolean
  error?: string
}

interface Props {
  sites: Site[]
}

export function SentryPanel({ sites }: Props) {
  const [issues, setIssues] = useState<SentryIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fixingId, setFixingId] = useState<string | null>(null)
  const [fixResults, setFixResults] = useState<Record<string, FixResult>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [clientEmail, setClientEmail] = useState<Record<string, string>>({})
  const [selectedSiteId, setSelectedSiteId] = useState<Record<string, string>>({})

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/maintenance/sentry')
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? `Sentry API error ${res.status}`)
        return
      }
      const d = await res.json() as { issues: SentryIssue[] }
      setIssues(d.issues ?? [])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchIssues() }, [fetchIssues])

  async function triggerFix(issue: SentryIssue) {
    const siteId = selectedSiteId[issue.id]
    const site = sites.find(s => s.id === siteId)
    if (!site?.github_repo) return

    setFixingId(issue.id)
    try {
      // Fetch CLAUDE.md from repo
      const [owner, repo] = site.github_repo.split('/')
      let claudeMd = ''
      try {
        const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/CLAUDE.md`,
          { headers: { Accept: 'application/vnd.github.v3.raw' } })
        if (ghRes.ok) claudeMd = await ghRes.text()
      } catch {}

      const res = await fetch('/api/maintenance/sentry-fix', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          siteId: site.id,
          siteName: site.name,
          githubRepo: site.github_repo,
          siteUrl: site.url ?? '',
          issueId: issue.id,
          issueTitle: issue.title,
          issueUrl: issue.permalink,
          stackTrace: `Level: ${issue.level}\nCulprit: ${issue.culprit}\nOccurrences: ${issue.count}`,
          claudeMd,
          clientEmail: clientEmail[issue.id] ?? '',
        }),
      })
      const d = await res.json() as { ok: boolean; error?: string }
      setFixResults(prev => ({ ...prev, [issue.id]: { issueId: issue.id, ...d } }))
    } finally {
      setFixingId(null)
    }
  }

  const levelColor: Record<string, string> = {
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    debug: '#6b7280',
    fatal: '#dc2626',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2 text-sm">
        <Loader2 size={14} className="animate-spin" /> Fetching Sentry issues…
      </div>
    )
  }

  if (error) {
    const isConfig = error.includes('SENTRY_AUTH_TOKEN')
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <AlertTriangle size={28} className="text-red-400 mx-auto mb-3" />
        <p className="text-sm font-semibold text-red-400 mb-1">{isConfig ? 'Sentry not configured' : 'Sentry error'}</p>
        <p className="text-xs text-slate-500">{isConfig ? 'Add SENTRY_AUTH_TOKEN and SENTRY_ORG to Vercel env vars.' : error}</p>
        <button onClick={fetchIssues} className="mt-4 flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mx-auto transition-colors">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    )
  }

  if (!issues.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle2 size={36} className="text-emerald-700 mb-4" />
        <p className="text-sm font-semibold text-slate-500">No unresolved Sentry issues</p>
        <button onClick={fetchIssues} className="mt-4 flex items-center gap-1.5 text-xs text-slate-600 hover:text-white transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500">{issues.length} unresolved issue{issues.length > 1 ? 's' : ''}</p>
        <button onClick={fetchIssues} className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors">
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      <div className="space-y-2">
        {issues.map(issue => {
          const result = fixResults[issue.id]
          const isExpanded = expanded === issue.id

          return (
            <div key={issue.id} className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              {/* Issue row */}
              <button
                onClick={() => setExpanded(isExpanded ? null : issue.id)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: levelColor[issue.level] ?? '#6b7280' }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{issue.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">{issue.culprit} · {issue.project.name}</div>
                </div>
                <div className="shrink-0 flex items-center gap-3 text-xs text-slate-500">
                  <span>{Number(issue.count).toLocaleString()} events</span>
                  <span>{new Date(issue.lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <a href={issue.permalink} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-slate-600 hover:text-indigo-400 transition-colors">
                    <ExternalLink size={12} />
                  </a>
                  <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Expanded: auto-fix form */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
                  {result ? (
                    <div className={`rounded-lg px-3 py-2 text-xs ${result.ok
                      ? 'text-emerald-400 border border-emerald-900 bg-emerald-950/40'
                      : 'text-red-400 border border-red-900 bg-red-950/40'}`}>
                      {result.ok
                        ? '✓ Auto-fix dispatched — a PR will be opened shortly. Team and client notified.'
                        : `Error: ${result.error}`}
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Map to site
                        </label>
                        <select
                          value={selectedSiteId[issue.id] ?? ''}
                          onChange={e => setSelectedSiteId(prev => ({ ...prev, [issue.id]: e.target.value }))}
                          className="w-full appearance-none rounded-lg px-3 py-2 text-sm text-white"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
                        >
                          <option value="">Select site…</option>
                          {sites.filter(s => s.github_repo).map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Client email <span className="font-normal text-slate-600 normal-case">(optional — for notification)</span>
                        </label>
                        <input
                          type="email"
                          value={clientEmail[issue.id] ?? ''}
                          onChange={e => setClientEmail(prev => ({ ...prev, [issue.id]: e.target.value }))}
                          placeholder="client@example.com"
                          className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}
                        />
                      </div>
                      <button
                        onClick={() => triggerFix(issue)}
                        disabled={fixingId === issue.id || !selectedSiteId[issue.id]}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                        style={{
                          background: fixingId === issue.id || !selectedSiteId[issue.id]
                            ? 'rgba(239,68,68,0.1)'
                            : 'linear-gradient(135deg,#dc2626,#b91c1c)',
                          color: fixingId === issue.id || !selectedSiteId[issue.id] ? '#6b7280' : 'white',
                          cursor: !selectedSiteId[issue.id] ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {fixingId === issue.id
                          ? <><Loader2 size={12} className="animate-spin" /> Dispatching fix…</>
                          : <><Zap size={12} /> Auto-Fix &amp; Notify</>
                        }
                      </button>
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

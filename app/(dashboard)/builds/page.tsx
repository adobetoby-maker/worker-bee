'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { BuildJob } from '@/app/api/build-trigger/route'

const STATUS_COLOR: Record<BuildJob['status'], string> = {
  queued: '#f59e0b',
  building: '#6366f1',
  iterating: '#818cf8',
  deploying: '#a78bfa',
  done: '#34d399',
  error: '#f87171',
}

const PHASE_LABELS = ['research', 'scaffold', 'visual-loop', 'deploy'] as const

function ScorePill({ score }: { score: number }) {
  const color = score >= 85 ? '#34d399' : score >= 70 ? '#f59e0b' : '#f87171'
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${color}22`, color }}>
      {score}/100
    </span>
  )
}

function JobRow({ job, onRefresh }: { job: BuildJob; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
      {/* Summary row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: STATUS_COLOR[job.status] }} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{job.submissionId}</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Job {job.jobId} · {new Date(job.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {job.currentScore > 0 && <ScorePill score={job.currentScore} />}
          <span className="text-xs px-2 py-0.5 rounded-full font-bold capitalize"
            style={{ background: `${STATUS_COLOR[job.status]}22`, color: STATUS_COLOR[job.status] }}>
            {job.status}
          </span>
          {job.status !== 'done' && job.status !== 'error' && (
            <button
              onClick={e => { e.stopPropagation(); onRefresh() }}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
            >
              Refresh
            </button>
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {/* Phase pipeline */}
          <div className="flex gap-2 mt-4 mb-4">
            {PHASE_LABELS.map(ph => {
              const status = job.phases?.[ph] ?? 'pending'
              return (
                <div key={ph} className="flex-1 text-center">
                  <div className="h-1.5 rounded-full mb-1.5"
                    style={{
                      background: status === 'done' ? '#34d399'
                        : status === 'running' ? '#6366f1'
                        : status === 'error' ? '#f87171'
                        : 'rgba(255,255,255,0.1)',
                    }} />
                  <p className="text-xs capitalize" style={{ color: 'rgba(255,255,255,0.35)' }}>{ph}</p>
                </div>
              )
            })}
          </div>

          {/* Scores */}
          {job.scores.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Quality iterations ({job.scores.length}/{job.maxIterations})
              </p>
              <div className="flex gap-2 flex-wrap">
                {job.scores.map((s, i) => (
                  <div key={i} className="text-center">
                    <ScorePill score={s.total} />
                    <p className="text-xs mt-1 max-w-[120px] truncate" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {s.worst}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deploy URL */}
          {job.deployUrl && (
            <a
              href={job.deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold mb-4"
              style={{ color: '#34d399' }}
            >
              {job.deployUrl} →
            </a>
          )}

          {/* Log tail */}
          {job.log.length > 0 && (
            <div className="rounded-lg p-3" style={{ background: 'rgba(0,0,0,0.4)', fontFamily: 'monospace' }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Build log (last 5)</p>
              {job.log.slice(-5).map((line, i) => (
                <p key={i} className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{line}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function BuildsPage() {
  const [jobs, setJobs] = useState<BuildJob[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all')

  const fetchJobs = useCallback(async () => {
    try {
      // List all jobs from build-logs/jobs/ in Supabase Storage via our API
      const res = await fetch('/api/build-status/list')
      if (!res.ok) return
      const data = await res.json()
      setJobs(data.jobs ?? [])
    } catch { /* non-fatal */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
    const t = setInterval(fetchJobs, 8000)
    return () => clearInterval(t)
  }, [fetchJobs])

  const filtered = jobs.filter(j => {
    if (filter === 'active') return j.status !== 'done' && j.status !== 'error'
    if (filter === 'done') return j.status === 'done'
    return true
  })

  const activeCount = jobs.filter(j => j.status !== 'done' && j.status !== 'error').length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Build Jobs</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {activeCount > 0 ? `${activeCount} active` : 'No active builds'} · auto-refreshes every 8s
          </p>
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'done'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold capitalize transition-colors"
              style={{
                background: filter === f ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                color: filter === f ? 'white' : 'rgba(255,255,255,0.4)',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline overview */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {(['research', 'scaffold', 'visual-loop', 'deploy'] as const).map(ph => {
          const count = jobs.filter(j => j.phases?.[ph] === 'running').length
          return (
            <div key={ph} className="rounded-xl border p-4 text-center"
              style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-xs mt-1 capitalize" style={{ color: 'rgba(255,255,255,0.35)' }}>{ph}</p>
            </div>
          )
        })}
      </div>

      {/* Pipeline docs link */}
      <div className="mb-6 p-4 rounded-xl border flex items-center gap-4"
        style={{ borderColor: 'rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.05)' }}>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Pipeline Knowledge Files</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Per-phase guides live in <code className="text-purple-400">manage-worker-bee/pipeline/</code>
          </p>
        </div>
        <Link href="/submissions"
          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
          style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
          Submissions →
        </Link>
      </div>

      {/* Job list */}
      {loading ? (
        <p className="text-sm text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🐝</p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {filter === 'active' ? 'No active builds' : 'No build jobs yet'}
          </p>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Submit a plan at /plan and click &quot;Launch Build&quot;
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => (
            <JobRow key={job.jobId} job={job} onRefresh={fetchJobs} />
          ))}
        </div>
      )}
    </div>
  )
}

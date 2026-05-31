'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Globe, ExternalLink, GitBranch, CheckCircle2, PauseCircle, AlertCircle,
  ChevronDown, ChevronRight, Zap, Clock, AlertTriangle, ShieldCheck, TrendingUp,
} from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

interface WbRun {
  site_id: string
  run_at: string
  seo_score: number | null
  cso_score: number | null
  changes: string[]
  recommendations: string[]
  phases: Record<string, boolean | string>
  status: string
  summary: string | null
}

interface Site {
  id: string
  name: string
  url: string
  stack: string
  status: string
  github_repo: string | null
  vercel_project_id: string | null
  created_at: string
  lastRun: WbRun | null
}

const STACK_LABELS: Record<string, string> = {
  nextjs: 'Next.js', wordpress: 'WordPress', react: 'React', static: 'Static', other: 'Other',
}

const STATUS_ICON: Record<string, LucideIcon> = {
  active: CheckCircle2, paused: PauseCircle, issue: AlertCircle,
}
const STATUS_COLOR: Record<string, string> = {
  active: 'text-emerald-400', paused: 'text-slate-500', issue: 'text-red-400',
}
const STATUS_BORDER: Record<string, string> = {
  active: 'rgba(52,211,153,0.65)', paused: 'rgba(100,116,139,0.35)', issue: 'rgba(248,113,113,0.65)',
}

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  if (d < 86400 * 30) return `${Math.floor(d / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-slate-500'
  if (score >= 80) return 'text-emerald-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-red-400'
}

function WbRunBadge({ run, onClick }: { run: WbRun | null; onClick: () => void }) {
  if (!run) {
    return (
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); onClick() }}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide transition-all hover:opacity-90"
        style={{ background: 'rgba(251,146,60,0.12)', color: 'rgb(251,146,60)', border: '1px solid rgba(251,146,60,0.25)' }}
        title="Never run through WB pipeline"
      >
        <AlertTriangle size={10} />
        Never run
      </button>
    )
  }

  const daysAgo = (Date.now() - new Date(run.run_at).getTime()) / 86400000
  const accent = daysAgo < 7 ? 'rgba(52,211,153' : daysAgo < 30 ? 'rgba(251,191,36' : 'rgba(148,163,184'

  return (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); onClick() }}
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide transition-all hover:opacity-90"
      style={{ background: `${accent},0.10)`, color: `${accent},1)`, border: `1px solid ${accent},0.25)` }}
      title={`Last WB run: ${new Date(run.run_at).toLocaleString()}`}
    >
      <Zap size={10} />
      {timeAgo(run.run_at)}
    </button>
  )
}

function RunDrawer({ run, onClose }: { run: WbRun | null; onClose: () => void }) {
  if (!run) {
    return (
      <div className="mt-3 rounded-xl border px-5 py-4 space-y-2"
        style={{ background: 'rgba(251,146,60,0.04)', borderColor: 'rgba(251,146,60,0.2)' }}>
        <p className="text-sm font-semibold text-amber-400 flex items-center gap-2">
          <AlertTriangle size={14} /> WB Pipeline — Never Run
        </p>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Run <span className="font-mono text-white">push to worker bee</span> in this project to generate SEO analysis, security audit, monetization map, blueprint, and vault entries.
        </p>
        <div className="flex gap-2 flex-wrap pt-1">
          {['SEO audit', 'CSO security check', 'Monetization & affiliates', 'Blueprint cork board', 'Vault population'].map(p => (
            <span key={p} className="text-[10px] rounded-full px-2 py-0.5 border"
              style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
              {p}
            </span>
          ))}
        </div>
      </div>
    )
  }

  const phaseList = Object.entries(run.phases ?? {})

  return (
    <div className="mt-3 rounded-xl border px-5 py-4 space-y-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
            <Clock size={10} className="inline mr-1" />
            {new Date(run.run_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
          {run.seo_score !== null && (
            <span className={`text-[11px] font-mono ${scoreColor(run.seo_score)}`}>
              SEO {run.seo_score}/100
            </span>
          )}
          {run.cso_score !== null && (
            <span className={`text-[11px] font-mono ${scoreColor(run.cso_score)}`}>
              <ShieldCheck size={10} className="inline mr-0.5" />CSO {run.cso_score}/100
            </span>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {phaseList.map(([phase, done]) => (
            <span key={phase}
              className="text-[10px] rounded-full px-2 py-0.5 border capitalize"
              style={{
                color: done ? 'rgb(52,211,153)' : 'var(--muted)',
                borderColor: done ? 'rgba(52,211,153,0.3)' : 'var(--border)',
                background: done ? 'rgba(52,211,153,0.06)' : 'transparent',
              }}>
              {done ? '✓' : '○'} {phase}
            </span>
          ))}
        </div>
      </div>

      {/* Summary */}
      {run.summary && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-light)' }}>{run.summary}</p>
      )}

      {/* Changes */}
      {(run.changes ?? []).length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-white mb-2 flex items-center gap-1.5">
            <TrendingUp size={11} /> What changed
          </p>
          <ul className="space-y-1">
            {run.changes.map((c, i) => (
              <li key={i} className="text-xs flex gap-2" style={{ color: 'var(--muted-light)' }}>
                <span className="text-emerald-400 shrink-0">+</span>{c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {(run.recommendations ?? []).length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
            <AlertTriangle size={11} /> Residual recommendations
          </p>
          <ul className="space-y-1">
            {run.recommendations.map((r, i) => (
              <li key={i} className="text-xs flex gap-2" style={{ color: 'var(--muted)' }}>
                <span className="text-amber-400 shrink-0">→</span>{r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function SiteList({ sites }: { sites: Site[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (sites.length === 0) {
    return (
      <div className="text-center py-20 rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <Globe size={36} className="mx-auto mb-3 text-slate-600" />
        <p className="text-sm mb-3" style={{ color: 'var(--muted-light)' }}>No sites yet.</p>
        <Link href="/sites/new" className="text-indigo-400 hover:text-indigo-300 text-sm underline">Add your first site</Link>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sites.map(s => {
        const StatusIcon = STATUS_ICON[s.status] ?? Globe
        const statusColor = STATUS_COLOR[s.status] ?? 'text-slate-400'
        const borderAccent = STATUS_BORDER[s.status] ?? 'transparent'
        const isExpanded = expandedId === s.id

        return (
          <div key={s.id}>
            <div className="flex items-center gap-4 rounded-xl border px-5 py-4 transition-all hover:border-white/[0.13]"
              style={{
                background: 'var(--surface)',
                borderColor: isExpanded ? 'rgba(99,102,241,0.4)' : 'var(--border)',
                boxShadow: `inset 3px 0 0 0 ${borderAccent}`,
                borderBottomLeftRadius: isExpanded ? 0 : undefined,
                borderBottomRightRadius: isExpanded ? 0 : undefined,
              }}>
              <StatusIcon size={15} className={`shrink-0 ${statusColor}`} />

              {/* Name + metadata */}
              <Link href={`/sites/${s.id}`} className="flex-1 min-w-0 no-underline group">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white text-sm group-hover:text-indigo-300 transition-colors">{s.name}</span>
                  <span className="text-[10px] border px-1.5 py-0.5 rounded-full"
                    style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
                    {STACK_LABELS[s.stack] ?? s.stack}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--muted)' }}>
                  {s.url && (
                    <a href={s.url.startsWith('http') ? s.url : `https://${s.url}`} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 transition-colors hover:text-indigo-400">
                      <ExternalLink size={10} />{s.url.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  {s.github_repo && (
                    <span className="flex items-center gap-1">
                      <GitBranch size={10} />{s.github_repo}
                    </span>
                  )}
                </div>
              </Link>

              {/* WB pipeline badge */}
              <WbRunBadge run={s.lastRun} onClick={() => setExpandedId(isExpanded ? null : s.id)} />

              {/* Date */}
              <span className="shrink-0 text-[10px] tabular-nums hidden sm:block" style={{ color: 'var(--muted)' }}>
                {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>

              {/* Expand toggle */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                className="shrink-0 p-0.5 rounded transition-colors hover:bg-white/[0.06]"
                style={{ color: 'var(--muted)' }}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>

            {/* Run drawer */}
            {isExpanded && (
              <div className="rounded-b-xl border border-t-0 px-5 pb-4"
                style={{ background: 'rgba(15,18,28,0.8)', borderColor: 'rgba(99,102,241,0.4)' }}>
                <RunDrawer run={s.lastRun} onClose={() => setExpandedId(null)} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

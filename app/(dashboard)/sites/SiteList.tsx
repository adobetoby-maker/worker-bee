'use client'
import Link from 'next/link'
import { Globe, ExternalLink, GitBranch, CheckCircle2, PauseCircle, AlertCircle } from 'lucide-react'

interface Site {
  id: string
  name: string
  url: string
  stack: string
  status: string
  github_repo: string | null
  vercel_project_id: string | null  // repurposed: stores stable .vercel.app URL
}

const STACK_LABELS: Record<string, string> = {
  nextjs: 'Next.js', wordpress: 'WordPress', react: 'React', static: 'Static', other: 'Other',
}

const STATUS_ICON: Record<string, React.ElementType> = {
  active: CheckCircle2, paused: PauseCircle, issue: AlertCircle,
}

const STATUS_COLOR: Record<string, string> = {
  active: 'text-emerald-400', paused: 'text-slate-500', issue: 'text-red-400',
}

const STATUS_BORDER: Record<string, string> = {
  active: 'rgba(52,211,153,0.65)', paused: 'rgba(100,116,139,0.35)', issue: 'rgba(248,113,113,0.65)',
}

export function SiteList({ sites }: { sites: Site[] }) {
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
        return (
          <Link key={s.id} href={`/sites/${s.id}`} className="no-underline group">
            <div className="flex items-center gap-4 rounded-xl border px-5 py-4 transition-all group-hover:border-white/[0.13]"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                boxShadow: `inset 3px 0 0 0 ${borderAccent}`,
              }}>
              <StatusIcon size={15} className={`shrink-0 ${statusColor}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-white text-sm">{s.name}</span>
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
                  {s.vercel_project_id?.includes('.vercel.app') && (
                    <a href={`https://${s.vercel_project_id}`} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 transition-colors hover:text-indigo-400 opacity-60">
                      <ExternalLink size={10} />{s.vercel_project_id}
                    </a>
                  )}
                </div>
              </div>
              {/* Hover chevron */}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
                className="shrink-0 opacity-0 group-hover:opacity-30 transition-opacity -translate-x-1 group-hover:translate-x-0 transition-transform">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

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
        return (
          <Link key={s.id} href={`/sites/${s.id}`} className="no-underline group">
            <div className="flex items-center gap-4 rounded-xl border px-5 py-4 transition-colors group-hover:border-white/14"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <StatusIcon size={16} className={`shrink-0 ${statusColor}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-white text-sm">{s.name}</span>
                  <span className="text-[11px] border px-1.5 py-0.5 rounded-full" style={{ color: 'var(--muted-light)', borderColor: 'var(--border)' }}>
                    {STACK_LABELS[s.stack] ?? s.stack}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
                  <a href={s.url.startsWith('http') ? s.url : `https://${s.url}`} target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="hover:text-indigo-400 flex items-center gap-1 transition-colors">
                    <ExternalLink size={11} />{s.url.replace(/^https?:\/\//, '')}
                  </a>
                  {s.github_repo && (
                    <span className="flex items-center gap-1">
                      <GitBranch size={11} />{s.github_repo}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

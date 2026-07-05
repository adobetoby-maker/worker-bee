'use client'
// Built by ATLAS — 2026-07-05
// Client-side filter/search table for the Portfolio registry.

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Search, X } from 'lucide-react'
import { KIND_COLORS, LIFECYCLE_COLORS, qaStateStyle, relTime, type Property, type QaRow } from '@/lib/atlas-console'

const KINDS = ['client-site', 'demo', 'saas', 'white-label-instance', 'content', 'internal', 'pro-bono']
const LIFECYCLES = ['active', 'prospect-demo', 'maintenance', 'retired', 'local-only']

// Default sort: active first, then by name
const LIFECYCLE_RANK: Record<string, number> = {
  active: 0, maintenance: 1, 'prospect-demo': 2, retired: 3, 'local-only': 4,
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
      {label}
    </span>
  )
}

function Chip({ label, color, active, onClick }: { label: string; color: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="cursor-pointer px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap"
      style={{
        background: active ? `${color}22` : 'var(--surface)',
        color: active ? color : 'var(--muted-light)',
        border: `1px solid ${active ? `${color}55` : 'var(--border)'}`,
      }}>
      {label}
    </button>
  )
}

export default function PortfolioTable({
  properties, qaBySlug, initialKind, initialLifecycle,
}: {
  properties: Property[]
  qaBySlug: Record<string, QaRow>
  initialKind: string | null
  initialLifecycle: string | null
}) {
  const router = useRouter()
  const [kind, setKind] = useState<string | null>(initialKind)
  const [lifecycle, setLifecycle] = useState<string | null>(initialLifecycle)
  const [query, setQuery] = useState('')

  function syncUrl(nextKind: string | null, nextLifecycle: string | null) {
    const p = new URLSearchParams()
    if (nextKind) p.set('kind', nextKind)
    if (nextLifecycle) p.set('lifecycle', nextLifecycle)
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `/portfolio?${qs}` : '/portfolio')
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return properties
      .filter(p => {
        if (kind && p.kind !== kind) return false
        if (lifecycle) {
          if (p.lifecycle !== lifecycle) return false
        } else if (p.lifecycle === 'local-only') {
          return false // default view hides local-only
        }
        if (q) {
          const hay = [p.name, p.slug, p.client, p.host, p.live_url, p.stack, p.notes].filter(Boolean).join(' ').toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        const ra = LIFECYCLE_RANK[a.lifecycle ?? ''] ?? 9
        const rb = LIFECYCLE_RANK[b.lifecycle ?? ''] ?? 9
        if (ra !== rb) return ra - rb
        return (a.name ?? a.slug).localeCompare(b.name ?? b.slug)
      })
  }, [properties, kind, lifecycle, query])

  return (
    <div>
      {/* Filter chips + search */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest mr-1" style={{ color: 'var(--muted)' }}>Kind</span>
          {KINDS.map(k => (
            <Chip key={k} label={k} color={KIND_COLORS[k] ?? '#64748b'} active={kind === k}
              onClick={() => { const v = kind === k ? null : k; setKind(v); syncUrl(v, lifecycle) }} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-widest mr-1" style={{ color: 'var(--muted)' }}>Stage</span>
          {LIFECYCLES.map(l => (
            <Chip key={l} label={l} color={LIFECYCLE_COLORS[l] ?? '#64748b'} active={lifecycle === l}
              onClick={() => { const v = lifecycle === l ? null : l; setLifecycle(v); syncUrl(kind, v) }} />
          ))}
        </div>
        <div className="relative max-w-xs mt-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name, client, host, url…"
            className="w-full rounded-lg pl-8 pr-8 py-2 text-xs text-white outline-none transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ color: 'var(--muted)' }}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="text-[11px] mb-2" style={{ color: 'var(--muted)' }}>
        {rows.length} shown{!lifecycle ? ' · local-only hidden (select the chip to view)' : ''}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="card rounded-xl px-4 py-8 text-center text-xs" style={{ color: 'var(--muted)' }}>
          No properties match the current filters.
        </div>
      ) : (
        <div className="card rounded-xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left" style={{ color: 'var(--muted)' }}>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]">Name</th>
                <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-[10px]">Kind</th>
                <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-[10px]">Stage</th>
                <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-[10px]">Host</th>
                <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-[10px]">Live</th>
                <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-[10px]">QA</th>
                <th className="px-3 py-2.5 font-semibold uppercase tracking-wider text-[10px] text-right">MRR/mo</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]">Repo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(p => {
                const qa = p.qa_slug ? qaBySlug[p.qa_slug] : undefined
                const qs = qa ? qaStateStyle(qa.state) : null
                return (
                  <tr key={p.slug}
                    onClick={() => router.push(`/portfolio/${p.slug}`)}
                    className="border-t cursor-pointer transition-colors hover:bg-white/5"
                    style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-white whitespace-nowrap">{p.name ?? p.slug}</div>
                      {p.client && <div className="text-[10px]" style={{ color: 'var(--muted)' }}>{p.client}</div>}
                    </td>
                    <td className="px-3 py-2.5"><Badge label={p.kind ?? '—'} color={KIND_COLORS[p.kind ?? ''] ?? '#64748b'} /></td>
                    <td className="px-3 py-2.5"><Badge label={p.lifecycle ?? '—'} color={LIFECYCLE_COLORS[p.lifecycle ?? ''] ?? '#64748b'} /></td>
                    <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'var(--muted-light)' }}>{p.host ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      {p.live_url ? (
                        <a href={p.live_url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 hover:text-indigo-300 transition-colors"
                          style={{ color: '#818cf8' }}>
                          <ExternalLink size={10} />
                          <span className="max-w-[160px] truncate inline-block align-bottom">
                            {p.live_url.replace(/^https?:\/\//, '')}
                          </span>
                        </a>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {qa && qs ? (
                        <span className="inline-flex items-center gap-1.5" title={`${qa.state} · ${relTime(qa.synced_at)}`}>
                          <span className="w-2 h-2 rounded-full inline-block"
                            style={qs.solid ? { background: qs.color } : { background: 'transparent', border: `1.5px solid ${qs.color}` }} />
                          <span className="text-[10px] uppercase" style={{ color: 'var(--muted-light)' }}>{qa.state}</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap"
                      style={{ color: (p.mrr_cents ?? 0) > 0 ? '#34d399' : 'var(--muted)' }}>
                      {(p.mrr_cents ?? 0) > 0 ? `$${((p.mrr_cents ?? 0) / 100).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px] max-w-[180px] truncate" style={{ color: 'var(--muted)' }}>
                      {p.repo_path ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

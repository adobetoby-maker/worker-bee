// Built by ATLAS — 2026-07-05
// PORTFOLIO — the unified property registry. PRD-atlas-platform §4.2/§4.3.
export const dynamic = 'force-dynamic'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase'
import type { Property, QaRow } from '@/lib/atlas-console'
import { KIND_COLORS, LIFECYCLE_COLORS } from '@/lib/atlas-console'
import { LayoutGrid } from 'lucide-react'
import PortfolioTable from './PortfolioTable'

export const metadata = { title: 'Portfolio — Worker-Bee' }

const db = supabaseAdmin as any

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; lifecycle?: string }>
}) {
  const params = await searchParams
  const [propsRes, qaRes] = await Promise.all([
    db.from('properties').select('*').order('name'),
    db.from('atlas_qa').select('slug, url, state, latest, runs, synced_at'),
  ])

  const properties = (propsRes.data ?? []) as Property[]
  const qa = (qaRes.data ?? []) as QaRow[]
  const qaBySlug: Record<string, QaRow> = Object.fromEntries(qa.map(q => [q.slug, q]))

  // Summary counts
  const kindCounts: Record<string, number> = {}
  const lifecycleCounts: Record<string, number> = {}
  for (const p of properties) {
    if (p.kind) kindCounts[p.kind] = (kindCounts[p.kind] ?? 0) + 1
    if (p.lifecycle) lifecycleCounts[p.lifecycle] = (lifecycleCounts[p.lifecycle] ?? 0) + 1
  }
  const totalMrrCents = properties.reduce((s, p) => s + (p.mrr_cents ?? 0), 0)

  return (
    <div className="max-w-6xl animate-fade-in pb-16">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <LayoutGrid size={18} style={{ color: '#818cf8' }} />
          <h1 className="text-2xl font-bold text-white">Portfolio</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
          {properties.length} properties · unified build registry
        </p>
      </div>

      {/* Summary stat strip — non-interactive, deliberately quieter than the filter chips below */}
      {properties.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-6 text-[11px]" style={{ color: 'var(--muted)' }}>
          {Object.entries(kindCounts).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
            <span key={k} className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: KIND_COLORS[k] ?? '#64748b' }} />
              <span className="font-semibold tabular-nums" style={{ color: 'var(--muted-light)' }}>{n}</span> {k}
            </span>
          ))}
          <span className="hidden sm:inline w-px h-3" style={{ background: 'var(--border-hover)' }} />
          {Object.entries(lifecycleCounts).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
            <span key={k} className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: LIFECYCLE_COLORS[k] ?? '#64748b' }} />
              <span className="font-semibold tabular-nums" style={{ color: 'var(--muted-light)' }}>{n}</span> {k}
            </span>
          ))}
          {totalMrrCents > 0 && (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="font-semibold tabular-nums" style={{ color: '#34d399' }}>
                ${(totalMrrCents / 100).toLocaleString()}
              </span> MRR
            </span>
          )}
        </div>
      )}

      {properties.length === 0 ? (
        <div className="card rounded-xl px-4 py-8 text-center text-xs" style={{ color: 'var(--muted)' }}>
          No properties in the registry yet — the ATLAS Bridge seeds this table.
        </div>
      ) : (
        <PortfolioTable
          properties={properties}
          qaBySlug={qaBySlug}
          initialKind={params.kind ?? null}
          initialLifecycle={params.lifecycle ?? null}
        />
      )}
    </div>
  )
}

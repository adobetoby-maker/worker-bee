export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import ProspectCard, { type Prospect } from './ProspectCard'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

const STAGES = [
  { key: 'new',           label: 'New',         color: '#64748b' },
  { key: 'active',        label: 'Active',       color: '#60a5fa' },
  { key: 'engaged',       label: 'Engaged',      color: '#818cf8' },
  { key: 'hot',           label: 'Hot',          color: '#f59e0b' },
  { key: 'in_conversation', label: 'Talking',    color: '#f97316' },
  { key: 'proposal_sent', label: 'Proposal',     color: '#a78bfa' },
  { key: 'won',           label: 'Won',          color: '#34d399' },
]

const COLLAPSED_STAGES = [
  { key: 'lost',     label: 'Lost',     color: '#f87171' },
  { key: 'archived', label: 'Archived', color: '#475569' },
]

export default async function PipelinePage({ searchParams }: {
  searchParams: Promise<{ campaign?: string; stage?: string }>
}) {
  const { campaign: campaignFilter, stage: stageFilter } = await searchParams

  let query = db
    .from('prospects')
    .select('id, business_name, city, state, category, demo_url, stage, current_touch, next_touch_date, created_at, outreach_campaign_id')
    .order('next_touch_date', { ascending: true, nullsFirst: false })

  if (campaignFilter) query = query.eq('outreach_campaign_id', campaignFilter)
  if (stageFilter) query = query.eq('stage', stageFilter)

  const { data } = await query
  const prospects: Prospect[] = data ?? []

  const byStage = (stage: string) => prospects.filter(p => p.stage === stage)

  return (
    <div className="max-w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Pipeline</h1>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            {prospects.length} prospects
            {stageFilter && ` · filtered: ${stageFilter}`}
            {campaignFilter && ` · 1 campaign`}
          </p>
        </div>
        <Link href="/leads"
          className="text-sm px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--muted-light)', border: '1px solid var(--border)' }}>
          ← Dashboard
        </Link>
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {STAGES.map(({ key, label, color }) => {
            const cards = byStage(key)
            return (
              <div key={key} className="w-52 shrink-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
                    {label}
                  </span>
                  <span className="text-xs ml-auto rounded-full px-1.5 py-0.5 font-medium"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>
                    {cards.length}
                  </span>
                </div>
                <div className="min-h-[120px] rounded-xl p-2"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                  {cards.length === 0 ? (
                    <div className="text-center py-6 text-xs" style={{ color: 'var(--muted)' }}>—</div>
                  ) : (
                    cards.map(p => <ProspectCard key={p.id} p={p} />)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Collapsed rows for Lost + Archived */}
      <div className="mt-6 space-y-2">
        {COLLAPSED_STAGES.map(({ key, label, color }) => {
          const cards = byStage(key)
          if (cards.length === 0) return null
          return (
            <details key={key} className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--border)' }}>
              <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
                style={{ background: 'var(--surface)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-sm font-semibold" style={{ color }}>{label}</span>
                <span className="text-xs ml-auto" style={{ color: 'var(--muted)' }}>{cards.length} prospects</span>
              </summary>
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3" style={{ background: 'var(--surface)' }}>
                {cards.map(p => (
                  <Link key={p.id} href={`/leads/${p.id}`}
                    className="rounded-lg p-3 text-sm transition-colors hover:bg-white/[0.03]"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <div className="font-semibold text-white truncate">{p.business_name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{p.city} · {p.category}</div>
                  </Link>
                ))}
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}

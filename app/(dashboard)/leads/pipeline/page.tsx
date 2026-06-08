export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { ExternalLink, ChevronRight } from 'lucide-react'

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

const TOUCH_LABELS: Record<number, string> = {
  0: 'Not started', 1: 'Email 1', 2: 'Text 1', 3: 'Call 1',
  4: 'Email 2', 5: 'Text 2', 6: 'Call 2',
  7: 'Email 3', 8: 'Text 3', 9: 'Call 3',
}

const TOUCH_CHANNEL_COLOR: Record<number, string> = {
  1: '#818cf8', 4: '#818cf8', 7: '#818cf8', // emails — purple
  2: '#34d399', 5: '#34d399', 8: '#34d399', // texts — green
  3: '#f59e0b', 6: '#f59e0b', 9: '#f59e0b', // calls — amber
}

type Prospect = {
  id: string
  business_name: string
  city: string
  state: string
  category: string
  demo_url: string | null
  stage: string
  current_touch: number
  next_touch_date: string | null
  created_at: string
  outreach_campaign_id: string | null
}

function daysInStage(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
}

function ProspectCard({ p }: { p: Prospect }) {
  const today = new Date().toISOString().split('T')[0]
  const nextTouch = (p.current_touch ?? 0) + 1
  const touchLabel = TOUCH_LABELS[nextTouch] ?? `Touch ${nextTouch}`
  const touchColor = TOUCH_CHANNEL_COLOR[nextTouch] ?? '#64748b'
  const isOverdue = p.next_touch_date && p.next_touch_date < today
  const days = daysInStage(p.created_at)

  return (
    <Link href={`/leads/${p.id}`}
      className="block rounded-lg p-3 mb-2 transition-all hover:border-white/10"
      style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white leading-tight truncate">{p.business_name}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{p.city} · {p.category}</div>
        </div>
        <ChevronRight size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--muted)' }} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded"
          style={{ background: `${touchColor}18`, color: touchColor }}>
          {touchLabel}
        </span>
        {p.next_touch_date && (
          <span className="text-[10px]" style={{ color: isOverdue ? '#f87171' : 'var(--muted)' }}>
            {isOverdue ? `overdue` : p.next_touch_date}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{days}d in stage</span>
        {p.demo_url && (
          <a href={p.demo_url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] transition-colors hover:text-indigo-300"
            style={{ color: '#818cf8' }}>
            demo <ExternalLink size={9} />
          </a>
        )}
      </div>
    </Link>
  )
}

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

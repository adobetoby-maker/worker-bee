'use client'
import Link from 'next/link'
import { ExternalLink, ChevronRight } from 'lucide-react'

const TOUCH_LABELS: Record<number, string> = {
  0: 'Not started', 1: 'Email 1', 2: 'Text 1', 3: 'Call 1',
  4: 'Email 2', 5: 'Text 2', 6: 'Call 2',
  7: 'Email 3', 8: 'Text 3', 9: 'Call 3',
}

const TOUCH_CHANNEL_COLOR: Record<number, string> = {
  1: '#818cf8', 4: '#818cf8', 7: '#818cf8',
  2: '#34d399', 5: '#34d399', 8: '#34d399',
  3: '#f59e0b', 6: '#f59e0b', 9: '#f59e0b',
}

export type Prospect = {
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

export default function ProspectCard({ p }: { p: Prospect }) {
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
            {isOverdue ? 'overdue' : p.next_touch_date}
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

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { ArrowLeft, RotateCcw, Archive } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

type Prospect = {
  id: string
  business_name: string
  city: string
  state: string
  category: string
  phone: string | null
  email: string | null
  demo_url: string | null
  stage: string
  current_touch: number
  archived_at: string | null
  reactivate_after: string | null
  sequence_start_date: string | null
  outreach_campaigns: { name: string } | null
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntilReactivation(iso: string | null): number | null {
  if (!iso) return null
  const diff = Math.floor((new Date(iso).getTime() - Date.now()) / 86400000)
  return diff
}

export default async function ArchivePage() {
  const today = new Date().toISOString().split('T')[0]

  const [archivedRes, reactivatingRes] = await Promise.all([
    db.from('prospects')
      .select('id, business_name, city, state, category, phone, email, demo_url, stage, current_touch, archived_at, reactivate_after, sequence_start_date, outreach_campaigns(name)')
      .eq('stage', 'archived')
      .order('reactivate_after', { ascending: true, nullsFirst: false }),
    db.from('prospects')
      .select('id, business_name, city, state, category, phone, email, demo_url, stage, current_touch, archived_at, reactivate_after, sequence_start_date, outreach_campaigns(name)')
      .lte('reactivate_after', today)
      .eq('stage', 'archived')
      .order('reactivate_after', { ascending: true }),
  ])

  const archived: Prospect[] = archivedRes.data ?? []
  const readyToReactivate: Prospect[] = reactivatingRes.data ?? []

  // Separate the rest
  const pendingArchive = archived.filter(p => {
    const days = daysUntilReactivation(p.reactivate_after)
    return days !== null && days > 0
  })
  const noReactivationDate = archived.filter(p => !p.reactivate_after)

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/leads"
          className="flex items-center gap-1.5 text-sm transition-colors hover:text-white"
          style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Archive</h1>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            {archived.length} archived · {readyToReactivate.length} ready to reactivate
          </p>
        </div>
      </div>

      {/* Ready to reactivate */}
      {readyToReactivate.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <RotateCcw size={14} style={{ color: '#34d399' }} />
            <h2 className="text-sm font-bold text-white">Ready to Reactivate</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold ml-1"
              style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
              {readyToReactivate.length}
            </span>
          </div>
          <div className="rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(52,211,153,0.2)', background: 'rgba(52,211,153,0.03)' }}>
            <div className="divide-y" style={{ borderColor: 'rgba(52,211,153,0.1)' }}>
              {readyToReactivate.map(p => (
                <Link key={p.id} href={`/leads/${p.id}`}
                  className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}>
                      <RotateCcw size={13} style={{ color: '#34d399' }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">{p.business_name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {p.city} · {p.category}
                        {p.outreach_campaigns && ` · ${p.outreach_campaigns.name}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-semibold" style={{ color: '#34d399' }}>
                        Reactivate now
                      </div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>
                        Due {formatDate(p.reactivate_after)}
                      </div>
                    </div>
                    <div className="text-xs px-2.5 py-1 rounded-full font-semibold"
                      style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
                      {p.current_touch}/9 touches
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <p className="text-xs mt-2 px-1" style={{ color: 'var(--muted)' }}>
            Open each prospect → Log Touch 1 to restart the sequence.
          </p>
        </div>
      )}

      {/* Pending reactivation */}
      {pendingArchive.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Archive size={14} style={{ color: 'var(--muted)' }} />
            <h2 className="text-sm font-bold text-white">Scheduled Reactivation</h2>
          </div>
          <div className="card rounded-xl overflow-hidden">
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {pendingArchive.map(p => {
                const days = daysUntilReactivation(p.reactivate_after)
                const isClose = days !== null && days <= 14

                return (
                  <Link key={p.id} href={`/leads/${p.id}`}
                    className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">{p.business_name}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {p.city} · {p.category}
                        {p.outreach_campaigns && ` · ${p.outreach_campaigns.name}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right text-xs">
                        <div style={{ color: isClose ? '#fbbf24' : 'var(--muted-light)' }}>
                          {days !== null ? `${days}d` : '—'} until reactivation
                        </div>
                        <div style={{ color: 'var(--muted)' }}>{formatDate(p.reactivate_after)}</div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(100,116,139,0.15)', color: '#64748b' }}>
                        {p.current_touch}/9
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* No reactivation date (lost or manual archive) */}
      {noReactivationDate.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Archive size={14} style={{ color: '#475569' }} />
            <h2 className="text-sm font-bold text-white">Permanently Archived</h2>
          </div>
          <div className="card rounded-xl overflow-hidden">
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {noReactivationDate.map(p => (
                <Link key={p.id} href={`/leads/${p.id}`}
                  className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">{p.business_name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {p.city} · {p.category}
                      {p.archived_at && ` · Archived ${formatDate(p.archived_at)}`}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full ml-4 shrink-0"
                    style={{ background: 'rgba(71,85,105,0.2)', color: '#64748b' }}>
                    {p.current_touch}/9
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {archived.length === 0 && (
        <div className="card rounded-xl p-10 text-center">
          <Archive size={28} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            No archived prospects yet. After 9 touches, prospects are automatically
            archived with a 6-month reactivation window.
          </p>
        </div>
      )}
    </div>
  )
}

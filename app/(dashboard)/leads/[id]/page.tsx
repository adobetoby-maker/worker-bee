export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import {
  ArrowLeft, Phone, Mail, Globe, ExternalLink,
  MapPin, Tag, Calendar, Clock, ChevronRight,
} from 'lucide-react'
import LogTouchModal from './LogTouchModal'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

const STAGE_COLORS: Record<string, string> = {
  new: '#64748b', active: '#60a5fa', engaged: '#818cf8',
  hot: '#f59e0b', in_conversation: '#f97316', proposal_sent: '#a78bfa',
  won: '#34d399', lost: '#f87171', archived: '#475569', reactivating: '#fbbf24',
}
const STAGE_LABELS: Record<string, string> = {
  new: 'New', active: 'Active', engaged: 'Engaged', hot: 'Hot',
  in_conversation: 'Talking', proposal_sent: 'Proposal', won: 'Won',
  lost: 'Lost', archived: 'Archived', reactivating: 'Reactivating',
}

// 9-touch sequence definition
const SEQUENCE = [
  { num: 1, label: 'E1', name: 'Email 1',  channel: 'email', color: '#818cf8' },
  { num: 2, label: 'T1', name: 'Text 1',   channel: 'text',  color: '#34d399' },
  { num: 3, label: 'C1', name: 'Call 1',   channel: 'call',  color: '#f59e0b' },
  { num: 4, label: 'E2', name: 'Email 2',  channel: 'email', color: '#818cf8' },
  { num: 5, label: 'T2', name: 'Text 2',   channel: 'text',  color: '#34d399' },
  { num: 6, label: 'C2', name: 'Call 2',   channel: 'call',  color: '#f59e0b' },
  { num: 7, label: 'E3', name: 'Email 3',  channel: 'email', color: '#818cf8' },
  { num: 8, label: 'T3', name: 'Text 3',   channel: 'text',  color: '#34d399' },
  { num: 9, label: 'C3', name: 'Call 3',   channel: 'call',  color: '#f59e0b' },
]

const EVENT_STATUS_COLORS: Record<string, string> = {
  sent: '#818cf8', delivered: '#60a5fa', opened: '#34d399', replied: '#22c55e',
  bounced: '#f87171', connected: '#34d399', voicemail: '#f59e0b',
  no_answer: '#64748b', callback_requested: '#a78bfa', draft_created: '#475569',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function daysAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  return `${diff}d ago`
}

type Prospect = {
  id: string
  business_name: string
  owner_name: string | null
  city: string
  state: string
  category: string
  phone: string | null
  email: string | null
  website: string | null
  demo_url: string | null
  demo_screenshot_url: string | null
  stage: string
  current_touch: number
  next_touch_date: string | null
  sequence_start_date: string | null
  deal_value: number | null
  monthly_value: number | null
  notes: string | null
  cold_call_opener: string | null
  created_at: string
  outreach_campaign_id: string | null
  outreach_campaigns: { name: string; region: string } | null
}

type ContactEvent = {
  id: string
  touch_number: number | null
  channel: string
  status: string
  notes: string | null
  email_subject: string | null
  call_outcome: string | null
  call_duration_seconds: number | null
  created_at: string
  email_templates: { name: string } | null
}

export default async function ProspectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const today = new Date().toISOString().split('T')[0]

  const [prospectRes, eventsRes] = await Promise.all([
    db.from('prospects')
      .select('*, outreach_campaigns(name, region)')
      .eq('id', id)
      .single(),
    db.from('contact_events')
      .select('*, email_templates(name)')
      .eq('prospect_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (prospectRes.error || !prospectRes.data) notFound()

  const p: Prospect = prospectRes.data
  const events: ContactEvent[] = eventsRes.data ?? []

  const stageColor = STAGE_COLORS[p.stage] ?? '#64748b'
  const stageLabel = STAGE_LABELS[p.stage] ?? p.stage
  const isOverdue = p.next_touch_date && p.next_touch_date < today
  const nextTouchNum = (p.current_touch ?? 0) + 1
  const nextTouchDef = SEQUENCE.find(s => s.num === nextTouchNum)

  // Build set of completed touch numbers from events
  const completedTouches = new Set(
    events.filter(e => e.touch_number && e.status !== 'draft_created').map(e => e.touch_number)
  )

  return (
    <div className="max-w-4xl">
      {/* Back nav */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/leads/pipeline"
          className="flex items-center gap-1.5 text-sm transition-colors hover:text-white"
          style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={14} /> Pipeline
        </Link>
        <span style={{ color: 'var(--muted)' }}>/</span>
        <Link href="/leads"
          className="text-sm transition-colors hover:text-white"
          style={{ color: 'var(--muted)' }}>
          Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="card rounded-2xl p-6 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{p.business_name}</h1>
              <span className="text-sm font-semibold px-2.5 py-1 rounded-full"
                style={{ background: `${stageColor}18`, color: stageColor }}>
                {stageLabel}
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap text-sm" style={{ color: 'var(--muted)' }}>
              {p.owner_name && <span>{p.owner_name}</span>}
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {p.city}, {p.state}
              </span>
              <span className="flex items-center gap-1">
                <Tag size={12} /> {p.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/leads/${id}/email`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
              <Mail size={13} /> Compose Email
            </Link>
            <LogTouchModal prospectId={id} currentTouch={p.current_touch ?? 0} />
          </div>
        </div>

        {/* Contact info row */}
        <div className="flex items-center gap-6 flex-wrap text-sm">
          {p.phone && (
            <a href={`tel:${p.phone}`}
              className="flex items-center gap-1.5 transition-colors hover:text-white"
              style={{ color: 'var(--muted-light)' }}>
              <Phone size={13} /> {p.phone}
            </a>
          )}
          {p.email && (
            <a href={`mailto:${p.email}`}
              className="flex items-center gap-1.5 transition-colors hover:text-white"
              style={{ color: 'var(--muted-light)' }}>
              <Mail size={13} /> {p.email}
            </a>
          )}
          {p.website && (
            <a href={p.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-white"
              style={{ color: 'var(--muted-light)' }}>
              <Globe size={13} /> Website <ExternalLink size={11} />
            </a>
          )}
          {p.demo_url && (
            <a href={p.demo_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-medium transition-colors"
              style={{ color: '#818cf8' }}>
              <ExternalLink size={13} /> Demo site
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column: Sequence + next action */}
        <div className="lg:col-span-2 space-y-5">

          {/* Sequence progress bar */}
          <div className="card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">9-Touch Sequence</h2>
              {p.sequence_start_date && (
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  Started {formatDate(p.sequence_start_date)}
                </span>
              )}
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-1 mb-4">
              {SEQUENCE.map((touch, i) => {
                const done = completedTouches.has(touch.num)
                const isCurrent = touch.num === nextTouchNum
                const isPast = (p.current_touch ?? 0) >= touch.num

                return (
                  <div key={touch.num} className="flex items-center gap-1 flex-1">
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                        style={{
                          background: done || isPast
                            ? `${touch.color}25`
                            : isCurrent
                              ? `${touch.color}15`
                              : 'rgba(255,255,255,0.04)',
                          color: done || isPast
                            ? touch.color
                            : isCurrent
                              ? touch.color
                              : 'var(--muted)',
                          border: isCurrent
                            ? `2px solid ${touch.color}`
                            : done || isPast
                              ? `1px solid ${touch.color}50`
                              : '1px solid var(--border)',
                          boxShadow: isCurrent ? `0 0 12px ${touch.color}40` : 'none',
                        }}>
                        {done || isPast ? '✓' : isCurrent ? '→' : touch.label}
                      </div>
                      <span className="text-[9px] font-medium" style={{
                        color: isCurrent ? touch.color : done || isPast ? touch.color : 'var(--muted)',
                        opacity: done || isPast || isCurrent ? 1 : 0.5,
                      }}>
                        {touch.name}
                      </span>
                    </div>
                    {i < SEQUENCE.length - 1 && (
                      <div className="h-px flex-1 mb-4" style={{
                        background: isPast ? 'rgba(99,102,241,0.4)' : 'var(--border)',
                      }} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Next action callout */}
            {p.stage !== 'archived' && p.stage !== 'lost' && p.stage !== 'won' && nextTouchDef && (
              <div className="rounded-lg px-4 py-3 flex items-center justify-between"
                style={{
                  background: isOverdue ? 'rgba(248,113,113,0.06)' : `${nextTouchDef.color}08`,
                  border: `1px solid ${isOverdue ? 'rgba(248,113,113,0.2)' : `${nextTouchDef.color}25`}`,
                }}>
                <div>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: isOverdue ? '#f87171' : nextTouchDef.color }}>
                    {isOverdue ? 'Overdue' : 'Next Up'}: {nextTouchDef.name}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>
                    {p.next_touch_date ? (isOverdue ? `Was due ${formatDate(p.next_touch_date)}` : `Due ${formatDate(p.next_touch_date)}`) : 'Log touch 1 to start the sequence'}
                  </div>
                </div>
                <ChevronRight size={14} style={{ color: isOverdue ? '#f87171' : nextTouchDef.color }} />
              </div>
            )}

            {p.stage === 'won' && (
              <div className="rounded-lg px-4 py-3 text-center" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <span className="text-sm font-semibold" style={{ color: '#34d399' }}>Won — sequence complete</span>
              </div>
            )}
          </div>

          {/* Contact history */}
          <div className="card rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-sm font-bold text-white">Contact History</h2>
            </div>
            {events.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
                No contact events yet. Log your first touch to start the sequence.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {events.map(ev => {
                  const touch = ev.touch_number ? SEQUENCE.find(s => s.num === ev.touch_number) : null
                  const statusColor = EVENT_STATUS_COLORS[ev.status] ?? '#64748b'
                  return (
                    <div key={ev.id} className="px-5 py-4 flex items-start gap-4">
                      {/* Channel dot */}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                        style={{
                          background: touch ? `${touch.color}15` : 'rgba(255,255,255,0.04)',
                          color: touch ? touch.color : 'var(--muted)',
                          border: `1px solid ${touch ? `${touch.color}30` : 'var(--border)'}`,
                        }}>
                        {ev.touch_number ? SEQUENCE.find(s => s.num === ev.touch_number)?.label ?? ev.touch_number : '—'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-white capitalize">
                            {ev.channel}
                            {ev.email_templates?.name ? ` — ${ev.email_templates.name}` : ''}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full font-medium capitalize"
                            style={{ background: `${statusColor}18`, color: statusColor }}>
                            {ev.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {ev.email_subject && (
                          <div className="text-xs mb-1" style={{ color: 'var(--muted-light)' }}>
                            Subject: {ev.email_subject}
                          </div>
                        )}
                        {ev.call_outcome && (
                          <div className="text-xs mb-1" style={{ color: 'var(--muted-light)' }}>
                            Outcome: {ev.call_outcome.replace(/_/g, ' ')}
                            {ev.call_duration_seconds && ` · ${Math.round(ev.call_duration_seconds / 60)}min`}
                          </div>
                        )}
                        {ev.notes && (
                          <div className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--muted)' }}>
                            {ev.notes}
                          </div>
                        )}
                      </div>
                      <div className="text-xs shrink-0" style={{ color: 'var(--muted)' }}>
                        {daysAgo(ev.created_at)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column: metadata + notes */}
        <div className="space-y-5">
          {/* Deal value */}
          <div className="card rounded-xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--muted)' }}>
              Deal Value
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--muted-light)' }}>Build fee</span>
                <span className="text-sm font-semibold text-white">
                  ${(p.deal_value ?? 750).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--muted-light)' }}>Monthly hosting</span>
                <span className="text-sm font-semibold text-white">
                  ${(p.monthly_value ?? 99)}/mo
                </span>
              </div>
              <div className="h-px" style={{ background: 'var(--border)' }} />
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--muted-light)' }}>Year 1 total</span>
                <span className="text-base font-bold" style={{ color: '#34d399' }}>
                  ${((p.deal_value ?? 750) + (p.monthly_value ?? 99) * 12).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Meta */}
          <div className="card rounded-xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--muted)' }}>
              Details
            </h3>
            <div className="space-y-3 text-sm">
              {p.outreach_campaigns && (
                <div className="flex items-start justify-between gap-2">
                  <span style={{ color: 'var(--muted)' }}>Campaign</span>
                  <span className="text-right font-medium text-white">
                    {p.outreach_campaigns.name}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--muted)' }}>Added</span>
                <span className="flex items-center gap-1" style={{ color: 'var(--muted-light)' }}>
                  <Calendar size={11} /> {formatDate(p.created_at)}
                </span>
              </div>
              {p.sequence_start_date && (
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--muted)' }}>Seq. started</span>
                  <span className="flex items-center gap-1" style={{ color: 'var(--muted-light)' }}>
                    <Clock size={11} /> {formatDate(p.sequence_start_date)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span style={{ color: 'var(--muted)' }}>Touches logged</span>
                <span className="font-semibold text-white">{p.current_touch ?? 0} / 9</span>
              </div>
            </div>
          </div>

          {/* Cold call opener */}
          {p.cold_call_opener && (
            <div className="card rounded-xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
                Cold Call Opener
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-light)' }}>
                {p.cold_call_opener}
              </p>
            </div>
          )}

          {/* Notes */}
          {p.notes && (
            <div className="card rounded-xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
                Notes
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--muted-light)' }}>
                {p.notes}
              </p>
            </div>
          )}

          {/* Quick actions */}
          <div className="card rounded-xl p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>
              Quick Actions
            </h3>
            <div className="space-y-2">
              {p.phone && (
                <a href={`tel:${p.phone}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full"
                  style={{ background: 'rgba(52,211,153,0.06)', color: '#34d399', border: '1px solid rgba(52,211,153,0.15)' }}>
                  <Phone size={13} /> Call {p.phone}
                </a>
              )}
              {p.phone && (
                <a href={`sms:${p.phone}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full"
                  style={{ background: 'rgba(52,211,153,0.06)', color: '#34d399', border: '1px solid rgba(52,211,153,0.15)' }}>
                  <Mail size={13} /> Text {p.phone}
                </a>
              )}
              <Link href={`/leads/${id}/email`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors w-full"
                style={{ background: 'rgba(99,102,241,0.06)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.15)' }}>
                <Mail size={13} /> Compose Email
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

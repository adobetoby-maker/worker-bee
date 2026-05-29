'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Mail, Plus, RefreshCw, Send, Copy, Pencil, Users, Calendar, ChevronRight } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Campaign {
  id: string
  name: string
  site_id?: string
  type: 'BROADCAST' | 'DRIP'
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT'
  subject?: string
  html_body?: string
  recipient_count?: number
  sent_at?: string
  created_at: string
}

// ── Config ────────────────────────────────────────────────────────────────────
const SITES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  medicalspanish:      { label: 'Medical Spanish',      color: '#00D4A4', bg: 'rgba(0,212,164,0.12)',   border: 'rgba(0,212,164,0.3)' },
  constructionspanish: { label: 'Construction Spanish', color: '#FF6B2B', bg: 'rgba(255,107,43,0.12)',  border: 'rgba(255,107,43,0.3)' },
  languagethreshold:   { label: 'Language Threshold',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)' },
  'worker-bee':        { label: 'Worker Bee',           color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
}

const TYPE_STYLES: Record<Campaign['type'], { color: string; bg: string; border: string }> = {
  BROADCAST: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   border: 'rgba(96,165,250,0.25)' },
  DRIP:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)' },
}

const STATUS_STYLES: Record<Campaign['status'], { color: string; bg: string; border: string; dot: string }> = {
  DRAFT:     { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)', dot: '#94a3b8' },
  SCHEDULED: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)',  dot: '#fbbf24' },
  SENDING:   { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)',  dot: '#60a5fa' },
  SENT:      { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)',  dot: '#34d399' },
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns]  = useState<Campaign[]>([])
  const [loading, setLoading]      = useState(true)
  const [sending, setSending]      = useState<string | null>(null)
  const [site, setSite]            = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (site) params.set('site', site)
    try {
      const res  = await fetch(`/api/campaigns?${params}`)
      const data = await res.json()
      setCampaigns(data.campaigns ?? [])
    } catch {}
    setLoading(false)
  }, [site])

  useEffect(() => { load() }, [load])

  async function sendCampaign(id: string, name: string) {
    if (!confirm(`Send "${name}" now? This will email all subscribed contacts on this site.`)) return
    setSending(id)
    try {
      const res  = await fetch(`/api/campaigns/${id}/send`, { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        alert(`Sent to ${data.sent ?? '?'} recipients.`)
        load()
      }
    } catch {}
    setSending(null)
  }

  async function duplicateCampaign(c: Campaign) {
    try {
      await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:      `${c.name} (copy)`,
          site_id:   c.site_id,
          type:      c.type,
          subject:   c.subject,
          html_body: c.html_body,
          status:    'DRAFT',
        }),
      })
      load()
    } catch {}
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Mail size={22} style={{ color: '#60a5fa' }} />
            <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            Email broadcasts and drip sequences for your sites
          </p>
        </div>
        <Link href="/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.35)', color: '#60a5fa' }}>
          <Plus size={16} />
          New Campaign
        </Link>
      </div>

      {/* Site tabs */}
      <div className="mb-6 flex items-center gap-1.5 flex-wrap">
        <SiteTab active={site === ''} onClick={() => setSite('')} label="All" />
        {Object.entries(SITES).map(([key, s]) => (
          <SiteTab key={key} active={site === key} onClick={() => setSite(key)}
            label={s.label} activeColor={s.color} activeBg={s.bg} activeBorder={s.border} />
        ))}
        <button onClick={load} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-sm" style={{ color: 'var(--muted)' }}>
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading campaigns…
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center"
          style={{ border: '1px dashed var(--border)', borderRadius: 16 }}>
          <Mail size={40} className="mb-4 opacity-20 text-white" />
          <p className="text-base font-semibold text-white mb-2">No campaigns yet</p>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            Click New Campaign to create your first email broadcast or drip sequence.
          </p>
          <Link href="/campaigns/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.35)', color: '#60a5fa' }}>
            <Plus size={16} /> New Campaign
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map(c => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onSend={() => sendCampaign(c.id, c.name)}
              onDuplicate={() => duplicateCampaign(c)}
              isSending={sending === c.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Campaign Card ─────────────────────────────────────────────────────────────
function CampaignCard({
  campaign: c, onSend, onDuplicate, isSending,
}: {
  campaign: Campaign
  onSend: () => void
  onDuplicate: () => void
  isSending: boolean
}) {
  const site   = SITES[c.site_id ?? '']
  const type   = TYPE_STYLES[c.type]
  const status = STATUS_STYLES[c.status]

  const canSend = c.status === 'DRAFT' && !!c.html_body

  return (
    <div className="rounded-xl flex flex-col transition-all"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>

      {/* Card header */}
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2">{c.name}</h3>
          {/* Status badge */}
          <span className="shrink-0 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ color: status.color, background: status.bg, border: `1px solid ${status.border}` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: status.dot }} />
            {c.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {/* Site badge */}
          {site && (
            <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ color: site.color, background: site.bg, border: `1px solid ${site.border}` }}>
              {site.label}
            </span>
          )}
          {/* Type badge */}
          <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ color: type.color, background: type.bg, border: `1px solid ${type.border}` }}>
            {c.type}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 py-3 flex-1 space-y-2">
        {c.subject ? (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--muted-light)' }}>
            {c.subject}
          </p>
        ) : (
          <p className="text-xs italic" style={{ color: 'var(--muted)', opacity: 0.5 }}>No subject yet</p>
        )}

        <div className="flex items-center gap-3 pt-1">
          {c.status === 'SENT' && c.recipient_count != null && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
              <Users size={11} /> {c.recipient_count.toLocaleString()} sent
            </span>
          )}
          {c.status === 'SENT' && c.sent_at && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
              <Calendar size={11} /> {new Date(c.sent_at).toLocaleDateString()}
            </span>
          )}
          {c.status !== 'SENT' && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
              <Calendar size={11} /> Created {new Date(c.created_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Card actions */}
      <div className="px-4 pb-4 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--border)' }}>
        {/* Edit */}
        <Link href={`/campaigns/${c.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 justify-center"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--muted-light)' }}>
          <Pencil size={12} /> Edit
        </Link>

        {/* Duplicate */}
        <button onClick={onDuplicate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--muted-light)' }}
          title="Duplicate campaign">
          <Copy size={12} />
        </button>

        {/* Send */}
        {canSend && (
          <button onClick={onSend} disabled={isSending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
            {isSending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
            Send
          </button>
        )}
        {c.status === 'SENT' && (
          <Link href={`/campaigns/${c.id}`}
            className="flex items-center gap-1 text-xs ml-auto"
            style={{ color: 'var(--muted)' }}>
            View report <ChevronRight size={11} />
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Site Tab ──────────────────────────────────────────────────────────────────
function SiteTab({
  active, onClick, label,
  activeColor = '#6366f1', activeBg = 'rgba(99,102,241,0.15)', activeBorder = 'rgba(99,102,241,0.4)',
}: {
  active: boolean; onClick: () => void; label: string
  activeColor?: string; activeBg?: string; activeBorder?: string
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        color:      active ? activeColor : 'var(--muted-light)',
        background: active ? activeBg    : 'rgba(255,255,255,0.04)',
        border:     active ? `1px solid ${activeBorder}` : '1px solid var(--border)',
      }}>
      {label}
    </button>
  )
}

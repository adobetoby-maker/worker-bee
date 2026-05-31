'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Flag, Plus, Trash2, RefreshCw, ChevronUp, ChevronDown,
  Link as LinkIcon, Copy, Check,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
type MilestoneStatus = 'pending' | 'in_progress' | 'complete' | 'blocked'

interface Milestone {
  id: string
  site_id: string
  title: string
  description: string | null
  status: MilestoneStatus
  sort_order: number
  completed_at: string | null
  created_at: string
  source?: 'manual' | 'auto'
  event_type?: string | null
}

const STATUS_CYCLE: MilestoneStatus[] = ['pending', 'in_progress', 'complete', 'blocked']

const STATUS_META: Record<MilestoneStatus, { icon: string; label: string; color: string; bg: string; border: string }> = {
  pending:     { icon: '⬜', label: 'Pending',     color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
  in_progress: { icon: '🔄', label: 'In Progress', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)'  },
  complete:    { icon: '✅', label: 'Complete',    color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.2)'  },
  blocked:     { icon: '🚫', label: 'Blocked',     color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)' },
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MilestonesPage() {
  const params = useParams()
  const siteId = params.id as string

  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '' })

  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [generatingShare, setGeneratingShare] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/project-milestones?site_id=${siteId}`)
      const data = await res.json()
      setMilestones(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }, [siteId])

  useEffect(() => { load() }, [load])

  async function addMilestone(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await fetch('/api/project-milestones', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, site_id: siteId }),
      })
      setForm({ title: '', description: '' })
      setShowForm(false)
      load()
    } catch {}
    setSaving(false)
  }

  async function cycleStatus(m: Milestone) {
    const idx = STATUS_CYCLE.indexOf(m.status)
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    setUpdating(m.id)
    try {
      await fetch(`/api/project-milestones/${m.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      load()
    } catch {}
    setUpdating(null)
  }

  async function move(m: Milestone, direction: 'up' | 'down') {
    const sorted = [...milestones].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex(x => x.id === m.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const swap = sorted[swapIdx]
    setUpdating(m.id)
    try {
      await Promise.all([
        fetch(`/api/project-milestones/${m.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sort_order: swap.sort_order }),
        }),
        fetch(`/api/project-milestones/${swap.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sort_order: m.sort_order }),
        }),
      ])
      load()
    } catch {}
    setUpdating(null)
  }

  async function deleteMilestone(id: string) {
    if (!confirm('Delete this milestone?')) return
    setDeleting(id)
    try {
      await fetch(`/api/project-milestones/${id}`, { method: 'DELETE' })
      load()
    } catch {}
    setDeleting(null)
  }

  async function generateShare() {
    setGeneratingShare(true)
    try {
      const res = await fetch('/api/share-tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ site_id: siteId, label: 'Milestone Share Link' }),
      })
      const data = await res.json()
      if (data.url) setShareUrl(data.url)
    } catch {}
    setGeneratingShare(false)
  }

  async function copyUrl() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sorted = [...milestones].sort((a, b) => a.sort_order - b.sort_order)
  const complete  = sorted.filter(m => m.status === 'complete').length
  const total     = sorted.length

  return (
    <div className="max-w-3xl">
      <Link href={`/sites/${siteId}`}
        className="flex items-center gap-1.5 text-sm mb-6 hover:text-indigo-400 transition-colors"
        style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={14} /> Back to Site
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Flag size={22} style={{ color: '#a78bfa' }} />
            <h1 className="text-2xl font-bold text-white">Milestones</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {total > 0 ? `${complete} of ${total} complete` : 'Track project progress and share with clients'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generateShare} disabled={generatingShare}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>
            {generatingShare ? <RefreshCw size={13} className="animate-spin" /> : <LinkIcon size={13} />}
            Generate Share Link
          </button>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
            <Plus size={14} /> Add Milestone
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'var(--muted)' }}>
            <span>Progress</span>
            <span>{Math.round((complete / total) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${(complete / total) * 100}%`, background: 'linear-gradient(90deg, #6366f1, #34d399)' }} />
          </div>
        </div>
      )}

      {/* Share URL */}
      {shareUrl && (
        <div className="rounded-xl border p-4 mb-6 flex items-center gap-3"
          style={{ background: 'rgba(52,211,153,0.06)', borderColor: 'rgba(52,211,153,0.2)' }}>
          <LinkIcon size={14} className="shrink-0" style={{ color: '#34d399' }} />
          <span className="text-xs font-mono flex-1 truncate" style={{ color: '#34d399' }}>{shareUrl}</span>
          <button onClick={copyUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0"
            style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={addMilestone}
          className="rounded-xl border p-5 mb-6"
          style={{ background: 'rgba(167,139,250,0.05)', borderColor: 'rgba(167,139,250,0.2)' }}>
          <p className="text-sm font-semibold text-white mb-4">New Milestone</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Launch homepage"
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional details…" rows={2}
                className="w-full text-sm rounded-lg px-3 py-2 outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: '#6366f1', color: '#fff' }}>
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />} Add
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-light)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Milestone list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm" style={{ color: 'var(--muted)' }}>
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading milestones…
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border text-center"
          style={{ borderColor: 'var(--border)' }}>
          <Flag size={36} className="mb-3 opacity-20 text-white" />
          <p className="text-sm font-medium text-white mb-1">No milestones yet</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Add milestones to track project phases</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((m, idx) => {
            const meta = STATUS_META[m.status]
            const isUpdating = updating === m.id
            return (
              <div key={m.id}
                className="rounded-xl border px-4 py-3.5 flex items-start gap-3 transition-all"
                style={{ background: 'var(--surface)', borderColor: m.status === 'complete' ? 'rgba(52,211,153,0.2)' : 'var(--border)' }}>
                {/* Status button */}
                <button onClick={() => !isUpdating && cycleStatus(m)}
                  disabled={isUpdating}
                  title={`Status: ${meta.label} — click to cycle`}
                  className="text-lg leading-none mt-0.5 transition-transform hover:scale-110 shrink-0 cursor-pointer">
                  {isUpdating ? '⏳' : meta.icon}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-white truncate">{m.title}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded-md shrink-0"
                      style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
                      {meta.label}
                    </span>
                    {m.source === 'auto' && (
                      <span className="text-xs px-1.5 py-0.5 rounded-md shrink-0"
                        style={{ color: '#94a3b8', background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)' }}
                        title={m.event_type ?? 'auto-detected'}>
                        auto
                      </span>
                    )}
                  </div>
                  {m.description && (
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{m.description}</p>
                  )}
                  {m.completed_at && (
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)', opacity: 0.6 }}>
                      Completed {new Date(m.completed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => move(m, 'up')} disabled={idx === 0 || !!updating}
                    className="flex items-center justify-center w-6 h-6 rounded transition-all disabled:opacity-20"
                    style={{ color: 'var(--muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <ChevronUp size={13} />
                  </button>
                  <button onClick={() => move(m, 'down')} disabled={idx === sorted.length - 1 || !!updating}
                    className="flex items-center justify-center w-6 h-6 rounded transition-all disabled:opacity-20"
                    style={{ color: 'var(--muted)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <ChevronDown size={13} />
                  </button>
                  <button onClick={() => deleteMilestone(m.id)} disabled={deleting === m.id}
                    className="flex items-center justify-center w-6 h-6 rounded transition-all opacity-30 hover:opacity-100"
                    style={{ color: '#f87171' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    {deleting === m.id ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

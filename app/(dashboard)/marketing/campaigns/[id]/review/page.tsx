'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock, Plus,
  X, Megaphone, CalendarDays, Globe, ChevronRight,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
type ApprovalStatus = 'pending_approval' | 'approved' | 'rejected' | 'draft'

interface ContentBrief {
  copy?:          string
  asset_url?:     string
  platform?:      string
  slot?:          string
  revision_note?: string
}

interface MarketingTask {
  id:              string
  campaign_id:     string
  platform:        string | null
  slot:            string | null
  approval_status: ApprovalStatus
  content_brief:   ContentBrief | null
  generated_assets: Record<string, string> | null
  text:            string
  type:            string
  done:            boolean
  created_at:      string
}

interface Campaign {
  id:            string
  name:          string
  site_type:     string
  status:        string
  platforms:     string[]
  content_types: string[]
  week_start:    string
  sites?: {
    name: string
    url:  string
    stack: string
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────
const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'

const APPROVAL_META: Record<ApprovalStatus, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode
}> = {
  pending_approval: { label: 'Pending',  color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)',  icon: <Clock size={11} /> },
  approved:         { label: 'Approved', color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)', icon: <CheckCircle2 size={11} /> },
  rejected:         { label: 'Rejected', color: '#f87171', bg: 'rgba(248,113,113,0.1)',  border: 'rgba(248,113,113,0.25)', icon: <XCircle size={11} /> },
  draft:            { label: 'Draft',    color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.25)', icon: <Clock size={11} /> },
}

const PLATFORM_EMOJI: Record<string, string> = {
  facebook:  '📘',
  instagram: '📸',
  tiktok:    '🎵',
  youtube:   '▶️',
  gbp:       '📍',
  linkedin:  '💼',
  pinterest: '📌',
  nextdoor:  '🏘️',
}

const PLATFORM_COLORS: Record<string, string> = {
  facebook:  '#60a5fa',
  instagram: '#f472b6',
  tiktok:    '#94a3b8',
  youtube:   '#f87171',
  gbp:       '#34d399',
  linkedin:  '#60a5fa',
  pinterest: '#f472b6',
  nextdoor:  '#fbbf24',
}

const PLATFORMS_LIST = [
  'facebook', 'instagram', 'tiktok', 'youtube', 'gbp', 'linkedin', 'pinterest', 'nextdoor',
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function getPlatformColor(p: string | null): string {
  return PLATFORM_COLORS[p ?? ''] ?? '#94a3b8'
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  } catch { return iso }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CampaignReviewPage() {
  const params     = useParams()
  const campaignId = params.id as string

  const [campaign, setCampaign]   = useState<Campaign | null>(null)
  const [tasks, setTasks]         = useState<MarketingTask[]>([])
  const [loading, setLoading]     = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)
  const [approveAll, setApproveAll] = useState(false)

  // Add post form
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({ platform: '', copy: '', asset_url: '' })
  const [addLoading, setAddLoading]   = useState(false)
  const [addError, setAddError]       = useState<string | null>(null)

  // Selected task editing state
  const [editCopy, setEditCopy]         = useState('')
  const [editAsset, setEditAsset]       = useState('')
  const [revisionNote, setRevisionNote] = useState('')

  const selectedTask = tasks.find(t => t.id === selectedId) ?? null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/marketing/campaigns/${campaignId}`, {
        headers: { 'x-api-key': API_KEY },
      })
      if (res.ok) {
        const d = await res.json()
        setCampaign(d.campaign)
        setTasks(d.tasks ?? [])
        // Auto-select first task
        if (!selectedId && d.tasks?.length) setSelectedId(d.tasks[0].id)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [campaignId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  // Sync edit state when selected task changes
  useEffect(() => {
    if (!selectedTask) return
    setEditCopy(selectedTask.content_brief?.copy ?? selectedTask.text ?? '')
    setEditAsset(
      selectedTask.content_brief?.asset_url ??
      selectedTask.generated_assets?.asset_url ??
      ''
    )
    setRevisionNote('')
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function doAction(taskId: string, action: 'approve' | 'reject' | 'revise') {
    setActioning(taskId)
    try {
      const body: Record<string, unknown> = { action }

      // If approve, patch content_brief with edited copy/asset first
      if (action === 'approve' && selectedTask) {
        await fetch(`/api/marketing/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
          body: JSON.stringify({
            content_brief: {
              ...(selectedTask.content_brief ?? {}),
              copy:      editCopy,
              asset_url: editAsset || undefined,
            },
          }),
        })
      }

      if (action === 'revise') body.revision_note = revisionNote

      const res = await fetch(`/api/marketing/tasks/${taskId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        // Optimistic update
        setTasks(prev => prev.map(t =>
          t.id === taskId
            ? { ...t, approval_status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'draft' }
            : t
        ))
        // Auto-advance to next pending
        if (action === 'approve' || action === 'reject') {
          const nextPending = tasks.find(
            t => t.id !== taskId && t.approval_status === 'pending_approval'
          )
          if (nextPending) setSelectedId(nextPending.id)
        }
      }
    } catch { /* ignore */ }
    setActioning(null)
  }

  async function approveAllTasks() {
    setApproveAll(true)
    const pending = tasks.filter(t => t.approval_status === 'pending_approval')
    for (const t of pending) {
      await fetch(`/api/marketing/tasks/${t.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({ action: 'approve' }),
      })
    }
    await load()
    setApproveAll(false)
  }

  async function addPost(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.platform || !addForm.copy.trim()) return
    setAddLoading(true)
    setAddError(null)
    try {
      const res = await fetch(`/api/marketing/campaigns/${campaignId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({
          platform:   addForm.platform,
          copy:       addForm.copy.trim(),
          asset_url:  addForm.asset_url || undefined,
          site_type:  campaign?.site_type,
        }),
      })
      if (res.ok) {
        const newTask = await res.json()
        setTasks(prev => [...prev, newTask])
        setSelectedId(newTask.id)
        setAddForm({ platform: '', copy: '', asset_url: '' })
        setShowAddForm(false)
      } else {
        const d = await res.json()
        setAddError(d.error ?? 'Failed to add post')
      }
    } catch {
      setAddError('Network error')
    }
    setAddLoading(false)
  }

  // Progress stats
  const approved = tasks.filter(t => t.approval_status === 'approved').length
  const total    = tasks.length
  const pct      = total > 0 ? Math.round((approved / total) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-sm" style={{ color: 'var(--muted)' }}>
        <RefreshCw size={16} className="animate-spin mr-2" /> Loading campaign…
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-white font-semibold mb-2">Campaign not found</p>
        <Link href="/marketing" className="text-sm" style={{ color: '#6366f1' }}>
          ← Back to campaigns
        </Link>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" style={{ maxHeight: 'calc(100vh - 48px)' }}>
      {/* ── Page header ────────────────────────────────────────────── */}
      <div className="shrink-0 mb-5">
        <Link
          href="/marketing"
          className="flex items-center gap-1.5 text-sm mb-4 transition-colors hover:text-indigo-400"
          style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={14} /> All Campaigns
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Megaphone size={18} style={{ color: '#6366f1' }} />
              <h1 className="text-xl font-bold text-white">{campaign.name}</h1>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                {campaign.status}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {campaign.sites && (
                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                  <Globe size={11} />
                  {campaign.sites.name}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                <CalendarDays size={11} />
                Week of {formatDate(campaign.week_start)}
              </span>
            </div>
          </div>

          {/* Approve All */}
          {tasks.some(t => t.approval_status === 'pending_approval') && (
            <button
              onClick={approveAllTasks}
              disabled={approveAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0"
              style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
              {approveAll
                ? <RefreshCw size={13} className="animate-spin" />
                : <CheckCircle2 size={13} />}
              Approve All
            </button>
          )}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'var(--muted)' }}>
              <span>{approved} of {total} approved</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6366f1, #34d399)' }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Two-column layout ─────────────────────────────────────── */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">

        {/* ── Left: Task List ──────────────────────────────────────── */}
        <div
          className="w-72 shrink-0 flex flex-col rounded-xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
          {/* List header */}
          <div
            className="px-4 py-3 flex items-center justify-between border-b shrink-0"
            style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Posts ({total})
            </span>
            <button
              onClick={() => setShowAddForm(v => !v)}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-semibold transition-all"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
              <Plus size={10} /> Add Post
            </button>
          </div>

          {/* Task rows */}
          <div className="flex-1 overflow-y-auto" style={{ borderTop: '1px solid transparent' }}>
            {tasks.length === 0 && !showAddForm ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Megaphone size={28} className="mb-3 opacity-20 text-white" />
                <p className="text-xs font-medium text-white mb-1">No posts yet</p>
                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                  Add a post using the button above
                </p>
              </div>
            ) : (
              tasks.map(task => {
                const meta    = APPROVAL_META[task.approval_status] ?? APPROVAL_META.pending_approval
                const pColor  = getPlatformColor(task.platform)
                const active  = selectedId === task.id
                const emoji   = PLATFORM_EMOJI[task.platform ?? ''] ?? '📝'

                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedId(task.id)}
                    className="w-full flex items-start gap-2.5 px-3 py-3 text-left transition-all"
                    style={{
                      background: active ? 'rgba(99,102,241,0.08)' : 'transparent',
                      borderLeft: active ? '3px solid #6366f1' : '3px solid transparent',
                    }}>
                    {/* Platform emoji */}
                    <span className="text-base shrink-0 mt-0.5" style={{ lineHeight: 1 }}>{emoji}</span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Platform + slot */}
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className="text-[10px] font-bold capitalize"
                          style={{ color: pColor }}>
                          {task.platform ?? 'Post'}
                        </span>
                        {task.slot && (
                          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                            · {task.slot}
                          </span>
                        )}
                      </div>
                      {/* Copy preview */}
                      <p
                        className="text-xs leading-relaxed line-clamp-2"
                        style={{ color: active ? '#e0e7ff' : 'var(--muted-light)' }}>
                        {task.content_brief?.copy ?? task.text ?? 'No copy yet'}
                      </p>
                    </div>

                    {/* Status chip */}
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold shrink-0 mt-0.5"
                      style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
                      {meta.icon}
                      {meta.label}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── Right: Detail Panel ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {selectedTask ? (
            <DetailPanel
              task={selectedTask}
              editCopy={editCopy}
              editAsset={editAsset}
              revisionNote={revisionNote}
              actioning={actioning}
              onEditCopy={setEditCopy}
              onEditAsset={setEditAsset}
              onRevisionNote={setRevisionNote}
              onApprove={() => doAction(selectedTask.id, 'approve')}
              onRevise={()  => doAction(selectedTask.id, 'revise')}
              onReject={()  => doAction(selectedTask.id, 'reject')}
              onAddPost={() => setShowAddForm(true)}
            />
          ) : (
            <EmptyDetail onAddPost={() => setShowAddForm(true)} />
          )}
        </div>
      </div>

      {/* ── Add Post Drawer / Modal ────────────────────────────────── */}
      {showAddForm && (
        <AddPostModal
          campaignPlatforms={campaign.platforms}
          form={addForm}
          loading={addLoading}
          error={addError}
          onClose={() => { setShowAddForm(false); setAddError(null) }}
          onChange={setAddForm}
          onSubmit={addPost}
        />
      )}
    </div>
  )
}

// ── DetailPanel ───────────────────────────────────────────────────────────────
function DetailPanel({
  task,
  editCopy, editAsset, revisionNote, actioning,
  onEditCopy, onEditAsset, onRevisionNote,
  onApprove, onRevise, onReject, onAddPost,
}: {
  task:           MarketingTask
  editCopy:       string
  editAsset:      string
  revisionNote:   string
  actioning:      string | null
  onEditCopy:     (v: string) => void
  onEditAsset:    (v: string) => void
  onRevisionNote: (v: string) => void
  onApprove:      () => void
  onRevise:       () => void
  onReject:       () => void
  onAddPost:      () => void
}) {
  const meta   = APPROVAL_META[task.approval_status] ?? APPROVAL_META.pending_approval
  const pColor = getPlatformColor(task.platform)
  const emoji  = PLATFORM_EMOJI[task.platform ?? ''] ?? '📝'
  const busy   = actioning === task.id

  return (
    <div
      className="flex-1 flex flex-col rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>

      {/* Panel header */}
      <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span style={{ fontSize: 22, lineHeight: 1 }}>{emoji}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold capitalize" style={{ color: pColor }}>
                  {task.platform ?? 'Post'}
                </span>
                {task.slot && (
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>— {task.slot}</span>
                )}
              </div>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1"
                style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
                {meta.icon} {meta.label}
              </span>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--muted)', opacity: 0.3 }} />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Copy textarea */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>
            Post Copy
          </label>
          <textarea
            value={editCopy}
            onChange={e => onEditCopy(e.target.value)}
            rows={8}
            placeholder="Enter or paste post copy here…"
            className="w-full text-sm rounded-lg px-3 py-2.5 outline-none resize-none leading-relaxed"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        {/* Asset URL */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>
            Asset URL
            <span className="ml-2 text-[10px] font-normal normal-case opacity-60">video, image, or Canva link</span>
          </label>
          <input
            value={editAsset}
            onChange={e => onEditAsset(e.target.value)}
            placeholder="https://drive.google.com/file/…"
            className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          {editAsset && (
            <a
              href={editAsset}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] mt-1 hover:text-indigo-400 transition-colors"
              style={{ color: '#6366f1' }}>
              Preview asset ↗
            </a>
          )}
        </div>

        {/* Revision note (only when choosing revise) */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>
            Revision Note
            <span className="ml-2 text-[10px] font-normal normal-case opacity-60">required for "Request Revision"</span>
          </label>
          <input
            value={revisionNote}
            onChange={e => onRevisionNote(e.target.value)}
            placeholder="What needs to change? (shown to content creator)"
            className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        {/* Existing revision note (if any) */}
        {task.content_brief?.revision_note && (
          <div
            className="rounded-lg px-3 py-2.5 text-xs"
            style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', color: '#fde68a' }}>
            <span className="font-bold block mb-1">Previous revision note:</span>
            {task.content_brief.revision_note}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-5 py-4 border-t shrink-0 flex flex-col gap-3" style={{ borderColor: 'var(--border)' }}>
        {/* Primary actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onApprove}
            disabled={busy || task.approval_status === 'approved'}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399' }}>
            {busy ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Approve & Publish
          </button>
          <button
            onClick={onRevise}
            disabled={busy || !revisionNote.trim()}
            title={!revisionNote.trim() ? 'Enter a revision note first' : undefined}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}>
            <Clock size={14} /> Revise
          </button>
          <button
            onClick={onReject}
            disabled={busy || task.approval_status === 'rejected'}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
            <XCircle size={14} /> Reject
          </button>
        </div>

        {/* Add post */}
        <button
          onClick={onAddPost}
          className="flex items-center justify-center gap-1.5 w-full px-4 py-2 rounded-lg text-xs font-medium transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted-light)' }}>
          <Plus size={12} /> Add Post to Campaign
        </button>
      </div>
    </div>
  )
}

// ── EmptyDetail ───────────────────────────────────────────────────────────────
function EmptyDetail({ onAddPost }: { onAddPost: () => void }) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center rounded-xl"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
      <Megaphone size={36} className="mb-4 opacity-15 text-white" />
      <p className="text-sm font-semibold text-white mb-1">Select a post to review</p>
      <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>
        Pick from the list on the left, or add a new post
      </p>
      <button
        onClick={onAddPost}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
        <Plus size={14} /> Add Post
      </button>
    </div>
  )
}

// ── AddPostModal ──────────────────────────────────────────────────────────────
function AddPostModal({
  campaignPlatforms, form, loading, error,
  onClose, onChange, onSubmit,
}: {
  campaignPlatforms: string[]
  form:              { platform: string; copy: string; asset_url: string }
  loading:           boolean
  error:             string | null
  onClose:           () => void
  onChange:          (f: { platform: string; copy: string; asset_url: string }) => void
  onSubmit:          (e: React.FormEvent) => void
}) {
  // Show campaign's platforms first, then rest
  const ordered = [
    ...campaignPlatforms.filter(p => PLATFORMS_LIST.includes(p)),
    ...PLATFORMS_LIST.filter(p => !campaignPlatforms.includes(p)),
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.12)' }}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <span className="font-bold text-white flex items-center gap-2">
            <Plus size={16} style={{ color: '#a5b4fc' }} /> Add Post
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'var(--muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Platform */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
              Platform
            </label>
            <div className="flex flex-wrap gap-2">
              {ordered.map(p => {
                const selected = form.platform === p
                const pColor   = getPlatformColor(p)
                const emoji    = PLATFORM_EMOJI[p] ?? '📝'
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onChange({ ...form, platform: p })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                    style={{
                      background: selected ? `${pColor}18` : 'rgba(255,255,255,0.04)',
                      border:     selected ? `1px solid ${pColor}50` : '1px solid var(--border)',
                      color:      selected ? pColor : 'var(--muted-light)',
                    }}>
                    {emoji} {p}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Copy */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
              Post Copy
            </label>
            <textarea
              value={form.copy}
              onChange={e => onChange({ ...form, copy: e.target.value })}
              placeholder="Write or paste the post copy…"
              rows={5}
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          {/* Asset URL */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
              Asset URL
              <span className="ml-2 text-[10px] font-normal normal-case opacity-60">optional</span>
            </label>
            <input
              value={form.asset_url}
              onChange={e => onChange({ ...form, asset_url: e.target.value })}
              placeholder="https://drive.google.com/…"
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          {error && (
            <div
              className="rounded-lg px-3 py-2 text-xs"
              style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5' }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 border-t flex items-center justify-end gap-2"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--muted-light)' }}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !form.platform || !form.copy.trim()}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: '#6366f1', color: '#fff' }}>
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            Add Post
          </button>
        </div>
      </form>
    </div>
  )
}

'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Megaphone, Plus, RefreshCw, CheckCircle2, Clock, Circle,
  XCircle, CalendarDays, LayoutGrid,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
type CampaignStatus = 'draft' | 'active' | 'completed' | 'paused'

interface Campaign {
  id: string
  site_id: string
  name: string
  site_type: string
  status: CampaignStatus
  platforms: string[]
  content_types: string[]
  week_start: string
  timezone: string
  created_at: string
  // joined from sites
  sites?: {
    name: string
    url: string
    stack: string
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────
const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'

const STATUS_META: Record<CampaignStatus, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode
}> = {
  draft:     { label: 'Draft',     color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', icon: <Circle size={11} /> },
  active:    { label: 'Active',    color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.2)',  icon: <CheckCircle2 size={11} /> },
  completed: { label: 'Completed', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)',  icon: <CheckCircle2 size={11} /> },
  paused:    { label: 'Paused',    color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.2)',   icon: <Clock size={11} /> },
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  facebook:  <span style={{ fontSize: 11, lineHeight: 1 }}>📘</span>,
  instagram: <span style={{ fontSize: 11, lineHeight: 1 }}>📸</span>,
  youtube:   <span style={{ fontSize: 11, lineHeight: 1 }}>▶️</span>,
  linkedin:  <span style={{ fontSize: 11, lineHeight: 1 }}>💼</span>,
  tiktok:    <span style={{ fontSize: 11, lineHeight: 1 }}>🎵</span>,
  pinterest: <span style={{ fontSize: 11, lineHeight: 1 }}>📌</span>,
  gbp:       <span style={{ fontSize: 11, lineHeight: 1 }}>📍</span>,
  nextdoor:  <span style={{ fontSize: 11, lineHeight: 1 }}>🏘️</span>,
}

const PLATFORM_COLORS: Record<string, string> = {
  facebook:  '#60a5fa',
  instagram: '#f472b6',
  youtube:   '#f87171',
  linkedin:  '#60a5fa',
  tiktok:    '#94a3b8',
  pinterest: '#f472b6',
  gbp:       '#34d399',
  nextdoor:  '#fbbf24',
}

type FilterTab = 'all' | CampaignStatus

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatWeekStart(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MarketingCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<FilterTab>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const res = await fetch(`/api/marketing/campaigns${params}`, {
        headers: { 'x-api-key': API_KEY },
      })
      if (res.ok) {
        const data = await res.json()
        setCampaigns(Array.isArray(data) ? data : [])
      }
    } catch {
      // ignore
    }
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const filtered = campaigns

  const tabCounts: Record<FilterTab, number> = {
    all:       campaigns.length,
    draft:     campaigns.filter(c => c.status === 'draft').length,
    active:    campaigns.filter(c => c.status === 'active').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    paused:    campaigns.filter(c => c.status === 'paused').length,
  }

  return (
    <div className="max-w-7xl">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Megaphone size={22} style={{ color: '#6366f1' }} />
            <h1 className="text-2xl font-bold text-white">Marketing Campaigns</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            Phase 1 — plan, review and approve weekly posts across all platforms
          </p>
        </div>
        <Link
          href="/marketing/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#a5b4fc' }}>
          <Plus size={15} /> New Campaign
        </Link>
      </div>

      {/* ── Filter tabs ───────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-wrap mb-6">
        {(['all', 'draft', 'active', 'completed', 'paused'] as FilterTab[]).map(tab => {
          const active = filter === tab
          const meta   = tab === 'all' ? null : STATUS_META[tab as CampaignStatus]
          const color  = meta?.color ?? '#6366f1'
          const bg     = meta?.bg    ?? 'rgba(99,102,241,0.15)'
          const border = meta?.border ?? 'rgba(99,102,241,0.35)'
          const label  = tab === 'all' ? 'All' : (meta?.label ?? tab)
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize flex items-center gap-1.5"
              style={{
                color:      active ? color : 'var(--muted-light)',
                background: active ? bg    : 'rgba(255,255,255,0.04)',
                border:     active ? `1px solid ${border}` : '1px solid var(--border)',
              }}>
              {label}
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: active ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.06)',
                  color: active ? color : 'var(--muted)',
                }}>
                {tabCounts[tab]}
              </span>
            </button>
          )
        })}
        <button
          onClick={load}
          disabled={loading}
          className="ml-auto p-1.5 rounded-lg transition-all"
          style={{ color: 'var(--muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-sm" style={{ color: 'var(--muted)' }}>
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading campaigns…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(campaign => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── CampaignCard ──────────────────────────────────────────────────────────────
function CampaignCard({ campaign }: { campaign: Campaign }) {
  const meta = STATUS_META[campaign.status] ?? STATUS_META.draft

  return (
    <Link
      href={`/marketing/campaigns/${campaign.id}/review`}
      className="block rounded-xl transition-all group"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.35)'; (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.04)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}>

      {/* Card header */}
      <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-white leading-snug truncate">{campaign.name}</h3>
          {/* Status chip */}
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
            style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
            {meta.icon}
            {meta.label}
          </span>
        </div>

        {/* Site info */}
        {campaign.sites && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate" style={{ color: 'var(--muted-light)' }}>
              {campaign.sites.name}
            </span>
            {campaign.site_type && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                {campaign.site_type}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="px-4 py-3 space-y-3">
        {/* Week start */}
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          <CalendarDays size={12} />
          <span>Week of {formatWeekStart(campaign.week_start)}</span>
        </div>

        {/* Platforms */}
        {campaign.platforms && campaign.platforms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {campaign.platforms.map(p => (
              <span
                key={p}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  color: PLATFORM_COLORS[p] ?? '#94a3b8',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid rgba(255,255,255,0.08)`,
                }}>
                {PLATFORM_ICONS[p] ?? null}
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </span>
            ))}
          </div>
        )}

        {/* Content types */}
        {campaign.content_types && campaign.content_types.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {campaign.content_types.map(ct => (
              <span
                key={ct}
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ color: 'var(--muted)', background: 'rgba(255,255,255,0.04)' }}>
                {ct}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
          {new Date(campaign.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <span
          className="text-[10px] font-semibold flex items-center gap-1 transition-colors group-hover:text-indigo-400"
          style={{ color: '#6366f1' }}>
          Review posts →
        </span>
      </div>
    </Link>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────
function EmptyState({ filter }: { filter: FilterTab }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 rounded-xl border text-center"
      style={{ borderColor: 'var(--border)' }}>
      <LayoutGrid size={40} className="mb-4 opacity-20 text-white" />
      <p className="text-sm font-semibold text-white mb-1">
        {filter === 'all' ? 'No campaigns yet' : `No ${filter} campaigns`}
      </p>
      <p className="text-xs mb-5" style={{ color: 'var(--muted)' }}>
        {filter === 'all'
          ? 'Create your first campaign to start planning weekly posts'
          : `Switch to "All" to see campaigns in other states`}
      </p>
      {filter === 'all' && (
        <Link
          href="/marketing/campaigns/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#a5b4fc' }}>
          <Plus size={14} /> Create Campaign
        </Link>
      )}
    </div>
  )
}

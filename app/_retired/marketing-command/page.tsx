export const dynamic = 'force-dynamic'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import {
  Target, Mail, Globe, CheckCircle2, AlertCircle,
  TrendingUp, DollarSign, Users, Briefcase, Zap,
  ExternalLink, ChevronRight, Building2,
  BookOpen, Mountain, Layers
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Prospect = {
  id: string; business_name: string; city: string | null
  stage: string; current_touch: number; next_touch_date: string | null
  deal_value: number | null; monthly_value: number | null
  outreach_campaign_id: string | null; created_at: string
}

type MarketingTask = {
  id: string; type: string; text: string; site: string | null
  channel: string | null; done: boolean; created_at: string
}

type Offer = {
  id: string; name: string; slug: string; lane: string
  price_min: number; price_max: number; recurring_min: number | null
  recurring_max: number | null; description: string | null
  landing_path: string | null; status: string
}

type SiteInventory = {
  id: string; name: string; repo_path: string | null; live_url: string | null
  category: string; lane: string | null; proof_status: string; notes: string | null
}

// ─── Config ──────────────────────────────────────────────────────────────────

const LANE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; accent: string }> = {
  contractor:  { label: 'Local Contractor Builds', icon: Building2,  color: '#f59e0b', accent: 'rgba(245,158,11,0.12)' },
  medical:     { label: 'Medical Authority Sites',  icon: Briefcase,  color: '#34d399', accent: 'rgba(52,211,153,0.12)' },
  lms:         { label: 'LMS / Language Products',  icon: BookOpen,   color: '#60a5fa', accent: 'rgba(96,165,250,0.12)' },
  platform:    { label: 'White-Label Worker Bee OS', icon: Layers,    color: '#a78bfa', accent: 'rgba(167,139,250,0.12)' },
  audit:       { label: '10x Audit / Rebuilds',     icon: Zap,        color: '#fb923c', accent: 'rgba(251,146,60,0.12)' },
}

const PROOF_CONFIG: Record<string, { label: string; color: string }> = {
  portfolio_ready:   { label: 'Portfolio Ready', color: '#34d399' },
  demo_spec_proof:   { label: 'Demo Proof',      color: '#60a5fa' },
  live_client_proof: { label: 'Live Client',     color: '#a78bfa' },
  needs_polish:      { label: 'Needs Polish',    color: '#f59e0b' },
  campaign_active:   { label: 'Active',          color: '#fb923c' },
  not_reviewed:      { label: 'Not Reviewed',    color: '#64748b' },
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  contractor:       Building2,
  medical:          Briefcase,
  language_lms:     BookOpen,
  climbing_content: Mountain,
  platform:         Layers,
  other:            Globe,
}

const STAGE_COLOR: Record<string, string> = {
  new:             '#64748b',
  active:          '#60a5fa',
  engaged:         '#818cf8',
  hot:             '#f59e0b',
  in_conversation: '#f97316',
  proposal_sent:   '#a78bfa',
  won:             '#34d399',
  lost:            '#f87171',
  archived:        '#475569',
}

import type React from 'react'

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: color ?? 'white' }}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</p>}
    </div>
  )
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</p>}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function MarketingCommandPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabaseAdmin as any

  const today = new Date().toISOString().split('T')[0]

  const [prospectsRes, tasksRes, offersRes, inventoryRes] = await Promise.all([
    sb.from('prospects')
      .select('id,business_name,city,stage,current_touch,next_touch_date,deal_value,monthly_value,outreach_campaign_id,created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    sb.from('marketing_tasks').select('*').eq('done', false).order('created_at', { ascending: false }).limit(60),
    sb.from('marketing_offers').select('*').eq('status', 'active').order('lane'),
    sb.from('marketing_site_inventory').select('*').order('proof_status').limit(100),
  ])

  const prospects: Prospect[]   = prospectsRes.data ?? []
  const tasks: MarketingTask[]  = tasksRes.data     ?? []
  const offers: Offer[]         = offersRes.data    ?? []
  const inventory: SiteInventory[] = inventoryRes.data ?? []

  // Aggregate prospect funnel using the full stage system
  const stageCounts = prospects.reduce<Record<string, number>>((acc, p) => {
    const s = p.stage ?? 'new'
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})

  const activeProspects = prospects.filter(p => !['won','lost','archived'].includes(p.stage))
  const dueToday        = prospects.filter(p =>
    p.next_touch_date && p.next_touch_date <= today && !['won','lost','archived'].includes(p.stage)
  )
  const pipelineValue   = activeProspects.reduce((sum, p) => sum + (p.deal_value ?? 750), 0)

  // Funnel rows: collapse active/engaged/hot/in_conversation → "In Progress"
  const newCount      = stageCounts.new             ?? 0
  const activeCount   = (stageCounts.active ?? 0) + (stageCounts.engaged ?? 0) + (stageCounts.hot ?? 0) + (stageCounts.in_conversation ?? 0)
  const proposalCount = stageCounts.proposal_sent   ?? 0
  const wonCount      = stageCounts.won             ?? 0
  const lostCount     = stageCounts.lost            ?? 0

  // Today's tasks — split by type
  const todoTasks  = tasks.filter(t => t.type === 'todo').slice(0, 8)
  const couldDo    = tasks.filter(t => t.type === 'could_do').slice(0, 5)

  // Inventory grouped by category
  const byCategory = inventory.reduce<Record<string, SiteInventory[]>>((acc, s) => {
    acc[s.category] = [...(acc[s.category] ?? []), s]
    return acc
  }, {})

  // Proof-ready sites (portfolio, demo, live)
  const proofReady = inventory.filter(s =>
    ['portfolio_ready','demo_spec_proof','live_client_proof'].includes(s.proof_status)
  )

  // Active offers by lane
  const offersByLane = offers.reduce<Record<string, Offer[]>>((acc, o) => {
    acc[o.lane] = [...(acc[o.lane] ?? []), o]
    return acc
  }, {})

  const needsPolish = inventory.filter(s => s.proof_status === 'needs_polish')

  return (
    <div className="max-w-[1400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Marketing Command</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            What do you do today to make money?
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/marketing-command/campaign-generator"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 cursor-pointer"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
            <Zap size={14} />
            Generate Campaign
          </Link>
          <Link href="/leads"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 cursor-pointer"
            style={{ background: 'var(--surface)', color: 'white', border: '1px solid var(--border)' }}>
            <Users size={14} />
            All Leads
          </Link>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <KpiCard label="New Prospects"  value={newCount}          color="#64748b" />
        <KpiCard label="In Progress"    value={activeCount}       color="#60a5fa" />
        <KpiCard label="Proposal Out"   value={proposalCount}     color="#a78bfa" />
        <KpiCard label="Won"            value={wonCount}          color="#34d399" />
        <KpiCard label="Due Today"      value={dueToday.length}   color={dueToday.length > 0 ? '#f59e0b' : undefined} sub={`$${(pipelineValue/1000).toFixed(0)}k pipeline`} />
        <KpiCard label="Proof Sites"    value={proofReady.length} sub={`${needsPolish.length} need polish`} color="#60a5fa" />
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — Revenue lanes + Active offers */}
        <div className="space-y-6">
          <div>
            <SectionHeader title="Revenue Lanes" sub="Active offers by lane" />
            <div className="space-y-3">
              {Object.entries(LANE_CONFIG).map(([laneKey, cfg]) => {
                const laneOffers = offersByLane[laneKey] ?? []
                const LaneIcon = cfg.icon
                return (
                  <div key={laneKey} className="rounded-xl p-4"
                    style={{ background: cfg.accent, border: `1px solid ${cfg.color}25` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <LaneIcon size={14} style={{ color: cfg.color }} />
                      <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                    {laneOffers.length === 0 ? (
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>No active offers</p>
                    ) : (
                      <div className="space-y-1.5">
                        {laneOffers.map(o => (
                          <div key={o.id} className="flex items-center justify-between">
                            <span className="text-xs text-white">{o.name}</span>
                            <span className="text-xs font-semibold tabular-nums" style={{ color: cfg.color }}>
                              ${o.price_min.toLocaleString()}
                              {o.price_max !== o.price_min ? `–${o.price_max.toLocaleString()}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Proof library */}
          <div>
            <SectionHeader title="Proof Library" sub="Sites ready to show prospects" />
            <div className="space-y-2">
              {proofReady.slice(0, 10).map(s => {
                const cfg = PROOF_CONFIG[s.proof_status] ?? PROOF_CONFIG.not_reviewed
                const CatIcon = CATEGORY_ICON[s.category] ?? Globe
                return (
                  <div key={s.id} className="flex items-center gap-3 py-2 px-3 rounded-lg group transition-all hover:opacity-80 cursor-pointer"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <CatIcon size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <span className="text-xs text-white flex-1 truncate">{s.name}</span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: `${cfg.color}18`, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    {s.live_url && (
                      <a href={s.live_url} target="_blank" rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => e.stopPropagation()}>
                        <ExternalLink size={10} style={{ color: 'var(--muted)' }} />
                      </a>
                    )}
                  </div>
                )
              })}
              {proofReady.length > 10 && (
                <p className="text-xs text-center pt-1" style={{ color: 'var(--muted)' }}>
                  +{proofReady.length - 10} more
                </p>
              )}
            </div>
          </div>
        </div>

        {/* MIDDLE — Today's actions */}
        <div className="space-y-6">
          <div>
            <SectionHeader title="Today's Actions" sub={`${todoTasks.length} queued · ${couldDo.length} could-do`} />
            {todoTasks.length === 0 ? (
              <div className="rounded-xl p-6 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <CheckCircle2 size={24} className="mx-auto mb-2" style={{ color: '#34d399' }} />
                <p className="text-sm text-white font-medium">No tasks queued</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  Generate a campaign to create outreach tasks
                </p>
                <Link href="/marketing-command/campaign-generator"
                  className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium transition-all hover:opacity-80 cursor-pointer"
                  style={{ color: '#f59e0b' }}>
                  Generate Campaign <ChevronRight size={12} />
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {todoTasks.map((t, i) => (
                  <div key={t.id} className="rounded-lg px-3 py-2.5 flex items-start gap-3"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <span className="text-[10px] font-bold tabular-nums mt-0.5 w-4 text-right flex-shrink-0"
                      style={{ color: 'var(--muted)' }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white leading-snug">{t.text}</p>
                      {(t.site || t.channel) && (
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                          {[t.site, t.channel].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {couldDo.length > 0 && (
            <div>
              <SectionHeader title="Could Do" sub="Lower priority — do if time" />
              <div className="space-y-1.5">
                {couldDo.map(t => (
                  <div key={t.id} className="rounded-lg px-3 py-2 flex items-start gap-2"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                    <AlertCircle size={11} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--muted)' }} />
                    <p className="text-xs leading-snug" style={{ color: 'var(--muted)' }}>{t.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick links to related pages */}
          <div>
            <SectionHeader title="Related Tools" />
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: '/marketing',       label: 'Campaign Plans', icon: Mail },
                { href: '/marketing-push',  label: 'Mktg Push',      icon: Target },
                { href: '/build-offer',     label: 'Build Offer',    icon: Globe },
                { href: '/campaigns',       label: 'Email Campaigns', icon: Mail },
                { href: '/contacts',        label: 'Contacts',        icon: Users },
                { href: '/monetization',    label: 'Monetization',   icon: DollarSign },
              ].map(item => {
                const ItemIcon = item.icon
                return (
                  <Link key={item.href} href={item.href}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 cursor-pointer"
                    style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                    <ItemIcon size={12} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — Lead funnel + sites needing polish */}
        <div className="space-y-6">
          {/* Prospect funnel */}
          <div>
            <SectionHeader title="Prospect Pipeline" sub={`${prospects.length} total · $${(pipelineValue/1000).toFixed(0)}k active value`} />
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {[
                { key: 'new',          label: 'New',        count: newCount,      color: STAGE_COLOR.new },
                { key: 'active',       label: 'In Progress', count: activeCount,  color: STAGE_COLOR.active },
                { key: 'proposal_sent',label: 'Proposal',   count: proposalCount, color: STAGE_COLOR.proposal_sent },
                { key: 'won',          label: 'Won',        count: wonCount,      color: STAGE_COLOR.won },
                { key: 'lost',         label: 'Lost',       count: lostCount,     color: STAGE_COLOR.lost },
              ].map(row => (
                <div key={row.key} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <div className="w-16 flex-shrink-0">
                    <div className="h-1 rounded-full" style={{ background: 'var(--border)' }}>
                      <div className="h-1 rounded-full transition-all"
                        style={{ width: prospects.length ? `${Math.round(row.count / prospects.length * 100)}%` : '0%', background: row.color }} />
                    </div>
                  </div>
                  <span className="text-xs flex-1" style={{ color: 'var(--muted)' }}>{row.label}</span>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: row.color }}>{row.count}</span>
                </div>
              ))}
            </div>

            {/* Due today — need action */}
            {dueToday.slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center gap-3 mt-2 px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <Users size={12} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{p.business_name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                    {p.city ?? '—'} · touch {p.current_touch + 1}
                  </p>
                </div>
                <Link href={`/leads/${p.id}`}
                  className="text-[10px] font-medium hover:opacity-80 cursor-pointer transition-all"
                  style={{ color: '#f59e0b' }}>
                  Go →
                </Link>
              </div>
            ))}
            {dueToday.length === 0 && prospects.length > 0 && (
              <p className="text-xs text-center mt-3" style={{ color: 'var(--muted)' }}>
                No touches due today
              </p>
            )}
          </div>

          {/* Sites needing polish */}
          {needsPolish.length > 0 && (
            <div>
              <SectionHeader title="Needs Polish" sub={`${needsPolish.length} sites — image or content fixes pending`} />
              <div className="space-y-2">
                {needsPolish.slice(0, 8).map(s => (
                  <div key={s.id} className="rounded-lg px-3 py-2.5 flex items-start gap-3"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <AlertCircle size={12} className="mt-0.5 flex-shrink-0" style={{ color: '#f59e0b' }} />
                    <div className="min-w-0">
                      <p className="text-xs text-white truncate">{s.name}</p>
                      {s.notes && (
                        <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--muted)' }}>
                          {s.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Site inventory by category */}
          <div>
            <SectionHeader title="Full Inventory" sub={`${inventory.length} sites tracked`} />
            <div className="space-y-2">
              {Object.entries(byCategory).map(([cat, sites]) => {
                const CatIcon = CATEGORY_ICON[cat] ?? Globe
                const label = cat.replace(/_/g, ' ')
                return (
                  <div key={cat} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <CatIcon size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                    <span className="text-xs capitalize flex-1" style={{ color: 'var(--muted)' }}>{label}</span>
                    <span className="text-xs font-semibold text-white tabular-nums">{sites.length}</span>
                    <TrendingUp size={10} style={{ color: 'var(--muted)' }} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

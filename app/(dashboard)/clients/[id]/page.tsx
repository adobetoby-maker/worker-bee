export const dynamic = 'force-dynamic'

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import {
  Users, Mail, Phone, Building2, ExternalLink, Plus, Clock,
  DollarSign, ChevronRight, CheckCircle, Circle, AlertCircle,
  MessageSquare, Inbox, Pencil, Globe,
} from 'lucide-react'

export const metadata = { title: 'Client — Worker-Bee' }

const db = supabaseAdmin as any

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    new:         { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)' },
    scoped:      { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
    quoted:      { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)' },
    approved:    { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)' },
    in_progress: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
    complete:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)' },
    declined:    { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
  }
  const s = map[status] ?? map.new
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {status.replace('_', ' ')}
    </span>
  )
}

function SiteStatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    active:      { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    maintenance: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    building:    { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
    archived:    { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  }
  const s = map[status] ?? map.active
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}44` }}
    >
      {status}
    </span>
  )
}

function MilestoneBar({ complete, total }: { complete: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((complete / total) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct === 100 ? '#10b981' : 'linear-gradient(90deg, #6366f1, #818cf8)',
          }}
        />
      </div>
      <span className="text-xs shrink-0" style={{ color: 'var(--muted)' }}>
        {complete}/{total}
      </span>
    </div>
  )
}

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params

  // Fetch client
  const { data: client, error: clientError } = await db
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (clientError || !client) notFound()

  // Fetch all linked sites
  const { data: sites } = await db
    .from('sites')
    .select('id, name, url, status')
    .eq('client_id', id)
    .order('name', { ascending: true })

  const siteList: any[] = sites ?? []
  const siteIds = siteList.map((s: any) => s.id)

  // Fetch project_costs, time_entries, milestones for all sites
  const [costsRes, timeRes, milestonesRes, requestsRes] = await Promise.all([
    siteIds.length > 0
      ? db.from('project_costs').select('site_id, amount_cents, billing_cycle, active, service, label').in('site_id', siteIds)
      : { data: [] },
    siteIds.length > 0
      ? db.from('time_entries').select('site_id, hours, rate_cents, billed, date, description').in('site_id', siteIds).order('date', { ascending: false })
      : { data: [] },
    siteIds.length > 0
      ? db.from('project_milestones').select('site_id, status').in('site_id', siteIds)
      : { data: [] },
    db
      .from('project_requests')
      .select('*')
      .eq('client_id', id)
      .order('received_at', { ascending: false })
      .limit(5),
  ])

  const costs: any[] = costsRes.data ?? []
  const timeEntries: any[] = timeRes.data ?? []
  const milestones: any[] = milestonesRes.data ?? []
  const requests: any[] = requestsRes.data ?? []

  // Per-site lookups
  function siteMonthly(siteId: string) {
    return costs
      .filter((c: any) => c.site_id === siteId && c.active && c.billing_cycle === 'monthly')
      .reduce((sum: number, c: any) => sum + c.amount_cents, 0)
  }
  function siteHours(siteId: string) {
    return timeEntries
      .filter((t: any) => t.site_id === siteId)
      .reduce((sum: number, t: any) => sum + t.hours, 0)
  }
  function siteUnbilledHours(siteId: string) {
    return timeEntries
      .filter((t: any) => t.site_id === siteId && !t.billed)
      .reduce((sum: number, t: any) => sum + t.hours, 0)
  }
  function siteMilestones(siteId: string) {
    const sm = milestones.filter((m: any) => m.site_id === siteId)
    return {
      total: sm.length,
      complete: sm.filter((m: any) => m.status === 'complete').length,
    }
  }

  // Totals for header cards
  const totalMonthly = siteIds.reduce((sum: number, sid: string) => sum + siteMonthly(sid), 0)
  const totalHours = timeEntries.reduce((sum: number, t: any) => sum + t.hours, 0)
  const totalUnbilled = timeEntries.filter((t: any) => !t.billed).reduce((sum: number, t: any) => sum + t.hours, 0)

  const sourceIcon: Record<string, string> = {
    phone: '📞',
    form: '📋',
    email: '✉️',
    message: '💬',
    other: '📌',
  }

  return (
    <div className="max-w-5xl space-y-8">
      {/* ── Client header ──────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}
            >
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">{client.name}</h1>
              {client.company && (
                <div className="flex items-center gap-1.5 mt-1 text-sm" style={{ color: 'var(--muted-light)' }}>
                  <Building2 size={13} />
                  {client.company}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-2">
                {client.email && (
                  <a
                    href={`mailto:${client.email}`}
                    className="flex items-center gap-1.5 text-sm hover:text-indigo-300 transition-colors"
                    style={{ color: 'var(--muted-light)' }}
                  >
                    <Mail size={13} />
                    {client.email}
                  </a>
                )}
                {client.phone && (
                  <a
                    href={`tel:${client.phone}`}
                    className="flex items-center gap-1.5 text-sm hover:text-indigo-300 transition-colors"
                    style={{ color: 'var(--muted-light)' }}
                  >
                    <Phone size={13} />
                    {client.phone}
                  </a>
                )}
              </div>
              {client.notes && (
                <p className="mt-3 text-sm max-w-xl" style={{ color: 'var(--muted)' }}>{client.notes}</p>
              )}
            </div>
          </div>

          <Link
            href={`/clients/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              color: 'var(--muted-light)',
            }}
          >
            <Pencil size={12} /> Edit
          </Link>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}
          >
            <Globe size={12} />
            {siteList.length} project{siteList.length !== 1 ? 's' : ''}
          </div>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}
          >
            <DollarSign size={12} />
            {totalMonthly > 0 ? formatCents(totalMonthly) + '/mo upkeep' : 'No upkeep costs'}
          </div>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}
          >
            <Clock size={12} />
            {totalHours.toFixed(1)}h logged
            {totalUnbilled > 0 && (
              <span style={{ color: '#f87171' }}> · {totalUnbilled.toFixed(1)}h unbilled</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Projects section ───────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white">Projects</h2>
          <Link
            href="/sites/new"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.3)',
              color: '#818cf8',
            }}
          >
            <Plus size={12} /> New Site
          </Link>
        </div>

        {siteList.length === 0 ? (
          <div
            className="rounded-xl border p-8 text-center"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <Globe size={32} className="mx-auto mb-3 opacity-20 text-white" />
            <p className="text-sm text-white mb-1">No projects yet</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Create a site and assign this client to it.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {siteList.map((site: any) => {
              const monthly = siteMonthly(site.id)
              const hours = siteHours(site.id)
              const unbilled = siteUnbilledHours(site.id)
              const { total: mTotal, complete: mComplete } = siteMilestones(site.id)
              return (
                <div
                  key={site.id}
                  className="rounded-xl border p-4"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{site.name}</span>
                        <SiteStatusBadge status={site.status ?? 'active'} />
                      </div>
                      {site.url && (
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 mt-0.5 text-xs hover:text-indigo-300 transition-colors"
                          style={{ color: 'var(--muted)' }}
                        >
                          <ExternalLink size={10} />
                          {site.url.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </div>

                    {/* Action links */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {[
                        { href: `/sites/${site.id}`, label: 'View' },
                        { href: `/sites/${site.id}/costs`, label: 'Costs' },
                        { href: `/sites/${site.id}/time`, label: 'Time' },
                        { href: `/sites/${site.id}/milestones`, label: 'Milestones' },
                      ].map(({ href, label }) => (
                        <Link
                          key={label}
                          href={href}
                          className="text-xs px-2.5 py-1 rounded-lg border transition-colors hover:border-indigo-400/50 hover:text-indigo-300"
                          style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="mt-3 flex flex-wrap gap-4 text-xs" style={{ color: 'var(--muted-light)' }}>
                    <span className="flex items-center gap-1">
                      <DollarSign size={11} style={{ color: '#10b981' }} />
                      {monthly > 0 ? formatCents(monthly) + '/mo' : 'No upkeep'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} style={{ color: unbilled > 0 ? '#f87171' : '#f59e0b' }} />
                      {hours.toFixed(1)}h logged
                      {unbilled > 0 && (
                        <span style={{ color: '#f87171' }}>· {unbilled.toFixed(1)}h unbilled</span>
                      )}
                    </span>
                    {mTotal > 0 && (
                      <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                        {mComplete === mTotal ? (
                          <CheckCircle size={11} style={{ color: '#10b981', flexShrink: 0 }} />
                        ) : (
                          <Circle size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                        )}
                        <MilestoneBar complete={mComplete} total={mTotal} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Recent requests ────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white">Recent Requests</h2>
          <Link
            href={`/clients/${id}/requests/new`}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.25)',
              color: '#34d399',
            }}
          >
            <Plus size={12} /> Log Request
          </Link>
        </div>

        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Inbox size={32} className="opacity-20 text-white" />
              <p className="text-xs" style={{ color: 'var(--muted)' }}>No requests yet</p>
            </div>
          ) : (
            <div>
              {requests.map((req: any, i: number) => (
                <div
                  key={req.id}
                  className="flex items-start gap-4 px-5 py-3.5 border-b last:border-b-0"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                >
                  <div className="text-base shrink-0 mt-0.5" aria-hidden>
                    {sourceIcon[req.source] ?? '📌'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white truncate">{req.title}</span>
                      <StatusBadge status={req.status} />
                    </div>
                    {req.description && (
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--muted)' }}>
                        {req.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--muted)' }}>
                      <span>{formatDate(req.received_at)}</span>
                      {req.estimated_hours && (
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {req.estimated_hours}h est.
                        </span>
                      )}
                      {req.estimated_cents && (
                        <span className="flex items-center gap-1">
                          <DollarSign size={10} /> {formatCents(req.estimated_cents)} est.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Billing link ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-base font-bold text-white mb-3">Billing</h2>
        <Link
          href={`/billing?client=${encodeURIComponent(client.name)}`}
          className="flex items-center justify-between px-5 py-4 rounded-xl border transition-colors hover:bg-white/[0.02] group"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}
            >
              <DollarSign size={16} style={{ color: '#10b981' }} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">View Invoices</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                See all billing for {client.name}
              </p>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--muted)' }} className="group-hover:text-indigo-400 transition-colors" />
        </Link>
      </section>
    </div>
  )
}

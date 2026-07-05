export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ArrowLeft, TrendingUp, DollarSign, MousePointerClick, RefreshCw } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import { SITE_MONETIZATION } from '@/lib/monetization'

type DbEarningsRow = {
  id: string
  site_id: string
  program_id: string
  period_month: string
  clicks: number
  conversions: number
  earnings_cents: number
  currency: string
  status: string
}

type SiteRow = { id: string; name: string; url: string | null }

// ── Small stat card ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{label}</div>
      <div className="text-2xl font-bold font-mono" style={{ color }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{sub}</div>}
    </div>
  )
}

// ── Earnings bar ───────────────────────────────────────────────────────────────

function Bar({ pct, color = '#34d399' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full flex-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(pct, 2)}%`, background: color, transition: 'width 0.4s ease' }}
      />
    </div>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    paid:      { color: '#34d399', bg: '#34d39918' },
    confirmed: { color: '#60a5fa', bg: '#60a5fa18' },
    pending:   { color: '#f59e0b', bg: '#f59e0b18' },
  }
  const s = map[status] ?? { color: '#94a3b8', bg: '#94a3b818' }
  return (
    <span className="text-xs px-1.5 py-0.5 rounded" style={{ color: s.color, background: s.bg }}>
      {status}
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function EarningsPage() {
  // Fetch all earnings + sites in parallel
  const [earningsResult, sitesResult] = await Promise.all([
    supabaseAdmin
      .from('affiliate_earnings')
      .select('id,site_id,program_id,period_month,clicks,conversions,earnings_cents,currency,status')
      .order('period_month', { ascending: false }),
    supabaseAdmin
      .from('sites')
      .select('id,name,url')
      .order('name'),
  ])

  const rows = (earningsResult.data ?? []) as DbEarningsRow[]
  const sites = (sitesResult.data ?? []) as SiteRow[]

  // Build site-id → site-name map using Supabase rows; fall back to lib/monetization registry
  const siteNameMap: Record<string, string> = {}
  for (const s of sites) siteNameMap[s.id] = s.name
  for (const sm of SITE_MONETIZATION) {
    const dbSite = sites.find(
      s => (s.url ?? '').includes(sm.siteKey) ||
           (s.name ?? '').toLowerCase().includes(sm.siteKey.replace(/^climb-/, '').replace(/-/g, ' ')),
    )
    if (dbSite && !siteNameMap[dbSite.id]) siteNameMap[dbSite.id] = sm.siteName
  }

  // Build program-id → program-name map from monetization registry
  const programNameMap: Record<string, string> = {}
  for (const sm of SITE_MONETIZATION) {
    for (const aff of sm.affiliates) {
      if (!programNameMap[aff.id]) programNameMap[aff.id] = aff.name
    }
  }

  // ── Global rollup ────────────────────────────────────────────────────────────

  const totalCents = rows.reduce((s, r) => s + r.earnings_cents, 0)
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0)
  const totalConversions = rows.reduce((s, r) => s + r.conversions, 0)

  // Per-site rollup
  const bySite: Record<string, { cents: number; clicks: number; conversions: number }> = {}
  for (const r of rows) {
    if (!bySite[r.site_id]) bySite[r.site_id] = { cents: 0, clicks: 0, conversions: 0 }
    bySite[r.site_id].cents += r.earnings_cents
    bySite[r.site_id].clicks += r.clicks
    bySite[r.site_id].conversions += r.conversions
  }
  const siteEntries = Object.entries(bySite).sort((a, b) => b[1].cents - a[1].cents)
  const maxSiteCents = siteEntries[0]?.[1].cents ?? 1

  // Per-program rollup
  const byProgram: Record<string, number> = {}
  for (const r of rows) {
    byProgram[r.program_id] = (byProgram[r.program_id] ?? 0) + r.earnings_cents
  }
  const programEntries = Object.entries(byProgram).sort((a, b) => b[1] - a[1])
  const maxProgramCents = programEntries[0]?.[1] ?? 1

  // Per-month rollup (last 12 months)
  const byMonth: Record<string, number> = {}
  for (const r of rows) {
    const m = r.period_month?.slice(0, 7) ?? 'unknown'
    byMonth[m] = (byMonth[m] ?? 0) + r.earnings_cents
  }
  const monthEntries = Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
  const maxMonthCents = monthEntries.reduce((m, [, c]) => Math.max(m, c), 1)

  const convRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) + '%' : '—'
  const avgPerMonth = monthEntries.length > 0 ? (totalCents / monthEntries.length / 100).toFixed(2) : '0.00'

  const isEmpty = rows.length === 0

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href="/monetization"
            className="flex items-center gap-1.5 text-sm mb-3 hover:text-indigo-400 transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            <ArrowLeft size={14} /> All Monetization
          </Link>
          <h1 className="text-2xl font-bold text-white">Earnings Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Revenue generated across all sites from affiliate programs
          </p>
        </div>
        <Link
          href="/monetization"
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--muted-light)', background: 'var(--surface)' }}
        >
          <RefreshCw size={13} /> Refresh
        </Link>
      </div>

      {isEmpty ? (
        /* ── Empty state ─────────────────────────────────────────────────────── */
        <div className="rounded-2xl border p-16 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(52,211,153,0.1)' }}>
            <DollarSign size={22} style={{ color: '#34d399' }} />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">No earnings logged yet</h2>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--muted)' }}>
            Once you start earning commissions from affiliate programs, log them on any site&apos;s monetization page.
            They&apos;ll appear here aggregated.
          </p>
          <Link
            href="/monetization"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: '#6366f1', color: 'white' }}
          >
            View sites to log earnings →
          </Link>
        </div>
      ) : (
        <>
          {/* ── Summary stats ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard label="Total Earned" value={`$${(totalCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} color="#34d399" sub="all time, all sites" />
            <StatCard label="Avg / Month" value={`$${avgPerMonth}`} color="#f59e0b" sub={`over ${monthEntries.length} months`} />
            <StatCard label="Total Clicks" value={totalClicks.toLocaleString()} color="#60a5fa" sub={`${convRate} conv. rate`} />
            <StatCard label="Conversions" value={totalConversions.toLocaleString()} color="#a78bfa" sub="across all programs" />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* ── Per-site breakdown ──────────────────────────────────────────── */}
            <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={14} style={{ color: '#34d399' }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  By Site
                </span>
              </div>
              <div className="space-y-4">
                {siteEntries.map(([siteId, data]) => {
                  const pct = Math.round((data.cents / maxSiteCents) * 100)
                  const name = siteNameMap[siteId] ?? siteId
                  const sm = SITE_MONETIZATION.find(s => {
                    const dbSite = sites.find(d => d.id === siteId)
                    return dbSite && (
                      (dbSite.url ?? '').includes(s.siteKey) ||
                      (dbSite.name ?? '').toLowerCase().includes(s.siteKey.replace(/^climb-/, '').replace(/-/g, ' '))
                    )
                  })
                  return (
                    <div key={siteId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {sm ? (
                            <Link
                              href={`/monetization/${sm.siteKey}`}
                              className="text-sm truncate hover:text-indigo-300 transition-colors"
                              style={{ color: 'var(--muted-light)', maxWidth: 180 }}
                            >
                              {name}
                            </Link>
                          ) : (
                            <span className="text-sm truncate" style={{ color: 'var(--muted-light)', maxWidth: 180 }}>
                              {name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>
                            {data.clicks.toLocaleString()} clicks
                          </span>
                          <span className="text-sm font-mono font-bold" style={{ color: '#34d399' }}>
                            ${(data.cents / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <Bar pct={pct} />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Per-program breakdown ───────────────────────────────────────── */}
            <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-5">
                <MousePointerClick size={14} style={{ color: '#60a5fa' }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  By Program
                </span>
              </div>
              <div className="space-y-4">
                {programEntries.map(([programId, cents]) => {
                  const pct = Math.round((cents / maxProgramCents) * 100)
                  const name = programNameMap[programId] ?? programId
                  return (
                    <div key={programId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm truncate" style={{ color: 'var(--muted-light)', maxWidth: 180 }}>
                          {name}
                        </span>
                        <span className="text-sm font-mono font-bold shrink-0 ml-3" style={{ color: '#60a5fa' }}>
                          ${(cents / 100).toFixed(2)}
                        </span>
                      </div>
                      <Bar pct={pct} color="#60a5fa" />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Monthly bar chart ──────────────────────────────────────────────── */}
          {monthEntries.length > 1 && (
            <div className="rounded-xl border p-5 mb-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'var(--muted)' }}>
                Monthly Trend
              </div>
              <div className="flex items-end gap-3" style={{ height: 120 }}>
                {monthEntries.map(([month, cents]) => {
                  const pct = Math.round((cents / maxMonthCents) * 100)
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-mono font-bold" style={{ color: '#34d399' }}>
                        ${(cents / 100).toFixed(0)}
                      </span>
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${Math.max(pct, 4)}%`,
                          background: 'linear-gradient(180deg, #34d399, #059669)',
                          minHeight: 4,
                        }}
                      />
                      <span className="text-[10px] truncate w-full text-center" style={{ color: 'var(--muted)' }}>
                        {month.slice(5)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── All earnings table ────────────────────────────────────────────── */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                All Earnings ({rows.length} entries)
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Month', 'Site', 'Program', 'Clicks', 'Conv.', 'Earnings', 'Status'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.id}
                      style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      <td className="px-5 py-3 text-xs font-mono whitespace-nowrap" style={{ color: 'var(--muted-light)' }}>
                        {row.period_month?.slice(0, 7)}
                      </td>
                      <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--muted-light)' }}>
                        {siteNameMap[row.site_id] ?? row.site_id.slice(0, 8) + '…'}
                      </td>
                      <td className="px-5 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--muted-light)' }}>
                        {programNameMap[row.program_id] ?? row.program_id}
                      </td>
                      <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--muted-light)' }}>
                        {row.clicks.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--muted-light)' }}>
                        {row.conversions.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-xs font-mono font-bold whitespace-nowrap" style={{ color: '#34d399' }}>
                        ${(row.earnings_cents / 100).toFixed(2)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

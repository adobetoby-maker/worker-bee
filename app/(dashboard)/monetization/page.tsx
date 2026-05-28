export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { SITE_MONETIZATION, type SiteMonetization } from '@/lib/monetization'

export const metadata = { title: 'Monetization — Worker-Bee' }

// ── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<SiteMonetization['siteType'], { label: string; color: string; bg: string }> = {
  'climbing-guide':    { label: 'Climbing',    color: '#2dd4bf', bg: '#2dd4bf18' },
  'auto-repair':       { label: 'Auto Repair', color: '#f59e0b', bg: '#f59e0b18' },
  'language-saas':     { label: 'Language',    color: '#a78bfa', bg: '#a78bfa18' },
  'logistics':         { label: 'Logistics',   color: '#94a3b8', bg: '#94a3b818' },
  'medical-education': { label: 'Medical',     color: '#fb7185', bg: '#fb718518' },
  'management':        { label: 'Management',  color: '#818cf8', bg: '#818cf818' },
  'marketing':         { label: 'Marketing',   color: '#9ca3af', bg: '#9ca3af18' },
}

function fmt(n: number) {
  return `$${n.toFixed(2)}`
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function MonetizationPage() {
  // Fetch revenue logged this month
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data: earningsRows } = await supabaseAdmin
    .from('affiliate_earnings')
    .select('earnings_cents')
    .gte('period_month', monthStart)

  const revenueLoggedCents = (earningsRows ?? []).reduce(
    (sum: number, r: { earnings_cents: number }) => sum + (r.earnings_cents ?? 0),
    0,
  )

  // Summary stats
  const totalSites = SITE_MONETIZATION.length
  const totalAffiliates = SITE_MONETIZATION.reduce((sum, s) => sum + s.affiliates.length, 0)
  const totalMaintCost = SITE_MONETIZATION.reduce((sum, s) => sum + s.aiCost.monthlyMaintCostUSD, 0)
  const revenueLoggedUSD = revenueLoggedCents / 100

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Monetization</h1>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            All sites revenue channels
          </p>
        </div>
        <Link
          href="/monetization/earnings"
          className="shrink-0 flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-colors"
          style={{ background: '#34d39918', color: '#34d399', border: '1px solid #34d39933' }}
        >
          View Earnings →
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Sites tracked',      value: String(totalSites),                 accent: '#818cf8' },
          { label: 'Affiliate programs', value: String(totalAffiliates),            accent: '#2dd4bf' },
          { label: 'Maint. cost / mo',   value: fmt(totalMaintCost),                accent: '#f59e0b' },
          { label: 'Revenue logged',     value: fmt(revenueLoggedUSD),              accent: '#34d399' },
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            className="rounded-xl p-4 border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="text-2xl font-bold" style={{ color: accent }}>{value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Sites table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div
          className="px-5 py-3 border-b text-xs font-semibold uppercase tracking-widest"
          style={{ borderColor: 'var(--border)', color: 'var(--muted)', letterSpacing: '0.08em' }}
        >
          Sites
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Site', 'Type', 'Affiliates', 'Products', 'Build cost', 'Maint/mo', ''].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-medium"
                    style={{ color: 'var(--muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SITE_MONETIZATION.map((site, i) => {
                const badge = TYPE_BADGE[site.siteType]
                const liveProducts = site.products.filter(p => p.status === 'live').length
                const readyProducts = site.products.filter(
                  p => p.status === 'template-ready' || p.status === 'planned',
                ).length

                return (
                  <tr
                    key={site.siteKey}
                    style={{
                      borderBottom: i < SITE_MONETIZATION.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    {/* Site name + URL */}
                    <td className="px-5 py-4">
                      <div className="font-medium text-white">{site.siteName}</div>
                      <a
                        href={site.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs hover:text-indigo-400 transition-colors"
                        style={{ color: 'var(--muted)' }}
                      >
                        {site.siteUrl.replace(/^https?:\/\//, '')}
                      </a>
                    </td>

                    {/* Type badge */}
                    <td className="px-5 py-4">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ color: badge.color, background: badge.bg }}
                      >
                        {badge.label}
                      </span>
                    </td>

                    {/* Affiliates */}
                    <td className="px-5 py-4">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ color: '#2dd4bf', background: '#2dd4bf18' }}
                      >
                        {site.affiliates.length} programs
                      </span>
                    </td>

                    {/* Products */}
                    <td className="px-5 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {liveProducts > 0 && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ color: '#34d399', background: '#34d39918' }}
                          >
                            {liveProducts} live
                          </span>
                        )}
                        {readyProducts > 0 && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ color: '#f59e0b', background: '#f59e0b18' }}
                          >
                            {readyProducts} ready
                          </span>
                        )}
                        {site.products.length === 0 && (
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>—</span>
                        )}
                      </div>
                    </td>

                    {/* Build cost */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-white">
                        {fmt(site.aiCost.buildCostUSD)}
                      </span>
                    </td>

                    {/* Maint/mo */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs" style={{ color: 'var(--muted-light)' }}>
                        {fmt(site.aiCost.monthlyMaintCostUSD)}/mo
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/monetization/${site.siteKey}`}
                        className="text-xs font-medium transition-colors hover:text-indigo-300"
                        style={{ color: '#818cf8' }}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

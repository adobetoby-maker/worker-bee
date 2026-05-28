'use client'

import { useState } from 'react'
import type { AffiliateProgram, DigitalProduct, AICostEstimate } from '@/lib/monetization'

// ── Serialisable prop shapes (no functions) ────────────────────────────────────

export interface SerialAffiliate {
  id: string
  name: string
  category: AffiliateProgram['category']
  envVar: string
  commission: string
  paymentThreshold: string
  signupUrl: string
  cookieDays: number
  instructions: string
  notes: string
}

export interface SerialProduct {
  id: string
  name: string
  description: string
  type: DigitalProduct['type']
  suggestedPrice: number
  status: DigitalProduct['status']
  envVar?: string
  gumroadUrl?: string
  notes: string
}

export interface AiCostRow {
  id: string
  session_date: string
  model: string
  input_tokens: number
  output_tokens: number
  cost_cents: number
  session_description: string | null
  billed: boolean
}

export interface EarningsRow {
  id: string
  site_id: string | null
  program_id: string
  period_month: string
  clicks: number
  conversions: number
  earnings_cents: number
  currency: string
  status: string
}

export interface MonetizationTabsProps {
  siteKey: string
  affiliates: SerialAffiliate[]
  products: SerialProduct[]
  aiCost: AICostEstimate
  opportunityAudit: string[]
  aiCostRows: AiCostRow[]
  earningsRows: EarningsRow[]
  matchedSiteId: string | null
  siteName: string
}

// ── Category icon ──────────────────────────────────────────────────────────────

function categoryIcon(cat: AffiliateProgram['category']) {
  switch (cat) {
    case 'gear':          return '🛒'
    case 'accommodation': return '🏨'
    case 'insurance':     return '🛡️'
    case 'activities':    return '🎯'
    case 'automotive':    return '🔧'
    case 'medical':       return '⚕️'
    case 'language':      return '🌐'
    default:              return '📎'
  }
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'active' | 'pending-signup' | 'not-signed-up' | DigitalProduct['status'] }) {
  const map = {
    'active':         { label: 'Active',         color: '#34d399', bg: '#34d39918' },
    'pending-signup': { label: 'Pending signup',  color: '#f59e0b', bg: '#f59e0b18' },
    'not-signed-up':  { label: 'Not signed up',   color: '#f87171', bg: '#f8717118' },
    'live':           { label: 'Live',             color: '#34d399', bg: '#34d39918' },
    'template-ready': { label: 'Template ready',  color: '#f59e0b', bg: '#f59e0b18' },
    'planned':        { label: 'Planned',          color: '#94a3b8', bg: '#94a3b818' },
  }
  const { label, color, bg } = map[status as keyof typeof map] ?? { label: status, color: '#94a3b8', bg: '#94a3b818' }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color, background: bg }}>
      {label}
    </span>
  )
}

// ── ProductTypeBadge ───────────────────────────────────────────────────────────

function ProductTypeBadge({ type }: { type: DigitalProduct['type'] }) {
  const map = {
    'pdf-guide':    { label: 'PDF Guide',     color: '#60a5fa', bg: '#60a5fa18' },
    'route-map':    { label: 'Route Map',     color: '#2dd4bf', bg: '#2dd4bf18' },
    'season-guide': { label: 'Season Guide',  color: '#34d399', bg: '#34d39918' },
    'course':       { label: 'Course',        color: '#a78bfa', bg: '#a78bfa18' },
    'subscription': { label: 'Subscription',  color: '#818cf8', bg: '#818cf818' },
  }
  const { label, color, bg } = map[type] ?? { label: type, color: '#94a3b8', bg: '#94a3b818' }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ color, background: bg }}>
      {label}
    </span>
  )
}

// ── Tab 1: Affiliates ──────────────────────────────────────────────────────────

function AffiliatesTab({
  affiliates,
  opportunityAudit,
  matchedSiteId,
}: {
  affiliates: SerialAffiliate[]
  opportunityAudit: string[]
  matchedSiteId: string | null
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeCard, setActiveCard] = useState<string | null>(null)

  function copyAndExpand(envVar: string, affId: string) {
    navigator.clipboard.writeText(envVar).catch(() => null)
    setActiveCard(affId)
  }

  const configUrl = matchedSiteId ? `/sites/${matchedSiteId}/config` : '/sites'

  return (
    <div className="space-y-6">

      {/* ── How-to workflow ── */}
      <div className="rounded-xl border p-4" style={{ background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.2)' }}>
        <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#818cf8' }}>
          How to activate an affiliate program
        </div>
        <ol className="space-y-2">
          {[
            { step: '1', text: 'Click "Sign Up →" on any card below — create your free affiliate account on their site.' },
            { step: '2', text: 'After signup, find your affiliate/tracking ID in their dashboard (e.g. "climbidaho-20" or a numeric AID like "1234567").' },
            { step: '3', text: 'Click "Copy env var name" on the card — this copies the variable name (e.g. AMAZON_AFFILIATE_TAG).' },
            { step: '4', text: <>Go to <a href={configUrl} style={{ color: '#818cf8', textDecoration: 'underline' }}>this site&apos;s Config page</a> → click &quot;Add Config&quot; → paste the env var name as the Key, paste your affiliate ID as the Value → check &quot;Apply to Vercel&quot; → Save.</> },
            { step: '5', text: 'Done. Every link on the live site now includes your tracking ID and earns commission on click-throughs.' },
          ].map(({ step, text }) => (
            <li key={step} className="flex items-start gap-3 text-sm" style={{ color: 'var(--muted-light)' }}>
              <span
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}
              >
                {step}
              </span>
              <span className="leading-relaxed">{text}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Opportunity audit ── */}
      {opportunityAudit.length > 0 && (
        <div className="rounded-xl p-4 border" style={{ background: '#f59e0b0a', borderColor: '#f59e0b33' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#f59e0b' }}>
            Opportunity Audit
          </div>
          <ul className="space-y-1.5">
            {opportunityAudit.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--muted-light)' }}>
                <span style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }}>▸</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Affiliate cards ── */}
      {affiliates.length === 0 ? (
        <div className="text-sm" style={{ color: 'var(--muted)' }}>No affiliate programs configured for this site.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {affiliates.map(aff => (
            <div
              key={aff.id}
              className="rounded-xl border p-4"
              style={{ background: 'var(--surface)', borderColor: activeCard === aff.id ? 'rgba(99,102,241,0.5)' : 'var(--border)' }}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{categoryIcon(aff.category)}</span>
                  <span className="font-medium text-white text-sm">{aff.name}</span>
                </div>
                <StatusBadge status="not-signed-up" />
              </div>

              {/* Quick stats */}
              <div className="flex gap-4 mb-3">
                <div className="text-xs" style={{ color: 'var(--muted-light)' }}>
                  <span style={{ color: 'var(--muted)' }}>Commission </span>{aff.commission}
                </div>
                <div className="text-xs" style={{ color: 'var(--muted-light)' }}>
                  <span style={{ color: 'var(--muted)' }}>Cookie </span>
                  {aff.cookieDays === 0 ? 'N/A' : `${aff.cookieDays}d`}
                </div>
              </div>

              {/* Payment threshold */}
              <div className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                Payout threshold: {aff.paymentThreshold}
              </div>

              {/* Notes */}
              {aff.notes && (
                <div className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {aff.notes}
                </div>
              )}

              {/* Expandable signup instructions */}
              <button
                onClick={() => setExpanded(expanded === aff.id ? null : aff.id)}
                className="text-xs mb-3 flex items-center gap-1 hover:text-white transition-colors"
                style={{ color: 'var(--muted-light)' }}
              >
                <span style={{ transform: expanded === aff.id ? 'rotate(0deg)' : 'rotate(-90deg)', display: 'inline-block', transition: 'transform 0.15s' }}>▾</span>
                Signup instructions
              </button>

              {expanded === aff.id && (
                <div className="text-xs rounded-lg p-3 mb-3 space-y-1.5" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--muted-light)' }}>
                  {aff.instructions.split('. ').filter(s => s.trim()).map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8' }}>
                        {i + 1}
                      </span>
                      <span>{step.trim()}{step.trim().endsWith('.') ? '' : '.'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* "Copy env var" → then show next-step callout */}
              {activeCard === aff.id ? (
                <div className="rounded-lg p-3 mb-3 border" style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.3)' }}>
                  <div className="text-xs font-semibold mb-2" style={{ color: '#818cf8' }}>
                    ✓ Copied: <code className="ml-1 px-1.5 py-0.5 rounded text-[11px]" style={{ background: 'rgba(255,255,255,0.08)' }}>{aff.envVar}</code>
                  </div>
                  <div className="text-xs mb-2.5 leading-relaxed" style={{ color: 'var(--muted-light)' }}>
                    Now go to Config → Add Config → paste <strong style={{ color: 'white' }}>{aff.envVar}</strong> as the Key, and your affiliate ID as the Value → check &quot;Apply to Vercel&quot; → Save.
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={configUrl}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                      style={{ background: '#6366f1', color: 'white' }}
                    >
                      Open Config →
                    </a>
                    <button
                      onClick={() => setActiveCard(null)}
                      className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--muted)', background: 'rgba(255,255,255,0.04)' }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <a
                    href={aff.signupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                    style={{ background: '#6366f122', color: '#818cf8', border: '1px solid #6366f133' }}
                  >
                    Sign Up →
                  </a>
                  <button
                    onClick={() => copyAndExpand(aff.envVar, aff.id)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-light)', border: '1px solid var(--border)' }}
                  >
                    Copy env var name
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab 2: Products ────────────────────────────────────────────────────────────

function ProductsTab({ products }: { products: SerialProduct[] }) {
  return (
    <div className="space-y-4">
      {products.length === 0 ? (
        <div className="text-sm" style={{ color: 'var(--muted)' }}>No digital products configured for this site.</div>
      ) : (
        products.map(p => (
          <div
            key={p.id}
            className="rounded-xl border p-4"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="font-medium text-white">{p.name}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <ProductTypeBadge type={p.type} />
                  <StatusBadge status={p.status} />
                  <span className="text-xs font-mono font-bold" style={{ color: '#34d399' }}>
                    ${p.suggestedPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm mb-3 leading-relaxed" style={{ color: 'var(--muted-light)' }}>
              {p.description}
            </p>

            {p.notes && (
              <div className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--muted)' }}>
                {p.notes}
              </div>
            )}

            {p.envVar && (
              <div className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                Env var: <code className="text-xs px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#a5b4fc' }}>
                  {p.envVar}
                </code>
              </div>
            )}

            {(p.status === 'template-ready' || p.status === 'planned') && (
              <a
                href="https://gumroad.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{ background: '#34d39918', color: '#34d399', border: '1px solid #34d39933' }}
              >
                Set up on Gumroad →
              </a>
            )}

            {p.status === 'live' && p.gumroadUrl && (
              <a
                href={p.gumroadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{ background: '#34d39918', color: '#34d399', border: '1px solid #34d39933' }}
              >
                View on Gumroad →
              </a>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ── Tab 3: AI Costs ────────────────────────────────────────────────────────────

function AiCostsTab({
  aiCost,
  aiCostRows,
  matchedSiteId,
}: {
  aiCost: AICostEstimate
  aiCostRows: AiCostRow[]
  matchedSiteId: string | null
}) {
  return (
    <div className="space-y-6">
      {/* Two-column breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Left: build cost */}
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            Build Cost
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--muted-light)' }}>Build sessions</span>
              <span className="font-mono text-white">{aiCost.buildSessions}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--muted-light)' }}>Avg tokens / session</span>
              <span className="font-mono text-white">{aiCost.avgTokensPerSession.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-2" style={{ borderColor: 'var(--border)' }}>
              <span className="font-medium text-white">Total build cost</span>
              <span className="font-mono font-bold" style={{ color: '#34d399' }}>
                ${aiCost.buildCostUSD.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--muted-light)' }}>Maint. sessions / mo</span>
              <span className="font-mono text-white">{aiCost.monthlyMaintSessions}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--muted-light)' }}>Maint. cost / mo</span>
              <span className="font-mono font-bold" style={{ color: '#f59e0b' }}>
                ${aiCost.monthlyMaintCostUSD.toFixed(2)}/mo
              </span>
            </div>
          </div>
        </div>

        {/* Right: billing notes */}
        <div
          className="rounded-xl border p-4"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            Billing Notes
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-light)' }}>
            {aiCost.billingNotes || 'No billing notes.'}
          </p>
        </div>
      </div>

      {/* AI cost log table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div
          className="px-5 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border)' }}
        >
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            AI Session Log
          </span>
          {matchedSiteId && (
            <a
              href={`/billing/new?siteId=${matchedSiteId}`}
              className="text-xs px-3 py-1 rounded-lg font-medium"
              style={{ background: '#6366f122', color: '#818cf8', border: '1px solid #6366f133' }}
            >
              Generate Invoice →
            </a>
          )}
        </div>

        {aiCostRows.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm mb-2" style={{ color: 'var(--muted)' }}>
              No AI sessions logged yet.
            </p>
            {!matchedSiteId && (
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                This site has not yet been matched to a Supabase site record. Create the site in Sites to start logging sessions.
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Model', 'Tokens in', 'Tokens out', 'Cost', 'Billed'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs" style={{ color: 'var(--muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aiCostRows.map((row, i) => (
                <tr
                  key={row.id}
                  style={{ borderBottom: i < aiCostRows.length - 1 ? '1px solid var(--border)' : 'none' }}
                >
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--muted-light)' }}>
                    {row.session_date}
                  </td>
                  <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--muted-light)' }}>
                    {row.model}
                  </td>
                  <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--muted-light)' }}>
                    {row.input_tokens.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--muted-light)' }}>
                    {row.output_tokens.toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-xs font-mono" style={{ color: '#34d399' }}>
                    ${(row.cost_cents / 100).toFixed(2)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={row.billed
                        ? { color: '#34d399', background: '#34d39918' }
                        : { color: '#94a3b8', background: '#94a3b818' }}
                    >
                      {row.billed ? 'Billed' : 'Unbilled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Tab 4: Earnings ────────────────────────────────────────────────────────────

function EarningsTab({
  earningsRows,
  affiliates,
  matchedSiteId,
  siteName,
}: {
  earningsRows: EarningsRow[]
  affiliates: SerialAffiliate[]
  matchedSiteId: string | null
  siteName: string
}) {
  const [form, setForm] = useState({
    program_id: affiliates[0]?.id ?? '',
    period_month: new Date().toISOString().slice(0, 7) + '-01',
    clicks: '',
    conversions: '',
    earnings_usd: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!matchedSiteId) { setErr('Site not matched to a DB record.'); return }
    setSaving(true); setErr(null)
    try {
      const res = await fetch('/api/affiliate-earnings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          site_id: matchedSiteId,
          program_id: form.program_id,
          period_month: form.period_month,
          clicks: parseInt(form.clicks) || 0,
          conversions: parseInt(form.conversions) || 0,
          earnings_cents: Math.round(parseFloat(form.earnings_usd) * 100) || 0,
          currency: 'USD',
          status: 'confirmed',
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  // ── Derived summaries ──────────────────────────────────────────────────────

  const totalCents = earningsRows.reduce((s, r) => s + r.earnings_cents, 0)
  const totalClicks = earningsRows.reduce((s, r) => s + r.clicks, 0)
  const totalConversions = earningsRows.reduce((s, r) => s + r.conversions, 0)

  // Per-program rollup
  const byProgram = earningsRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.program_id] = (acc[r.program_id] ?? 0) + r.earnings_cents
    return acc
  }, {})
  const programEntries = Object.entries(byProgram).sort((a, b) => b[1] - a[1])
  const maxProgramCents = programEntries[0]?.[1] ?? 1

  // Per-month rollup (last 6 months)
  const byMonth = earningsRows.reduce<Record<string, number>>((acc, r) => {
    const m = r.period_month?.slice(0, 7) ?? 'unknown'
    acc[m] = (acc[m] ?? 0) + r.earnings_cents
    return acc
  }, {})
  const monthEntries = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).slice(-6)
  const maxMonthCents = monthEntries.reduce((m, [, c]) => Math.max(m, c), 1)

  const convRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '—'

  return (
    <div className="space-y-6">

      {/* ── Summary hero ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Earned', value: `$${(totalCents / 100).toFixed(2)}`, color: '#34d399', sub: siteName },
          { label: 'Total Clicks', value: totalClicks.toLocaleString(), color: '#60a5fa', sub: 'across all programs' },
          { label: 'Conversions', value: totalConversions.toLocaleString(), color: '#a78bfa', sub: `${convRate}% rate` },
          { label: 'Avg/Month', value: monthEntries.length > 0 ? `$${(totalCents / monthEntries.length / 100).toFixed(2)}` : '$0.00', color: '#f59e0b', sub: `over ${monthEntries.length || 0} months` },
        ].map(({ label, value, color, sub }) => (
          <div
            key={label}
            className="rounded-xl border p-4"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{label}</div>
            <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
            <div className="text-xs mt-1 truncate" style={{ color: 'var(--muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {earningsRows.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* ── Per-program bar chart ─────────────────────────────────────── */}
          <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
              By Program
            </div>
            <div className="space-y-3">
              {programEntries.map(([programId, cents]) => {
                const pct = Math.round((cents / maxProgramCents) * 100)
                const aff = affiliates.find(a => a.id === programId)
                return (
                  <div key={programId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs truncate" style={{ color: 'var(--muted-light)', maxWidth: 140 }}>
                        {aff?.name ?? programId}
                      </span>
                      <span className="text-xs font-mono font-bold" style={{ color: '#34d399' }}>
                        ${(cents / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #34d399, #6ee7b7)' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Monthly trend bars ────────────────────────────────────────── */}
          <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
              Monthly Trend
            </div>
            <div className="flex items-end gap-2 h-28">
              {monthEntries.map(([month, cents]) => {
                const pct = Math.round((cents / maxMonthCents) * 100)
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-mono" style={{ color: '#34d399' }}>
                      ${(cents / 100).toFixed(0)}
                    </span>
                    <div className="w-full rounded-t" style={{ height: `${Math.max(pct, 4)}%`, background: 'linear-gradient(180deg, #34d399, #059669)', minHeight: 4 }} />
                    <span className="text-[9px] truncate w-full text-center" style={{ color: 'var(--muted)' }}>
                      {month.slice(5)}
                    </span>
                  </div>
                )
              })}
              {monthEntries.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-xs" style={{ color: 'var(--muted)' }}>
                  No data yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Earnings table ──────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Earnings Log
          </span>
        </div>

        {earningsRows.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              No earnings logged yet. Use the form below to log your first month.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Month', 'Program', 'Clicks', 'Conv.', 'Earnings', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs" style={{ color: 'var(--muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {earningsRows.map((row, i) => {
                const aff = affiliates.find(a => a.id === row.program_id)
                return (
                  <tr
                    key={row.id}
                    style={{ borderBottom: i < earningsRows.length - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--muted-light)' }}>
                      {row.period_month?.slice(0, 7)}
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--muted-light)' }}>
                      {aff?.name ?? row.program_id}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--muted-light)' }}>
                      {row.clicks.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--muted-light)' }}>
                      {row.conversions.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono font-bold" style={{ color: '#34d399' }}>
                      ${(row.earnings_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={row.status === 'paid'
                          ? { color: '#34d399', background: '#34d39918' }
                          : row.status === 'confirmed'
                            ? { color: '#60a5fa', background: '#60a5fa18' }
                            : { color: '#f59e0b', background: '#f59e0b18' }}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Log earnings form ───────────────────────────────────────────────── */}
      {matchedSiteId && affiliates.length > 0 && (
        <div
          className="rounded-xl border p-5"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            Log Earnings
          </div>
          <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Program</label>
              <select
                value={form.program_id}
                onChange={e => setForm(f => ({ ...f, program_id: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'var(--border)', color: 'white' }}
              >
                {affiliates.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Period Month</label>
              <input
                type="date"
                value={form.period_month}
                onChange={e => setForm(f => ({ ...f, period_month: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'var(--border)', color: 'white' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Earnings (USD)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.earnings_usd}
                onChange={e => setForm(f => ({ ...f, earnings_usd: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'var(--border)', color: 'white' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Clicks</label>
              <input
                type="number"
                placeholder="0"
                value={form.clicks}
                onChange={e => setForm(f => ({ ...f, clicks: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'var(--border)', color: 'white' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Conversions</label>
              <input
                type="number"
                placeholder="0"
                value={form.conversions}
                onChange={e => setForm(f => ({ ...f, conversions: e.target.value }))}
                className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'var(--border)', color: 'white' }}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: saving ? '#6366f144' : '#6366f1', color: 'white' }}
              >
                {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Log Earnings'}
              </button>
            </div>
          </form>
          {err && (
            <p className="mt-3 text-xs" style={{ color: '#f87171' }}>{err}</p>
          )}
        </div>
      )}

      {!matchedSiteId && (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{ borderColor: '#f59e0b33', background: '#f59e0b0a', color: '#f59e0b' }}
        >
          This site has not been matched to a Supabase site record. Create it in Sites to enable earnings logging.
        </div>
      )}
    </div>
  )
}

// ── Root component ─────────────────────────────────────────────────────────────

const TABS = ['Affiliates', 'Products', 'AI Costs', 'Earnings'] as const
type TabName = typeof TABS[number]

export default function MonetizationTabs({
  siteKey,
  affiliates,
  products,
  aiCost,
  opportunityAudit,
  aiCostRows,
  earningsRows,
  matchedSiteId,
  siteName,
}: MonetizationTabsProps) {
  const [active, setActive] = useState<TabName>('Affiliates')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(tab => {
          const isActive = tab === active
          return (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              className="px-4 py-2.5 text-sm font-medium transition-colors relative"
              style={{ color: isActive ? '#e0e7ff' : 'var(--muted-light)' }}
            >
              {tab}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  style={{ background: '#818cf8' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {active === 'Affiliates' && (
        <AffiliatesTab affiliates={affiliates} opportunityAudit={opportunityAudit} matchedSiteId={matchedSiteId} />
      )}
      {active === 'Products' && (
        <ProductsTab products={products} />
      )}
      {active === 'AI Costs' && (
        <AiCostsTab aiCost={aiCost} aiCostRows={aiCostRows} matchedSiteId={matchedSiteId} />
      )}
      {active === 'Earnings' && (
        <EarningsTab earningsRows={earningsRows} affiliates={affiliates} matchedSiteId={matchedSiteId} siteName={siteName} />
      )}
    </div>
  )
}

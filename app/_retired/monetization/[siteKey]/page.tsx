export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import { getSiteMonetization, type SiteMonetization } from '@/lib/monetization'
import MonetizationTabs, {
  type SerialAffiliate,
  type SerialProduct,
  type AiCostRow,
  type EarningsRow,
} from './MonetizationTabs'

// ── Type badge ─────────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<SiteMonetization['siteType'], { label: string; color: string; bg: string }> = {
  'climbing-guide':    { label: 'Climbing',    color: '#2dd4bf', bg: '#2dd4bf18' },
  'auto-repair':       { label: 'Auto Repair', color: '#f59e0b', bg: '#f59e0b18' },
  'language-saas':     { label: 'Language',    color: '#a78bfa', bg: '#a78bfa18' },
  'logistics':         { label: 'Logistics',   color: '#94a3b8', bg: '#94a3b818' },
  'medical-education': { label: 'Medical',     color: '#fb7185', bg: '#fb718518' },
  'management':        { label: 'Management',  color: '#818cf8', bg: '#818cf818' },
  'marketing':         { label: 'Marketing',   color: '#9ca3af', bg: '#9ca3af18' },
}

// ── DB row types (raw from Supabase) ──────────────────────────────────────────

type DbAiCostRow = {
  id: string
  site_id: string | null
  session_date: string
  model: string
  input_tokens: number
  output_tokens: number
  cost_cents: number
  session_description: string | null
  billed: boolean
}

type DbEarningsRow = {
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

type DbSite = {
  id: string
  name: string
  url: string | null
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function MonetizationDetailPage({
  params,
}: {
  params: Promise<{ siteKey: string }>
}) {
  const { siteKey } = await params
  const site = getSiteMonetization(siteKey)
  if (!site) notFound()

  // Try to match to a DB site
  const sitesResult = await supabaseAdmin
    .from('sites')
    .select('id,name,url')
    .order('name')
  const sites = (sitesResult.data ?? []) as unknown as DbSite[]

  const matchedSite = sites.find(
    s =>
      (s.url ?? '').includes(siteKey) ||
      (s.name ?? '').toLowerCase().includes(siteKey.replace(/^climb-/, '').replace(/-/g, ' ')),
  )

  // Fetch AI cost log and earnings if a DB site was found
  let aiCostRows: AiCostRow[] = []
  let earningsRows: EarningsRow[] = []

  if (matchedSite) {
    const [costResult, earnResult] = await Promise.all([
      supabaseAdmin
        .from('ai_cost_log')
        .select('id,site_id,session_date,model,input_tokens,output_tokens,cost_cents,session_description,billed')
        .eq('site_id', matchedSite.id)
        .order('session_date', { ascending: false })
        .limit(50),
      supabaseAdmin
        .from('affiliate_earnings')
        .select('id,site_id,program_id,period_month,clicks,conversions,earnings_cents,currency,status')
        .eq('site_id', matchedSite.id)
        .order('period_month', { ascending: false }),
    ])
    aiCostRows = ((costResult.data ?? []) as unknown as DbAiCostRow[]) as AiCostRow[]
    earningsRows = ((earnResult.data ?? []) as unknown as DbEarningsRow[]) as EarningsRow[]
  }

  const badge = TYPE_BADGE[site.siteType]

  // Serialise data to pass as props (no functions)
  const serialAffiliates: SerialAffiliate[] = site.affiliates.map(a => ({
    id: a.id,
    name: a.name,
    category: a.category,
    envVar: a.envVar,
    commission: a.commission,
    paymentThreshold: a.paymentThreshold,
    signupUrl: a.signupUrl,
    cookieDays: a.cookieDays,
    instructions: a.instructions,
    notes: a.notes,
  }))

  const serialProducts: SerialProduct[] = site.products.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    type: p.type,
    suggestedPrice: p.suggestedPrice,
    status: p.status,
    envVar: p.envVar,
    gumroadUrl: p.gumroadUrl,
    notes: p.notes,
  }))

  return (
    <div className="max-w-4xl">
      {/* Back link */}
      <Link
        href="/monetization"
        className="flex items-center gap-1.5 text-sm mb-6 hover:text-indigo-400 transition-colors"
        style={{ color: 'var(--muted)' }}
      >
        <ArrowLeft size={14} /> All Monetization
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{site.siteName}</h1>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
              style={{ color: badge.color, background: badge.bg }}
            >
              {badge.label}
            </span>
          </div>
          <a
            href={site.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:text-indigo-400 transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            {site.siteUrl}
          </a>
        </div>
      </div>

      {/* Tabbed content */}
      <MonetizationTabs
        siteKey={siteKey}
        siteName={site.siteName}
        affiliates={serialAffiliates}
        products={serialProducts}
        aiCost={site.aiCost}
        opportunityAudit={site.opportunityAudit}
        aiCostRows={aiCostRows}
        earningsRows={earningsRows}
        matchedSiteId={matchedSite?.id ?? null}
      />
    </div>
  )
}

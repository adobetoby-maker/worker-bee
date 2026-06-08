export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { Target, Users, TrendingUp, AlertCircle, Plus, ChevronRight } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

const STAGE_COLORS: Record<string, string> = {
  new: '#64748b', active: '#60a5fa', engaged: '#818cf8',
  hot: '#f59e0b', in_conversation: '#f97316', proposal_sent: '#a78bfa',
  won: '#34d399', lost: '#f87171', archived: '#475569', reactivating: '#fbbf24',
}

const STAGE_LABELS: Record<string, string> = {
  new: 'New', active: 'Active', engaged: 'Engaged', hot: 'Hot',
  in_conversation: 'Talking', proposal_sent: 'Proposal', won: 'Won',
  lost: 'Lost', archived: 'Archived', reactivating: 'Reactivating',
}

const TOUCH_LABELS: Record<number, string> = {
  0: '—', 1: 'Email 1', 2: 'Text 1', 3: 'Call 1',
  4: 'Email 2', 5: 'Text 2', 6: 'Call 2',
  7: 'Email 3', 8: 'Text 3', 9: 'Call 3',
}

function StageDot({ stage }: { stage: string }) {
  const color = STAGE_COLORS[stage] ?? '#64748b'
  const label = STAGE_LABELS[stage] ?? stage
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: `${color}18`, color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

export default async function LeadsCampaignDashboard() {
  const today = new Date().toISOString().split('T')[0]

  const [campaignsRes, prospectsRes, dueRes] = await Promise.all([
    db.from('outreach_campaigns').select('*').order('created_at', { ascending: false }),
    db.from('prospects').select('id, business_name, city, category, stage, current_touch, next_touch_date, outreach_campaign_id, deal_value, monthly_value'),
    db.from('prospects').select('id, business_name, city, category, demo_url, stage, current_touch, next_touch_date')
      .lte('next_touch_date', today)
      .not('stage', 'in', '(won,lost,archived)')
      .order('next_touch_date', { ascending: true })
      .limit(10),
  ])

  const campaigns = campaignsRes.data ?? []
  const allProspects = prospectsRes.data ?? []
  const dueProspects = dueRes.data ?? []

  const activeRevenue = allProspects
    .filter((p: { stage: string }) => !['won', 'lost', 'archived'].includes(p.stage))
    .reduce((sum: number, p: { deal_value: number }) => sum + (p.deal_value ?? 750), 0)
  const wonRevenue = allProspects
    .filter((p: { stage: string }) => p.stage === 'won')
    .reduce((sum: number, p: { deal_value: number; monthly_value: number }) =>
      sum + (p.deal_value ?? 750) + (p.monthly_value ?? 99) * 12, 0)

  const stageCounts = allProspects.reduce((acc: Record<string, number>, p: { stage: string }) => {
    acc[p.stage] = (acc[p.stage] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Leads & Campaigns</h1>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            {allProspects.length} prospects across {campaigns.length} campaigns
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/leads/pipeline"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
            <Target size={14} /> Pipeline
          </Link>
          <Link href="/leads/archive"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--muted-light)', border: '1px solid var(--border)' }}>
            Archive
          </Link>
          <Link href="/leads/templates"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--muted-light)', border: '1px solid var(--border)' }}>
            Email Templates
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Prospects', value: allProspects.length, icon: Users, color: '#818cf8', cls: 'stat-indigo' },
          { label: 'Active Pipeline', value: `$${activeRevenue.toLocaleString()}`, icon: TrendingUp, color: '#34d399', cls: 'stat-emerald' },
          { label: 'Won Revenue', value: `$${wonRevenue.toLocaleString()}`, icon: Target, color: '#f59e0b', cls: 'stat-amber' },
          { label: 'Action Needed', value: dueProspects.length, icon: AlertCircle, color: '#f87171', cls: 'stat-slate' },
        ].map(({ label, value, icon: Icon, color, cls }) => (
          <div key={label} className={`card ${cls} rounded-xl px-5 py-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{label}</span>
              <Icon size={14} style={{ color }} />
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Action needed today */}
      {dueProspects.length > 0 && (
        <div className="rounded-xl mb-8 overflow-hidden"
          style={{ border: '1px solid rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.04)' }}>
          <div className="px-5 py-3 flex items-center gap-2 border-b" style={{ borderColor: 'rgba(251,191,36,0.15)' }}>
            <AlertCircle size={14} style={{ color: '#fbbf24' }} />
            <span className="text-sm font-semibold" style={{ color: '#fbbf24' }}>Action Needed Today</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {dueProspects.map((p: {
              id: string; business_name: string; city: string; category: string;
              stage: string; current_touch: number; next_touch_date: string;
            }) => {
              const nextTouchNum = (p.current_touch ?? 0) + 1
              const isOverdue = p.next_touch_date < today
              return (
                <Link key={p.id} href={`/leads/${p.id}`}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-white/[0.02]">
                  <div className="flex items-center gap-3 min-w-0">
                    <StageDot stage={p.stage} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{p.business_name}</div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>{p.city} · {p.category}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-medium px-2 py-0.5 rounded"
                      style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                      {TOUCH_LABELS[nextTouchNum] ?? `Touch ${nextTouchNum}`}
                    </span>
                    {isOverdue && <span className="text-xs" style={{ color: '#f87171' }}>overdue</span>}
                    <ChevronRight size={14} style={{ color: 'var(--muted)' }} />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Campaign cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Campaigns</h2>
          <button className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Plus size={12} /> New Campaign
          </button>
        </div>
        <div className="grid gap-4">
          {campaigns.map((campaign: { id: string; name: string; region: string; status: string; notes: string }) => {
            const cProspects = allProspects.filter(
              (p: { outreach_campaign_id: string }) => p.outreach_campaign_id === campaign.id
            )
            const cStageCounts = cProspects.reduce((acc: Record<string, number>, p: { stage: string }) => {
              acc[p.stage] = (acc[p.stage] ?? 0) + 1
              return acc
            }, {})
            const cPipeline = cProspects
              .filter((p: { stage: string }) => !['won', 'lost', 'archived'].includes(p.stage))
              .reduce((sum: number, p: { deal_value: number }) => sum + (p.deal_value ?? 750), 0)
            const cWon = cProspects.filter((p: { stage: string }) => p.stage === 'won').length

            return (
              <div key={campaign.id} className="card rounded-xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-white">{campaign.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: campaign.status === 'active' ? 'rgba(52,211,153,0.12)' : 'rgba(100,116,139,0.12)',
                          color: campaign.status === 'active' ? '#34d399' : '#64748b',
                        }}>
                        {campaign.status}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {campaign.region} · {cProspects.length} prospects · ${cPipeline.toLocaleString()} pipeline · {cWon} won
                    </p>
                  </div>
                  <Link href={`/leads/pipeline?campaign=${campaign.id}`}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--muted-light)', border: '1px solid var(--border)' }}>
                    View Pipeline <ChevronRight size={12} />
                  </Link>
                </div>

                {cProspects.length > 0 && (
                  <>
                    <div className="flex rounded-full overflow-hidden h-2 gap-px mb-3">
                      {Object.entries(cStageCounts).map(([stage, count]) => (
                        <div key={stage} title={`${STAGE_LABELS[stage] ?? stage}: ${count}`}
                          style={{
                            background: STAGE_COLORS[stage] ?? '#64748b',
                            width: `${((count as number) / cProspects.length) * 100}%`,
                            minWidth: (count as number) > 0 ? 4 : 0,
                          }} />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(cStageCounts).map(([stage, count]) => (
                        <span key={stage} className="text-xs" style={{ color: 'var(--muted)' }}>
                          <span style={{ color: STAGE_COLORS[stage] }}>●</span> {STAGE_LABELS[stage] ?? stage} {count as number}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Stage summary */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {(['new', 'active', 'hot', 'proposal_sent', 'won'] as const).map(stage => (
          <Link key={stage} href={`/leads/pipeline?stage=${stage}`}
            className="card rounded-xl px-4 py-3 text-center hover:border-white/10 transition-colors">
            <div className="text-xl font-bold text-white">{stageCounts[stage] ?? 0}</div>
            <div className="text-xs mt-0.5" style={{ color: STAGE_COLORS[stage] }}>
              {STAGE_LABELS[stage]}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

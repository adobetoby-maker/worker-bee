export const dynamic = 'force-dynamic'

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { Users, Plus, DollarSign, Clock, ChevronRight, Building2 } from 'lucide-react'

export const metadata = { title: 'Clients — Worker-Bee' }

const db = supabaseAdmin as any

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ElementType; color: string
}) {
  return (
    <div
      className="rounded-xl border p-5 flex items-center gap-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          {label}
        </p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </div>
  )
}

export default async function ClientsPage() {
  // Fetch clients
  const { data: clients, error } = await db
    .from('clients')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return (
      <div className="max-w-5xl">
        <p className="text-red-400 text-sm">Error loading clients: {error.message}</p>
      </div>
    )
  }

  const clientList = clients ?? []

  // Fetch sites with client_id set (project counts + upkeep + hours)
  const { data: sites } = await db
    .from('sites')
    .select('id, name, client_id')
    .not('client_id', 'is', null)

  const { data: projectCosts } = await db
    .from('project_costs')
    .select('site_id, amount_cents, billing_cycle, active')
    .eq('active', true)
    .eq('billing_cycle', 'monthly')

  const { data: timeEntries } = await db
    .from('time_entries')
    .select('site_id, hours, rate_cents')

  // Build lookup maps
  const sitesByClient: Record<string, any[]> = {}
  for (const site of sites ?? []) {
    if (!sitesByClient[site.client_id]) sitesByClient[site.client_id] = []
    sitesByClient[site.client_id].push(site)
  }

  const monthlyCostBySite: Record<string, number> = {}
  for (const pc of projectCosts ?? []) {
    monthlyCostBySite[pc.site_id] = (monthlyCostBySite[pc.site_id] ?? 0) + pc.amount_cents
  }

  const buildCostBySite: Record<string, number> = {}
  for (const te of timeEntries ?? []) {
    buildCostBySite[te.site_id] = (buildCostBySite[te.site_id] ?? 0) + te.hours * te.rate_cents
  }

  // Per-client aggregates
  function clientStats(clientId: string) {
    const clientSites = sitesByClient[clientId] ?? []
    const projectCount = clientSites.length
    const monthlyUpkeep = clientSites.reduce((sum: number, s: any) => sum + (monthlyCostBySite[s.id] ?? 0), 0)
    const buildCost = clientSites.reduce((sum: number, s: any) => sum + (buildCostBySite[s.id] ?? 0), 0)
    return { projectCount, monthlyUpkeep, buildCost }
  }

  // Summary stats
  const totalClients = clientList.length
  const totalMonthly = Object.values(monthlyCostBySite).reduce((a: number, b: number) => a + b, 0)
  const totalHoursCost = Object.values(buildCostBySite).reduce((a: number, b: number) => a + b, 0)

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Users size={22} style={{ color: '#818cf8' }} />
            <h1 className="text-2xl font-bold text-white">Clients</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            {totalClients} client{totalClients !== 1 ? 's' : ''} — manage projects, costs, and requests
          </p>
        </div>
        <Link
          href="/clients/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{
            background: 'rgba(99,102,241,0.2)',
            color: '#818cf8',
            border: '1px solid rgba(99,102,241,0.35)',
          }}
        >
          <Plus size={15} />
          New Client
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Clients" value={String(totalClients)} icon={Users} color="#818cf8" />
        <StatCard label="Monthly Upkeep" value={formatCents(totalMonthly)} icon={DollarSign} color="#10b981" />
        <StatCard label="Build Hours Value" value={formatCents(totalHoursCost)} icon={Clock} color="#f59e0b" />
      </div>

      {/* Client table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {clientList.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <Users size={40} style={{ color: 'var(--muted)', opacity: 0.3 }} />
            <div className="text-center">
              <p className="text-sm font-semibold text-white mb-1">No clients yet</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Add your first client to start managing projects and costs.
              </p>
            </div>
            <Link
              href="/clients/new"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: 'rgba(99,102,241,0.4)', color: '#818cf8' }}
            >
              <Plus size={12} /> New Client
            </Link>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div
              className="hidden md:grid px-5 py-2.5 border-b text-xs font-semibold uppercase tracking-wider"
              style={{
                gridTemplateColumns: '1fr 200px 110px 130px 130px 80px',
                gap: 12,
                borderColor: 'rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                color: 'var(--muted)',
              }}
            >
              <span>Client</span>
              <span>Company</span>
              <span>Projects</span>
              <span>Monthly Upkeep</span>
              <span>Build Value</span>
              <span></span>
            </div>

            <div>
              {clientList.map((client: any) => {
                const { projectCount, monthlyUpkeep, buildCost } = clientStats(client.id)
                return (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="grid px-5 py-4 items-center border-b last:border-b-0 hover:bg-white/[0.025] transition-colors group"
                    style={{
                      gridTemplateColumns: '1fr 200px 110px 130px 130px 80px',
                      gap: 12,
                      borderColor: 'rgba(255,255,255,0.05)',
                    }}
                  >
                    {/* Name + email */}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {client.name}
                      </div>
                      {client.email && (
                        <div className="text-xs truncate mt-0.5" style={{ color: 'var(--muted)' }}>
                          {client.email}
                        </div>
                      )}
                      {client.phone && (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                          {client.phone}
                        </div>
                      )}
                    </div>

                    {/* Company */}
                    <div className="text-sm truncate" style={{ color: 'var(--muted-light)' }}>
                      {client.company ? (
                        <span className="flex items-center gap-1.5">
                          <Building2 size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                          {client.company}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted)', opacity: 0.5 }}>—</span>
                      )}
                    </div>

                    {/* Project count */}
                    <div>
                      {projectCount > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: 'rgba(99,102,241,0.12)',
                            color: '#818cf8',
                            border: '1px solid rgba(99,102,241,0.25)',
                          }}
                        >
                          {projectCount} site{projectCount !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--muted)', opacity: 0.5 }}>No sites</span>
                      )}
                    </div>

                    {/* Monthly upkeep */}
                    <div className="text-sm font-semibold" style={{ color: monthlyUpkeep > 0 ? '#10b981' : 'var(--muted)' }}>
                      {monthlyUpkeep > 0 ? formatCents(monthlyUpkeep) + '/mo' : '—'}
                    </div>

                    {/* Build value */}
                    <div className="text-sm" style={{ color: buildCost > 0 ? '#f59e0b' : 'var(--muted)' }}>
                      {buildCost > 0 ? formatCents(buildCost) : '—'}
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-end">
                      <ChevronRight size={16} style={{ color: 'var(--muted)' }} className="group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

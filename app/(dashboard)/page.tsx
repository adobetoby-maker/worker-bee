export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { Globe, KeyRound, Cpu, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react'

async function getStats() {
  const [{ count: totalSites }, { count: activeSites }] = await Promise.all([
    supabaseAdmin.from('sites').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('sites').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ])
  return { totalSites: totalSites ?? 0, activeSites: activeSites ?? 0 }
}

export default async function DashboardPage() {
  const stats = await getStats()

  const cards = [
    { label: 'Total Sites', value: stats.totalSites, icon: Globe, href: '/sites', color: 'text-indigo-400' },
    { label: 'Active Sites', value: stats.activeSites, icon: CheckCircle2, href: '/sites', color: 'text-emerald-400' },
    { label: 'Vault Entries', value: '—', icon: KeyRound, href: '/vault', color: 'text-amber-400' },
    { label: 'Alerts', value: 0, icon: AlertCircle, href: '/sites', color: 0 > 0 ? 'text-red-400' : 'text-slate-500' },
  ]

  const quickLinks = [
    { href: '/sites/new', label: 'Add a site', desc: 'Register a new client site' },
    { href: '/vault', label: 'Open Vault', desc: 'Manage credentials & API keys' },
    { href: '/configurator', label: 'Claude Configurator', desc: 'Generate CLAUDE.md & settings' },
  ]

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--muted-light)' }}>Agency command center</p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map(c => (
          <Link key={c.label} href={c.href} className="no-underline group">
            <div className="rounded-xl border p-5 transition-colors group-hover:border-white/14"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <c.icon size={18} className={`mb-3 ${c.color}`} />
              <div className={`text-3xl font-bold leading-none mb-1 ${c.color}`}>{c.value}</div>
              <div className="text-xs" style={{ color: 'var(--muted-light)' }}>{c.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--muted)' }}>Quick actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {quickLinks.map(l => (
          <Link key={l.href} href={l.href}
            className="no-underline group flex items-center justify-between rounded-xl border p-4 transition-colors hover:border-indigo-500/50"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div>
              <div className="text-sm font-semibold text-white mb-0.5">{l.label}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>{l.desc}</div>
            </div>
            <ArrowRight size={15} className="text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}

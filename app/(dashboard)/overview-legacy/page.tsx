export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { Globe, KeyRound, Cpu, ArrowRight, CheckCircle2, AlertCircle, Search } from 'lucide-react'

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
    { label: 'Total Sites',   value: stats.totalSites,  icon: Globe,         href: '/sites', accent: 'indigo',  statClass: 'stat-indigo'  },
    { label: 'Active Sites',  value: stats.activeSites, icon: CheckCircle2,  href: '/sites', accent: 'emerald', statClass: 'stat-emerald' },
    { label: 'Vault Entries', value: '—',               icon: KeyRound,      href: '/vault', accent: 'amber',   statClass: 'stat-amber'   },
    { label: 'Alerts',        value: 0,                 icon: AlertCircle,   href: '/sites', accent: 'slate',   statClass: 'stat-slate'   },
  ]

  const ACCENT_TEXT: Record<string, string> = {
    indigo: '#818cf8', emerald: '#34d399', amber: '#fbbf24', slate: '#64748b',
  }

  const quickLinks = [
    { href: '/sites/new',     label: 'Add a site',          desc: 'Register a new client site',        icon: Globe },
    { href: '/vault',         label: 'Open Vault',           desc: 'Manage credentials & API keys',     icon: KeyRound },
    { href: '/configurator',  label: 'Claude Configurator',  desc: 'Generate CLAUDE.md & settings',     icon: Cpu },
    { href: '/audits',        label: 'Evaluate a Site',      desc: 'Audit an existing site for SEO & security issues', icon: Search },
  ]

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-sm" style={{ color: 'var(--muted-light)' }}>Agency command center</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        {cards.map(c => (
          <Link key={c.label} href={c.href} className="no-underline group">
            <div className={`card card-glow ${c.statClass} rounded-xl p-5 h-full transition-all`}>
              <c.icon size={16} className="mb-4 shrink-0" style={{ color: ACCENT_TEXT[c.accent] }} />
              <div className="text-3xl font-bold leading-none mb-1.5 tabular-nums"
                style={{ color: ACCENT_TEXT[c.accent] }}>{c.value}</div>
              <div className="text-xs" style={{ color: 'var(--muted-light)' }}>{c.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Quick actions</h2>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        {quickLinks.map(l => (
          <Link key={l.href} href={l.href}
            className="no-underline group card card-glow flex items-center justify-between rounded-xl p-4 transition-all hover:border-indigo-500/40">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--surface2)' }}>
                <l.icon size={14} className="text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white leading-tight mb-0.5 truncate">{l.label}</div>
                <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>{l.desc}</div>
              </div>
            </div>
            <ArrowRight size={14} className="ml-2 transition-transform group-hover:translate-x-0.5 shrink-0"
              style={{ color: 'var(--muted)' }} />
          </Link>
        ))}
      </div>

      {/* Client Links */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Client links</h2>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/plan" className="no-underline group card card-glow rounded-xl p-5 transition-all hover:border-indigo-500/40">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Globe size={18} style={{ color: '#818cf8' }} />
          </div>
          <div className="text-base font-bold text-white mb-1">Plan a New Site →</div>
          <div className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            Walk a client through the site planning wizard to generate a custom blueprint.
          </div>
        </Link>
        <Link href="/evaluate" className="no-underline group card card-glow rounded-xl p-5 transition-all hover:border-cyan-500/40">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
            style={{ background: 'rgba(6,182,212,0.12)' }}>
            <Search size={18} style={{ color: '#22d3ee' }} />
          </div>
          <div className="text-base font-bold text-white mb-1">Evaluate Existing Site →</div>
          <div className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            Crawl an existing site for SEO, security, and performance issues — then build a fix plan.
          </div>
        </Link>
      </div>
    </div>
  )
}

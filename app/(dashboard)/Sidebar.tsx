'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Globe, KeyRound, LayoutDashboard, LogOut, Inbox, GitBranch, Wrench,
  Layers, Sparkles, Search, Zap, Shield, Hammer, HelpCircle, Map, Brain,
  Cpu, ArrowLeft, Settings2, BarChart2, Wand2, ScanSearch, ExternalLink,
  ChevronRight, LineChart, Users, FileText, DollarSign, Receipt, Rocket,
  Terminal, Pin, Activity,
} from 'lucide-react'

const GLOBAL_NAV = [
  { href: '/',               label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/sites',          label: 'Sites',         icon: Globe },
  { href: '/monitor',        label: 'Monitor',       icon: Activity,     accent: '#34d399' },
  { href: '/builds',         label: 'Builds',        icon: Hammer,       accent: '#34d399' },
  { href: '/analytics',      label: 'Analytics',     icon: LineChart,     accent: '#60a5fa' },
  { href: '/billing',        label: 'Billing',       icon: Receipt,    accent: '#10b981' },
  { href: '/monetization',   label: 'Monetization', icon: DollarSign, accent: '#34d399' },
  { href: '/build-studio',   label: 'Build Studio', icon: Terminal,   accent: '#818cf8' },
  { href: '/ship-ready',     label: 'Ship Ready',   icon: Rocket,     accent: '#34d399' },
  { href: '/tetrad',         label: 'TETRAD',       icon: Zap,        accent: '#fbbf24' },
  { href: '/language-lens',  label: 'Lang Lens',    icon: Shield,     accent: '#d4af37' },
  { href: '/submissions',    label: 'Submissions',  icon: Inbox },
  { href: '/audits',         label: 'Audits',       icon: Search },
  { href: '/iterations',     label: 'Iterations',   icon: GitBranch },
  { href: '/maintenance',    label: 'Maintain',     icon: Wrench },
  { href: '/batch',          label: 'Batch',        icon: Layers },
  { href: '/mods',           label: 'Mods',         icon: Sparkles },
  { href: '/vault',          label: 'Vault',        icon: KeyRound },
  { href: '/neural-map',     label: 'Neural Map',   icon: Brain,      accent: '#a78bfa' },
  { href: '/configurator',   label: 'Config',       icon: Cpu },
  { href: '/flow-boards',    label: 'Flow Boards',  icon: Pin,        accent: '#c9a96e' },
  { href: '/sitemap-visual', label: 'Sitemap',      icon: Map },
  { href: '/help',           label: 'Help',         icon: HelpCircle },
]

function projectNav(siteId: string, siteUrl?: string) {
  const base = `/sites/${siteId}`
  const evaluateUrl = `/evaluate?url=${encodeURIComponent(siteUrl ?? '')}&siteId=${siteId}`
  return [
    {
      section: 'Project',
      items: [
        { href: base,                     label: 'Overview',   icon: LayoutDashboard, accent: '#e2e8f0' },
        { href: `${base}/config`,         label: 'Config',     icon: Settings2,       accent: '#34d399' },
        { href: `${base}/blueprint`,      label: 'Blueprint',  icon: Map,             accent: '#818cf8' },
        { href: `${base}/build`,          label: 'Build',      icon: Wand2,           accent: '#f59e0b' },
        { href: `${base}/build/progress`, label: 'Progress',   icon: BarChart2,       accent: '#f87171' },
        { href: evaluateUrl,              label: 'Quality QA', icon: ScanSearch,      accent: '#34d399' },
        { href: `${base}/portal`,         label: 'Portal',     icon: Users,           accent: '#818cf8' },
        { href: `${base}/cms`,            label: 'CMS',        icon: FileText,        accent: '#f59e0b' },
      ],
    },
    {
      section: 'Tools',
      items: [
        { href: `${base}/edit`,  label: 'Edit Site',   icon: Wrench,   accent: '#94a3b8' },
        { href: '/vault',        label: 'Vault',        icon: KeyRound, accent: '#94a3b8' },
        { href: '/audits',       label: 'Audits',       icon: Search,   accent: '#94a3b8' },
        { href: '/iterations',   label: 'Iterations',   icon: GitBranch, accent: '#94a3b8' },
      ],
    },
  ]
}

const MOBILE_GLOBAL = GLOBAL_NAV.slice(0, 7)
const PROJECT_RE = /^\/sites\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/

type SiteInfo = { id: string; name: string; url: string }

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const match = PROJECT_RE.exec(pathname)
  const projectId = match?.[1] ?? null
  const isProjectMode = Boolean(projectId)

  const [site, setSite] = useState<SiteInfo | null>(null)

  useEffect(() => {
    if (!projectId) { setSite(null); return }
    fetch(`/api/sites/${projectId}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: SiteInfo | null) => { if (d) setSite(d) })
      .catch(() => null)
  }, [projectId])

  function isActive(href: string) {
    const base = href.split('?')[0]
    if (base === '/') return pathname === '/'
    if (base === `/sites/${projectId}`) return pathname === base
    return pathname === base || pathname.startsWith(base + '/')
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (isProjectMode && projectId) {
    const sections = projectNav(projectId, site?.url)
    return (
      <>
        <aside className="hidden md:flex w-52 flex-col shrink-0 border-r"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="px-3 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <Link href="/sites"
              className="flex items-center gap-1.5 text-xs mb-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
              style={{ color: 'var(--muted)' }}>
              <ArrowLeft size={12} /> All Sites
            </Link>
            <div className="rounded-lg px-3 py-2.5" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate text-white leading-tight">
                    {site?.name ?? '…'}
                  </div>
                  {site?.url && (
                    <a href={site.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 mt-0.5 hover:text-indigo-300 transition-colors"
                      style={{ color: '#818cf8', fontSize: 10 }}>
                      <ExternalLink size={9} />
                      <span className="truncate" style={{ maxWidth: 100 }}>
                        {site.url.replace(/^https?:\/\//, '')}
                      </span>
                    </a>
                  )}
                </div>
                <ChevronRight size={11} style={{ color: '#818cf8', flexShrink: 0, marginTop: 2 }} />
              </div>
            </div>
          </div>

          <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-4">
            {sections.map(({ section, items }) => (
              <div key={section}>
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--muted)', opacity: 0.5 }}>
                  {section}
                </div>
                <div className="space-y-px">
                  {items.map(({ href, label, icon: Icon, accent }) => {
                    const active = isActive(href)
                    const color = accent ?? '#6366f1'
                    return (
                      <Link key={href + label} href={href}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                          color: active ? '#e0e7ff' : 'var(--muted-light)',
                          background: active ? `${color}22` : 'transparent',
                          boxShadow: active ? `inset 3px 0 0 0 ${color}` : 'none',
                        }}>
                        <Icon size={13} className="shrink-0" style={{ color: active ? color : undefined }} />
                        {label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="px-2 pb-3 pt-2 border-t space-y-px" style={{ borderColor: 'var(--border)' }}>
            <Link href="/"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors"
              style={{ color: 'var(--muted)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
              <LayoutDashboard size={13} /> Dashboard
            </Link>
            <button onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors text-left"
              style={{ color: 'var(--muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.07)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' }}>
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </aside>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {[
            { href: `/sites/${projectId}`,         label: 'Overview', icon: LayoutDashboard },
            { href: `/sites/${projectId}/config`,  label: 'Config',   icon: Settings2 },
            { href: `/sites/${projectId}/blueprint`, label: 'Blueprint', icon: Map },
            { href: `/sites/${projectId}/build`,   label: 'Build',    icon: Wand2 },
            { href: '/sites',                      label: 'All Sites', icon: ArrowLeft },
          ].map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors relative"
                style={{ color: active ? '#818cf8' : '#475569' }}>
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-indigo-400" />}
                <Icon size={19} strokeWidth={active ? 2.2 : 1.7} />
                <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, letterSpacing: '0.05em' }}>
                  {label.toUpperCase()}
                </span>
              </Link>
            )
          })}
        </nav>
      </>
    )
  }

  return (
    <>
      <aside className="hidden md:flex w-52 flex-col shrink-0 border-r"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)', boxShadow: '0 2px 8px rgba(99,102,241,0.4)' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L12.196 4V10L7 13L1.804 10V4L7 1Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="7" cy="7" r="1.5" fill="white"/>
              </svg>
            </div>
            <div>
              <div className="font-bold text-[13px] text-white leading-none tracking-tight">Worker-Bee</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>Agency console</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-px overflow-y-auto">
          {GLOBAL_NAV.map(({ href, label, icon: Icon, accent }) => {
            const active = isActive(href)
            const activeColor = accent ?? '#6366f1'
            const activeIconColor = accent ?? '#818cf8'
            return (
              <Link key={href} href={href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all relative"
                style={{
                  color: active ? '#e0e7ff' : 'var(--muted-light)',
                  background: active ? `${activeColor}22` : 'transparent',
                  boxShadow: active ? `inset 3px 0 0 0 ${activeColor}` : 'none',
                }}>
                <Icon size={14} className="shrink-0" style={{ color: active ? activeIconColor : undefined }} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="px-2 pb-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.background = 'rgba(248,113,113,0.07)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' }}>
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {MOBILE_GLOBAL.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors relative"
              style={{ color: active ? '#818cf8' : '#475569' }}>
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-indigo-400" />}
              <Icon size={19} strokeWidth={active ? 2.2 : 1.7} />
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, letterSpacing: '0.05em' }}>
                {label.toUpperCase()}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

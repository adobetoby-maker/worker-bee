'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Globe, KeyRound, LayoutDashboard, LogOut, Cpu, Inbox, GitBranch, Wrench, Layers, Sparkles } from 'lucide-react'

const NAV = [
  { href: '/',              label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/sites',         label: 'Sites',        icon: Globe },
  { href: '/submissions',   label: 'Submissions',  icon: Inbox },
  { href: '/iterations',    label: 'Iterations',   icon: GitBranch },
  { href: '/maintenance',   label: 'Maintain',     icon: Wrench },
  { href: '/batch',         label: 'Batch',        icon: Layers },
  { href: '/mods',          label: 'Mods',         icon: Sparkles },
  { href: '/vault',         label: 'Vault',        icon: KeyRound },
  { href: '/configurator',  label: 'Config',       icon: Cpu },
]

/* Mobile tab bar shows only top-level items */
const MOBILE_NAV = NAV.slice(0, 6)

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href)
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-52 flex-col shrink-0 border-r"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

        {/* Brand */}
        <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            {/* Hexagon bee mark */}
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

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-px overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all relative"
                style={{
                  color: active ? '#e0e7ff' : 'var(--muted-light)',
                  background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                  boxShadow: active ? 'inset 3px 0 0 0 #6366f1' : 'none',
                }}>
                <Icon size={14} className="shrink-0" style={{ color: active ? '#818cf8' : undefined }} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
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

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {MOBILE_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors relative"
              style={{ color: active ? '#818cf8' : '#475569' }}>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-indigo-400" />
              )}
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

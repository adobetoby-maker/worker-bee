'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Globe, KeyRound, Settings, LayoutDashboard, LogOut, Cpu, Inbox, GitBranch, Wrench, Layers, Sparkles, BookOpen } from 'lucide-react'

const NAV = [
  { href: '/',              label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/sites',         label: 'Sites',         icon: Globe },
  { href: '/submissions',   label: 'Submissions',   icon: Inbox },
  { href: '/iterations',    label: 'Iterations',    icon: GitBranch },
  { href: '/maintenance',   label: 'Maintain',      icon: Wrench },
  { href: '/batch',         label: 'Batch',         icon: Layers },
  { href: '/mods',          label: 'Mods',          icon: Sparkles },
  { href: '/lingua',        label: 'Lingua',        icon: BookOpen },
  { href: '/vault',         label: 'Vault',         icon: KeyRound },
  { href: '/configurator',  label: 'Config',        icon: Cpu },
]

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
      <aside className="hidden md:flex w-56 flex-col shrink-0 border-r" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <Settings size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm text-white tracking-tight">Worker-Bee</span>
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>Agency console</p>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive(href) ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}>
              <Icon size={15} className="shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="px-2 pb-4 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          <button onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors">
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch border-t"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors"
              style={{ color: active ? '#818cf8' : '#475569' }}>
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, letterSpacing: '0.04em' }}>
                {label.toUpperCase()}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

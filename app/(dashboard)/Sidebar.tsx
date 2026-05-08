'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Globe, KeyRound, Settings, LayoutDashboard, LogOut, Cpu, Inbox } from 'lucide-react'

const NAV = [
  { href: '/',             label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/sites',        label: 'Sites',         icon: Globe },
  { href: '/submissions',  label: 'Submissions',   icon: Inbox },
  { href: '/vault',        label: 'Vault',         icon: KeyRound },
  { href: '/configurator', label: 'Configurator',  icon: Cpu },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="w-56 flex flex-col shrink-0 border-r" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <Settings size={14} className="text-white" />
          </div>
          <span className="font-bold text-sm text-white tracking-tight">Worker-Bee</span>
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>Agency console</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}>
              <Icon size={15} className="shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-4 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        <button onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors">
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}

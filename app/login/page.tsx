'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/sites')
    } else {
      setError('Invalid password.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm px-4">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <KeyRound size={18} className="text-white" />
          </div>
          <span className="text-[1.1rem] font-bold text-white tracking-tight">Worker-Bee</span>
        </div>
        <form onSubmit={submit} className="rounded-2xl border p-8 space-y-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div>
            <h1 className="text-lg font-bold text-white mb-1">Sign in</h1>
            <p className="text-sm" style={{ color: 'var(--muted-light)' }}>Agency management console</p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              className="w-full rounded-xl border px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
              style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
              placeholder="Enter master password"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

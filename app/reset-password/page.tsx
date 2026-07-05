'use client'
// Built by ATLAS — 2026-07-05
// Public reset-password page. Token arrives as ?token=... from the emailed
// link. Client-side expiry decode is UX only — the real HMAC + expiry check
// happens server-side in /api/auth/reset-confirm.

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { KeyRound, Eye, EyeOff } from 'lucide-react'

const MIN_LENGTH = 12

/** UX-only token peek: decode base64url payload and check exp. */
function tokenLooksValid(token: string | null): boolean {
  if (!token) return false
  const dot = token.lastIndexOf('.')
  if (dot === -1) return false
  try {
    const payload = JSON.parse(atob(token.slice(0, dot).replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' && Date.now() < payload.exp
  } catch {
    return false
  }
}

function RevealInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-xl border px-4 py-3 pr-11 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
          style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors hover:text-white"
          style={{ color: 'var(--muted)' }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const tokenOk = useMemo(() => tokenLooksValid(token), [token])

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    const res = await fetch('/api/auth/reset-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    if (res.ok) {
      router.push('/sites')
    } else if (res.status === 401) {
      setError('This reset link is invalid or has expired. Request a new one from the login page.')
      setLoading(false)
    } else {
      const body = await res.json().catch(() => null)
      setError(body?.error ?? 'Reset failed. Try again.')
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
            <h1 className="text-lg font-bold text-white mb-1">Set a new password</h1>
            <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
              {tokenOk
                ? `Minimum ${MIN_LENGTH} characters. You'll be signed in right away.`
                : 'This reset link is invalid or has expired.'}
            </p>
          </div>
          {tokenOk ? (
            <>
              <RevealInput label="New password" value={password} onChange={setPassword} placeholder="At least 12 characters" />
              <RevealInput label="Confirm password" value={confirm} onChange={setConfirm} placeholder="Repeat new password" />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm cursor-pointer"
              >
                {loading ? 'Saving…' : 'Set password & sign in'}
              </button>
            </>
          ) : (
            <a
              href="/login"
              className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors text-sm text-center cursor-pointer"
            >
              Back to sign in
            </a>
          )}
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}

'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Eye, EyeOff } from 'lucide-react'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string
              size?: string
              width?: number
              text?: string
              shape?: string
            },
          ) => void
        }
      }
    }
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSending, setResetSending] = useState(false)
  const googleDivRef = useRef<HTMLDivElement>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')
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

  async function requestReset() {
    if (resetSending) return
    setResetSending(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/auth/reset-request', { method: 'POST' })
      if (res.status === 429) {
        setError('A reset link was just sent — wait a minute before trying again.')
      } else {
        setNotice('Reset link sent to the operator email. It expires in 15 minutes.')
      }
    } catch {
      setError('Could not request a reset. Try again.')
    } finally {
      setResetSending(false)
    }
  }

  const handleGoogleCredential = useCallback(
    async (response: { credential: string }) => {
      setError('')
      setNotice('')
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      })
      if (res.ok) {
        router.push('/sites')
      } else {
        setError('Google sign-in failed — account not authorized.')
      }
    },
    [router],
  )

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return

    function renderGoogleButton() {
      if (!window.google || !googleDivRef.current) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID as string,
        callback: handleGoogleCredential,
      })
      window.google.accounts.id.renderButton(googleDivRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: 304,
        text: 'continue_with',
        shape: 'pill',
      })
    }

    if (window.google) {
      renderGoogleButton()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = renderGoogleButton
    document.head.appendChild(script)
  }, [handleGoogleCredential])

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
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                className="w-full rounded-xl border px-4 py-3 pr-11 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
                style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
                placeholder="Enter master password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors hover:text-white"
                style={{ color: 'var(--muted)' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {notice && <p className="text-sm text-emerald-400">{notice}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm cursor-pointer"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={requestReset}
              disabled={resetSending}
              className="text-xs cursor-pointer transition-colors hover:text-white disabled:opacity-50"
              style={{ color: 'var(--muted)' }}
            >
              {resetSending ? 'Sending…' : 'Forgot password?'}
            </button>
          </div>
          {GOOGLE_CLIENT_ID && (
            <div className="pt-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>or</span>
                <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
              </div>
              <div ref={googleDivRef} className="flex justify-center" />
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { Wand2, Sparkles, Send, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react'

type Step = 'form' | 'polish' | 'submitted'

export default function RequestPage() {
  const [step, setStep] = useState<Step>('form')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [business, setBusiness] = useState('')
  const [raw, setRaw] = useState('')
  const [cleaned, setCleaned] = useState('')

  const [polishing, setPolishing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function polishRequest() {
    if (!raw.trim()) return
    setPolishing(true)
    setError('')
    try {
      const res = await fetch('/api/maintenance/cleanup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ raw, business }),
      })
      const data = await res.json() as { cleaned?: string; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Cleanup failed')
      setCleaned(data.cleaned ?? raw)
      setStep('polish')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPolishing(false)
    }
  }

  async function submitRequest() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/maintenance/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, business, raw, cleaned }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Submit failed')
      setStep('submitted')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = "w-full rounded-xl border px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
  const inputStyle = { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.12)' }

  if (step === 'submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0a0f1a' }}>
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Request received!</h1>
          <p className="text-slate-400 mb-6">
            We&apos;ll review your request and follow up at {email} within one business day.
          </p>
          <div className="rounded-2xl border p-5 text-left" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">What happens next</p>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>→ We review your request and confirm scope</li>
              <li>→ Our team makes the changes to your live site</li>
              <li>→ You get a link to review before we publish</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 md:p-12" style={{ background: '#0a0f1a' }}>
      <div className="max-w-xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 size={18} className="text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Worker Bee</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Request a change</h1>
          <p className="text-slate-400 text-sm">
            Tell us what you&apos;d like updated on your site. Plain English is perfect — we&apos;ll handle the rest.
          </p>
        </div>

        {step === 'form' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Your name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith"
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Email *</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" type="email"
                  className={inputCls} style={inputStyle} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Business name</label>
              <input value={business} onChange={e => setBusiness(e.target.value)} placeholder="Acme Plumbing Co."
                className={inputCls} style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                What needs to change? *
              </label>
              <textarea
                value={raw}
                onChange={e => setRaw(e.target.value)}
                rows={6}
                placeholder={`Describe what you'd like updated. For example:\n\n"Can you update our hours to Monday–Friday 8am–6pm and Saturday 9am–3pm? Also the phone number changed to 555-0192. And can we add a section about our new tire rotation special for $29.99?"`}
                className={inputCls}
                style={{ ...inputStyle, resize: 'none' }}
              />
              <p className="text-xs text-slate-600 mt-1.5 px-1">
                Don&apos;t worry about being technical — write it exactly like you&apos;d say it to us.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-400 px-1">{error}</p>
            )}

            <button
              onClick={polishRequest}
              disabled={polishing || !name.trim() || !email.trim() || !raw.trim()}
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', cursor: polishing || !raw.trim() ? 'not-allowed' : 'pointer' }}
            >
              {polishing
                ? <><Loader2 size={14} className="animate-spin" /> Polishing your request…</>
                : <><Sparkles size={14} /> Polish & preview</>
              }
            </button>
            <p className="text-xs text-center text-slate-600">
              We&apos;ll clean up your request and show you a preview before submitting.
            </p>
          </div>
        )}

        {step === 'polish' && (
          <div className="space-y-5">
            <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Your original request</p>
                <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{raw}</p>
              </div>
              <div className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-2 flex items-center gap-1.5">
                  <Sparkles size={11} /> Polished version
                </p>
                <textarea
                  value={cleaned}
                  onChange={e => setCleaned(e.target.value)}
                  rows={7}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-slate-200 leading-relaxed resize-none"
                  style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}
                />
                <p className="text-xs text-slate-600 mt-1 px-0.5">You can edit this before submitting.</p>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 px-1">{error}</p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('form')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                <ArrowLeft size={14} /> Edit
              </button>
              <button
                onClick={submitRequest}
                disabled={submitting || !cleaned.trim()}
                className="flex items-center justify-center gap-2 flex-1 px-6 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                style={{ background: '#6366f1', color: 'white' }}
              >
                {submitting
                  ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
                  : <><Send size={14} /> Submit request</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

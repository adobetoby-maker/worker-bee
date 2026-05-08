'use client'
import { useState } from 'react'
import { Wand2, Send, CheckCircle2, Plus, X, ChevronRight } from 'lucide-react'

const CARD_TYPES = ['page', 'section', 'feature'] as const

interface Card {
  id: string
  title: string
  type: typeof CARD_TYPES[number]
  notes: string
}

type Step = 'intake' | 'cards' | 'submitted'

export default function PlanPage() {
  const [step, setStep] = useState<Step>('intake')

  // Intake fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [business, setBusiness] = useState('')
  const [vision, setVision] = useState('')

  // Cards
  const [cards, setCards] = useState<Card[]>([])
  const [cardTitle, setCardTitle] = useState('')
  const [cardType, setCardType] = useState<typeof CARD_TYPES[number]>('page')
  const [cardNotes, setCardNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function addCard() {
    if (!cardTitle.trim()) return
    setCards(cs => [...cs, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: cardTitle.trim(),
      type: cardType,
      notes: cardNotes.trim(),
    }])
    setCardTitle('')
    setCardNotes('')
  }

  function removeCard(id: string) {
    setCards(cs => cs.filter(c => c.id !== id))
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    try {
      const nodes = cards.map((c, i) => ({
        id: c.id,
        position: { x: (i % 4) * 240, y: Math.floor(i / 4) * 200 },
        data: { title: c.title, type: c.type, description: c.notes, claudePrompt: '', status: 'planned' },
      }))
      const res = await fetch('/api/blueprints/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, business, vision, nodes, edges: [] }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `Server error ${res.status}`)
      }
      setStep('submitted')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
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
          <h1 className="text-2xl font-bold text-white mb-2">Plan received!</h1>
          <p className="text-slate-400 mb-6">
            We&apos;ll review your blueprint and reach out to {email} to get started.
          </p>
          <div className="rounded-2xl border p-5 text-left" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">What happens next</p>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>→ We review your vision and card list</li>
              <li>→ We refine the brief and confirm scope</li>
              <li>→ Build begins within 1–2 business days</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 md:p-12" style={{ background: '#0a0f1a' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Wand2 size={20} className="text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">Worker Bee</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Plan your website</h1>
          <p className="text-slate-400">Tell us what you need. We&apos;ll handle the rest.</p>
        </div>

        {/* Step tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {(['intake', 'cards'] as const).map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              disabled={s === 'cards' && !name && !email}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
              style={{
                background: step === s ? '#6366f1' : 'transparent',
                color: step === s ? 'white' : 'rgba(255,255,255,0.5)',
              }}
            >
              <span className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                style={{ background: step === s ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)' }}>
                {i + 1}
              </span>
              {s === 'intake' ? 'Your info' : 'Your pages'}
            </button>
          ))}
        </div>

        {/* ── Step 1: Intake ── */}
        {step === 'intake' && (
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
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">What does your website need to do?</label>
              <textarea value={vision} onChange={e => setVision(e.target.value)} rows={4}
                placeholder="Tell us your goals, your customers, what makes you different, any sites you like the look of…"
                className={inputCls} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <button
              onClick={() => setStep('cards')}
              disabled={!name.trim() || !email.trim()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-40"
              style={{ background: '#6366f1', color: 'white' }}
            >
              Next — add your pages <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* ── Step 2: Cards ── */}
        {step === 'cards' && (
          <div className="space-y-6">
            <p className="text-sm text-slate-400">
              Add the pages or sections you need. Even a rough list helps — we&apos;ll fill in the details.
            </p>

            {/* Existing cards */}
            {cards.length > 0 && (
              <div className="space-y-2">
                {cards.map(c => (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}>
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded"
                      style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>{c.type}</span>
                    <span className="flex-1 text-sm font-semibold text-white">{c.title}</span>
                    {c.notes && <span className="text-xs text-slate-500 truncate max-w-[160px]">{c.notes}</span>}
                    <button onClick={() => removeCard(c.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add card form */}
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex gap-2">
                {CARD_TYPES.map(t => (
                  <button key={t} onClick={() => setCardType(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: cardType === t ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                      color: cardType === t ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
                      border: `1px solid ${cardType === t ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
                    }}>
                    {t}
                  </button>
                ))}
              </div>
              <input value={cardTitle} onChange={e => setCardTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCard()}
                placeholder="e.g. Home page, Services, About us, Contact…"
                className={inputCls} style={inputStyle} />
              <input value={cardNotes} onChange={e => setCardNotes(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCard()}
                placeholder="Notes (optional) — any special requirements"
                className={inputCls} style={inputStyle} />
              <button onClick={addCard} disabled={!cardTitle.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
                style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                <Plus size={14} /> Add card
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-400 px-1">{error}</p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep('intake')}
                className="px-5 py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                Back
              </button>
              <button onClick={submit} disabled={submitting || (!name.trim() || !email.trim())}
                className="flex items-center gap-2 flex-1 justify-center px-6 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                style={{ background: '#6366f1', color: 'white' }}>
                {submitting
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</>
                  : <><Send size={14} />Send us the plan</>
                }
              </button>
            </div>

            <p className="text-xs text-center text-slate-600">
              Don&apos;t have every page figured out yet? Submit anyway — we&apos;ll work through it together.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

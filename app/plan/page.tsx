'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { CheckCircle2 } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

const PAGE_OPTIONS = ['Home', 'About', 'Services', 'Blog', 'Contact', 'Portfolio', 'Pricing', 'FAQ', 'Store'] as const

const STYLE_OPTIONS = [
  { id: 'minimal', label: 'Minimal', desc: 'Clean, airy, lots of white space' },
  { id: 'bold', label: 'Bold', desc: 'Strong type, high contrast, commanding' },
  { id: 'luxury', label: 'Luxury', desc: 'Rich textures, gold accents, refined' },
  { id: 'playful', label: 'Playful', desc: 'Bright colors, rounded shapes, fun' },
  { id: 'corporate', label: 'Corporate', desc: 'Trustworthy, structured, professional' },
  { id: 'editorial', label: 'Editorial', desc: 'Magazine-style, type-forward, cultural' },
] as const

interface WizardData {
  businessName: string
  description: string
  audience: string
  cta: string
  pages: string[]
  style: string
  inspiration: string
}

interface BlueprintNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    title: string
    type: string
    description: string
    purpose?: string
    sections?: string[]
    status: string
    rotation?: number
    claudePrompt?: string
  }
}

interface BlueprintEdge {
  id: string
  source: string
  target: string
  type?: string
}

interface AnalysisOutput {
  claudeMd?: string
  settingsJson?: string
  htmlStarter?: string
  tailwindStarter?: string
}

interface SubmissionPayload {
  wizard: WizardData
  cleaned: Partial<WizardData>
  blueprint: { nodes: BlueprintNode[]; edges: BlueprintEdge[] }
  style: string
  pages: string[]
  analysis?: AnalysisOutput
  submittedAt: string
}

type Phase = 'wizard' | 'corkboard' | 'submitting' | 'done'

// ── Helpers ────────────────────────────────────────────────────────────────

function useDebouncedCleanup(wizard: WizardData, step: number) {
  const [cleaned, setCleaned] = useState<Partial<WizardData>>({})
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevStepRef = useRef(step)

  const runCleanup = useCallback(async (data: WizardData) => {
    if (!data.description.trim()) return
    try {
      const res = await fetch('/api/blueprint-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field: 'description',
          value: data.description,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.result) {
          setCleaned(prev => ({ ...prev, description: json.result }))
        }
      }
    } catch {
      // silent — this is a background enhancement
    }
  }, [])

  useEffect(() => {
    if (step !== prevStepRef.current) {
      prevStepRef.current = step
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => runCleanup(wizard), 800)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [step, wizard, runCleanup])

  return cleaned
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function PlanPage() {
  const [step, setStep] = useState(1) // 1–7
  const [phase, setPhase] = useState<Phase>('wizard')

  const [wizard, setWizard] = useState<WizardData>({
    businessName: '',
    description: '',
    audience: '',
    cta: '',
    pages: [],
    style: '',
    inspiration: '',
  })

  const cleaned = useDebouncedCleanup(wizard, step)

  const [customPage, setCustomPage] = useState('')
  const [blueprint, setBlueprint] = useState<{ nodes: BlueprintNode[]; edges: BlueprintEdge[] } | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisOutput | null>(null)
  const [blueprintError, setBlueprintError] = useState('')
  const [blueprintLoading, setBlueprintLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submittedId, setSubmittedId] = useState('')

  const totalSteps = 7

  function update<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setWizard(prev => ({ ...prev, [key]: value }))
  }

  function togglePage(page: string) {
    setWizard(prev => ({
      ...prev,
      pages: prev.pages.includes(page)
        ? prev.pages.filter(p => p !== page)
        : [...prev.pages, page],
    }))
  }

  function addCustomPage() {
    const trimmed = customPage.trim()
    if (!trimmed || wizard.pages.includes(trimmed)) return
    setWizard(prev => ({ ...prev, pages: [...prev.pages, trimmed] }))
    setCustomPage('')
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1: return wizard.businessName.trim().length > 0
      case 2: return wizard.description.trim().length > 0
      case 3: return wizard.audience.trim().length > 0
      case 4: return wizard.cta.trim().length > 0
      case 5: return wizard.pages.length > 0
      case 6: return wizard.style.length > 0
      case 7: return true // inspiration is optional
      default: return false
    }
  }

  async function goNext() {
    if (step < totalSteps) {
      setStep(s => s + 1)
    } else {
      await generateBlueprint()
    }
  }

  function goBack() {
    if (phase === 'corkboard') {
      setPhase('wizard')
      setStep(1)
      setBlueprint(null)
      setBlueprintError('')
    } else if (step > 1) {
      setStep(s => s - 1)
    }
  }

  async function generateBlueprint() {
    setBlueprintLoading(true)
    setBlueprintError('')
    setPhase('corkboard')
    try {
      const res = await fetch('/api/blueprint-wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'wizard',
          wizard,
          cleaned,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `Error ${res.status}`)
      }
      const data = await res.json()
      setBlueprint({ nodes: data.nodes ?? [], edges: data.edges ?? [] })
      setAnalysis(data.analysis ?? null)
    } catch (err) {
      setBlueprintError(err instanceof Error ? err.message : String(err))
    } finally {
      setBlueprintLoading(false)
    }
  }

  async function confirmAndSubmit() {
    setPhase('submitting')
    setSubmitError('')
    try {
      const payload: SubmissionPayload = {
        wizard,
        cleaned,
        blueprint: blueprint ?? { nodes: [], edges: [] },
        style: wizard.style,
        pages: wizard.pages,
        analysis: analysis ?? undefined,
        submittedAt: new Date().toISOString(),
      }
      const res = await fetch('/api/blueprints/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `Error ${res.status}`)
      }
      const data = await res.json()
      setSubmittedId(data.id ?? '')
      // Brief delay for the "finalizing" message to show
      await new Promise(r => setTimeout(r, 1800))
      setPhase('done')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
      setPhase('corkboard')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'done') {
    return <DoneScreen wizard={wizard} blueprint={blueprint} submittedId={submittedId} />
  }

  if (phase === 'submitting') {
    return <SubmittingScreen />
  }

  if (phase === 'corkboard') {
    return (
      <CorkboardScreen
        wizard={wizard}
        blueprint={blueprint}
        loading={blueprintLoading}
        error={blueprintError}
        submitError={submitError}
        onConfirm={confirmAndSubmit}
        onBack={goBack}
        onRetry={generateBlueprint}
      />
    )
  }

  // Wizard phase
  return (
    <WizardScreen
      step={step}
      totalSteps={totalSteps}
      wizard={wizard}
      update={update}
      togglePage={togglePage}
      customPage={customPage}
      setCustomPage={setCustomPage}
      addCustomPage={addCustomPage}
      canAdvance={canAdvance}
      goNext={goNext}
      goBack={goBack}
    />
  )
}

// ── Wizard Screen ──────────────────────────────────────────────────────────

interface WizardScreenProps {
  step: number
  totalSteps: number
  wizard: WizardData
  update: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void
  togglePage: (page: string) => void
  customPage: string
  setCustomPage: (v: string) => void
  addCustomPage: () => void
  canAdvance: () => boolean
  goNext: () => void
  goBack: () => void
}

function WizardScreen({
  step, totalSteps, wizard, update, togglePage,
  customPage, setCustomPage, addCustomPage, canAdvance, goNext, goBack,
}: WizardScreenProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
    // Focus main input on step change
    const t = setTimeout(() => {
      if (inputRef.current) inputRef.current.focus()
    }, 50)
    return () => clearTimeout(t)
  }, [step])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && step !== 2 && step !== 7) {
      e.preventDefault()
      if (canAdvance()) goNext()
    }
  }

  const inputBase = "w-full bg-transparent rounded-2xl border px-5 py-4 text-lg text-white placeholder-white/30 outline-none transition-all focus:border-white/40"
  const inputStyle: React.CSSProperties = { borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)' }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0b0d18' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <span className="text-sm font-bold tracking-tight" style={{ color: 'rgba(255,255,255,0.5)' }}>
          worker-bee.app / plan
        </span>
        <span className="text-sm font-medium tabular-nums" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {step} of {totalSteps}
        </span>
      </div>

      {/* Progress track */}
      <div className="h-0.5 w-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${(step / totalSteps) * 100}%`, background: 'var(--accent)' }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl animate-fade-in" key={step}>
          {/* Question */}
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>
            Question {step}
          </p>

          {step === 1 && (
            <WizardStep1
              value={wizard.businessName}
              onChange={v => update('businessName', v)}
              inputRef={inputRef as React.RefObject<HTMLInputElement>}
              inputBase={inputBase}
              inputStyle={inputStyle}
              onKeyDown={handleKeyDown}
            />
          )}
          {step === 2 && (
            <WizardStep2
              value={wizard.description}
              onChange={v => update('description', v)}
              inputRef={inputRef as React.RefObject<HTMLTextAreaElement>}
              inputBase={inputBase}
              inputStyle={inputStyle}
            />
          )}
          {step === 3 && (
            <WizardStep3
              value={wizard.audience}
              onChange={v => update('audience', v)}
              inputRef={inputRef as React.RefObject<HTMLInputElement>}
              inputBase={inputBase}
              inputStyle={inputStyle}
              onKeyDown={handleKeyDown}
            />
          )}
          {step === 4 && (
            <WizardStep4
              value={wizard.cta}
              onChange={v => update('cta', v)}
              inputRef={inputRef as React.RefObject<HTMLInputElement>}
              inputBase={inputBase}
              inputStyle={inputStyle}
              onKeyDown={handleKeyDown}
            />
          )}
          {step === 5 && (
            <WizardStep5
              pages={wizard.pages}
              togglePage={togglePage}
              customPage={customPage}
              setCustomPage={setCustomPage}
              addCustomPage={addCustomPage}
            />
          )}
          {step === 6 && (
            <WizardStep6
              style={wizard.style}
              setStyle={v => update('style', v)}
            />
          )}
          {step === 7 && (
            <WizardStep7
              value={wizard.inspiration}
              onChange={v => update('inspiration', v)}
              inputRef={inputRef as React.RefObject<HTMLTextAreaElement>}
              inputBase={inputBase}
              inputStyle={inputStyle}
            />
          )}

          {/* Nav buttons */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={goBack}
                className="px-5 py-3 rounded-2xl text-sm font-semibold transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
              >
                Back
              </button>
            )}
            <button
              onClick={goNext}
              disabled={!canAdvance()}
              className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-30"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              {step === totalSteps ? 'Generate my site plan →' : 'Next →'}
            </button>
          </div>

          {step === totalSteps && (
            <p className="text-xs text-center mt-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Takes about 10 seconds
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Individual Steps ───────────────────────────────────────────────────────

function WizardStep1({ value, onChange, inputRef, inputBase, inputStyle, onKeyDown }: {
  value: string; onChange: (v: string) => void
  inputRef: React.RefObject<HTMLInputElement>
  inputBase: string; inputStyle: React.CSSProperties
  onKeyDown: (e: React.KeyboardEvent) => void
}) {
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-3">What&apos;s your business name?</h1>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Just the name — we&apos;ll build on it.</p>
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="e.g. Acme Plumbing Co."
        className={inputBase}
        style={inputStyle}
      />
    </>
  )
}

function WizardStep2({ value, onChange, inputRef, inputBase, inputStyle }: {
  value: string; onChange: (v: string) => void
  inputRef: React.RefObject<HTMLTextAreaElement>
  inputBase: string; inputStyle: React.CSSProperties
}) {
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-3">What does it do in one sentence?</h1>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Don&apos;t overthink it — raw and honest is fine.</p>
      <textarea
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. We help Twin Falls homeowners fix plumbing emergencies fast, any time of day."
        rows={3}
        className={inputBase}
        style={{ ...inputStyle, resize: 'none' }}
      />
    </>
  )
}

function WizardStep3({ value, onChange, inputRef, inputBase, inputStyle, onKeyDown }: {
  value: string; onChange: (v: string) => void
  inputRef: React.RefObject<HTMLInputElement>
  inputBase: string; inputStyle: React.CSSProperties
  onKeyDown: (e: React.KeyboardEvent) => void
}) {
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-3">Who is it for?</h1>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Describe the person who needs you most.</p>
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="e.g. Homeowners in their 30s–50s who value reliability over price"
        className={inputBase}
        style={inputStyle}
      />
    </>
  )
}

function WizardStep4({ value, onChange, inputRef, inputBase, inputStyle, onKeyDown }: {
  value: string; onChange: (v: string) => void
  inputRef: React.RefObject<HTMLInputElement>
  inputBase: string; inputStyle: React.CSSProperties
  onKeyDown: (e: React.KeyboardEvent) => void
}) {
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-3">What&apos;s the main thing you want visitors to do?</h1>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Your primary call-to-action and conversion goal.</p>
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="e.g. Call us or book a service online"
        className={inputBase}
        style={inputStyle}
      />
    </>
  )
}

function WizardStep5({ pages, togglePage, customPage, setCustomPage, addCustomPage }: {
  pages: string[]
  togglePage: (p: string) => void
  customPage: string
  setCustomPage: (v: string) => void
  addCustomPage: () => void
}) {
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-3">What pages do you need?</h1>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Pick all that apply — you can add custom ones too.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {PAGE_OPTIONS.map(page => {
          const selected = pages.includes(page)
          return (
            <button
              key={page}
              onClick={() => togglePage(page)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: selected ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                color: selected ? 'white' : 'rgba(255,255,255,0.55)',
                border: `1px solid ${selected ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {page}
            </button>
          )
        })}

        {/* Custom pages already added */}
        {pages.filter(p => !(PAGE_OPTIONS as readonly string[]).includes(p)).map(page => (
          <button
            key={page}
            onClick={() => togglePage(page)}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: 'var(--accent)',
              color: 'white',
              border: '1px solid var(--accent)',
            }}
          >
            {page} ×
          </button>
        ))}
      </div>

      {/* Add custom page */}
      <div className="flex gap-2">
        <input
          value={customPage}
          onChange={e => setCustomPage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomPage() } }}
          placeholder="Add custom page…"
          className="flex-1 bg-transparent rounded-xl border px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/30 transition-all"
          style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)' }}
        />
        <button
          onClick={addCustomPage}
          disabled={!customPage.trim()}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
        >
          Add
        </button>
      </div>
    </>
  )
}

function WizardStep6({ style, setStyle }: { style: string; setStyle: (v: string) => void }) {
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-3">What&apos;s your style?</h1>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Pick the vibe that fits your brand.</p>

      <div className="grid grid-cols-2 gap-3">
        {STYLE_OPTIONS.map(opt => {
          const selected = style === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => setStyle(opt.id)}
              className="text-left p-4 rounded-2xl border transition-all"
              style={{
                background: selected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                borderColor: selected ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
              }}
            >
              <div className="text-sm font-bold text-white mb-0.5">{opt.label}</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{opt.desc}</div>
            </button>
          )
        })}
      </div>
    </>
  )
}

function WizardStep7({ value, onChange, inputRef, inputBase, inputStyle }: {
  value: string; onChange: (v: string) => void
  inputRef: React.RefObject<HTMLTextAreaElement>
  inputBase: string; inputStyle: React.CSSProperties
}) {
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-3">Any sites you love the look of?</h1>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Optional — paste links or just describe what you like.</p>
      <textarea
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. stripe.com — clean and modern. Or: I love dark themes with big headlines."
        rows={4}
        className={inputBase}
        style={{ ...inputStyle, resize: 'none' }}
      />
    </>
  )
}

// ── Cork Board Screen ──────────────────────────────────────────────────────

const CARD_COLORS = [
  '#fffbeb', // warm yellow
  '#fef2f2', // blush
  '#f0fdf4', // mint
  '#eff6ff', // sky
  '#fdf4ff', // lavender
  '#fff7ed', // peach
]

const PIN_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899']

function CorkboardScreen({ wizard, blueprint, loading, error, submitError, onConfirm, onBack, onRetry }: {
  wizard: WizardData
  blueprint: { nodes: BlueprintNode[]; edges: BlueprintEdge[] } | null
  loading: boolean
  error: string
  submitError: string
  onConfirm: () => void
  onBack: () => void
  onRetry: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0b0d18' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <span className="text-sm font-bold tracking-tight" style={{ color: 'rgba(255,255,255,0.5)' }}>
          worker-bee.app / plan
        </span>
        <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}>
          Your site plan
        </span>
      </div>

      {/* Board area */}
      <div className="flex-1 overflow-auto p-6 md:p-10">
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/60"
              style={{ animation: 'spin 0.9s linear infinite' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Building your site plan…</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={onRetry}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.3)' }}>
              Try again
            </button>
          </div>
        )}

        {blueprint && !loading && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-1">{wizard.businessName || 'Your site'}</h2>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {wizard.pages.length} pages · {wizard.style} style
              </p>
            </div>

            {/* Cork board */}
            <div
              className="rounded-3xl relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #c8a97a 0%, #b8935e 50%, #c4a06e 100%)',
                minHeight: 480,
                padding: '40px 32px',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2), 0 4px 32px rgba(0,0,0,0.4)',
              }}
            >
              {/* Cork texture overlay */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 60% 70%, rgba(0,0,0,0.1) 1px, transparent 1px)',
                backgroundSize: '18px 18px, 24px 24px',
              }} />

              {/* SVG edges / threads */}
              {blueprint.edges.length > 0 && (
                <svg
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: '100%', height: '100%', overflow: 'visible' }}
                >
                  {/* We skip edge rendering since absolute-positioned cards make coordinate mapping complex */}
                </svg>
              )}

              {/* Cards grid */}
              <div className="relative grid gap-6"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                {blueprint.nodes.map((node, i) => {
                  const cardColor = CARD_COLORS[i % CARD_COLORS.length]
                  const pinColor = PIN_COLORS[i % PIN_COLORS.length]
                  const rotation = node.data.rotation ?? ((i % 3 === 0 ? -1 : i % 3 === 1 ? 1 : -0.5) * (1 + (i * 0.3)))
                  const sections = node.data.sections ?? []

                  return (
                    <div
                      key={node.id}
                      className="relative"
                      style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'top center' }}
                    >
                      {/* Pin */}
                      <div className="absolute left-1/2 -top-3 z-10"
                        style={{ transform: 'translateX(-50%)' }}>
                        <div className="w-5 h-5 rounded-full border-2 border-white/30 shadow-sm"
                          style={{ background: pinColor }} />
                      </div>

                      {/* Card */}
                      <div
                        className="rounded-lg pt-5 pb-4 px-4 shadow-lg"
                        style={{
                          background: cardColor,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)',
                          minHeight: 140,
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.5)', fontSize: '9px' }}>
                            {node.data.type}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold mb-1.5" style={{ color: '#1a1a1a', lineHeight: 1.3 }}>
                          {node.data.title}
                        </h3>
                        <p className="text-xs leading-snug" style={{ color: '#4a4a4a' }}>
                          {node.data.description}
                        </p>
                        {sections.length > 0 && (
                          <ul className="mt-2 space-y-0.5">
                            {sections.slice(0, 3).map((s, si) => (
                              <li key={si} className="text-xs" style={{ color: '#666', fontSize: '10px' }}>
                                · {s}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirmation footer */}
      {blueprint && !loading && (
        <div className="border-t px-6 py-5 shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#0b0d18' }}>
          <p className="text-sm font-semibold text-white mb-4 text-center">
            This is your site plan. Does it look right?
          </p>

          {submitError && (
            <p className="text-xs text-red-400 text-center mb-3">{submitError}</p>
          )}

          <div className="flex gap-3 max-w-md mx-auto">
            <button
              onClick={onBack}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
            >
              Adjust something
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-2xl text-sm font-bold transition-colors"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              Yes, looks great →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Submitting Screen ──────────────────────────────────────────────────────

function SubmittingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b0d18' }}>
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-indigo-400 mx-auto mb-6"
          style={{ animation: 'spin 0.9s linear infinite' }} />
        <p className="text-base font-semibold text-white mb-1">Your plan is being finalized…</p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Just a moment</p>
      </div>
    </div>
  )
}

// ── Done Screen ────────────────────────────────────────────────────────────

const BUILD_PHASES = [
  { id: 'research', label: 'Research' },
  { id: 'scaffold', label: 'Scaffold' },
  { id: 'visual-loop', label: 'Quality loop' },
  { id: 'deploy', label: 'Deploy' },
] as const

type BuildPhaseId = typeof BUILD_PHASES[number]['id']
type PhaseStatus = 'pending' | 'running' | 'done' | 'error'

interface BuildJob {
  jobId: string
  status: 'queued' | 'building' | 'iterating' | 'deploying' | 'done' | 'error'
  iteration: number
  maxIterations: number
  scores: Array<{ i: number; total: number; worst: string }>
  currentScore: number
  deployUrl?: string
  phases: Record<BuildPhaseId, PhaseStatus>
  log: string[]
}

function DoneScreen({ wizard, blueprint, submittedId }: {
  wizard: WizardData
  blueprint: { nodes: BlueprintNode[]; edges: BlueprintEdge[] } | null
  submittedId: string
}) {
  const [launching, setLaunching] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<BuildJob | null>(null)
  const [launchError, setLaunchError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function launchBuild() {
    setLaunching(true)
    setLaunchError('')
    try {
      const res = await fetch('/api/build-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId: submittedId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      setJobId(data.jobId)
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : String(err))
      setLaunching(false)
    }
  }

  useEffect(() => {
    if (!jobId) return

    async function poll() {
      try {
        const res = await fetch(`/api/build-status/${jobId}`)
        if (!res.ok) return
        const data = await res.json() as BuildJob
        setJob(data)
        if (data.status === 'done' || data.status === 'error') {
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch { /* non-fatal */ }
    }

    poll()
    pollRef.current = setInterval(poll, 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [jobId])

  const phaseColor = (s: PhaseStatus) =>
    s === 'done' ? '#34d399' : s === 'running' ? '#6366f1' : s === 'error' ? '#f87171' : 'rgba(255,255,255,0.15)'

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0b0d18' }}>
      <div className="max-w-md w-full text-center">
        {/* Celebration checkmark */}
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(52,211,153,0.15)', animation: 'pulse-check 0.6s ease both' }}>
            <CheckCircle2 size={40} style={{ color: '#34d399' }} />
          </div>
          <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full" style={{ background: '#6366f1', animation: 'confetti-1 0.8s ease both' }} />
          <div className="absolute -top-1 -left-3 w-2 h-2 rounded-full" style={{ background: '#f59e0b', animation: 'confetti-2 0.9s ease both' }} />
          <div className="absolute top-0 right-0 w-2 h-2 rounded-full" style={{ background: '#ec4899', animation: 'confetti-3 0.7s ease both' }} />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Plan submitted!</h1>
        <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {jobId ? 'Build pipeline active — tracking progress below.' : 'Your blueprint is ready. Launch the build when you\'re ready.'}
        </p>

        {/* Summary card */}
        <div className="rounded-2xl border p-5 text-left mb-6"
          style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Your plan
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Business</span>
              <span className="text-white font-semibold">{wizard.businessName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Style</span>
              <span className="text-white font-semibold capitalize">{wizard.style}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Pages</span>
              <span className="text-white font-semibold">{wizard.pages.length} planned</span>
            </div>
            {blueprint && (
              <div className="flex justify-between text-sm">
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Blueprint cards</span>
                <span className="text-white font-semibold">{blueprint.nodes.length}</span>
              </div>
            )}
          </div>
        </div>

        {/* Build pipeline status — shown after launch */}
        {job && (
          <div className="rounded-2xl border p-5 text-left mb-6"
            style={{ borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6366f1' }}>
                Build pipeline
              </p>
              {job.currentScore > 0 && (
                <span className="text-xs font-bold" style={{ color: '#34d399' }}>
                  {job.currentScore}/100
                </span>
              )}
            </div>

            {/* Phase list */}
            <div className="space-y-2 mb-4">
              {BUILD_PHASES.map(ph => {
                const status = job.phases?.[ph.id] ?? 'pending'
                return (
                  <div key={ph.id} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: phaseColor(status) }} />
                    <span className="text-sm flex-1" style={{ color: status === 'pending' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)' }}>
                      {ph.label}
                    </span>
                    {status === 'running' && job.phases?.[ph.id] === 'running' && ph.id === 'visual-loop' && (
                      <span className="text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        iter {job.iteration}/{job.maxIterations}
                      </span>
                    )}
                    {status === 'done' && (
                      <span className="text-xs" style={{ color: '#34d399' }}>✓</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Score history */}
            {job.scores.length > 0 && (
              <div className="border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Quality scores</p>
                <div className="flex gap-1.5 flex-wrap">
                  {job.scores.map((s, i) => (
                    <span key={i} className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: s.total >= 85 ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)',
                        color: s.total >= 85 ? '#34d399' : 'rgba(255,255,255,0.5)',
                      }}>
                      {s.total}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Live URL when done */}
            {job.status === 'done' && job.deployUrl && (
              <a
                href={job.deployUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
              >
                View live site →
              </a>
            )}

            {/* Last log line */}
            {job.log.length > 0 && (
              <p className="text-xs mt-3 truncate" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {job.log[job.log.length - 1]}
              </p>
            )}
          </div>
        )}

        {/* Launch build CTA — shown before launch */}
        {!jobId && (
          <div className="space-y-3">
            <button
              onClick={launchBuild}
              disabled={launching || !submittedId}
              className="w-full py-4 rounded-2xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              {launching ? 'Launching build…' : 'Launch Build →'}
            </button>

            {launchError && (
              <p className="text-xs" style={{ color: '#f87171' }}>{launchError}</p>
            )}

            <div className="rounded-2xl border p-5 text-left"
              style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">What the build does</p>
              <ul className="space-y-2 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <li>→ Research: reads your blueprint, sets up project</li>
                <li>→ Scaffold: builds all pages from your blueprint cards</li>
                <li>→ Quality loop: up to 10 visual iterations, scored /100</li>
                <li>→ Deploy: live on worker-bee.app when score ≥ 85</li>
              </ul>
            </div>
          </div>
        )}

        {submittedId && (
          <p className="text-xs mt-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Ref: {submittedId}{jobId ? ` · Job: ${jobId}` : ''}
          </p>
        )}
      </div>

      <style>{`
        @keyframes pulse-check {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes confetti-1 {
          0% { transform: translate(0,0) scale(0); opacity: 0; }
          60% { transform: translate(6px,-14px) scale(1.2); opacity: 1; }
          100% { transform: translate(8px,-10px) scale(1); opacity: 0.8; }
        }
        @keyframes confetti-2 {
          0% { transform: translate(0,0) scale(0); opacity: 0; }
          60% { transform: translate(-10px,-12px) scale(1.2); opacity: 1; }
          100% { transform: translate(-12px,-8px) scale(1); opacity: 0.8; }
        }
        @keyframes confetti-3 {
          0% { transform: translate(0,0) scale(0); opacity: 0; }
          60% { transform: translate(12px,-10px) scale(1.2); opacity: 1; }
          100% { transform: translate(10px,-6px) scale(1); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}

'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { CheckCircle2, Mic, MicOff } from 'lucide-react'

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

const SITE_TYPE_OPTIONS = [
  { id: 'marketing', label: 'Marketing / Landing', desc: 'Showcase and convert visitors' },
  { id: 'saas', label: 'SaaS Product', desc: 'Software with signup and dashboard' },
  { id: 'ecommerce', label: 'E-commerce', desc: 'Online store with cart and checkout' },
  { id: 'leadgen', label: 'Lead Generation', desc: 'Capture contacts and book calls' },
  { id: 'blog', label: 'Blog / CMS', desc: 'Content-driven, editorial, articles' },
  { id: 'info', label: 'Info / Portfolio', desc: 'Reference site or showcase work' },
] as const

interface WizardData {
  businessName: string
  siteType: string
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

// ── Constants ──────────────────────────────────────────────────────────────

// Steps that have text inputs — eligible for dictation + AI cleanup
// Step layout: 1=name, 2=siteType, 3=description, 4=audience, 5=cta, 6=pages, 7=style, 8=inspiration
const STEP_FIELD: Partial<Record<number, TextWizardField>> = {
  1: 'businessName',
  3: 'description',
  4: 'audience',
  5: 'cta',
  8: 'inspiration',
}

const STEP_FIELD_SET = new Set<string>(Object.values(STEP_FIELD) as string[])

// ── Hooks ──────────────────────────────────────────────────────────────────

function useFieldCleanup() {
  const [cleaned, setCleaned] = useState<Partial<Record<TextWizardField, string>>>({})
  const timers = useRef<Partial<Record<string, ReturnType<typeof setTimeout>>>>({})

  const scheduleClean = useCallback((field: TextWizardField, value: string) => {
    if (timers.current[field]) clearTimeout(timers.current[field])
    timers.current[field] = setTimeout(async () => {
      if (!value.trim() || value.length < 4) return
      try {
        const res = await fetch('/api/blueprint-cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field, value }),
        })
        if (!res.ok) return
        const json = await res.json()
        if (json.result && json.result.trim() !== value.trim()) {
          setCleaned(prev => ({ ...prev, [field]: json.result }))
        }
      } catch {} // silent background enhancement
    }, 1200)
  }, [])

  const clearCleaned = useCallback((field: TextWizardField) => {
    setCleaned(prev => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  return { cleaned, scheduleClean, clearCleaned }
}

// Text-field-only keys — subset of WizardData that are strings (not pages array)
type TextWizardField = 'businessName' | 'description' | 'audience' | 'cta' | 'inspiration'

type DictationUpdater = (field: TextWizardField, value: string) => void

function useDictation(onTranscript: DictationUpdater) {
  const [listeningField, setListeningField] = useState<TextWizardField | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null)
  const baseRef = useRef<string>('')

  const toggle = useCallback((field: TextWizardField, currentValue: string) => {
    // Stop any running recognition
    if (recogRef.current) {
      recogRef.current.abort()
      recogRef.current = null
    }
    // Toggle off same field
    if (listeningField === field) {
      setListeningField(null)
      return
    }

    if (typeof window === 'undefined') return
    const WinAny = window as unknown as Record<string, unknown>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (WinAny.SpeechRecognition ?? WinAny.webkitSpeechRecognition) as any
    if (!SR) return

    // Base is whatever user typed so far — we append dictation to it
    baseRef.current = currentValue ? currentValue.trimEnd() + ' ' : ''

    const recog = new SR()
    recog.continuous = true
    recog.interimResults = true
    recog.lang = 'en-US'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recog.onresult = (event: any) => {
      let finalPart = ''
      let interimPart = ''
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) finalPart += r[0].transcript
        else interimPart += r[0].transcript
      }
      const full = (baseRef.current + finalPart + interimPart).trim()
      onTranscript(field, full)
    }

    recog.onerror = () => {
      setListeningField(null)
      recogRef.current = null
    }

    recog.onend = () => {
      setListeningField(prev => (prev === field ? null : prev))
      recogRef.current = null
    }

    try {
      recog.start()
      recogRef.current = recog
      setListeningField(field)
    } catch { /* permission denied or browser unsupported */ }
  }, [listeningField, onTranscript])

  return { listeningField, toggle }
}

// ── Shared UI ──────────────────────────────────────────────────────────────

function MicButton({ isListening, onClick }: { isListening: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={isListening ? 'Stop dictation' : 'Speak your answer'}
      className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-xl transition-all"
      style={{
        width: 44,
        height: 44,
        background: isListening ? '#f59e0b' : 'rgba(245,158,11,0.12)',
        color: isListening ? '#0b0d18' : '#f59e0b',
        border: isListening ? '2px solid #f59e0b' : '1.5px solid rgba(245,158,11,0.35)',
        animation: isListening ? 'mic-pulse 1.4s ease-in-out infinite' : 'none',
        flexShrink: 0,
      }}
    >
      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
    </button>
  )
}

function CleanSuggestion({ value, onApply, onDismiss }: {
  value: string
  onApply: () => void
  onDismiss: () => void
}) {
  return (
    <div
      className="mt-3 rounded-2xl p-4 flex items-start gap-3"
      style={{
        background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.2)',
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>✨</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(165,180,252,0.65)' }}>
          AI cleaned this up
        </p>
        <p className="text-sm leading-relaxed text-white break-words">{value}</p>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0 ml-2">
        <button
          onClick={onApply}
          className="text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
          style={{ background: 'rgba(99,102,241,0.25)', color: '#a5b4fc' }}
        >
          Apply
        </button>
        <button
          onClick={onDismiss}
          className="text-xs px-3 py-1.5 rounded-xl"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          Skip
        </button>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function PlanPage() {
  const [step, setStep] = useState(1) // 1–7
  const [phase, setPhase] = useState<Phase>('wizard')

  const [wizard, setWizard] = useState<WizardData>({
    businessName: '',
    siteType: '',
    description: '',
    audience: '',
    cta: '',
    pages: [],
    style: '',
    inspiration: '',
  })

  const { cleaned, scheduleClean, clearCleaned } = useFieldCleanup()

  // Tracks fields the user has explicitly dismissed the suggestion for
  const [dismissedFields, setDismissedFields] = useState<Set<TextWizardField>>(new Set())

  function update<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setWizard(prev => ({ ...prev, [key]: value }))
    if (typeof value === 'string' && value.length >= 4 && STEP_FIELD_SET.has(key as string)) {
      const tf = key as TextWizardField
      // New typing clears a previous dismissal so suggestion can re-appear if AI improves it
      setDismissedFields(prev => {
        if (!prev.has(tf)) return prev
        const next = new Set(prev)
        next.delete(tf)
        return next
      })
      scheduleClean(tf, value)
    }
  }

  const dictation = useDictation((field, value) => update(field, value))

  function applyClean(field: TextWizardField) {
    const cv = cleaned[field]
    if (!cv) return
    setWizard(prev => ({ ...prev, [field]: cv }))
    clearCleaned(field)
  }

  function dismissClean(field: TextWizardField) {
    setDismissedFields(prev => new Set([...prev, field]))
  }

  function togglePage(page: string) {
    setWizard(prev => ({
      ...prev,
      pages: prev.pages.includes(page)
        ? prev.pages.filter(p => p !== page)
        : [...prev.pages, page],
    }))
  }

  const [customPage, setCustomPage] = useState('')
  const [blueprint, setBlueprint] = useState<{ nodes: BlueprintNode[]; edges: BlueprintEdge[] } | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisOutput | null>(null)
  const [blueprintError, setBlueprintError] = useState('')
  const [blueprintLoading, setBlueprintLoading] = useState(false)
  const [sseLog, setSseLog] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submittedId, setSubmittedId] = useState('')

  const totalSteps = 8

  function addCustomPage() {
    const trimmed = customPage.trim()
    if (!trimmed || wizard.pages.includes(trimmed)) return
    setWizard(prev => ({ ...prev, pages: [...prev.pages, trimmed] }))
    setCustomPage('')
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1: return wizard.businessName.trim().length > 0
      case 2: return wizard.siteType.length > 0
      case 3: return wizard.description.trim().length > 0
      case 4: return wizard.audience.trim().length > 0
      case 5: return wizard.cta.trim().length > 0
      case 6: return wizard.pages.length > 0
      case 7: return wizard.style.length > 0
      case 8: return true // inspiration is optional
      default: return false
    }
  }

  async function goNext() {
    // Auto-apply AI-cleaned version for this step's field before advancing
    const currentField: TextWizardField | undefined = STEP_FIELD[step]
    if (currentField && cleaned[currentField] && !dismissedFields.has(currentField)) {
      setWizard(prev => ({ ...prev, [currentField]: cleaned[currentField]! }))
      clearCleaned(currentField)
    }
    if (step < totalSteps) {
      setStep(step + 1)
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
      setStep(step - 1)
    }
  }

  async function generateBlueprint() {
    setBlueprintLoading(true)
    setBlueprintError('')
    setSseLog([])
    setPhase('corkboard')

    const addLog = (msg: string) =>
      setSseLog(prev => [...prev, `${new Date().toLocaleTimeString()} — ${msg}`])

    try {
      addLog('Connecting…')
      const res = await fetch('/api/blueprint-wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'wizard', wizard, cleaned }),
      })

      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `Error ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let isLogEvent = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event: log')) { isLogEvent = true; continue }
          if (line === '') { isLogEvent = false; continue }
          if (line.startsWith(': ')) continue // heartbeat

          if (line.startsWith('data: ')) {
            const raw = line.slice(6)
            if (isLogEvent) {
              try { addLog(JSON.parse(raw)) } catch { /* ignore */ }
              isLogEvent = false
            } else {
              const json = JSON.parse(raw)
              if (json.error) throw new Error(json.error)
              if (json.nodes) {
                addLog(`Done ��� ${(json.nodes as unknown[]).length} cards`)
                const bp = { nodes: json.nodes ?? [], edges: json.edges ?? [] }
                setBlueprint(bp)
                setAnalysis(json.analysis ?? null)
                try { localStorage.setItem('wb-pipeline-blueprint', JSON.stringify(bp)) } catch { /* quota */ }
              }
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      addLog(`Error: ${msg}`)
      setBlueprintError(msg)
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
      await new Promise(r => setTimeout(r, 1800))
      setPhase('done')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err))
      setPhase('corkboard')
    }
  }

  // suppress unused-var warning — submitting is used implicitly via setPhase
  void submitting

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
        sseLog={sseLog}
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
      dictation={dictation}
      cleaned={cleaned}
      dismissedFields={dismissedFields}
      applyClean={applyClean}
      dismissClean={dismissClean}
    />
  )
}

// ── Wizard Screen ──────────────────────────────────────────────────────────

interface DictationHandle {
  listeningField: TextWizardField | null
  toggle: (field: TextWizardField, currentValue: string) => void
}

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
  dictation: DictationHandle
  cleaned: Partial<Record<TextWizardField, string>>
  dismissedFields: Set<TextWizardField>
  applyClean: (field: TextWizardField) => void
  dismissClean: (field: TextWizardField) => void
}

function WizardScreen({
  step, totalSteps, wizard, update, togglePage,
  customPage, setCustomPage, addCustomPage, canAdvance, goNext, goBack,
  dictation, cleaned, dismissedFields, applyClean, dismissClean,
}: WizardScreenProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
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

  // Current field eligible for dictation + cleanup
  const currentField = STEP_FIELD[step]
  const cleanedValue = currentField ? cleaned[currentField] : undefined
  const showSuggestion = !!(
    cleanedValue &&
    currentField &&
    !dismissedFields.has(currentField) &&
    cleanedValue.trim() !== (wizard[currentField] as string | undefined)?.trim()
  )

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
              isListening={dictation.listeningField === 'businessName'}
              onMicClick={() => dictation.toggle('businessName', wizard.businessName)}
            />
          )}
          {step === 2 && (
            <WizardStepSiteType
              siteType={wizard.siteType}
              setSiteType={v => update('siteType', v)}
            />
          )}
          {step === 3 && (
            <WizardStep3
              value={wizard.description}
              onChange={v => update('description', v)}
              inputRef={inputRef as React.RefObject<HTMLTextAreaElement>}
              inputBase={inputBase}
              inputStyle={inputStyle}
              isListening={dictation.listeningField === 'description'}
              onMicClick={() => dictation.toggle('description', wizard.description)}
            />
          )}
          {step === 4 && (
            <WizardStep4
              value={wizard.audience}
              onChange={v => update('audience', v)}
              inputRef={inputRef as React.RefObject<HTMLInputElement>}
              inputBase={inputBase}
              inputStyle={inputStyle}
              onKeyDown={handleKeyDown}
              isListening={dictation.listeningField === 'audience'}
              onMicClick={() => dictation.toggle('audience', wizard.audience)}
            />
          )}
          {step === 5 && (
            <WizardStep5
              value={wizard.cta}
              onChange={v => update('cta', v)}
              inputRef={inputRef as React.RefObject<HTMLInputElement>}
              inputBase={inputBase}
              inputStyle={inputStyle}
              onKeyDown={handleKeyDown}
              isListening={dictation.listeningField === 'cta'}
              onMicClick={() => dictation.toggle('cta', wizard.cta)}
            />
          )}
          {step === 6 && (
            <WizardStep6
              pages={wizard.pages}
              togglePage={togglePage}
              customPage={customPage}
              setCustomPage={setCustomPage}
              addCustomPage={addCustomPage}
            />
          )}
          {step === 7 && (
            <WizardStep7
              style={wizard.style}
              setStyle={v => update('style', v)}
            />
          )}
          {step === 8 && (
            <WizardStep8
              value={wizard.inspiration}
              onChange={v => update('inspiration', v)}
              inputRef={inputRef as React.RefObject<HTMLTextAreaElement>}
              inputBase={inputBase}
              inputStyle={inputStyle}
              isListening={dictation.listeningField === 'inspiration'}
              onMicClick={() => dictation.toggle('inspiration', wizard.inspiration)}
            />
          )}

          {/* AI cleanup suggestion — visible card with Apply / Skip */}
          {showSuggestion && currentField && (
            <CleanSuggestion
              value={cleanedValue!}
              onApply={() => applyClean(currentField)}
              onDismiss={() => dismissClean(currentField)}
            />
          )}

          {/* Nav buttons */}
          <div className="flex gap-3 mt-6">
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

      <style>{`
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(245,158,11,0); }
        }
      `}</style>
    </div>
  )
}

// ── Individual Steps ───────────────────────────────────────────────────────

function WizardStep1({ value, onChange, inputRef, inputBase, inputStyle, onKeyDown, isListening, onMicClick }: {
  value: string; onChange: (v: string) => void
  inputRef: React.RefObject<HTMLInputElement>
  inputBase: string; inputStyle: React.CSSProperties
  onKeyDown: (e: React.KeyboardEvent) => void
  isListening: boolean; onMicClick: () => void
}) {
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-3">What&apos;s your business name?</h1>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Just the name — we&apos;ll build on it.</p>
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="e.g. Acme Plumbing Co."
          className={inputBase}
          style={{ ...inputStyle, paddingRight: '64px' }}
        />
        <MicButton isListening={isListening} onClick={onMicClick} />
      </div>
    </>
  )
}

function WizardStepSiteType({ siteType, setSiteType }: { siteType: string; setSiteType: (v: string) => void }) {
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-3">What kind of site are you building?</h1>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>This shapes your entire blueprint.</p>

      <div className="grid grid-cols-2 gap-3">
        {SITE_TYPE_OPTIONS.map(opt => {
          const selected = siteType === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => setSiteType(opt.id)}
              className="text-left p-4 rounded-2xl border transition-all"
              style={{
                background: selected ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)',
                borderColor: selected ? '#f59e0b' : 'rgba(255,255,255,0.1)',
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

function WizardStep3({ value, onChange, inputRef, inputBase, inputStyle, isListening, onMicClick }: {
  value: string; onChange: (v: string) => void
  inputRef: React.RefObject<HTMLTextAreaElement>
  inputBase: string; inputStyle: React.CSSProperties
  isListening: boolean; onMicClick: () => void
}) {
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-3">What does it do in one sentence?</h1>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Don&apos;t overthink it — raw and honest is fine.</p>
      <div className="relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="e.g. We help Twin Falls homeowners fix plumbing emergencies fast, any time of day."
          rows={3}
          className={inputBase}
          style={{ ...inputStyle, resize: 'none', paddingRight: '64px' }}
        />
        <div className="absolute right-3 top-4">
          <MicButton isListening={isListening} onClick={onMicClick} />
        </div>
      </div>
    </>
  )
}

function WizardStep4({ value, onChange, inputRef, inputBase, inputStyle, onKeyDown, isListening, onMicClick }: {
  value: string; onChange: (v: string) => void
  inputRef: React.RefObject<HTMLInputElement>
  inputBase: string; inputStyle: React.CSSProperties
  onKeyDown: (e: React.KeyboardEvent) => void
  isListening: boolean; onMicClick: () => void
}) {
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-3">Who is it for?</h1>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Describe the person who needs you most.</p>
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="e.g. Homeowners in their 30s–50s who value reliability over price"
          className={inputBase}
          style={{ ...inputStyle, paddingRight: '64px' }}
        />
        <MicButton isListening={isListening} onClick={onMicClick} />
      </div>
    </>
  )
}

function WizardStep5({ value, onChange, inputRef, inputBase, inputStyle, onKeyDown, isListening, onMicClick }: {
  value: string; onChange: (v: string) => void
  inputRef: React.RefObject<HTMLInputElement>
  inputBase: string; inputStyle: React.CSSProperties
  onKeyDown: (e: React.KeyboardEvent) => void
  isListening: boolean; onMicClick: () => void
}) {
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-3">What&apos;s the main thing you want visitors to do?</h1>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Your primary call-to-action and conversion goal.</p>
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="e.g. Call us or book a service online"
          className={inputBase}
          style={{ ...inputStyle, paddingRight: '64px' }}
        />
        <MicButton isListening={isListening} onClick={onMicClick} />
      </div>
    </>
  )
}

function WizardStep6({ pages, togglePage, customPage, setCustomPage, addCustomPage }: {
  pages: string[]
  togglePage: (p: string) => void
  customPage: string
  setCustomPage: (v: string) => void
  addCustomPage: () => void
}) {
  const [listeningCustom, setListeningCustom] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recogRef = useRef<any>(null)

  function toggleCustomMic() {
    if (recogRef.current) {
      recogRef.current.abort()
      recogRef.current = null
      setListeningCustom(false)
      return
    }
    const WinAny = window as unknown as Record<string, unknown>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (WinAny.SpeechRecognition ?? WinAny.webkitSpeechRecognition) as any
    if (!SR) return

    const recog = new SR()
    recog.continuous = false
    recog.interimResults = false
    recog.lang = 'en-US'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recog.onresult = (event: any) => {
      const transcript = (event.results[0]?.[0]?.transcript ?? '').trim()
      if (transcript) setCustomPage(transcript)
    }

    recog.onend = () => { setListeningCustom(false); recogRef.current = null }
    recog.onerror = () => { setListeningCustom(false); recogRef.current = null }

    try { recog.start(); recogRef.current = recog; setListeningCustom(true) } catch { /* unsupported */ }
  }

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

      {/* Custom page input with mic */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={customPage}
            onChange={e => setCustomPage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomPage() } }}
            placeholder="Add custom page… or speak it"
            className="w-full bg-transparent rounded-xl border px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/30 transition-all"
            style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)', paddingRight: '56px' }}
          />
          <button
            type="button"
            onClick={toggleCustomMic}
            title={listeningCustom ? 'Stop dictation' : 'Speak a page name'}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-lg transition-all"
            style={{
              width: 34,
              height: 34,
              background: listeningCustom ? '#f59e0b' : 'rgba(245,158,11,0.12)',
              color: listeningCustom ? '#0b0d18' : '#f59e0b',
              border: listeningCustom ? '2px solid #f59e0b' : '1.5px solid rgba(245,158,11,0.35)',
              animation: listeningCustom ? 'mic-pulse 1.4s ease-in-out infinite' : 'none',
            }}
          >
            {listeningCustom ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        </div>
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

function WizardStep7({ style, setStyle }: { style: string; setStyle: (v: string) => void }) {
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

function WizardStep8({ value, onChange, inputRef, inputBase, inputStyle, isListening, onMicClick }: {
  value: string; onChange: (v: string) => void
  inputRef: React.RefObject<HTMLTextAreaElement>
  inputBase: string; inputStyle: React.CSSProperties
  isListening: boolean; onMicClick: () => void
}) {
  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-3">Any sites you love the look of?</h1>
      <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Optional — paste links or just describe what you like.</p>
      <div className="relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="e.g. stripe.com — clean and modern. Or: I love dark themes with big headlines."
          rows={4}
          className={inputBase}
          style={{ ...inputStyle, resize: 'none', paddingRight: '64px' }}
        />
        <div className="absolute right-3 top-4">
          <MicButton isListening={isListening} onClick={onMicClick} />
        </div>
      </div>
    </>
  )
}

// ── Blueprint Generating View ──────────────────────────────────────────────

const GENERATING_STAGES = [
  'Analyzing your business…',
  'Planning your pages…',
  'Designing your blueprint…',
  'Connecting everything together…',
  'Putting on finishing touches…',
]

// Checkpoints: [progressPercent, delayMs, stageIndex] — tuned for Sonnet 4.6 + SSE ~25-50s
const CHECKPOINTS: [number, number, number][] = [
  [18,  1500, 0],
  [40,  6000, 1],
  [62, 13000, 2],
  [80, 22000, 3],
  [93, 30000, 4],
  [97, 45000, 4], // slow crawl after last stage — still alive
]

function BlueprintGeneratingView({ sseLog }: { sseLog: string[] }) {
  const [progress, setProgress] = useState(0)
  const [stageIdx, setStageIdx] = useState(0)
  const [slowAlert, setSlowAlert] = useState(false)

  useEffect(() => {
    const timers = CHECKPOINTS.map(([pct, delay, stage]) =>
      setTimeout(() => { setProgress(pct); setStageIdx(stage) }, delay)
    )
    const slowTimer = setTimeout(() => setSlowAlert(true), 38000)
    return () => { timers.forEach(clearTimeout); clearTimeout(slowTimer) }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] px-6">
      <div className="w-full max-w-sm">
        {/* Bee icon */}
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-8 flex items-center justify-center text-2xl select-none"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          🐝
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-2">Building your site plan</h2>
        <p
          className="text-sm text-center mb-8 transition-all duration-700"
          style={{ color: 'rgba(255,255,255,0.45)', minHeight: 20 }}
          key={stageIdx}
        >
          {GENERATING_STAGES[stageIdx]}
        </p>

        {/* Progress track */}
        <div className="w-full h-1.5 rounded-full overflow-hidden mb-3"
          style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--accent), #818cf8)',
              transition: 'width 2s ease-out',
            }}
          />
        </div>

        <div className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          <span>Step {stageIdx + 1} of {GENERATING_STAGES.length}</span>
          <span>{progress}%</span>
        </div>

        {slowAlert ? (
          <p className="text-xs text-center mt-6" style={{ color: 'rgba(245,158,11,0.5)' }}>
            Still working — Sonnet is building a detailed blueprint…
          </p>
        ) : (
          <p className="text-xs text-center mt-6" style={{ color: 'rgba(255,255,255,0.18)' }}>
            Usually takes 30–50 seconds
          </p>
        )}
      </div>

      {/* Debug log — copyable, shown while generating */}
      {sseLog.length > 0 && (
        <div className="w-full max-w-sm mt-8">
          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>log</span>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(sseLog.join('\n'))}
                className="text-xs px-2 py-0.5 rounded-md"
                style={{ color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)' }}
              >
                copy
              </button>
            </div>
            <div className="p-3 max-h-28 overflow-y-auto space-y-0.5" style={{ fontFamily: 'monospace' }}>
              {sseLog.map((entry, i) => (
                <p key={i} className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.32)' }}>{entry}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
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

function CorkboardScreen({ wizard, blueprint, loading, error, submitError, sseLog, onConfirm, onBack, onRetry }: {
  wizard: WizardData
  blueprint: { nodes: BlueprintNode[]; edges: BlueprintEdge[] } | null
  loading: boolean
  error: string
  submitError: string
  sseLog: string[]
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
        {loading && <BlueprintGeneratingView sseLog={sseLog} />}

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
                    {status === 'running' && ph.id === 'visual-loop' && (
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

            {job.log.length > 0 && (
              <p className="text-xs mt-3 truncate" style={{ color: 'rgba(255,255,255,0.2)' }}>
                {job.log[job.log.length - 1]}
              </p>
            )}
          </div>
        )}

        {/* Launch build CTA */}
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

        {/* Manage dashboard handoff */}
        <div className="mt-6 pt-5 border-t space-y-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <a
            href="/pipeline"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}
          >
            Open build pipeline →
          </a>
          <a
            href="https://manage.worker-bee.app/submissions"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            View in manage dashboard →
          </a>
        </div>

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

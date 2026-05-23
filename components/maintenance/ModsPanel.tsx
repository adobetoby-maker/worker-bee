'use client'

import { useState } from 'react'
import { Sparkles, Languages, Loader2, CheckCircle2, GitPullRequest, ChevronDown, AlertTriangle, Scissors, ArrowLeftRight, MessageSquarePlus } from 'lucide-react'

interface Site {
  id: string
  name: string
  url: string | null
  github_repo: string | null
  notes: string | null
}

interface Props {
  sites: Site[]
}

const LANGUAGES = [
  { code: 'es', label: 'Spanish', flag: '🇲🇽' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷' },
  { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
]

const MOD_TYPES = [
  { key: 'translate',  label: 'Translate',    icon: Languages,         description: 'Localize site copy via Pronto' },
  { key: 'seo',        label: 'SEO Boost',    icon: Sparkles,          description: 'Schema markup, meta, OpenGraph' },
  { key: 'remove',     label: 'Content Fix',  icon: Scissors,          description: 'Remove a service or feature from all copy' },
  { key: 'swap',       label: 'Swap',         icon: ArrowLeftRight,    description: 'Replace one phrase with another everywhere' },
  { key: 'request',    label: 'Request',      icon: MessageSquarePlus, description: 'Type any task — build machine does the work' },
]

type ModType = 'translate' | 'seo' | 'remove' | 'swap' | 'request'
type Stage = 'idle' | 'generating' | 'firing' | 'done' | 'error'

export function ModsPanel({ sites }: Props) {
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [modType, setModType] = useState<ModType>('translate')
  const [targetLangs, setTargetLangs] = useState<Set<string>>(new Set(['es']))
  const [tone, setTone] = useState<'auto' | 'formal' | 'informal'>('auto')
  const [removeTerm, setRemoveTerm] = useState('')
  const [swapFrom, setSwapFrom] = useState('')
  const [swapTo, setSwapTo] = useState('')
  const [requestText, setRequestText] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [log, setLog] = useState('')
  const [error, setError] = useState('')

  function toggleLang(code: string) {
    setTargetLangs(prev => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  async function dispatch() {
    if (!selectedSite) return
    setStage('generating')
    setError('')
    setLog('')

    setStage('firing')

    try {
      const res = await fetch('/api/mods', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          siteId: selectedSite.id,
          modType,
          targetLangs: Array.from(targetLangs),
          tone,
          term: removeTerm,
          from: swapFrom,
          to: swapTo,
          request: requestText,
        }),
      })

      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(d.error ?? `HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setLog(prev => prev + decoder.decode(value))
      }

      setStage('done')
    } catch (e) {
      setError(String(e))
      setStage('error')
    }
  }

  const canDispatch = !!selectedSite &&
    (modType !== 'translate' || targetLangs.size > 0) &&
    (modType !== 'remove'  || removeTerm.trim().length > 0) &&
    (modType !== 'swap'    || (swapFrom.trim().length > 0 && swapTo.trim().length > 0)) &&
    (modType !== 'request' || requestText.trim().length > 0)
  const isRunning = stage === 'generating' || stage === 'firing'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: Config */}
      <div className="lg:col-span-2 space-y-5">
        {/* Site selector */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Site</label>
          <div className="relative">
            <select
              value={selectedSite?.id ?? ''}
              onChange={e => {
                const site = sites.find(s => s.id === e.target.value)
                setSelectedSite(site ?? null)
                setStage('idle')
                setLog('')
                setError('')
              }}
              disabled={isRunning}
              className="w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm text-white font-medium"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <option value="">Select a site…</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Mod type */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Mod Type</label>
          <div className="space-y-2">
            {MOD_TYPES.map(({ key, label, icon: Icon, description }) => {
              const active = modType === key
              return (
                <button
                  key={key}
                  onClick={() => !isRunning && setModType(key as ModType)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{
                    background: active ? 'rgba(99,102,241,0.12)' : 'var(--surface)',
                    border: `1px solid ${active ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                  }}
                >
                  <Icon size={15} className={active ? 'text-indigo-400' : 'text-slate-500'} />
                  <div>
                    <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-400'}`}>{label}</p>
                    <p className="text-xs text-slate-600">{description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Translate options */}
        {modType === 'translate' && (
          <>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Target Languages</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(({ code, label, flag }) => {
                  const selected = targetLangs.has(code)
                  return (
                    <button
                      key={code}
                      onClick={() => !isRunning && toggleLang(code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: selected ? 'rgba(99,102,241,0.2)' : 'var(--surface)',
                        border: `1px solid ${selected ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
                        color: selected ? '#a5b4fc' : '#475569',
                      }}
                    >
                      <span>{flag}</span> {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Tone</label>
              <div className="flex gap-2">
                {(['auto', 'formal', 'informal'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => !isRunning && setTone(t)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                    style={{
                      background: tone === t ? 'rgba(99,102,241,0.2)' : 'var(--surface)',
                      border: `1px solid ${tone === t ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                      color: tone === t ? '#a5b4fc' : '#475569',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Content Fix term input */}
        {modType === 'remove' && (
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              What to remove?
            </label>
            <input
              type="text"
              value={removeTerm}
              onChange={e => setRemoveTerm(e.target.value)}
              placeholder="e.g. Alignment, Free Estimates, Towing…"
              disabled={isRunning}
              className="w-full rounded-xl px-4 py-3 text-sm text-white font-medium"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', outline: 'none' }}
            />
            <p className="text-xs text-slate-600 mt-1.5">
              Finds every mention across components, copy files, articles, chatbot, and pricing — removes them all and opens a PR.
            </p>
          </div>
        )}

        {/* Swap inputs */}
        {modType === 'swap' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Replace
            </label>
            <input
              type="text"
              value={swapFrom}
              onChange={e => setSwapFrom(e.target.value)}
              placeholder="Current text (e.g. Auto Repair)"
              disabled={isRunning}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', outline: 'none' }}
            />
            <div className="flex items-center gap-2 px-1">
              <ArrowLeftRight size={12} className="text-slate-600 shrink-0" />
              <span className="text-xs text-slate-600">with</span>
            </div>
            <input
              type="text"
              value={swapTo}
              onChange={e => setSwapTo(e.target.value)}
              placeholder="New text (e.g. Auto Service)"
              disabled={isRunning}
              className="w-full rounded-xl px-4 py-2.5 text-sm text-white"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', outline: 'none' }}
            />
            <p className="text-xs text-slate-600">Case-aware replacement across all components, copy files, and articles.</p>
          </div>
        )}

        {/* Request textarea */}
        {modType === 'request' && (
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              What do you need?
            </label>
            <textarea
              value={requestText}
              onChange={e => setRequestText(e.target.value)}
              placeholder={"Client called — add a banner for their summer promotion: 20% off oil changes in June, runs through June 30. Add it to the hero section and the footer."}
              disabled={isRunning}
              rows={5}
              className="w-full rounded-xl px-4 py-3 text-sm text-white resize-none leading-relaxed"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', outline: 'none' }}
            />
            <p className="text-xs text-slate-600 mt-1.5">
              Write it like you'd explain it to a developer. Build machine reads the site first, then does the work and opens a PR.
            </p>
          </div>
        )}

        {/* Dispatch button */}
        <button
          onClick={dispatch}
          disabled={isRunning || !canDispatch}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: isRunning || !canDispatch
              ? 'rgba(99,102,241,0.1)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: isRunning || !canDispatch ? '#4c4f8a' : 'white',
            border: isRunning || !canDispatch ? '1px solid rgba(99,102,241,0.2)' : 'none',
            cursor: isRunning || !canDispatch ? 'not-allowed' : 'pointer',
          }}
        >
          {(stage === 'generating' || stage === 'firing') && <><Loader2 size={14} className="animate-spin" /> Dispatching mod…</>}
          {stage === 'done' && <><CheckCircle2 size={14} /> Mod dispatched — PR incoming</>}
          {(stage === 'idle' || stage === 'error') && (
            <>
              {modType === 'translate'  ? <Languages size={14} />
                : modType === 'remove'  ? <Scissors size={14} />
                : modType === 'swap'    ? <ArrowLeftRight size={14} />
                : modType === 'request' ? <MessageSquarePlus size={14} />
                : <Sparkles size={14} />}
              {' '}Dispatch
            </>
          )}
        </button>

      </div>

      {/* Right: Output */}
      <div className="lg:col-span-3">
        {error && (
          <div className="flex items-start gap-2 rounded-xl px-4 py-3 mb-4 text-sm text-red-400"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {log ? (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="px-3 py-2 text-xs font-semibold text-emerald-400 flex items-center gap-2"
              style={{ background: 'rgba(16,185,129,0.06)', borderBottom: '1px solid rgba(16,185,129,0.15)' }}>
              <GitPullRequest size={12} />
              Dispatch output
            </div>
            <pre className="text-xs p-4 overflow-auto max-h-96 leading-relaxed whitespace-pre-wrap text-emerald-300"
              style={{ background: '#0a0f0a' }}>
              {log}
            </pre>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 rounded-xl text-center px-8"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {modType === 'translate'  ? <Languages size={32} className="text-slate-700 mb-4" />
              : modType === 'remove'  ? <Scissors size={32} className="text-slate-700 mb-4" />
              : modType === 'swap'    ? <ArrowLeftRight size={32} className="text-slate-700 mb-4" />
              : modType === 'request' ? <MessageSquarePlus size={32} className="text-slate-700 mb-4" />
              : <Sparkles size={32} className="text-slate-700 mb-4" />
            }
            <p className="text-sm font-semibold text-slate-500">
              {modType === 'translate'  ? 'Pick site + languages, then dispatch'
                : modType === 'remove'  ? 'Pick site + enter what to remove, then dispatch'
                : modType === 'swap'    ? 'Pick site + enter from/to, then dispatch'
                : modType === 'request' ? 'Pick site + describe the task, then dispatch'
                : 'Pick site, then dispatch'}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {modType === 'translate'  ? 'Build machine calls Pronto API, writes translations, opens a PR.'
                : modType === 'remove'  ? 'Build machine hunts every reference across all files, removes them, opens a PR.'
                : modType === 'swap'    ? 'Build machine replaces all instances with case-awareness, opens a PR.'
                : modType === 'request' ? 'Build machine reads the site, does the work, and opens a PR.'
                : 'Build machine audits and improves SEO metadata and schema.'}
            </p>
            {modType === 'translate' && (
              <p className="text-xs mt-3 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)' }}>
                Requires <code className="text-indigo-300">PRONTO_API_KEY</code> in site .env.local
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

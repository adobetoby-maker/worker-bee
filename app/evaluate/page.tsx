'use client'
import { useState, useEffect, useRef } from 'react'
import { CheckCircle2 } from 'lucide-react'
import type {
  AuditResult,
  AuditCheck,
  CheckStatus,
  BlueprintResult,
  BlueprintNode,
  BlueprintStatus,
  BlueprintEffort,
  BlueprintMode,
} from '@/lib/types/audit'

// ── Types ──────────────────────────────────────────────────────────────────

type Phase = 'input' | 'scanning' | 'results' | 'corkboard' | 'confirm' | 'submitting' | 'done'

interface EvalState {
  siteUrl: string
  githubRepo: string
  improvements: string
}

interface ConfirmData {
  name: string
  email: string
  notes: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function scoreColor(score: number, type: 'seo' | 'security' | 'perf'): string {
  if (type === 'seo') return '#06b6d4'    // cyan
  if (type === 'perf') return '#f59e0b'   // amber
  // security: green if good, red if bad
  if (score >= 70) return '#10b981'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function statusDot(status: CheckStatus): string {
  switch (status) {
    case 'critical': return '#ef4444'
    case 'fail': return '#f87171'
    case 'warn': return '#f59e0b'
    case 'pass': return '#10b981'
    default: return '#64748b'
  }
}

function priorityBadge(status: BlueprintStatus): { bg: string; color: string; label: string } {
  switch (status) {
    case 'critical': return { bg: 'rgba(239,68,68,0.12)', color: '#f87171', label: 'Critical' }
    case 'important': return { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', label: 'Important' }
    case 'nice-to-have': return { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', label: 'Nice to have' }
    default: return { bg: 'rgba(100,116,139,0.12)', color: '#94a3b8', label: status }
  }
}

function effortChip(effort: BlueprintEffort): { bg: string; color: string } {
  switch (effort) {
    case 'low': return { bg: 'rgba(16,185,129,0.1)', color: '#34d399' }
    case 'medium': return { bg: 'rgba(245,158,11,0.1)', color: '#fbbf24' }
    case 'high': return { bg: 'rgba(239,68,68,0.1)', color: '#f87171' }
    default: return { bg: 'rgba(100,116,139,0.1)', color: '#94a3b8' }
  }
}

const CARD_COLORS = [
  '#fffbeb', '#fef2f2', '#f0fdf4', '#eff6ff', '#fdf4ff', '#fff7ed',
]
const PIN_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899']

// ── Score Circle ───────────────────────────────────────────────────────────

function ScoreCircle({ label, score, color }: { label: string; score: number; color: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(score)))
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20" style={{ flexShrink: 0 }}>
        {/* Outer ring via conic-gradient */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: `conic-gradient(${color} ${pct}%, rgba(255,255,255,0.08) 0%)`,
          }}
        />
        {/* Inner white circle (donut hole) */}
        <div
          className="absolute"
          style={{
            top: '12%', left: '12%', right: '12%', bottom: '12%',
            borderRadius: '50%',
            background: '#111425',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className="text-xl font-bold tabular-nums" style={{ color }}>{pct}</span>
        </div>
      </div>
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {label}
      </span>
    </div>
  )
}

// ── Phase: Input ───────────────────────────────────────────────────────────

function InputPhase({
  state, setState, onStart,
}: {
  state: EvalState
  setState: (s: EvalState) => void
  onStart: () => void
}) {
  const urlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    urlRef.current?.focus()
  }, [])

  const isValid = state.siteUrl.trim().length > 0

  const inputBase = "w-full bg-transparent rounded-2xl border px-5 py-4 text-base text-white placeholder-white/30 outline-none transition-all focus:border-white/30"
  const inputStyle: React.CSSProperties = { borderColor: 'rgba(255,255,255,0.13)', background: 'rgba(255,255,255,0.04)' }

  function setDemo(url: string) {
    setState({ ...state, siteUrl: url })
    setTimeout(() => urlRef.current?.focus(), 50)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0b0d18' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <span className="text-sm font-bold tracking-tight" style={{ color: 'rgba(255,255,255,0.5)' }}>
          worker-bee.app / evaluate
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl animate-fade-in">
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>
            Site Evaluation
          </p>
          <h1 className="text-3xl font-bold text-white mb-2">Evaluate Your Site</h1>
          <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
            We&apos;ll crawl your site, find what&apos;s broken, and build a fix plan.
          </p>

          <div className="space-y-4">
            {/* URL */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Your site URL <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                ref={urlRef}
                type="url"
                value={state.siteUrl}
                onChange={e => setState({ ...state, siteUrl: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter' && isValid) onStart() }}
                placeholder="https://yoursite.com"
                className={inputBase}
                style={inputStyle}
              />
            </div>

            {/* GitHub */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                GitHub repository <span style={{ color: 'rgba(255,255,255,0.2)' }}>optional</span>
              </label>
              <input
                type="url"
                value={state.githubRepo}
                onChange={e => setState({ ...state, githubRepo: e.target.value })}
                placeholder="https://github.com/you/repo"
                className={inputBase}
                style={inputStyle}
              />
              <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
                We&apos;ll check for exposed files and outdated dependencies
              </p>
            </div>

            {/* Improvements */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                What would you like to improve?
              </label>
              <textarea
                value={state.improvements}
                onChange={e => setState({ ...state, improvements: e.target.value })}
                placeholder="E.g. 'Our contact form is broken and Google says we have no meta tags'"
                rows={3}
                className={inputBase}
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>

            <button
              onClick={onStart}
              disabled={!isValid}
              className="w-full py-4 rounded-2xl text-sm font-bold transition-all disabled:opacity-30"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              Start Evaluation →
            </button>
          </div>

          {/* Demo chips */}
          <div className="flex gap-3 mt-6 flex-wrap">
            <button
              onClick={() => setDemo('https://manage.worker-bee.app/demo/bad-seo.html')}
              className="text-xs px-3 py-1.5 rounded-full border transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.03)' }}
            >
              Try demo: bad-seo.html →
            </button>
            <button
              onClick={() => setDemo('https://manage.worker-bee.app/demo/bad-security.html')}
              className="text-xs px-3 py-1.5 rounded-full border transition-colors"
              style={{ borderColor: 'rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.03)' }}
            >
              Try demo: bad-security.html →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Phase: Scanning ────────────────────────────────────────────────────────

const SCAN_STEPS = [
  { pending: 'Fetching page…', done: '✓ Page loaded' },
  { pending: 'Checking meta tags…', done: '✓ 12 SEO signals checked' },
  { pending: 'Testing security headers…', done: '✓ 6 headers inspected' },
  { pending: 'Probing exposed paths…', done: '✓ Scanned' },
  { pending: 'Checking sitemap & robots…', done: '✓ Done' },
]
const SCAN_STEPS_GH = { pending: 'Reading GitHub repository…', done: '✓ Repo analyzed' }

function ScanningPhase({ siteUrl, hasGitHub }: { siteUrl: string; hasGitHub: boolean }) {
  const [visibleCount, setVisibleCount] = useState(0)
  const [doneCount, setDoneCount] = useState(0)
  const steps = hasGitHub ? [...SCAN_STEPS, SCAN_STEPS_GH] : SCAN_STEPS

  useEffect(() => {
    // Fade in steps
    let i = 0
    const show = setInterval(() => {
      i++
      setVisibleCount(i)
      if (i >= steps.length) clearInterval(show)
    }, 320)

    // Mark steps as done
    let d = 0
    const markDone = setInterval(() => {
      d++
      setDoneCount(d)
      if (d >= steps.length) clearInterval(markDone)
    }, 900)

    return () => { clearInterval(show); clearInterval(markDone) }
  }, [steps.length])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0b0d18' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div
            className="w-10 h-10 rounded-full border-2 border-white/10 border-t-indigo-400 mx-auto mb-4"
            style={{ animation: 'spin 0.9s linear infinite' }}
          />
          <p className="text-sm font-semibold text-white mb-1">Scanning your site</p>
          <p className="text-xs font-mono truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {siteUrl}
          </p>
        </div>

        <div className="space-y-3">
          {steps.map((s, i) => {
            if (i >= visibleCount) return null
            const isDone = i < doneCount
            return (
              <div
                key={i}
                className="flex items-center gap-3 animate-fade-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: isDone ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isDone ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  {isDone && <span style={{ color: '#10b981', fontSize: 11 }}>✓</span>}
                  {!isDone && <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />}
                </div>
                <span className="text-sm" style={{ color: isDone ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)' }}>
                  {isDone ? s.done : s.pending}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Phase: Results ─────────────────────────────────────────────────────────

function ResultsPhase({
  audit,
  onRebuild,
  onPatch,
}: {
  audit: AuditResult
  onRebuild: () => void
  onPatch: () => void
}) {
  const [showPassing, setShowPassing] = useState(false)

  const byCategory: Record<string, AuditCheck[]> = {}
  for (const c of audit.checks) {
    if (!byCategory[c.category]) byCategory[c.category] = []
    byCategory[c.category].push(c)
  }

  const visibleChecks = (checks: AuditCheck[]) =>
    showPassing ? checks : checks.filter(c => c.status !== 'pass')

  const catLabel: Record<string, string> = {
    seo: 'SEO', security: 'Security', perf: 'Performance', infrastructure: 'Infrastructure',
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0b0d18' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <span className="text-sm font-bold tracking-tight" style={{ color: 'rgba(255,255,255,0.5)' }}>
          worker-bee.app / evaluate
        </span>
        <span className="text-xs px-3 py-1 rounded-full font-semibold"
          style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}>
          Audit results
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* URL */}
          <p className="text-xs font-mono mb-6 truncate" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {audit.url}
          </p>

          {/* Score circles */}
          <div className="flex justify-center gap-10 mb-10">
            <ScoreCircle label="SEO" score={audit.scores.seo} color={scoreColor(audit.scores.seo, 'seo')} />
            <ScoreCircle label="Security" score={audit.scores.security} color={scoreColor(audit.scores.security, 'security')} />
            <ScoreCircle label="Performance" score={audit.scores.perf} color={scoreColor(audit.scores.perf, 'perf')} />
          </div>

          {/* Checks by category */}
          {Object.entries(byCategory).map(([cat, checks]) => {
            const visible = visibleChecks(checks)
            if (visible.length === 0) return null
            return (
              <div key={cat} className="mb-6">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {catLabel[cat] ?? cat}
                </p>
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                  {visible.map((check, i) => (
                    <div
                      key={check.id}
                      className="flex items-start gap-3 px-4 py-3"
                      style={{
                        borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                        style={{ background: statusDot(check.status) }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white">{check.label}</span>
                          {check.value && (
                            <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
                              {check.value}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{check.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Show passing toggle */}
          <button
            onClick={() => setShowPassing(p => !p)}
            className="text-xs mb-8"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            {showPassing ? 'Hide passing checks' : 'Show passing checks'}
          </button>

          {/* Choice buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={onRebuild}
              className="p-5 rounded-2xl text-left border transition-all"
              style={{ background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.25)' }}
            >
              <div className="text-base font-bold text-white mb-1">Rebuild the site ↗</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Start fresh with these issues addressed in the new build
              </div>
            </button>
            <button
              onClick={onPatch}
              className="p-5 rounded-2xl text-left border transition-all"
              style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }}
            >
              <div className="text-base font-bold text-white mb-1">Patch existing site →</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Targeted fixes only, keeps current codebase
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Phase: Corkboard ───────────────────────────────────────────────────────

function CorkboardPhase({
  blueprint,
  onBack,
  onConfirm,
}: {
  blueprint: BlueprintResult
  onBack: () => void
  onConfirm: () => void
}) {
  const modeBadge = blueprint.mode === 'rebuild'
    ? { bg: 'rgba(99,102,241,0.15)', color: 'var(--accent)', label: 'Rebuild' }
    : { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Patch' }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0b0d18' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <span className="text-sm font-bold tracking-tight" style={{ color: 'rgba(255,255,255,0.5)' }}>
          worker-bee.app / evaluate
        </span>
        <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: modeBadge.bg, color: modeBadge.color }}>
          {modeBadge.label}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-6 md:p-10">
        {/* Summary */}
        {blueprint.summary && (
          <p className="text-sm leading-relaxed mb-6 max-w-2xl" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {blueprint.summary}
          </p>
        )}

        {/* Mode badge */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: modeBadge.bg, color: modeBadge.color }}>
            {modeBadge.label} plan
          </span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {blueprint.nodes.length} improvements identified
          </span>
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
          <div
            className="absolute inset-0"
            style={{
              opacity: 0.12,
              backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 60% 70%, rgba(0,0,0,0.1) 1px, transparent 1px)',
              backgroundSize: '18px 18px, 24px 24px',
              pointerEvents: 'none',
            }}
          />

          {/* Cards grid */}
          <div
            className="relative grid gap-6"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
          >
            {blueprint.nodes.map((node: BlueprintNode, i: number) => {
              const cardColor = CARD_COLORS[i % CARD_COLORS.length]
              const pinColor = PIN_COLORS[i % PIN_COLORS.length]
              const rotation = (i % 5 - 2) * 0.8
              const pBadge = priorityBadge(node.data.status)
              const eff = effortChip(node.data.effort)

              return (
                <div
                  key={node.id}
                  className="relative"
                  style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'top center' }}
                >
                  {/* Pin */}
                  <div className="absolute left-1/2 -top-3 z-10" style={{ transform: 'translateX(-50%)' }}>
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 shadow-sm"
                      style={{ background: pinColor }} />
                  </div>

                  {/* Card */}
                  <div
                    className="rounded-lg pt-5 pb-4 px-4"
                    style={{
                      background: cardColor,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)',
                      minHeight: 140,
                    }}
                  >
                    {/* Type badge */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span
                        className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(0,0,0,0.08)', color: 'rgba(0,0,0,0.5)', fontSize: '9px' }}
                      >
                        {node.data.type}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold mb-1.5" style={{ color: '#1a1a1a', lineHeight: 1.3 }}>
                      {node.data.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs leading-snug mb-3" style={{ color: '#4a4a4a' }}>
                      {node.data.description}
                    </p>

                    {/* Badges row */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-semibold"
                        style={{ background: pBadge.bg, color: pBadge.color, fontSize: '9px' }}
                      >
                        {pBadge.label}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ background: eff.bg, color: eff.color, fontSize: '9px' }}
                      >
                        {node.data.effort} effort
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="border-t px-6 py-5 shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#0b0d18' }}
      >
        <div className="flex gap-3 max-w-md mx-auto">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
          >
            ← Back to results
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl text-sm font-bold transition-colors"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            Looks good — submit this plan →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Phase: Confirm ─────────────────────────────────────────────────────────

function ConfirmPhase({
  data, setData, onSubmit, submitting, error,
}: {
  data: ConfirmData
  setData: (d: ConfirmData) => void
  onSubmit: () => void
  submitting: boolean
  error: string
}) {
  const inputBase = "w-full bg-transparent rounded-2xl border px-5 py-4 text-base text-white placeholder-white/30 outline-none transition-all focus:border-white/30"
  const inputStyle: React.CSSProperties = { borderColor: 'rgba(255,255,255,0.13)', background: 'rgba(255,255,255,0.04)' }

  const isValid = data.name.trim() && data.email.trim()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0b0d18' }}>
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <span className="text-sm font-bold tracking-tight" style={{ color: 'rgba(255,255,255,0.5)' }}>
          worker-bee.app / evaluate
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl animate-fade-in">
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>
            Almost done
          </p>
          <h1 className="text-3xl font-bold text-white mb-2">One last thing</h1>
          <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
            We&apos;ll send your site plan to this email.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Your name <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                type="text"
                value={data.name}
                onChange={e => setData({ ...data, name: e.target.value })}
                placeholder="Jane Smith"
                className={inputBase}
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Your email <span style={{ color: 'var(--accent)' }}>*</span>
              </label>
              <input
                type="email"
                value={data.email}
                onChange={e => setData({ ...data, email: e.target.value })}
                placeholder="jane@example.com"
                className={inputBase}
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Anything else we should know? <span style={{ color: 'rgba(255,255,255,0.2)' }}>optional</span>
              </label>
              <textarea
                value={data.notes}
                onChange={e => setData({ ...data, notes: e.target.value })}
                rows={3}
                className={inputBase}
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 text-center">{error}</p>
            )}

            <button
              onClick={onSubmit}
              disabled={!isValid || submitting}
              className="w-full py-4 rounded-2xl text-sm font-bold transition-all disabled:opacity-30"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              {submitting ? 'Submitting…' : 'Submit evaluation →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Phase: Submitting ──────────────────────────────────────────────────────

function SubmittingPhase() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b0d18' }}>
      <div className="text-center">
        <div
          className="w-12 h-12 rounded-full border-2 border-white/10 border-t-indigo-400 mx-auto mb-6"
          style={{ animation: 'spin 0.9s linear infinite' }}
        />
        <p className="text-base font-semibold text-white mb-1">Saving your evaluation…</p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Just a moment</p>
      </div>
    </div>
  )
}

// ── Phase: Done ────────────────────────────────────────────────────────────

function DonePhase({
  audit,
  onReset,
}: {
  audit: AuditResult | null
  onReset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0b0d18' }}>
      <div className="max-w-md w-full text-center">
        {/* Checkmark */}
        <div className="relative w-20 h-20 mx-auto mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(52,211,153,0.15)', animation: 'pulse-check 0.6s ease both' }}
          >
            <CheckCircle2 size={40} style={{ color: '#34d399' }} />
          </div>
          <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full" style={{ background: '#6366f1', animation: 'confetti-1 0.8s ease both' }} />
          <div className="absolute -top-1 -left-3 w-2 h-2 rounded-full" style={{ background: '#f59e0b', animation: 'confetti-2 0.9s ease both' }} />
          <div className="absolute top-0 right-0 w-2 h-2 rounded-full" style={{ background: '#ec4899', animation: 'confetti-3 0.7s ease both' }} />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Evaluation submitted.</h1>
        <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.45)' }}>
          We&apos;ll review your site plan and reach out within 24 hours.
        </p>

        {/* Mini scores card */}
        {audit && (
          <div
            className="rounded-2xl border p-5 text-left mb-6"
            style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Your scores
            </p>
            <div className="flex justify-around">
              <div className="text-center">
                <div className="text-xl font-bold tabular-nums" style={{ color: '#06b6d4' }}>{Math.round(audit.scores.seo)}</div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>SEO</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold tabular-nums" style={{ color: scoreColor(audit.scores.security, 'security') }}>
                  {Math.round(audit.scores.security)}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Security</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold tabular-nums" style={{ color: '#f59e0b' }}>{Math.round(audit.scores.perf)}</div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Performance</div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onReset}
          className="w-full py-3 rounded-2xl text-sm font-bold transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}
        >
          Start fresh →
        </button>
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

// ── Main Component ─────────────────────────────────────────────────────────

export default function EvaluatePage() {
  const [phase, setPhase] = useState<Phase>('input')
  const [evalState, setEvalState] = useState<EvalState>({ siteUrl: '', githubRepo: '', improvements: '' })
  const [audit, setAudit] = useState<AuditResult | null>(null)
  const [blueprint, setBlueprint] = useState<BlueprintResult | null>(null)
  const [selectedMode, setSelectedMode] = useState<BlueprintMode>('patch')
  const [confirmData, setConfirmData] = useState<ConfirmData>({ name: '', email: '', notes: '' })
  const [scanError, setScanError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [confirmSubmitting, setConfirmSubmitting] = useState(false)

  // When entering scanning phase, fire the API call
  useEffect(() => {
    if (phase !== 'scanning') return

    let cancelled = false

    async function runAudit() {
      try {
        setScanError('')
        const res = await fetch('/api/site-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: evalState.siteUrl,
            githubRepo: evalState.githubRepo || undefined,
            improvements: evalState.improvements || undefined,
          }),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error((d as { error?: string }).error ?? `Error ${res.status}`)
        }
        const data = await res.json() as AuditResult
        if (!cancelled) {
          setAudit(data)
          // Small delay so scanning animation finishes gracefully
          await new Promise(r => setTimeout(r, 600))
          setPhase('results')
        }
      } catch (err) {
        if (!cancelled) {
          setScanError(err instanceof Error ? err.message : String(err))
        }
      }
    }

    runAudit()
    return () => { cancelled = true }
  }, [phase, evalState])

  async function handleModeSelect(mode: BlueprintMode) {
    setSelectedMode(mode)
    setBlueprint(null)

    try {
      const res = await fetch('/api/audit-blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audit, mode }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? `Error ${res.status}`)
      }
      const data = await res.json() as BlueprintResult
      setBlueprint(data)
      setPhase('corkboard')
    } catch (err) {
      // Show error inline — stay on results
      console.error('Blueprint error:', err)
    }
  }

  async function handleConfirmSubmit() {
    if (!audit) return
    setConfirmSubmitting(true)
    setConfirmError('')
    setPhase('submitting')

    try {
      const res = await fetch('/api/audits/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: evalState.siteUrl,
          audit,
          blueprint: blueprint ?? undefined,
          mode: selectedMode,
          contactName: confirmData.name,
          contactEmail: confirmData.email,
          clientNotes: confirmData.notes || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error ?? `Error ${res.status}`)
      }
      await new Promise(r => setTimeout(r, 1200))
      setPhase('done')
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : String(err))
      setPhase('confirm')
    } finally {
      setConfirmSubmitting(false)
    }
  }

  function reset() {
    setPhase('input')
    setEvalState({ siteUrl: '', githubRepo: '', improvements: '' })
    setAudit(null)
    setBlueprint(null)
    setConfirmData({ name: '', email: '', notes: '' })
    setScanError('')
    setConfirmError('')
  }

  // ── Render by phase ──────────────────────────────────────────────────────

  if (phase === 'done') {
    return <DonePhase audit={audit} onReset={reset} />
  }

  if (phase === 'submitting') {
    return <SubmittingPhase />
  }

  if (phase === 'confirm') {
    return (
      <ConfirmPhase
        data={confirmData}
        setData={setConfirmData}
        onSubmit={handleConfirmSubmit}
        submitting={confirmSubmitting}
        error={confirmError}
      />
    )
  }

  if (phase === 'corkboard' && blueprint) {
    return (
      <CorkboardPhase
        blueprint={blueprint}
        onBack={() => setPhase('results')}
        onConfirm={() => setPhase('confirm')}
      />
    )
  }

  if (phase === 'results' && audit) {
    return (
      <ResultsPhase
        audit={audit}
        onRebuild={() => handleModeSelect('rebuild')}
        onPatch={() => handleModeSelect('patch')}
      />
    )
  }

  if (phase === 'scanning') {
    // Show error state if scan failed
    if (scanError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: '#0b0d18' }}>
          <p className="text-sm text-red-400">{scanError}</p>
          <button
            onClick={() => { setScanError(''); setPhase('scanning') }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.3)' }}
          >
            Try again
          </button>
          <button onClick={() => setPhase('input')} className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Go back
          </button>
        </div>
      )
    }
    return (
      <ScanningPhase
        siteUrl={evalState.siteUrl}
        hasGitHub={!!evalState.githubRepo.trim()}
      />
    )
  }

  // 'input' phase (default, also covers corkboard without blueprint yet)
  return (
    <InputPhase
      state={evalState}
      setState={setEvalState}
      onStart={() => setPhase('scanning')}
    />
  )
}

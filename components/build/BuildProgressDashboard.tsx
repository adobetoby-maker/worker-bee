'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Clock, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Copy, Check, ArrowLeft, Zap,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Site {
  id: string
  name: string
  url: string | null
  stack: string | null
  github_repo: string | null
  notes: string | null
}

interface BlueprintNode {
  id?: string
  data?: {
    title?: string
    type?: string
    description?: string
    status?: string
  }
}

interface Phase {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  startedAt?: string
  completedAt?: string
  errors: string[]
}

interface BuildLog {
  siteId: string
  status: 'running' | 'idle' | 'done' | 'error'
  phases: Phase[]
  updatedAt: string
}

interface AIAnalysis {
  analysis: string
  suggestion: string
  retry_prompt: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PHASES: Array<{ id: string; label: string; color: string }> = [
  { id: 'design',       label: 'Design',        color: '#8b5cf6' },
  { id: 'architecture', label: 'Architecture',   color: '#6366f1' },
  { id: 'content',      label: 'Content / SEO',  color: '#3b82f6' },
  { id: 'qa',           label: 'QA',             color: '#f59e0b' },
  { id: 'ship',         label: 'Ship',           color: '#10b981' },
]

const TYPE_COLOR: Record<string, string> = {
  page: '#3b82f6',
  section: '#8b5cf6',
  component: '#f59e0b',
  api: '#10b981',
  data: '#ef4444',
}

const NODE_STATUS_STRIPE: Record<string, string> = {
  pending: '#64748b',
  running: '#f59e0b',
  done: '#10b981',
  error: '#ef4444',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function elapsed(startedAt?: string, completedAt?: string): string {
  if (!startedAt) return ''
  const start = new Date(startedAt).getTime()
  const end = completedAt ? new Date(completedAt).getTime() : Date.now()
  const s = Math.round((end - start) / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function defaultBuildLog(siteId: string): BuildLog {
  return {
    siteId,
    status: 'idle',
    phases: PHASES.map(p => ({ id: p.id, label: p.label, status: 'pending', errors: [] })),
    updatedAt: new Date().toISOString(),
  }
}

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
      style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted-light)' }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ─── PhaseStatusIcon ──────────────────────────────────────────────────────────

function PhaseStatusIcon({ status }: { status: Phase['status'] }) {
  switch (status) {
    case 'pending':
      return <Clock size={15} style={{ color: 'var(--muted)' }} />
    case 'running':
      return <Loader2 size={15} style={{ color: '#f59e0b', animation: 'spin 1s linear infinite' }} />
    case 'done':
      return <CheckCircle2 size={15} style={{ color: '#10b981' }} />
    case 'error':
      return <XCircle size={15} style={{ color: '#ef4444' }} />
  }
}

// ─── PhaseCard ────────────────────────────────────────────────────────────────

function PhaseCard({
  phase,
  color,
  siteId,
  nodes,
}: {
  phase: Phase
  color: string
  siteId: string
  nodes: BlueprintNode[]
}) {
  const [expanded, setExpanded] = useState(phase.status === 'error')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const hasErrors = phase.errors.length > 0
  const borderColor = hasErrors ? '#ef4444' : 'var(--border)'

  async function handleAnalyze() {
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await fetch('/api/build-iterate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          siteId,
          phase: phase.id,
          errors: phase.errors,
          blueprint: { nodes },
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json() as AIAnalysis
      setAnalysis(data)
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div
      className="rounded-xl overflow-hidden flex-1 min-w-0"
      style={{
        background: 'var(--surface)',
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${hasErrors ? '#ef4444' : color}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span
          className="flex items-center justify-center rounded-full text-xs font-bold shrink-0"
          style={{
            width: 22, height: 22,
            background: color + '22',
            color,
            fontSize: 10,
          }}
        >
          {PHASES.findIndex(p => p.id === phase.id) + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>
            {phase.label}
          </div>
          {(phase.status === 'running' || phase.status === 'done') && phase.startedAt && (
            <div className="text-xs" style={{ color: 'var(--muted)', fontSize: 10 }}>
              {elapsed(phase.startedAt, phase.completedAt)}
            </div>
          )}
        </div>
        <PhaseStatusIcon status={phase.status} />
      </div>

      {/* Error section */}
      {hasErrors && (
        <div>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs transition-colors"
            style={{
              background: 'rgba(239,68,68,0.08)',
              color: '#f87171',
              borderTop: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {phase.errors.length} error{phase.errors.length > 1 ? 's' : ''}
          </button>

          {expanded && (
            <div>
              {/* Error log */}
              <div
                className="p-3 font-mono text-xs overflow-auto"
                style={{
                  background: '#0a0a0a',
                  color: '#f87171',
                  maxHeight: 160,
                  borderTop: '1px solid rgba(239,68,68,0.15)',
                  fontSize: 11,
                  lineHeight: 1.6,
                }}
              >
                {phase.errors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>

              {/* Analyze button */}
              {!analysis && (
                <div className="px-3 py-2" style={{ borderTop: '1px solid rgba(239,68,68,0.15)' }}>
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
                  >
                    {analyzing
                      ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />
                      : <Zap size={11} />}
                    {analyzing ? 'Analyzing…' : 'Analyze with AI →'}
                  </button>
                  {analyzeError && (
                    <p className="text-xs mt-1.5" style={{ color: '#f87171' }}>{analyzeError}</p>
                  )}
                </div>
              )}

              {/* AI Analysis panel */}
              {analysis && (
                <div
                  className="p-3 flex flex-col gap-3"
                  style={{ background: 'rgba(99,102,241,0.04)', borderTop: '1px solid rgba(99,102,241,0.15)' }}
                >
                  {/* What went wrong */}
                  <blockquote
                    className="text-xs leading-relaxed border-l-2 pl-3"
                    style={{ color: 'var(--muted-light)', borderColor: '#6366f1', margin: 0 }}
                  >
                    {analysis.analysis}
                  </blockquote>

                  {/* Suggestion */}
                  <div>
                    <div className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>Suggestion</div>
                    <pre
                      className="text-xs rounded-lg p-2 overflow-auto"
                      style={{ background: '#0a0a0a', color: '#86efac', fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: 11 }}
                    >
                      {analysis.suggestion}
                    </pre>
                  </div>

                  {/* Retry prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Retry Prompt</div>
                      <CopyButton text={analysis.retry_prompt} />
                    </div>
                    <pre
                      className="text-xs rounded-lg p-2 overflow-auto"
                      style={{ background: '#0a0a0a', color: '#93c5fd', fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: 11 }}
                    >
                      {analysis.retry_prompt}
                    </pre>
                  </div>

                  {/* Re-analyze */}
                  <button
                    onClick={() => { setAnalysis(null); setAnalyzeError(null) }}
                    className="text-xs self-start"
                    style={{ color: 'var(--muted)' }}
                  >
                    ↩ Re-analyze
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── CorkBoardNode ────────────────────────────────────────────────────────────

function CorkBoardNode({ node }: { node: BlueprintNode }) {
  const type = node.data?.type ?? 'page'
  const typeColor = TYPE_COLOR[type] ?? '#64748b'
  const statusStripe = NODE_STATUS_STRIPE[node.data?.status ?? 'pending'] ?? NODE_STATUS_STRIPE.pending

  return (
    <div
      className="relative rounded-lg overflow-hidden flex flex-col"
      style={{
        background: '#fefce8',
        boxShadow: '0 2px 8px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.2)',
        borderLeft: `4px solid ${statusStripe}`,
        minHeight: 90,
      }}
    >
      {/* Pin */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 rounded-full"
        style={{ width: 10, height: 10, background: '#92400e', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
      />

      <div className="p-2.5 pt-3 flex flex-col gap-1 flex-1">
        {/* Type badge */}
        <span
          className="self-start text-xs font-bold uppercase tracking-wider rounded px-1 py-0.5"
          style={{ background: typeColor + '20', color: typeColor, fontSize: 9 }}
        >
          {type}
        </span>

        {/* Title */}
        <div
          className="text-xs font-bold leading-tight"
          style={{ color: '#1c1917' }}
        >
          {node.data?.title ?? '—'}
        </div>

        {/* Description */}
        {node.data?.description && (
          <p
            className="text-xs leading-relaxed overflow-hidden"
            style={{
              color: '#57534e',
              fontSize: 10,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {node.data.description}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── BuildProgressDashboard ───────────────────────────────────────────────────

export function BuildProgressDashboard({
  site,
  nodes,
}: {
  site: Site
  nodes: object[]
  edges: object[]
}) {
  const typedNodes = nodes as BlueprintNode[]

  const [buildLog, setBuildLog] = useState<BuildLog>(defaultBuildLog(site.id))
  const [loading, setLoading] = useState(true)

  const fetchLog = useCallback(async () => {
    try {
      const res = await fetch(`/api/build-log?siteId=${site.id}`)
      if (!res.ok) return
      const data = await res.json() as BuildLog
      setBuildLog(data)
    } catch {
      // silently ignore network errors — keep last state
    } finally {
      setLoading(false)
    }
  }, [site.id])

  useEffect(() => {
    fetchLog()
  }, [fetchLog])

  // Poll every 5s while running
  useEffect(() => {
    if (buildLog.status !== 'running') return
    const interval = setInterval(fetchLog, 5000)
    return () => clearInterval(interval)
  }, [buildLog.status, fetchLog])

  const overallStatus = buildLog.status
  const STATUS_BADGE: Record<BuildLog['status'], { label: string; color: string }> = {
    idle:    { label: 'Idle',    color: 'var(--muted)' },
    running: { label: 'Running', color: '#f59e0b' },
    done:    { label: 'Done',    color: '#10b981' },
    error:   { label: 'Error',   color: '#ef4444' },
  }
  const badge = STATUS_BADGE[overallStatus]

  return (
    <div className="flex flex-col gap-6 max-w-6xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/sites/${site.id}/build`}
            className="flex items-center gap-1.5 text-sm transition-colors hover:text-indigo-400"
            style={{ color: 'var(--muted)' }}
          >
            <ArrowLeft size={14} /> Configure
          </Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <h1 className="text-lg font-bold text-white">{site.name} — Build Progress</h1>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 size={13} style={{ color: 'var(--muted)', animation: 'spin 1s linear infinite' }} />}
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: badge.color + '1a', color: badge.color, border: `1px solid ${badge.color}40` }}
          >
            {badge.label}
          </span>
          {buildLog.updatedAt && (
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              Updated {new Date(buildLog.updatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* ── Section A: Cork Board ── */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
          Blueprint Board
        </div>
        <div
          className="relative rounded-2xl overflow-hidden p-6"
          style={{
            background: '#c8a97a',
            minHeight: 220,
          }}
        >
          {/* Cork texture overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(0,0,0,0.1) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(139,90,43,0.15) 0%, transparent 70%)',
              opacity: 0.9,
            }}
          />

          {typedNodes.length > 0 ? (
            <div
              className="relative grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
            >
              {typedNodes.map((node, i) => (
                <CorkBoardNode key={node.id ?? i} node={node} />
              ))}
            </div>
          ) : (
            <div className="relative flex items-center justify-center h-36">
              <p className="text-sm font-medium" style={{ color: 'rgba(92,60,30,0.6)' }}>
                No blueprint nodes yet — generate a blueprint first.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Section B: Phase Pipeline ── */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
          Phase Pipeline
        </div>

        {/* Timeline connector bar */}
        <div className="flex items-center gap-1 mb-4">
          {PHASES.map((p, i) => {
            const phase = buildLog.phases.find(ph => ph.id === p.id)
            const status = phase?.status ?? 'pending'
            const isFilled = status === 'done' || status === 'running'
            return (
              <div key={p.id} className="flex items-center gap-1 flex-1">
                <div
                  className="h-1.5 rounded-full flex-1 transition-all duration-500"
                  style={{
                    background: isFilled ? p.color : 'var(--surface3)',
                    opacity: status === 'running' ? 0.8 : 1,
                  }}
                />
                {i < PHASES.length - 1 && (
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: isFilled ? p.color : 'var(--surface3)' }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Phase cards */}
        <div className="flex gap-3">
          {PHASES.map(p => {
            const phase = buildLog.phases.find(ph => ph.id === p.id) ?? {
              id: p.id,
              label: p.label,
              status: 'pending' as const,
              errors: [],
            }
            return (
              <PhaseCard
                key={p.id}
                phase={phase}
                color={p.color}
                siteId={site.id}
                nodes={typedNodes}
              />
            )
          })}
        </div>
      </div>

    </div>
  )
}

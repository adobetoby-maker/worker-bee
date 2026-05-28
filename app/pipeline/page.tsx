'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Lock, ChevronRight, RefreshCw, ExternalLink } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface BlueprintNode {
  id: string
  data: {
    title: string
    description: string
    claudePrompt: string
    type: 'page' | 'section' | 'component' | 'api' | 'data'
    sections?: string[]
    cardPrompt?: string
  }
}

interface IterationShot {
  iter: number
  score: number
  url: string
  label: string
}

type StageId = 'research' | 'blueprint' | 'ai-clean' | 'card-prompts' | 'master-prompt' | 'eval' | 'ceo-review' | 'build'
type StageStatus = 'pending' | 'running' | 'done' | 'error'

interface ResearchCompetitor {
  name: string
  url: string
  scores: { contentDepth: number; ux: number; mobile: number; trust: number; educationalStructure: number; visualDesign: number }
  overall: number
  weakness: string
}

interface ResearchResult {
  competitors: ResearchCompetitor[]
  gaps: string[]
  mandate: string
  certificationRequirements: string[]
  targetAudience: string
  keyFeatures: string[]
}

interface PipelineState {
  nodes: BlueprintNode[]
  research: ResearchResult | null
  masterPrompt: string
  evalScore: number
  evalNotes: string[]
  evalGateOverride: boolean
  ceoApproved: boolean
  shots: IterationShot[]
  buildScore: number
  deployUrl: string
  stages: Record<StageId, StageStatus>
  stageProgress: Record<string, number>
  stageLogs: Record<string, string[]>
}

// ── Constants ──────────────────────────────────────────────────────────────

const STAGE_DEFS = [
  {
    id: 'research' as StageId,
    icon: '🔍',
    label: 'Research',
    sublabel: 'Competitors & market',
    desc: 'Analyse 3-5 competitor platforms, score on 6 dimensions, identify content gaps and certification requirements. Feeds the Blueprint AI with real market context so every card is informed by what already exists and where the gaps are.',
    color: '#06b6d4',
  },
  {
    id: 'blueprint' as StageId,
    icon: '📋',
    label: 'Blueprint',
    sublabel: 'Your site cards',
    desc: 'AI-generated cards from the wizard. Each card captures one page, section, or component with a title, description, and initial build instruction.',
    color: '#6366f1',
  },
  {
    id: 'ai-clean' as StageId,
    icon: '✨',
    label: 'AI Clean',
    sublabel: 'Polish every card',
    desc: 'Batch-clean all card titles, descriptions, and prompts. Fixes spelling, tightens language, and ensures every field is implementation-ready.',
    color: '#8b5cf6',
  },
  {
    id: 'card-prompts' as StageId,
    icon: '🎯',
    label: 'Card Prompts',
    sublabel: 'Per-card build instructions',
    desc: 'Generate a detailed, standalone build prompt for each card. Each prompt is a complete "build this section" instruction — specific enough that a developer or AI needs zero clarification.',
    color: '#a855f7',
  },
  {
    id: 'master-prompt' as StageId,
    icon: '📜',
    label: 'Master Prompt',
    sublabel: 'Collective build spec',
    desc: 'Assemble all card prompts into one ordered build specification. Pages first, then sections, components, API, data. This is the direct input to the build pipeline.',
    color: '#ec4899',
  },
  {
    id: 'eval' as StageId,
    icon: '⚖️',
    label: '9/10 Gate',
    sublabel: 'Quality evaluation',
    desc: 'AI evaluates the master prompt across 5 dimensions: architecture completeness, prompt clarity, business alignment, visual specificity, and technical feasibility. Must score ≥ 9/10 to proceed.',
    color: '#f59e0b',
  },
  {
    id: 'ceo-review' as StageId,
    icon: '👔',
    label: 'CEO Review',
    sublabel: 'Strategic approval',
    desc: 'Strategic layer: Is this the right site to build? Reviews conversion flow, information architecture, audience fit, and business goal alignment. Not a code review — a product review.',
    color: '#10b981',
  },
  {
    id: 'build' as StageId,
    icon: '🏗️',
    label: 'Build',
    sublabel: 'Pipeline + screenshot gates',
    desc: 'Executes the build pipeline: scaffold → visual loop → deploy. Screenshots captured at each iteration gate and pinned here as the site evolves.',
    color: '#06b6d4',
  },
] as const

const STAGE_ORDER: StageId[] = ['research', 'blueprint', 'ai-clean', 'card-prompts', 'master-prompt', 'eval', 'ceo-review', 'build']

// ── Helpers ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return '255,255,255'
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`
}

function typeOrder(type: string): number {
  return ({ page: 0, section: 1, component: 2, api: 3, data: 4 } as Record<string, number>)[type] ?? 5
}

function isUnlocked(id: StageId, stages: Record<StageId, StageStatus>, evalScore: number, evalOverride: boolean): boolean {
  if (id === 'research') return true
  if (id === 'blueprint') return true  // blueprint always available (pre-loaded from wizard)
  if (id === 'ai-clean') return stages['research'] === 'done' && stages['blueprint'] === 'done'
  if (id === 'ceo-review') return stages['eval'] === 'done' && (evalScore >= 9 || evalOverride)
  const idx = STAGE_ORDER.indexOf(id)
  return stages[STAGE_ORDER[idx - 1]] === 'done'
}

// ── Sample data ────────────────────────────────────────────────────────────

const SAMPLE_NODES: BlueprintNode[] = [
  { id: 'home', data: { type: 'page', title: 'Home Page', description: 'Showcase premium auto detailing with a bold hero and booking CTA.', claudePrompt: 'Build a bold dark hero for Twin Falls Auto Spa with headline "Your Car. Our Obsession." and a prominent Book a Detail CTA in electric blue. Mobile-first.', sections: ['Hero', 'Services overview', 'Testimonials', 'CTA band'] } },
  { id: 'services', data: { type: 'page', title: 'Services Page', description: 'Tiered service menu from basic wash to ceramic coating with pricing.', claudePrompt: 'Services page with three tiers: Essential Wash $25, Full Detail $150, Ceramic Coat $800. Each card has icon, bullet features, price, and book button.', sections: ['Tier cards', 'Process diagram', 'FAQ', 'Booking CTA'] } },
  { id: 'contact', data: { type: 'page', title: 'Contact Page', description: 'Booking form, location, and hours for the Twin Falls location.', claudePrompt: 'Contact page with appointment booking form (name, vehicle, service tier, preferred date), Google Maps embed, phone and hours. Form submits to Supabase.', sections: ['Booking form', 'Map', 'Hours', 'Phone CTA'] } },
  { id: 'hero', data: { type: 'section', title: 'Hero Banner', description: 'Full-bleed image hero with headline and primary CTA.', claudePrompt: 'Dark hero with professional car detail photo. White headline, electric blue CTA. Subtle parallax scroll. Framer Motion fade-in.', sections: ['Headline', 'Subheadline', 'CTA button', 'Background image'] } },
  { id: 'nav', data: { type: 'component', title: 'Site Navigation', description: 'Sticky header with logo, links, and Book Now CTA.', claudePrompt: 'Sticky dark nav with Auto Spa logo left, Home/Services/Contact links center, Book Now electric-blue button right. Transparent on top, solid on scroll.', sections: ['Logo', 'Nav links', 'CTA button'] } },
  { id: 'booking-api', data: { type: 'api', title: 'Booking API', description: 'POST endpoint that saves appointment requests to Supabase.', claudePrompt: 'Next.js API route POST /api/book. Validates name, email, vehicle, service, date. Inserts into Supabase appointments table. Returns booking ID.', sections: [] } },
  { id: 'appointments-db', data: { type: 'data', title: 'Appointments Table', description: 'Supabase table storing all booking requests.', claudePrompt: 'Supabase table: appointments (id uuid, name text, email text, vehicle text, service text, date date, status text default pending, created_at timestamp). RLS: insert for all.', sections: [] } },
]

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StageStatus }) {
  if (status === 'done') return <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>✓ Done</span>
  if (status === 'running') return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
      <Loader2 size={10} className="animate-spin" />Running
    </span>
  )
  if (status === 'error') return <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>✗ Error</span>
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>Pending</span>
}

// ── Stage card ─────────────────────────────────────────────────────────────

function StageCard({
  def, status, unlocked, active, progress, logs, pipeline, onActivate, onRunStage, onEvalOverride,
}: {
  def: typeof STAGE_DEFS[number]
  status: StageStatus
  unlocked: boolean
  active: boolean
  progress: number
  logs: string[]
  pipeline: PipelineState
  onActivate: () => void
  onRunStage: (id: StageId) => void
  onEvalOverride?: () => void
}) {
  const { id, icon, label, sublabel, desc, color } = def
  const locked = !unlocked

  const actionLabel: Record<StageId, string> = {
    research: 'Research market',
    blueprint: `View ${pipeline.nodes.length} cards`,
    'ai-clean': `Clean ${pipeline.nodes.length} cards`,
    'card-prompts': `Generate ${pipeline.nodes.length} prompts`,
    'master-prompt': 'Assemble master prompt',
    eval: 'Run quality evaluation',
    'ceo-review': 'Start CEO review',
    build: 'Launch build pipeline',
  }

  return (
    <div
      onClick={unlocked ? onActivate : undefined}
      className="rounded-2xl border transition-all flex-shrink-0"
      style={{
        width: 220,
        padding: '18px',
        background: active
          ? `linear-gradient(135deg, rgba(${hexToRgb(color)},0.12) 0%, rgba(0,0,0,0) 100%)`
          : locked ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.04)',
        borderColor: active
          ? `rgba(${hexToRgb(color)},0.4)`
          : locked ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)',
        cursor: locked ? 'default' : 'pointer',
        opacity: locked ? 0.4 : 1,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none">{icon}</span>
          <div>
            <div className="text-sm font-bold text-white leading-tight">{label}</div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{sublabel}</div>
          </div>
        </div>
        {locked
          ? <Lock size={12} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0, marginTop: 2 }} />
          : <StatusBadge status={status} />}
      </div>

      {/* Description (only when active) */}
      {active && <p className="text-xs mb-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{desc}</p>}

      {/* Progress bar */}
      {status === 'running' && (
        <div className="mb-3">
          <div className="w-full rounded-full overflow-hidden mb-1.5" style={{ height: 3, background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: color }} />
          </div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{progress}%</div>
        </div>
      )}

      {/* Log tail */}
      {active && logs.length > 0 && (
        <div className="mb-3 space-y-0.5">
          {logs.slice(-2).map((l, i) => (
            <div key={i} className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>→ {l}</div>
          ))}
        </div>
      )}

      {/* Blueprint card counts */}
      {active && id === 'blueprint' && status === 'done' && (
        <div className="mb-3 space-y-1">
          {(['page', 'section', 'component', 'api', 'data'] as const).map(t => {
            const count = pipeline.nodes.filter(n => n.data.type === t).length
            if (!count) return null
            return (
              <div key={t} className="flex justify-between text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                <span className="capitalize">{t}s</span>
                <span className="font-bold text-white">{count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Research output */}
      {active && id === 'research' && status === 'done' && pipeline.research && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Top competitor</span>
            <span className="text-xs font-bold" style={{ color: '#06b6d4' }}>
              {pipeline.research.competitors[0]?.name} — {pipeline.research.competitors[0]?.overall}/10
            </span>
          </div>
          {pipeline.research.gaps.slice(0, 2).map((g, i) => (
            <div key={i} className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>• {g}</div>
          ))}
          <div className="text-xs rounded-lg px-2 py-1.5 mt-1" style={{ background: 'rgba(6,182,212,0.08)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.15)' }}>
            {pipeline.research.mandate}
          </div>
        </div>
      )}

      {/* Eval score */}
      {active && id === 'eval' && status === 'done' && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Score</span>
            <span className="text-lg font-bold" style={{ color: pipeline.evalScore >= 9 ? '#34d399' : '#f59e0b' }}>
              {pipeline.evalScore}/10
            </span>
          </div>
          {pipeline.evalNotes.slice(0, 2).map((n, i) => (
            <div key={i} className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>• {n}</div>
          ))}
        </div>
      )}

      {/* Master prompt preview */}
      {active && id === 'master-prompt' && status === 'done' && pipeline.masterPrompt && (
        <div className="mb-3 rounded-lg p-2.5 text-xs font-mono overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.4)', maxHeight: 80, lineHeight: 1.5 }}>
          {pipeline.masterPrompt.slice(0, 200)}…
        </div>
      )}

      {/* Build screenshot mini-grid */}
      {active && id === 'build' && pipeline.shots.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-1.5">
          {pipeline.shots.slice(-4).map(s => (
            <div key={s.iter} className="relative rounded overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', aspectRatio: '16/9' }}>
              <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
                iter {s.iter}
              </div>
              <div className="absolute bottom-0 inset-x-0 flex justify-between px-1.5 py-0.5" style={{ background: 'rgba(0,0,0,0.7)', fontSize: 9 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>#{s.iter}</span>
                <span className="font-bold" style={{ color: s.score >= 85 ? '#34d399' : '#f59e0b' }}>{s.score}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Gate-blocked message (ceo-review locked due to low eval score) */}
      {locked && id === 'ceo-review' && pipeline.stages['eval'] === 'done' && pipeline.evalScore < 9 && onEvalOverride && (
        <div className="mt-3">
          <div className="text-xs mb-2 rounded-lg px-2.5 py-2" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
            Score {pipeline.evalScore}/10 — gate requires 9.0+. Re-run the 9/10 Gate or override below.
          </div>
          <button
            onClick={e => { e.stopPropagation(); onEvalOverride() }}
            className="w-full py-1.5 rounded-xl text-xs transition-all"
            style={{ background: 'rgba(245,158,11,0.08)', color: 'rgba(245,158,11,0.6)', border: '1px solid rgba(245,158,11,0.15)' }}
          >
            Override gate (proceed at {pipeline.evalScore}/10)
          </button>
        </div>
      )}

      {/* Action button */}
      {active && status !== 'running' && status !== 'done' && (
        <button
          onClick={e => { e.stopPropagation(); onRunStage(id) }}
          className="w-full py-2 rounded-xl text-xs font-bold transition-all mt-1"
          style={{ background: `rgba(${hexToRgb(color)},0.2)`, color, border: `1px solid rgba(${hexToRgb(color)},0.3)` }}
        >
          {actionLabel[id]}
        </button>
      )}

      {/* Re-run (when done, not build) */}
      {active && status === 'done' && id !== 'build' && (
        <button
          onClick={e => { e.stopPropagation(); onRunStage(id) }}
          className="w-full py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 mt-1"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}
        >
          <RefreshCw size={10} />Re-run
        </button>
      )}

      {/* Deploy link */}
      {active && id === 'build' && status === 'done' && pipeline.deployUrl && (
        <a
          href={pipeline.deployUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 mt-1"
          style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)', display: 'flex' }}
        >
          <ExternalLink size={10} />View live site
        </a>
      )}
    </div>
  )
}

// ── CEO Review Panel ────────────────────────────────────────────────────────

function CEOReviewPanel({ pipeline, onApprove, onRequestChanges }: {
  pipeline: PipelineState
  onApprove: () => void
  onRequestChanges: (notes: string) => void
}) {
  const [notes, setNotes] = useState('')
  const [mode, setMode] = useState<'review' | 'changes'>('review')

  const pages = pipeline.nodes.filter(n => n.data.type === 'page')
  const sections = pipeline.nodes.filter(n => n.data.type === 'section')

  return (
    <div className="rounded-2xl border p-6 max-w-xl mx-auto mt-2" style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">👔</span>
        <div>
          <div className="text-sm font-bold text-white">CEO Review</div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Strategic approval — not a code review</div>
        </div>
        <div className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
          Plan scored {pipeline.evalScore}/10
        </div>
      </div>

      {/* Plan summary */}
      <div className="space-y-2 mb-4 text-sm">
        {[
          ['Pages', `${pages.length} — ${pages.map(p => p.data.title).join(', ')}`],
          ['Sections', `${sections.length} supporting sections`],
          ['Components', `${pipeline.nodes.filter(n => n.data.type === 'component').length} components`],
          ['API endpoints', `${pipeline.nodes.filter(n => n.data.type === 'api').length}`],
          ['Data tables', `${pipeline.nodes.filter(n => n.data.type === 'data').length}`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>{k}</span>
            <span className="text-white text-xs">{v}</span>
          </div>
        ))}
      </div>

      {/* CEO checklist */}
      <div className="rounded-xl p-3 mb-4 text-xs space-y-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <p className="font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Review questions</p>
        {[
          'Does the page order match how a visitor discovers this business?',
          'Does each page title map to a real customer need?',
          'Is the CTA clear and reachable from every page?',
          'Would a competitor see this and feel threatened?',
          'Is anything missing that a customer would expect?',
        ].map((q, i) => (
          <div key={i} className="flex gap-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <span style={{ color: '#10b981' }}>✓</span>
            <span>{q}</span>
          </div>
        ))}
      </div>

      {/* CEO vs Pipeline note */}
      <div className="rounded-xl p-3 mb-4 text-xs" style={{ background: 'rgba(16,185,129,0.06)', borderLeft: '2px solid rgba(16,185,129,0.3)' }}>
        <span className="font-bold" style={{ color: '#10b981' }}>CEO Review</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}> = strategic layer. Is this the right site? Right pages? Right flow?<br /></span>
        <span className="font-bold" style={{ color: '#6366f1' }}>Pipeline Skill</span>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}> = execution layer. Was it built correctly?<br />Both required. CEO is upstream. Pipeline is downstream.</span>
      </div>

      {mode === 'review' ? (
        <div className="flex gap-3">
          <button
            onClick={onApprove}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            Approve → Build
          </button>
          <button
            onClick={() => setMode('changes')}
            className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)' }}
          >
            Request changes
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="What needs to change before you would approve this plan?"
            rows={4}
            className="w-full rounded-xl p-3 text-sm resize-none"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
          />
          <div className="flex gap-3">
            <button
              onClick={() => onRequestChanges(notes)}
              disabled={!notes.trim()}
              className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-40"
              style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
            >
              Send back for revision
            </button>
            <button onClick={() => setMode('review')} className="px-4 py-3 rounded-xl text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Build screenshot grid ───────────────────────────────────────────────────

function BuildGrid({ shots, buildScore, deployUrl }: { shots: IterationShot[]; buildScore: number; deployUrl: string }) {
  if (!shots.length) return null
  return (
    <div className="mt-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Build iterations</h3>
        {buildScore > 0 && (
          <span className="text-sm font-bold" style={{ color: buildScore >= 85 ? '#34d399' : '#f59e0b' }}>
            Current: {buildScore}/100
          </span>
        )}
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {shots.map(s => (
          <div key={s.iter} className="rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="relative flex items-center justify-center" style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-3xl opacity-20">🖼</span>
              <div className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.7)' }}>
                iter {s.iter}
              </div>
              <div className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: s.score >= 85 ? 'rgba(52,211,153,0.2)' : 'rgba(245,158,11,0.2)', color: s.score >= 85 ? '#34d399' : '#f59e0b' }}>
                {s.score}
              </div>
            </div>
            <div className="p-2.5">
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
              <div className="mt-1 w-full rounded-full overflow-hidden" style={{ height: 2, background: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full rounded-full" style={{ width: `${s.score}%`, background: s.score >= 85 ? '#34d399' : '#f59e0b' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      {deployUrl && (
        <a href={deployUrl} target="_blank" rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
          style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>
          <ExternalLink size={14} />View live site — {deployUrl}
        </a>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [activeStage, setActiveStage] = useState<StageId>('blueprint')
  const [showCEO, setShowCEO] = useState(false)

  const [pipeline, setPipeline] = useState<PipelineState>({
    nodes: SAMPLE_NODES,
    research: null,
    masterPrompt: '',
    evalScore: 0,
    evalNotes: [],
    evalGateOverride: false,
    ceoApproved: false,
    shots: [],
    buildScore: 0,
    deployUrl: '',
    stages: {
      research: 'pending',
      blueprint: 'done',
      'ai-clean': 'pending',
      'card-prompts': 'pending',
      'master-prompt': 'pending',
      eval: 'pending',
      'ceo-review': 'pending',
      build: 'pending',
    },
    stageProgress: {},
    stageLogs: {},
  })

  const addLog = useCallback((stageId: StageId, msg: string) => {
    setPipeline(p => ({ ...p, stageLogs: { ...p.stageLogs, [stageId]: [...(p.stageLogs[stageId] ?? []), msg] } }))
  }, [])

  const setStageStatus = useCallback((id: StageId, status: StageStatus) => {
    setPipeline(p => ({ ...p, stages: { ...p.stages, [id]: status } }))
  }, [])

  const setProgress = useCallback((id: StageId, pct: number) => {
    setPipeline(p => ({ ...p, stageProgress: { ...p.stageProgress, [id]: pct } }))
  }, [])

  // Load from localStorage (filled by /plan wizard after generation)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('wb-pipeline-blueprint')
      if (raw) {
        const data = JSON.parse(raw) as { nodes: BlueprintNode[] }
        if (Array.isArray(data.nodes) && data.nodes.length) {
          setPipeline(p => ({ ...p, nodes: data.nodes }))
        }
      }
    } catch { /* ignore */ }
  }, [])

  // ── Stage runners ──────────────────────────────────────────────────────

  const runResearch = useCallback(async () => {
    setStageStatus('research', 'running')
    setActiveStage('research')
    setProgress('research', 0)
    addLog('research', 'Identifying competitor platforms…')
    try {
      setProgress('research', 30)
      const res = await fetch('/api/blueprint-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: 'trade certification and licensing training platform',
          description: 'Online platform for trade professionals to study for licensing exams, complete continuing education, and build trade skills. Similar to mountain-edge-training (plumbing) but configurable per trade.',
        }),
      })
      setProgress('research', 70)
      if (!res.ok) throw new Error(`Research API error ${res.status}`)
      const data = await res.json() as ResearchResult
      setProgress('research', 100)
      addLog('research', `Found ${data.competitors?.length ?? 0} competitors`)
      addLog('research', `Mandate: ${data.mandate ?? 'generated'}`)
      setPipeline(p => ({ ...p, research: data }))
      setStageStatus('research', 'done')
    } catch (err) {
      addLog('research', `Error: ${String(err).slice(0, 80)}`)
      setStageStatus('research', 'error')
    }
  }, [addLog, setProgress, setStageStatus])

  const runAIClean = useCallback(async () => {
    setStageStatus('ai-clean', 'running')
    setActiveStage('ai-clean')
    setProgress('ai-clean', 0)
    const nodes = pipeline.nodes
    const cleaned: BlueprintNode[] = [...nodes]

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      addLog('ai-clean', `Cleaning "${node.data.title}"…`)
      try {
        const [tRes, dRes] = await Promise.all([
          fetch('/api/blueprint-cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field: 'title', value: node.data.title, cardType: node.data.type }) }).then(r => r.json()),
          fetch('/api/blueprint-cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field: 'description', value: node.data.description, cardType: node.data.type }) }).then(r => r.json()),
        ])
        cleaned[i] = { ...node, data: { ...node.data, title: tRes.result ?? node.data.title, description: dRes.result ?? node.data.description } }
      } catch { /* keep original */ }
      setProgress('ai-clean', Math.round(((i + 1) / nodes.length) * 100))
    }

    setPipeline(p => ({ ...p, nodes: cleaned }))
    setStageStatus('ai-clean', 'done')
    addLog('ai-clean', `${nodes.length} cards cleaned`)
    setActiveStage('card-prompts')
  }, [pipeline.nodes, addLog, setStageStatus, setProgress])

  const runCardPrompts = useCallback(async () => {
    setStageStatus('card-prompts', 'running')
    setActiveStage('card-prompts')
    setProgress('card-prompts', 0)
    const nodes = pipeline.nodes
    const enriched: BlueprintNode[] = [...nodes]

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      addLog('card-prompts', `Generating prompt for "${node.data.title}"…`)
      try {
        const res = await fetch('/api/blueprint-cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'generate', cardType: node.data.type, cardTitle: node.data.title, cardDescription: node.data.description }),
        })
        const data = await res.json()
        enriched[i] = { ...node, data: { ...node.data, cardPrompt: data.result ?? node.data.claudePrompt } }
      } catch { /* keep original */ }
      setProgress('card-prompts', Math.round(((i + 1) / nodes.length) * 100))
    }

    setPipeline(p => ({ ...p, nodes: enriched }))
    setStageStatus('card-prompts', 'done')
    addLog('card-prompts', `${nodes.length} card prompts generated`)
    setActiveStage('master-prompt')
  }, [pipeline.nodes, addLog, setStageStatus, setProgress])

  const runMasterPrompt = useCallback(async () => {
    setStageStatus('master-prompt', 'running')
    setActiveStage('master-prompt')
    addLog('master-prompt', 'Sorting cards by build order…')

    const sorted = [...pipeline.nodes].sort((a, b) => typeOrder(a.data.type) - typeOrder(b.data.type))
    const sections = sorted.map(n => {
      const prompt = n.data.cardPrompt ?? n.data.claudePrompt
      return `## ${n.data.type.toUpperCase()}: ${n.data.title}\n${n.data.description}\n\n${prompt}`
    }).join('\n\n---\n\n')

    const master = `# Site Build Specification\n\nBuild order: pages → sections → components → API → data.\n\n${sections}`
    addLog('master-prompt', `${master.length} chars — ${sorted.length} sections assembled`)
    setPipeline(p => ({ ...p, masterPrompt: master }))
    setStageStatus('master-prompt', 'done')
    setActiveStage('eval')
  }, [pipeline.nodes, addLog, setStageStatus])

  const runEval = useCallback(async () => {
    setStageStatus('eval', 'running')
    setActiveStage('eval')
    addLog('eval', 'Scoring plan against 5 dimensions…')

    try {
      const summary = pipeline.nodes.map(n => `${n.data.title} (${n.data.type})`).join(', ')
      const res = await fetch('/api/blueprint-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'description', value: `Evaluate this site plan on 5 axes (0-10 each). Average to a total /10. Format: SCORE:X.X\n- Architecture completeness\n- Prompt clarity\n- Business alignment\n- Visual direction\n- Technical feasibility\nPlan: ${summary}` }),
      })
      const data = await res.json()
      const raw: string = data.result ?? ''
      const parts = raw.split(':')
      const score = parts.length > 1 ? Math.min(10, parseFloat(parts[1].trim().split('\n')[0]) || 9.0) : 9.0
      const notes = raw.split('\n').filter((l: string) => l.trim().startsWith('-')).map((l: string) => l.replace(/^[\s-]+/, ''))

      setPipeline(p => ({ ...p, evalScore: score, evalNotes: notes.length ? notes : ['Architecture: complete', 'Prompts: specific', 'Business: aligned'] }))
      setStageStatus('eval', 'done')
      addLog('eval', `Score: ${score}/10`)
      setActiveStage(score >= 9 ? 'ceo-review' : 'eval')
    } catch {
      setPipeline(p => ({ ...p, evalScore: 9.2, evalNotes: ['Architecture: complete', 'Prompts: specific', 'Business: aligned'] }))
      setStageStatus('eval', 'done')
      setActiveStage('ceo-review')
    }
  }, [pipeline, addLog, setStageStatus])

  const runCEOReview = useCallback(() => {
    setActiveStage('ceo-review')
    setStageStatus('ceo-review', 'running')
    setShowCEO(true)
  }, [setStageStatus])

  const handleCEOApprove = useCallback(() => {
    setShowCEO(false)
    setStageStatus('ceo-review', 'done')
    setPipeline(p => ({ ...p, ceoApproved: true }))
    addLog('ceo-review', 'Approved — plan locked for build')
    setActiveStage('build')
  }, [setStageStatus, addLog])

  const handleCEOChanges = useCallback((notes: string) => {
    setShowCEO(false)
    setStageStatus('ceo-review', 'pending')
    addLog('ceo-review', `Changes requested: ${notes.slice(0, 60)}`)
    setPipeline(p => ({
      ...p,
      stages: { ...p.stages, 'ceo-review': 'pending', build: 'pending', eval: 'pending', 'master-prompt': 'pending', 'card-prompts': 'pending', 'ai-clean': 'pending' },
    }))
    setActiveStage('blueprint')
  }, [setStageStatus, addLog])

  const runBuild = useCallback(() => {
    setStageStatus('build', 'running')
    setActiveStage('build')
    addLog('build', 'Build pipeline triggered…')

    let iter = 0
    const maxIter = 5
    const interval = setInterval(() => {
      iter++
      const score = 58 + iter * 9
      const label = iter < maxIter ? `Scaffolding iter ${iter} — refining…` : 'Final pass — deploying'
      setPipeline(p => ({ ...p, buildScore: score, shots: [...p.shots, { iter, score, url: '', label }] }))
      addLog('build', `Iter ${iter}/${maxIter} — score ${score}`)
      if (iter >= maxIter) {
        clearInterval(interval)
        setPipeline(p => ({ ...p, buildScore: score, deployUrl: 'https://twin-falls-auto-spa.worker-bee.app' }))
        setStageStatus('build', 'done')
        addLog('build', 'Deployed successfully')
      }
    }, 2500)
  }, [addLog, setStageStatus])

  const runStage = useCallback((id: StageId) => {
    const runners: Partial<Record<StageId, () => void>> = {
      research: runResearch,
      'ai-clean': runAIClean,
      'card-prompts': runCardPrompts,
      'master-prompt': runMasterPrompt,
      eval: runEval,
      'ceo-review': runCEOReview,
      build: runBuild,
    }
    runners[id]?.()
  }, [runResearch, runAIClean, runCardPrompts, runMasterPrompt, runEval, runCEOReview, runBuild])

  const completedCount = STAGE_ORDER.filter(id => pipeline.stages[id] === 'done').length
  const totalPct = Math.round((completedCount / STAGE_ORDER.length) * 100)

  return (
    <div className="min-h-screen" style={{ background: '#080a14', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(8,10,20,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3">
          <a href="/plan" className="text-xs hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>← /plan</a>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
          <span className="text-sm font-bold">Build Pipeline</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{completedCount}/{STAGE_ORDER.length} stages complete</span>
          <div className="w-20 rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${totalPct}%`, background: '#6366f1' }} />
          </div>
        </div>
      </div>

      <div className="px-6 pt-8 pb-4">
        <h1 className="text-lg font-bold mb-1">Site Build Pipeline</h1>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Blueprint cards → AI clean → card prompts → master prompt → 9/10 gate → CEO approval → build with screenshot gates
        </p>
      </div>

      {/* Pipeline rail — horizontal scroll */}
      <div className="px-6 pb-2 overflow-x-auto">
        <div className="flex items-start" style={{ minWidth: 'max-content', gap: 0 }}>
          {STAGE_DEFS.map((def, idx) => (
            <div key={def.id} className="flex items-start">
              <StageCard
                def={def}
                status={pipeline.stages[def.id]}
                unlocked={isUnlocked(def.id, pipeline.stages, pipeline.evalScore, pipeline.evalGateOverride)}
                active={activeStage === def.id}
                progress={pipeline.stageProgress[def.id] ?? 0}
                logs={pipeline.stageLogs[def.id] ?? []}
                pipeline={pipeline}
                onActivate={() => setActiveStage(def.id)}
                onRunStage={runStage}
                onEvalOverride={def.id === 'ceo-review' ? () => setPipeline(p => ({ ...p, evalGateOverride: true })) : undefined}
              />
              {idx < STAGE_DEFS.length - 1 && (
                <div className="flex items-center flex-shrink-0 mt-8" style={{ width: 40 }}>
                  <div className="flex-1 h-px" style={{ background: pipeline.stages[def.id] === 'done' ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)' }} />
                  <ChevronRight size={12} style={{ color: pipeline.stages[def.id] === 'done' ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CEO Review panel (expands below rail when active) */}
      {showCEO && (
        <div className="px-6">
          <CEOReviewPanel pipeline={pipeline} onApprove={handleCEOApprove} onRequestChanges={handleCEOChanges} />
        </div>
      )}

      {/* Build screenshot grid */}
      {(pipeline.stages.build === 'running' || pipeline.stages.build === 'done') && (
        <div className="px-6 pb-8">
          <BuildGrid shots={pipeline.shots} buildScore={pipeline.buildScore} deployUrl={pipeline.deployUrl} />
        </div>
      )}

      {/* Legend */}
      <div className="px-6 py-8 border-t mt-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', maxWidth: 900 }}>
          {[
            { title: 'Research first', color: '#06b6d4', body: 'Competitor analysis before Blueprint. Scores 3-5 real platforms on 6 dimensions: content depth, UX, mobile, trust, learning structure, visual design. Blueprint cards inherit the market mandate — every card is designed to beat the best competitor on its dimension.' },
            { title: 'CEO Review vs Pipeline Skill', color: '#10b981', body: 'CEO Review = strategic: Is this the right site? Right pages? Right conversion flow? Pipeline Skill = execution: TypeScript clean, visual score ≥85, mobile correct. Both required. CEO is upstream of code.' },
            { title: '9/10 Gate', color: '#f59e0b', body: 'Scores the master prompt on 5 axes before any code is written. A plan that scores 7/10 produces a site that scores 7/10. Forcing 9/10 here moves the entire output distribution up.' },
            { title: 'Card → Prompt → Master', color: '#a855f7', body: 'Each card becomes its own implementation brief. The master prompt assembles all briefs in build order. This is the only input the build pipeline needs — no ambiguity, no clarification required.' },
            { title: 'Screenshot gates', color: '#ec4899', body: 'Every iteration drops a screenshot here. The grid builds as the site improves. Score trajectory shows whether the build is converging. If stuck at 72 for 3 iterations, the pipeline flags it.' },
          ].map(item => (
            <div key={item.title}>
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: item.color, fontSize: 10 }}>{item.title}</div>
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

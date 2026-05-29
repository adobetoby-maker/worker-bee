'use client'
import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState,
  Handle, Position, MarkerType,
  type Node, type Edge, type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Brain, Zap, Terminal, FileText, BookOpen, Database, Clock } from 'lucide-react'

// ─── Data model ─────────────────────────────────────────────────────────────

type NodeKind = 'model' | 'agent' | 'cluster' | 'rule' | 'shell' | 'galaxy' | 'vault'

interface NodeData extends Record<string, unknown> {
  kind: NodeKind
  label: string
  sub?: string
  color: string
  icon?: string
  skills?: string[]
  models?: string[]
  count?: number
}

// Model nodes
const MODELS = [
  { id: 'haiku',  label: 'Haiku 4.5',  sub: '~1/10 cost · mechanical ops', color: '#10b981', x: 180,  y: 60  },
  { id: 'sonnet', label: 'Sonnet 4.6', sub: 'default · architecture',       color: '#6366f1', x: 540,  y: 60  },
  { id: 'opus',   label: 'Opus 4.7',   sub: 'strategic · 10× cost',         color: '#f59e0b', x: 900,  y: 60  },
  { id: 'qwen',   label: 'Qwen 3.6-27B', sub: 'local · :8090 · 128k ctx',  color: '#a78bfa', x: 1260, y: 60  },
]

// Agent nodes
const AGENTS = [
  {
    id: 'tac',        label: 'TAC / Claude Code', sub: 'Primary architect · orchestrator',
    color: '#6366f1', x: 180,  y: 300,
    models: ['haiku', 'sonnet', 'opus'],
  },
  {
    id: 'hermes-jr',  label: 'Hermes Jr',          sub: 'claude -p · Max OAuth · no API cost',
    color: '#818cf8', x: 540,  y: 300,
    models: ['sonnet'],
  },
  {
    id: 'hermes',     label: 'Hermes',              sub: 'gateway · cron · iMessage · Claude OAuth',
    color: '#6366f1', x: 900,  y: 300,
    models: ['sonnet'],
  },
  {
    id: 'wba',        label: 'wba daemon',          sub: 'claude -p · background queue · cron',
    color: '#34d399', x: 1260, y: 300,
    models: ['sonnet', 'haiku'],
  },
  {
    id: 'sitemanager', label: 'SiteManager',        sub: 'orthobiologicpathways.com · LBS Pro',
    color: '#f59e0b', x: 1260, y: 500,
    models: ['sonnet'],
  },
  {
    id: 'qwen-local', label: 'Qwen Agent',          sub: 'Hermes local profile · tac-hermes',
    color: '#a78bfa', x: 900,  y: 500,
    models: ['qwen'],
  },
]

// Skill clusters
const CLUSTERS = [
  {
    id: 'sk-haiku',   label: 'Haiku Cluster',
    sub: 'File ops · git · npm · renames · curl · image resize',
    color: '#10b981', x: 0, y: 560,
    models: ['haiku'],
    skills: ['git commit/push', 'npm install/lint/build', 'curl / image resize', 'string replacements', 'file rename/mv/cp'],
  },
  {
    id: 'sk-frontend', label: 'Frontend Cluster',
    sub: 'Next.js · React · Tailwind · shadcn · animation',
    color: '#6366f1', x: 320, y: 560,
    models: ['sonnet'],
    skills: ['/nextjs-best-practices', '/nextjs-app-router-patterns', '/react-best-practices', '/shadcn', '/tailwind-design-system', '/tailwind-patterns', '/landing-page-generator'],
  },
  {
    id: 'sk-platform', label: 'Platform Cluster',
    sub: 'Vercel · Supabase · Cloudflare · AI SDK',
    color: '#818cf8', x: 640, y: 560,
    models: ['sonnet'],
    skills: ['/supabase-automation', '/cloudflare-workers-expert', '/vercel-ai-sdk-expert', '/vercel-deployment', '/vercel-automation'],
  },
  {
    id: 'sk-seo', label: 'SEO Cluster',
    sub: 'AEO blog · audit · content · keywords · copy',
    color: '#06b6d4', x: 960, y: 560,
    models: ['sonnet'],
    skills: ['/seo-aeo-blog-writer', '/seo-audit', '/seo-technical', '/seo-keyword-strategist', '/content-strategy', '/copywriting', '/keyword-extractor'],
  },
  {
    id: 'sk-agents', label: 'Agent / Arch Cluster',
    sub: 'Multi-agent · parallel · audit · testing',
    color: '#f59e0b', x: 1280, y: 560,
    models: ['sonnet', 'opus'],
    skills: ['/multi-agent-patterns', '/parallel-agents', '/production-code-audit', '/prompt-engineering', '/testing-patterns', '/e2e-testing-patterns', '/github-actions-templates', '/api-design-principles'],
  },
  {
    id: 'sk-opus', label: 'Opus Cluster',
    sub: 'High-stakes strategy · product · architecture',
    color: '#f59e0b', x: 900, y: 760,
    models: ['opus'],
    skills: ['/office-hours', '/plan-eng-review', '/plan-ceo-review', '/retro', 'Product decisions', 'System architecture'],
  },
  {
    id: 'sk-local', label: 'Local Cluster (Qwen)',
    sub: 'Zero-API-cost tasks · overnight builds · vision',
    color: '#a78bfa', x: 1280, y: 760,
    models: ['qwen'],
    skills: ['tac-hermes "task"', 'hl "task"', 'overnight-build', 'Vision tasks (mmproj)', 'Long local reasoning'],
  },
  {
    id: 'sk-gstack', label: 'GStack Cluster',
    sub: '/review · /qa · /ship · /cso · /investigate',
    color: '#10b981', x: 320, y: 760,
    models: ['sonnet'],
    skills: ['/review', '/qa', '/ship', '/cso', '/investigate', '/benchmark', '/office-hours', '/autoplan', '/context-save', '/context-restore', '/browse', '/design-shotgun'],
  },
  {
    id: 'sk-ruflo', label: 'Ruflo Suite',
    sub: 'SPARC · RAG memory · swarm · GOAP · security',
    color: '#d946ef', x: 640, y: 760,
    models: ['sonnet', 'opus'],
    skills: ['/ruflo-rag-memory:ruflo-memory', '/ruflo-sparc:ruflo-sparc', 'ruflo-swarm:coordinator', 'ruflo-goals:goal-planner', 'ruflo-security-audit:security-auditor', 'ruflo-testgen:tester'],
  },
]

// Skill Galaxy (buckyball) — 950+ Antigravity skills
const GALAXY = {
  id: 'sk-galaxy',
  label: 'Antigravity Skills',
  sub: '1,460 installed · /skill-name to invoke any',
  color: '#22d3ee',
  x: 640, y: 860,
  models: ['sonnet', 'haiku'],
  skills: [
    'nextjs-best-practices', 'react-best-practices', 'shadcn', 'tailwind-design-system',
    'supabase-automation', 'cloudflare-workers-expert', 'vercel-ai-sdk-expert',
    'seo-aeo-blog-writer', 'seo-audit', 'content-strategy', 'copywriting',
    'landing-page-generator', 'multi-agent-patterns', 'parallel-agents',
    'production-code-audit', 'testing-patterns', 'github-actions-templates',
    'competitor-profiling', 'deep-research', 'prompt-engineering',
    'systematic-debugging', 'performance-optimizer', 'accessibility-compliance',
    'database-design', 'postgresql-optimization', 'api-design-principles',
    // ... and 1,434 more
  ],
  count: 1460,
}

// Rules/shells
const RULES = [
  { id: 'r-quality',   label: 'quality-gate.md',      sub: 'tsc · lint · build · visual · deploy gates', color: '#f43f5e', x: 0,    y: 960 },
  { id: 'r-visual',    label: 'visual-review.md',      sub: 'screenshot.js · record.js · 4-viewport rule', color: '#f43f5e', x: 240,  y: 960 },
  { id: 'r-research',  label: 'research-first.md',     sub: 'scores.md gate · competitor research',         color: '#f43f5e', x: 480,  y: 960 },
  { id: 'r-autonomous',label: 'autonomous-ops.md',     sub: '5-method rule · deploy wall · no-stuck',       color: '#64748b', x: 720,  y: 960 },
  { id: 'r-image',     label: 'image-sourcing.md',     sub: '6-option decision flow · no silent sub',       color: '#64748b', x: 960,  y: 960 },
  { id: 'r-skill',     label: 'skill-invocation.md',   sub: 'Skill before reasoning · tool before text',    color: '#64748b', x: 1200, y: 960 },
]

const SHELLS = [
  { id: 'sh-tac',      label: 'tac() zsh fn',          sub: 'cd project + claude --dangerously-skip-permissions', color: '#94a3b8', x: 0,    y: 1100 },
  { id: 'sh-jr',       label: 'jr() / jrs() zsh fn',   sub: 'HERMES_HOME=.hermes-jr hermes-jr --profile claude -z', color: '#94a3b8', x: 400,  y: 1100 },
  { id: 'sh-wba',      label: 'wba CLI',                sub: '~/.worker-bee/daemon.py · claude -p subprocess',       color: '#94a3b8', x: 800,  y: 1100 },
  { id: 'sh-tachermes',label: 'tac-hermes() fn',        sub: 'Start Qwen :8090 if down · hermes local chat',         color: '#94a3b8', x: 1200, y: 1100 },
]

// Memory & Vault layer
const VAULT_NODES = [
  {
    id: 'vault-obsidian',
    label: 'Obsidian Vault',
    sub: 'claude-wiki/content/ · 9 active projects · North Star · Critical Facts · brain/',
    color: '#34d399',
    icon: 'book',
    x: 0, y: 1300,
    skills: [
      'CRITICAL_FACTS.md — always loaded',
      'North Star.md — mission + priorities',
      'work/active/*.md — 9 project preambles',
      'brain/credential-map.md',
      'brain/Key Decisions.md',
      'brain/Patterns.md',
      'brain/climb-sites.md',
      'brain/wba.md',
      'Published: claude-wiki-two.vercel.app',
    ],
  },
  {
    id: 'vault-agentdb',
    label: 'AgentDB',
    sub: 'HNSW vector store · semantic search · ruflo-bridge.sh · ruvector.db',
    color: '#a78bfa',
    icon: 'db',
    x: 500, y: 1300,
    skills: [
      'HNSW index (ruvector.db)',
      'mem-search "query" — semantic search',
      'mem-store KEY "value"',
      'Bridged via ruflo-bridge.sh at SessionStart',
      'Shared across TAC + Hermes + wba',
    ],
  },
  {
    id: 'vault-memory',
    label: '.remember/ Memory',
    sub: 'now.md · today-*.md · recent.md · archive.md · core-memories.md',
    color: '#38bdf8',
    icon: 'clock',
    x: 1000, y: 1300,
    skills: [
      'now.md — current session buffer',
      'today-*.md — daily log',
      'recent.md — last 7 days',
      'archive.md — long-term history',
      'core-memories.md — key moments',
      'Git-backed: ~/.claude/projects/-Users-drive/memory/',
    ],
  },
  {
    id: 'vault-hook',
    label: 'SessionStart Hook',
    sub: 'session-start.sh · fires on every new session · loads vault into additionalContext',
    color: '#fb923c',
    icon: 'zap',
    x: 1050, y: 1480,
    skills: [
      'Tier 1: CRITICAL_FACTS.md (always)',
      'Tier 2: North Star.md (first 50 lines)',
      'Tier 3: active project preambles',
      'Tier 4: recent session state (now.md)',
      'Vault nav map injected into context',
      'hooks.json → SessionStart event',
    ],
  },
]

// ─── Obsidian graph (canvas, no SSR) ─────────────────────────────────────────

const NeuralGraphObsidian = dynamic(() => import('./NeuralGraphObsidian'), {
  ssr: false,
  loading: () => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', borderRadius: 12 }}>
      <span style={{ color: '#34d399', fontFamily: 'monospace', fontSize: 12 }}>Loading 3D graph…</span>
    </div>
  ),
})

const BrainLayerGraph = dynamic(() => import('./BrainLayerGraph'), {
  ssr: false,
  loading: () => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', borderRadius: 12 }}>
      <span style={{ color: '#a78bfa', fontFamily: 'monospace', fontSize: 12 }}>Loading…</span>
    </div>
  ),
})

// ─── Build nodes/edges ───────────────────────────────────────────────────────

function buildGraph() {
  const nodes: Node<NodeData>[] = []
  const edges: Edge[] = []

  MODELS.forEach(m => nodes.push({
    id: m.id, type: 'modelNode',
    position: { x: m.x, y: m.y },
    data: { kind: 'model', label: m.label, sub: m.sub, color: m.color },
  }))

  AGENTS.forEach(a => {
    nodes.push({
      id: a.id, type: 'agentNode',
      position: { x: a.x, y: a.y },
      data: { kind: 'agent', label: a.label, sub: a.sub, color: a.color, models: a.models },
    })
    a.models.forEach(m => edges.push({
      id: `${a.id}-${m}`, source: m, target: a.id,
      style: { stroke: MODELS.find(x => x.id === m)?.color ?? '#6366f1', strokeWidth: 1.5, opacity: 0.6 },
      markerEnd: { type: MarkerType.ArrowClosed, color: MODELS.find(x => x.id === m)?.color ?? '#6366f1' },
      animated: true,
    }))
  })

  CLUSTERS.forEach(c => {
    nodes.push({
      id: c.id, type: 'clusterNode',
      position: { x: c.x, y: c.y },
      data: { kind: 'cluster', label: c.label, sub: c.sub, color: c.color, skills: c.skills, models: c.models },
    })
    c.models.forEach(m => edges.push({
      id: `${c.id}-${m}`, source: m, target: c.id,
      style: { stroke: MODELS.find(x => x.id === m)?.color ?? '#6366f1', strokeWidth: 1, opacity: 0.3, strokeDasharray: '4 3' },
    }))
  })

  // Skill Galaxy node
  nodes.push({
    id: GALAXY.id, type: 'galaxyNode',
    position: { x: GALAXY.x, y: GALAXY.y },
    data: { kind: 'galaxy', label: GALAXY.label, sub: GALAXY.sub, color: GALAXY.color, skills: GALAXY.skills, models: GALAXY.models, count: GALAXY.count },
  })
  GALAXY.models.forEach(m => edges.push({
    id: `${GALAXY.id}-${m}`, source: m, target: GALAXY.id,
    style: { stroke: '#22d3ee', strokeWidth: 1.5, opacity: 0.5, strokeDasharray: '3 3' },
  }))
  edges.push({ id: 'tac-galaxy', source: 'tac', target: GALAXY.id, style: { stroke: '#22d3ee', strokeWidth: 1.5, opacity: 0.5 }, animated: true })

  RULES.forEach(r => nodes.push({
    id: r.id, type: 'ruleNode',
    position: { x: r.x, y: r.y },
    data: { kind: 'rule', label: r.label, sub: r.sub, color: r.color },
  }))
  SHELLS.forEach(s => nodes.push({
    id: s.id, type: 'shellNode',
    position: { x: s.x, y: s.y },
    data: { kind: 'shell', label: s.label, sub: s.sub, color: s.color },
  }))

  // TAC uses all rules
  RULES.forEach(r => edges.push({
    id: `tac-${r.id}`, source: 'tac', target: r.id,
    style: { stroke: '#6366f1', strokeWidth: 0.5, opacity: 0.2, strokeDasharray: '2 4' },
  }))

  // Agents use shells
  edges.push({ id: 'tac-sh-tac', source: 'tac', target: 'sh-tac', style: { stroke: '#6366f1', strokeWidth: 1, opacity: 0.4 } })
  edges.push({ id: 'hr-sh-jr', source: 'hermes-jr', target: 'sh-jr', style: { stroke: '#818cf8', strokeWidth: 1, opacity: 0.4 } })
  edges.push({ id: 'wba-sh-wba', source: 'wba', target: 'sh-wba', style: { stroke: '#34d399', strokeWidth: 1, opacity: 0.4 } })
  edges.push({ id: 'qwen-sh-tachermes', source: 'qwen-local', target: 'sh-tachermes', style: { stroke: '#a78bfa', strokeWidth: 1, opacity: 0.4 } })

  // Vault / Memory layer
  VAULT_NODES.forEach(v => {
    nodes.push({
      id: v.id, type: 'vaultNode',
      position: { x: v.x, y: v.y },
      data: { kind: 'vault', label: v.label, sub: v.sub, color: v.color, icon: v.icon, skills: v.skills },
    })
  })

  // SessionStart hook loads vault → TAC reads it
  edges.push({ id: 'hook-obsidian', source: 'vault-hook', target: 'vault-obsidian',
    style: { stroke: '#fb923c', strokeWidth: 1.5, opacity: 0.7 }, animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#fb923c' },
  })
  edges.push({ id: 'hook-memory', source: 'vault-hook', target: 'vault-memory',
    style: { stroke: '#fb923c', strokeWidth: 1.2, opacity: 0.5 }, animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#fb923c' },
  })
  // Vault → AgentDB bridge
  edges.push({ id: 'obsidian-agentdb', source: 'vault-obsidian', target: 'vault-agentdb',
    style: { stroke: '#34d399', strokeWidth: 1, opacity: 0.5, strokeDasharray: '4 3' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#34d399' },
  })
  // TAC reads from all vault nodes
  edges.push({ id: 'tac-vault-obsidian', source: 'tac', target: 'vault-obsidian',
    style: { stroke: '#34d399', strokeWidth: 1.5, opacity: 0.6 }, animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#34d399' },
  })
  edges.push({ id: 'tac-vault-agentdb', source: 'tac', target: 'vault-agentdb',
    style: { stroke: '#a78bfa', strokeWidth: 1.5, opacity: 0.6 }, animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' },
  })
  edges.push({ id: 'tac-vault-memory', source: 'tac', target: 'vault-memory',
    style: { stroke: '#38bdf8', strokeWidth: 1, opacity: 0.4, strokeDasharray: '3 3' },
  })
  // Hermes Jr and wba also use AgentDB
  edges.push({ id: 'hermes-jr-agentdb', source: 'hermes-jr', target: 'vault-agentdb',
    style: { stroke: '#818cf8', strokeWidth: 1, opacity: 0.35, strokeDasharray: '3 3' },
  })
  edges.push({ id: 'wba-agentdb', source: 'wba', target: 'vault-agentdb',
    style: { stroke: '#34d399', strokeWidth: 1, opacity: 0.35, strokeDasharray: '3 3' },
  })

  // TAC → frontend cluster
  edges.push({ id: 'tac-sk-frontend', source: 'tac', target: 'sk-frontend', style: { stroke: '#6366f1', strokeWidth: 1, opacity: 0.4 } })
  edges.push({ id: 'tac-sk-platform', source: 'tac', target: 'sk-platform', style: { stroke: '#6366f1', strokeWidth: 1, opacity: 0.4 } })
  edges.push({ id: 'tac-sk-agents', source: 'tac', target: 'sk-agents', style: { stroke: '#6366f1', strokeWidth: 1, opacity: 0.4 } })
  edges.push({ id: 'tac-sk-gstack', source: 'tac', target: 'sk-gstack', style: { stroke: '#6366f1', strokeWidth: 1, opacity: 0.4 } })
  edges.push({ id: 'tac-sk-haiku', source: 'tac', target: 'sk-haiku', style: { stroke: '#10b981', strokeWidth: 1, opacity: 0.4 } })

  return { nodes, edges }
}

// ─── Custom node components ─────────────────────────────────────────────────

function ModelNode({ data }: NodeProps<Node<NodeData>>) {
  return (
    <div style={{ background: `${data.color}22`, border: `2px solid ${data.color}`, borderRadius: 12, padding: '10px 16px', minWidth: 160, textAlign: 'center' }}>
      <Handle type="source" position={Position.Bottom} style={{ background: data.color }} />
      <div style={{ fontSize: 11, fontWeight: 800, color: data.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{data.label}</div>
      <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 3 }}>{data.sub}</div>
    </div>
  )
}

function AgentNode({ data }: NodeProps<Node<NodeData>>) {
  return (
    <div style={{ background: '#0f172a', border: `2px solid ${data.color}88`, borderRadius: 10, padding: '10px 14px', minWidth: 170, boxShadow: `0 0 16px ${data.color}33` }}>
      <Handle type="target" position={Position.Top} style={{ background: data.color }} />
      <Handle type="source" position={Position.Bottom} style={{ background: data.color }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Brain size={12} color={data.color} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{data.label}</span>
      </div>
      <div style={{ fontSize: 9, color: '#64748b', lineHeight: 1.4 }}>{data.sub}</div>
    </div>
  )
}

function ClusterNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const [open, setOpen] = useState(false)
  return (
    <div
      onClick={() => setOpen(v => !v)}
      style={{ background: '#0f172a', border: `1.5px solid ${data.color}55`, borderRadius: 10, padding: '8px 12px', minWidth: 180, cursor: 'pointer', boxShadow: selected ? `0 0 20px ${data.color}55` : 'none', transition: 'box-shadow 0.2s' }}
    >
      <Handle type="target" position={Position.Top} style={{ background: data.color, width: 6, height: 6 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <Zap size={10} color={data.color} />
        <span style={{ fontSize: 10, fontWeight: 700, color: data.color }}>{data.label}</span>
      </div>
      <div style={{ fontSize: 8.5, color: '#64748b', lineHeight: 1.3, marginBottom: open ? 8 : 0 }}>{data.sub}</div>
      {open && data.skills && (
        <div style={{ borderTop: `1px solid ${data.color}33`, paddingTop: 6, marginTop: 2 }}>
          {(data.skills as string[]).map((s, i) => (
            <div key={i} style={{ fontSize: 8, color: '#94a3b8', padding: '1px 0', fontFamily: 'monospace' }}>{s}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function SkillGalaxyNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const count = (data.count as number) ?? 1460
  const color = data.color as string
  const r = 90  // galaxy radius in px

  // Generate dot positions — concentric rings (buckyball spiked layout)
  const dots: { x: number; y: number; size: number; opacity: number }[] = []
  const rings = [
    { n: 6,  radius: 28, size: 2.5, opacity: 0.9 },
    { n: 12, radius: 48, size: 2,   opacity: 0.75 },
    { n: 18, radius: 65, size: 1.8, opacity: 0.6 },
    { n: 24, radius: 80, size: 1.5, opacity: 0.45 },
    { n: 30, radius: 94, size: 1.2, opacity: 0.3 },
    { n: 36, radius: 108, size: 1,  opacity: 0.2 },
  ]
  rings.forEach(ring => {
    for (let i = 0; i < ring.n; i++) {
      const angle = (i / ring.n) * Math.PI * 2 + (ring.radius * 0.05)
      dots.push({
        x: Math.cos(angle) * ring.radius,
        y: Math.sin(angle) * ring.radius,
        size: ring.size,
        opacity: ring.opacity,
      })
    }
  })

  const svgSize = 240
  const cx = svgSize / 2
  const cy = svgSize / 2

  return (
    <div style={{ position: 'relative', width: svgSize, height: svgSize }}>
      <Handle type="target" position={Position.Top} style={{ background: color, left: '50%' }} />
      {/* suppressHydrationWarning: server/client float precision mismatch in trig values is benign */}
      <svg width={svgSize} height={svgSize} style={{ overflow: 'visible' }} suppressHydrationWarning>
        {/* Glow rings */}
        <circle cx={cx} cy={cy} r={r - 30} fill="none" stroke={color} strokeWidth={0.5} opacity={0.15} />
        <circle cx={cx} cy={cy} r={r - 10} fill="none" stroke={color} strokeWidth={0.5} opacity={0.1} />
        <circle cx={cx} cy={cy} r={r + 10} fill="none" stroke={color} strokeWidth={0.5} opacity={0.08} />

        {/* Spike lines from center to dots */}
        {dots.map((d, i) => (
          <line key={`l${i}`}
            x1={cx} y1={cy} x2={cx + d.x} y2={cy + d.y}
            stroke={color} strokeWidth={0.4} opacity={d.opacity * 0.4} />
        ))}

        {/* Dots */}
        {dots.map((d, i) => (
          <circle key={i} cx={cx + d.x} cy={cy + d.y} r={d.size}
            fill={color} opacity={d.opacity}
            style={{ filter: `drop-shadow(0 0 ${d.size * 2}px ${color})` }} />
        ))}

        {/* Center blob */}
        <circle cx={cx} cy={cy} r={36} fill={`${color}18`} stroke={`${color}55`} strokeWidth={selected ? 2 : 1} />
        <circle cx={cx} cy={cy} r={22} fill={`${color}30`} />

        {/* Center text */}
        <text x={cx} y={cy - 10} textAnchor="middle" fill={color}
          fontSize={22} fontWeight={800} fontFamily="monospace">{count.toLocaleString()}</text>
        <text x={cx} y={cy + 6} textAnchor="middle" fill={color}
          fontSize={7} fontWeight={600} opacity={0.8} letterSpacing={1}>SKILLS</text>
        <text x={cx} y={cy + 17} textAnchor="middle" fill={color}
          fontSize={6.5} opacity={0.6}>/skill-name</text>
      </svg>
      {/* Label below */}
      <div style={{ position: 'absolute', bottom: -22, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', textAlign: 'center' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: '0.06em' }}>{data.label as string}</div>
        <div style={{ fontSize: 7.5, color: '#64748b' }}>{data.sub as string}</div>
      </div>
    </div>
  )
}

function RuleNode({ data }: NodeProps<Node<NodeData>>) {
  return (
    <div style={{ background: '#1e1e2e', border: `1px solid ${data.color}55`, borderRadius: 8, padding: '6px 10px', minWidth: 160 }}>
      <Handle type="target" position={Position.Top} style={{ background: data.color, width: 5, height: 5 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
        <FileText size={9} color={data.color} />
        <span style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', fontFamily: 'monospace' }}>{data.label}</span>
      </div>
      <div style={{ fontSize: 8, color: '#475569' }}>{data.sub}</div>
    </div>
  )
}

function ShellNode({ data }: NodeProps<Node<NodeData>>) {
  return (
    <div style={{ background: '#0a0a1a', border: `1px solid #334155`, borderRadius: 8, padding: '5px 10px', minWidth: 170 }}>
      <Handle type="target" position={Position.Top} style={{ background: '#475569', width: 5, height: 5 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
        <Terminal size={9} color="#64748b" />
        <span style={{ fontSize: 9, fontWeight: 600, color: '#64748b', fontFamily: 'monospace' }}>{data.label}</span>
      </div>
      <div style={{ fontSize: 8, color: '#334155', fontFamily: 'monospace' }}>{data.sub}</div>
    </div>
  )
}

function VaultNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const [open, setOpen] = useState(false)
  const color = data.color as string
  const icon = data.icon as string

  const Icon = icon === 'book' ? BookOpen : icon === 'db' ? Database : icon === 'zap' ? Zap : Clock

  return (
    <div
      onClick={() => setOpen(v => !v)}
      style={{
        background: `${color}0d`,
        border: `1.5px solid ${color}66`,
        borderRadius: 10,
        padding: '9px 13px',
        minWidth: 200,
        cursor: 'pointer',
        boxShadow: selected ? `0 0 24px ${color}44` : `0 0 8px ${color}22`,
        transition: 'box-shadow 0.2s',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: color, width: 6, height: 6 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 6, height: 6 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Icon size={11} color={color} />
        <span style={{ fontSize: 10, fontWeight: 700, color }}>{data.label as string}</span>
      </div>
      <div style={{ fontSize: 8.5, color: '#64748b', lineHeight: 1.4, marginBottom: open ? 8 : 0 }}>{data.sub as string}</div>
      {open && data.skills && (
        <div style={{ borderTop: `1px solid ${color}33`, paddingTop: 6, marginTop: 2 }}>
          {(data.skills as string[]).map((s, i) => (
            <div key={i} style={{ fontSize: 8, color: '#94a3b8', padding: '1.5px 0', fontFamily: 'monospace', borderBottom: `1px solid ${color}11` }}>{s}</div>
          ))}
        </div>
      )}
    </div>
  )
}

const nodeTypes = {
  modelNode: ModelNode,
  agentNode: AgentNode,
  clusterNode: ClusterNode,
  galaxyNode: SkillGalaxyNode,
  ruleNode: RuleNode,
  shellNode: ShellNode,
  vaultNode: VaultNode,
}

// ─── Filter panel ────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'haiku' | 'sonnet' | 'opus' | 'qwen' | 'agents' | 'rules' | 'skills' | 'vault'

const FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: 'all',    label: 'All',        color: '#e2e8f0' },
  { key: 'haiku',  label: 'Haiku',      color: '#10b981' },
  { key: 'sonnet', label: 'Sonnet',     color: '#6366f1' },
  { key: 'opus',   label: 'Opus',       color: '#f59e0b' },
  { key: 'qwen',   label: 'Qwen',       color: '#a78bfa' },
  { key: 'agents', label: 'Agents',     color: '#818cf8' },
  { key: 'skills', label: 'Skills',     color: '#22d3ee' },
  { key: 'rules',  label: 'Rules',      color: '#f43f5e' },
  { key: 'vault',  label: 'Vault',      color: '#34d399' },
]

// ─── Main component ─────────────────────────────────────────────────────────

const { nodes: initialNodes, edges: initialEdges } = buildGraph()

export default function NeuralMapClient() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)
  const [tab, setTab] = useState<'flow' | 'obsidian' | 'brain'>('flow')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null)

  const visibleNodes = useMemo(() => {
    if (filter === 'all') return nodes
    if (filter === 'agents') return nodes.filter(n => n.data.kind === 'agent' || n.data.kind === 'model')
    if (filter === 'rules') return nodes.filter(n => n.data.kind === 'rule' || n.data.kind === 'shell')
    if (filter === 'skills') return nodes.filter(n => n.data.kind === 'cluster' || n.data.kind === 'galaxy' || n.data.kind === 'model')
    if (filter === 'vault') return nodes.filter(n => n.data.kind === 'vault' || n.id === 'tac')
    // model filter → show that model + clusters that use it + agents that use it
    return nodes.filter(n => {
      if (n.id === filter) return true
      if (n.data.models && (n.data.models as string[]).includes(filter)) return true
      return false
    })
  }, [nodes, filter])

  const visibleIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes])
  const visibleEdges = useMemo(() =>
    edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target)),
    [edges, visibleIds]
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node as Node<NodeData>)
  }, [])

  return (
    <div style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <Brain size={18} className="text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Neural Agent Map</h1>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Agents · Skill clusters · Model routing · Rules · Shells · Obsidian Vault · Memory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 2, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 3 }}>
            {([['flow', 'Flow Diagram'], ['obsidian', '3D Graph'], ['brain', 'Mind / Skills / 2nd Brain']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 6,
                  background: tab === key ? '#1e293b' : 'transparent',
                  color: tab === key ? '#e2e8f0' : '#64748b',
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Filters — only show in flow tab */}
          {tab === 'flow' && (
            <div className="flex gap-1.5 flex-wrap">
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                    border: `1.5px solid ${filter === f.key ? f.color : '#334155'}`,
                    background: filter === f.key ? `${f.color}22` : 'transparent',
                    color: filter === f.key ? f.color : '#64748b',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend — flow tab only */}
      {tab === 'flow' && <div className="flex gap-4 mb-3 shrink-0 flex-wrap">
        {[
          { label: 'Model',   color: '#6366f1', shape: '■' },
          { label: 'Agent',   color: '#818cf8', shape: '◆' },
          { label: 'Skill cluster (click to expand)', color: '#10b981', shape: '▲' },
          { label: '1,460 skills galaxy', color: '#22d3ee', shape: '✦' },
          { label: 'Rule file', color: '#f43f5e', shape: '▬' },
          { label: 'Shell fn', color: '#475569', shape: '▬' },
          { label: 'Vault / Memory (click to expand)', color: '#34d399', shape: '⬡' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span style={{ color: l.color, fontSize: 10 }}>{l.shape}</span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>{l.label}</span>
          </div>
        ))}
      </div>}

      {/* Graph */}
      {tab === 'brain' ? (
        <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid #21262d' }}>
          <BrainLayerGraph />
        </div>
      ) : tab === 'obsidian' ? (
        <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid #21262d' }}>
          <NeuralGraphObsidian />
        </div>
      ) : (
        <div style={{ flex: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: '#060612' }}>
          <ReactFlow
            nodes={visibleNodes}
            edges={visibleEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            attributionPosition="bottom-left"
            style={{ background: '#060612' }}
          >
            <Background color="#1e293b" gap={24} size={1} />
            <Controls style={{ background: '#0f172a', border: '1px solid var(--border)' }} />
            <MiniMap
              style={{ background: '#0f172a', border: '1px solid var(--border)' }}
              nodeColor={(n) => (n.data as NodeData).color ?? '#6366f1'}
            />
          </ReactFlow>
        </div>
      )}

      {/* Side panel when node selected (flow tab only) */}
      {tab === 'flow' && selectedNode && (
        <div
          style={{
            position: 'absolute', right: 24, top: 120, width: 280,
            background: '#0f172a', border: `1.5px solid ${(selectedNode.data as NodeData).color}55`,
            borderRadius: 12, padding: 16, zIndex: 10,
            boxShadow: `0 8px 32px ${(selectedNode.data as NodeData).color}22`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: 11, fontWeight: 700, color: (selectedNode.data as NodeData).color }}>
              {(selectedNode.data as NodeData).label}
            </span>
            <button onClick={() => setSelectedNode(null)} style={{ color: '#475569', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
          <p style={{ fontSize: 10, color: '#94a3b8', marginBottom: 10 }}>{(selectedNode.data as NodeData).sub}</p>
          {(selectedNode.data as NodeData).skills && (
            <>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Skills</div>
              {((selectedNode.data as NodeData).skills as string[]).map((s, i) => (
                <div key={i} style={{ fontSize: 9, color: '#818cf8', fontFamily: 'monospace', padding: '2px 0', borderBottom: '1px solid #1e293b' }}>{s}</div>
              ))}
            </>
          )}
          {(selectedNode.data as NodeData).models && (
            <>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#64748b', marginTop: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Runs on</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {((selectedNode.data as NodeData).models as string[]).map(m => {
                  const model = MODELS.find(x => x.id === m)
                  return (
                    <span key={m} style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: `${model?.color ?? '#6366f1'}22`, color: model?.color ?? '#6366f1', border: `1px solid ${model?.color ?? '#6366f1'}44` }}>{model?.label ?? m}</span>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

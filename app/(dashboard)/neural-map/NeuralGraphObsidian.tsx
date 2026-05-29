'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import * as THREE from 'three'

// ─── Graph data ───────────────────────────────────────────────────────────────

type Kind = 'model' | 'agent' | 'cluster' | 'rule' | 'shell' | 'vault' | 'memory' | 'skill'

interface GNode {
  id: string
  label: string
  kind: Kind
  color: string
  val?: number
  x?: number
  y?: number
  z?: number
}

interface GLink {
  source: string
  target: string
  color?: string
  dashed?: boolean
}

const NODES: GNode[] = [
  // Models
  { id: 'haiku',      label: 'Haiku 4.5',        kind: 'model',   color: '#10b981', val: 6 },
  { id: 'sonnet',     label: 'Sonnet 4.6',        kind: 'model',   color: '#6366f1', val: 10 },
  { id: 'opus',       label: 'Opus 4.7',          kind: 'model',   color: '#f59e0b', val: 7 },
  { id: 'qwen',       label: 'Qwen 3.6-27B',      kind: 'model',   color: '#a78bfa', val: 5 },
  // Agents
  { id: 'tac',        label: 'TAC / Claude Code', kind: 'agent',   color: '#6366f1', val: 18 },
  { id: 'jr',         label: 'Hermes Jr',          kind: 'agent',   color: '#818cf8', val: 10 },
  { id: 'hermes',     label: 'Hermes',             kind: 'agent',   color: '#6366f1', val: 8 },
  { id: 'wba',        label: 'wba daemon',         kind: 'agent',   color: '#34d399', val: 7 },
  { id: 'sm',         label: 'SiteManager',        kind: 'agent',   color: '#f59e0b', val: 5 },
  { id: 'qwen-agent', label: 'Qwen Agent',         kind: 'agent',   color: '#a78bfa', val: 5 },
  // Skill clusters
  { id: 'sk-haiku',   label: 'Haiku Skills',       kind: 'cluster', color: '#10b981', val: 5 },
  { id: 'sk-front',   label: 'Frontend',           kind: 'cluster', color: '#6366f1', val: 7 },
  { id: 'sk-platform',label: 'Platform',           kind: 'cluster', color: '#818cf8', val: 7 },
  { id: 'sk-seo',     label: 'SEO',                kind: 'cluster', color: '#06b6d4', val: 5 },
  { id: 'sk-agents',  label: 'Agent / Arch',       kind: 'cluster', color: '#f59e0b', val: 5 },
  { id: 'sk-opus',    label: 'Opus Skills',        kind: 'cluster', color: '#f59e0b', val: 4 },
  { id: 'sk-local',   label: 'Local (Qwen)',       kind: 'cluster', color: '#a78bfa', val: 4 },
  { id: 'sk-gstack',  label: 'GStack',             kind: 'cluster', color: '#10b981', val: 6 },
  { id: 'sk-ruflo',   label: 'Ruflo Suite',        kind: 'cluster', color: '#d946ef', val: 5 },
  { id: 'sk-galaxy',  label: '1,460 Skills',       kind: 'skill',   color: '#22d3ee', val: 14 },
  // Rules
  { id: 'r-quality',  label: 'quality-gate',       kind: 'rule',    color: '#f43f5e', val: 4 },
  { id: 'r-visual',   label: 'visual-review',      kind: 'rule',    color: '#f43f5e', val: 4 },
  { id: 'r-research', label: 'research-first',     kind: 'rule',    color: '#f43f5e', val: 4 },
  { id: 'r-auto',     label: 'autonomous-ops',     kind: 'rule',    color: '#64748b', val: 3 },
  { id: 'r-skill',    label: 'skill-invocation',   kind: 'rule',    color: '#64748b', val: 3 },
  // Shells
  { id: 'sh-tac',     label: 'tac() fn',           kind: 'shell',   color: '#94a3b8', val: 3 },
  { id: 'sh-jr',      label: 'jr() / jrs()',       kind: 'shell',   color: '#94a3b8', val: 3 },
  { id: 'sh-wba',     label: 'wba CLI',            kind: 'shell',   color: '#94a3b8', val: 3 },
  // Vault / Memory
  { id: 'vault',      label: 'Obsidian Vault',     kind: 'vault',   color: '#34d399', val: 10 },
  { id: 'agentdb',    label: 'AgentDB',            kind: 'memory',  color: '#a78bfa', val: 8 },
  { id: 'remember',   label: '.remember/',         kind: 'memory',  color: '#38bdf8', val: 6 },
  { id: 'hook',       label: 'SessionStart Hook',  kind: 'vault',   color: '#fb923c', val: 7 },
]

const LINKS: GLink[] = [
  // models → agents
  { source: 'haiku',   target: 'tac',    color: '#10b981' },
  { source: 'sonnet',  target: 'tac',    color: '#6366f1' },
  { source: 'opus',    target: 'tac',    color: '#f59e0b' },
  { source: 'sonnet',  target: 'jr',     color: '#818cf8' },
  { source: 'sonnet',  target: 'hermes', color: '#6366f1' },
  { source: 'sonnet',  target: 'wba',    color: '#34d399' },
  { source: 'haiku',   target: 'wba',    color: '#10b981' },
  { source: 'sonnet',  target: 'sm',     color: '#f59e0b' },
  { source: 'qwen',    target: 'qwen-agent', color: '#a78bfa' },
  // agents → clusters
  { source: 'tac',    target: 'sk-haiku',    color: '#10b981' },
  { source: 'tac',    target: 'sk-front',    color: '#6366f1' },
  { source: 'tac',    target: 'sk-platform', color: '#818cf8' },
  { source: 'tac',    target: 'sk-agents',   color: '#6366f1' },
  { source: 'tac',    target: 'sk-gstack',   color: '#10b981' },
  { source: 'tac',    target: 'sk-galaxy',   color: '#22d3ee' },
  { source: 'haiku',  target: 'sk-haiku',    color: '#10b981', dashed: true },
  { source: 'sonnet', target: 'sk-front',    color: '#6366f1', dashed: true },
  { source: 'sonnet', target: 'sk-platform', color: '#818cf8', dashed: true },
  { source: 'sonnet', target: 'sk-seo',      color: '#06b6d4', dashed: true },
  { source: 'sonnet', target: 'sk-ruflo',    color: '#d946ef', dashed: true },
  { source: 'opus',   target: 'sk-opus',     color: '#f59e0b', dashed: true },
  { source: 'qwen',   target: 'sk-local',    color: '#a78bfa', dashed: true },
  // agents → rules
  { source: 'tac', target: 'r-quality',  color: '#f43f5e', dashed: true },
  { source: 'tac', target: 'r-visual',   color: '#f43f5e', dashed: true },
  { source: 'tac', target: 'r-research', color: '#f43f5e', dashed: true },
  { source: 'tac', target: 'r-auto',     color: '#64748b', dashed: true },
  { source: 'tac', target: 'r-skill',    color: '#64748b', dashed: true },
  // agents → shells
  { source: 'tac',    target: 'sh-tac', color: '#6366f1' },
  { source: 'jr',     target: 'sh-jr',  color: '#818cf8' },
  { source: 'wba',    target: 'sh-wba', color: '#34d399' },
  // vault layer
  { source: 'hook',    target: 'vault',    color: '#fb923c' },
  { source: 'hook',    target: 'remember', color: '#fb923c' },
  { source: 'vault',   target: 'agentdb',  color: '#34d399' },
  { source: 'tac',     target: 'vault',    color: '#34d399' },
  { source: 'tac',     target: 'agentdb',  color: '#a78bfa' },
  { source: 'tac',     target: 'remember', color: '#38bdf8', dashed: true },
  { source: 'jr',      target: 'agentdb',  color: '#818cf8', dashed: true },
  { source: 'wba',     target: 'agentdb',  color: '#34d399', dashed: true },
]

const KIND_COLOR: Record<Kind, string> = {
  model:   '#6366f1',
  agent:   '#818cf8',
  cluster: '#22d3ee',
  rule:    '#f43f5e',
  shell:   '#94a3b8',
  vault:   '#34d399',
  memory:  '#38bdf8',
  skill:   '#22d3ee',
}

const NODE_DESC: Record<string, string> = {
  tac:       'Primary Claude Code session. Architect, coder, orchestrator. Routes tasks to Haiku/Sonnet/Opus by complexity.',
  jr:        'Hermes Jr — Max OAuth background agent. Runs claude -p subprocess. No API cost. Synchronous via jr "task".',
  hermes:    'Background gateway agent. Handles cron jobs, iMessage, Telegram, long-running tasks post-session.',
  wba:       'Worker-Bee agent daemon. Background queue processor. Claude -p subprocess, fire-and-forget.',
  sm:        'SiteManager profile. Handles orthobiologicpathways.com and LBS Pro orders autonomously.',
  'qwen-agent': 'Qwen local agent. Zero API cost. Runs via tac-hermes() on llama-server :8090.',
  haiku:     '~1/10 cost. Mechanical ops: git, npm, curl, image resize, file rename, string replace.',
  sonnet:    'Default model. TypeScript, architecture, debugging, content, orchestration decisions.',
  opus:      '10× Sonnet cost. High-stakes strategy, product decisions, complex multi-system architecture.',
  qwen:      'Local 27B model at :8090 via llama-server. 128k context. Zero API cost. Overnight builds.',
  vault:     'Obsidian vault at ~/claude-wiki/content/. 9 project preambles. CRITICAL_FACTS.md always loaded.',
  agentdb:   'HNSW vector store (ruvector.db). Semantic search via mem-search. Bridged at SessionStart.',
  remember:  '.remember/ flat-file memory. now.md → today-*.md → recent.md → archive.md. Git-backed.',
  hook:      'session-start.sh fires on every new Claude Code session. Loads vault in 4 tiers into additionalContext.',
  'sk-galaxy': '1,460 Antigravity skills installed across 90+ plugins. Invoke any with /skill-name.',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NeuralGraphObsidian() {
  const fgRef = useRef<any>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 800, h: 600 })
  const [selected, setSelected] = useState<GNode | null>(null)
  const [search, setSearch] = useState('')
  const [filterKind, setFilterKind] = useState<Kind | null>(null)

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setDims({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight })
      }
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Slow auto-rotate
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return
    let angle = 0
    const id = setInterval(() => {
      if (selected) return // pause rotation when node selected
      angle += 0.002
      const dist = 600
      fg.cameraPosition({
        x: dist * Math.sin(angle),
        z: dist * Math.cos(angle),
      })
    }, 33)
    return () => clearInterval(id)
  }, [selected])

  const graphData = {
    nodes: NODES.map(n => ({ ...n })),
    links: LINKS.map(l => ({ ...l })),
  }

  const isHighlighted = useCallback((node: GNode) => {
    if (filterKind && node.kind !== filterKind) return false
    if (search) {
      const q = search.toLowerCase()
      return node.label.toLowerCase().includes(q) || node.id.toLowerCase().includes(q)
    }
    return true
  }, [filterKind, search])

  // Custom 3D node — glowing sphere
  const nodeThreeObject = useCallback((node: any) => {
    const n = node as GNode
    const highlighted = isHighlighted(n)
    const isSelected = selected?.id === n.id
    const r = Math.sqrt((n.val ?? 5)) * 2.5

    const group = new THREE.Group()

    // Core sphere
    const geo = new THREE.SphereGeometry(r, 16, 16)
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(n.color),
      emissive: new THREE.Color(n.color),
      emissiveIntensity: highlighted ? (isSelected ? 0.9 : 0.5) : 0.1,
      transparent: true,
      opacity: highlighted ? 1 : 0.2,
    })
    group.add(new THREE.Mesh(geo, mat))

    // Outer glow halo (selected only)
    if (isSelected) {
      const haloGeo = new THREE.SphereGeometry(r * 2.2, 16, 16)
      const haloMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(n.color),
        emissive: new THREE.Color(n.color),
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
      })
      group.add(new THREE.Mesh(haloGeo, haloMat))
    }

    return group
  }, [selected, isHighlighted])

  const handleNodeClick = useCallback((node: any) => {
    const n = node as GNode
    setSelected(prev => prev?.id === n.id ? null : n)
    // Fly camera to node
    const dist = 120
    const { x = 0, y = 0, z = 0 } = n
    fgRef.current?.cameraPosition(
      { x: x + dist, y: y + dist * 0.4, z: z + dist },
      { x, y, z },
      800
    )
  }, [])

  const linkColor = useCallback((link: any) => (link as GLink).color ?? '#ffffff22', [])
  const linkWidth = useCallback((link: any) => (link as GLink).dashed ? 0.3 : 1, [])

  const KINDS: Kind[] = ['model', 'agent', 'cluster', 'vault', 'memory', 'rule', 'shell', 'skill']

  return (
    <div style={{ display: 'flex', height: '100%', background: '#0d1117', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
      {/* 3D canvas */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative' }}>
        <ForceGraph3D
          ref={fgRef}
          graphData={graphData as any}
          width={dims.w}
          height={dims.h}
          backgroundColor="#0d1117"
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={false}
          nodeLabel={(n: any) => (n as GNode).label}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={1.5}
          linkDirectionalParticleColor={linkColor}
          onNodeClick={handleNodeClick}
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          enableNodeDrag={false}
        />

        {/* Search bar */}
        <div style={{
          position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          background: '#161b22dd', border: '1px solid #30363d',
          borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8,
          backdropFilter: 'blur(8px)', zIndex: 10,
        }}>
          <span style={{ fontSize: 11, color: '#8b949e' }}>⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes…"
            style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e6edf3', fontSize: 12, width: 160 }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 11 }}>✕</button>
          )}
        </div>

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 14, left: 14,
          background: '#161b22cc', border: '1px solid #21262d',
          borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', gap: 5, zIndex: 10,
        }}>
          {KINDS.map(k => (
            <button
              key={k}
              onClick={() => setFilterKind(prev => prev === k ? null : k)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none',
                cursor: 'pointer', padding: '1px 0',
                opacity: filterKind === null || filterKind === k ? 1 : 0.35,
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: KIND_COLOR[k],
                boxShadow: filterKind === k ? `0 0 6px ${KIND_COLOR[k]}` : 'none',
              }} />
              <span style={{ fontSize: 10, color: '#8b949e', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</span>
            </button>
          ))}
          <div style={{ marginTop: 4, borderTop: '1px solid #21262d', paddingTop: 6, fontSize: 9, color: '#484f58', fontFamily: 'monospace' }}>
            drag to orbit · scroll to zoom
          </div>
        </div>

        {/* Node count */}
        <div style={{
          position: 'absolute', bottom: 14, right: selected ? 280 : 14,
          background: '#161b22cc', borderRadius: 6, padding: '4px 10px',
          fontSize: 10, color: '#484f58', fontFamily: 'monospace',
          border: '1px solid #21262d', zIndex: 10,
        }}>
          {NODES.length} nodes · {LINKS.length} links · 3D
        </div>
      </div>

      {/* Side panel */}
      {selected && (
        <div style={{
          width: 260, background: '#161b22', borderLeft: '1px solid #21262d',
          padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
          overflowY: 'auto', zIndex: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%', background: selected.color,
                boxShadow: `0 0 10px ${selected.color}`,
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3' }}>{selected.label}</span>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#484f58', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>

          <div style={{
            background: '#0d1117', borderRadius: 6, padding: '5px 10px',
            fontSize: 10, fontFamily: 'monospace',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            border: `1px solid ${selected.color}44`,
            color: selected.color, display: 'inline-block',
          }}>
            {selected.kind}
          </div>

          <div style={{ fontSize: 11, color: '#8b949e', lineHeight: 1.6 }}>
            {NODE_DESC[selected.id] ?? `${selected.kind} node in the TAC neural network.`}
          </div>

          <div>
            <div style={{ fontSize: 10, color: '#484f58', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Connections</div>
            {LINKS
              .filter(l => l.source === selected.id || l.target === selected.id)
              .slice(0, 12)
              .map((l, i) => {
                const otherId = l.source === selected.id ? l.target : l.source
                const other = NODES.find(n => n.id === otherId)
                if (!other) return null
                return (
                  <button key={i} onClick={() => handleNodeClick(other)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', background: 'none', border: 'none', padding: '3px 0', cursor: 'pointer' }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: other.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: '#8b949e' }}>{other.label}</span>
                  </button>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

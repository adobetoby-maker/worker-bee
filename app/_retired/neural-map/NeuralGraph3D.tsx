'use client'
import { useRef, useMemo, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Html } from '@react-three/drei'
import * as THREE from 'three'

// ─── Graph data ──────────────────────────────────────────────────────────────

type GNodeKind = 'vault' | 'agent' | 'model' | 'skill' | 'rule' | 'memory' | 'hook'

interface GNode {
  id: string
  label: string
  kind: GNodeKind
  sub?: string
  size?: number
  files?: string[]
}

interface GEdge {
  source: string
  target: string
  strength?: number
}

const GRAPH_NODES: GNode[] = [
  // Vault / memory
  { id: 'vault',    label: 'Obsidian Vault',   kind: 'vault',  sub: 'claude-wiki/content/ · 9 active projects', size: 1.6,
    files: ['CRITICAL_FACTS.md','North Star.md','work/active/jrs-auto-repair.md','work/active/manage-worker-bee.md','work/active/language-lens-elite.md','work/active/orthobiologic-pathways.md','work/active/silver-creek-logistics.md','work/active/wb-pipeline.md','brain/credential-map.md','brain/Key Decisions.md','brain/Patterns.md'] },
  { id: 'agentdb',  label: 'AgentDB',           kind: 'memory', sub: 'HNSW · ruvector.db · semantic search', size: 1.2,
    files: ['ruvector.db','mem-search','mem-store','ruflo-bridge.sh'] },
  { id: 'remember', label: '.remember/',         kind: 'memory', sub: 'now.md · recent.md · archive.md', size: 1.0,
    files: ['now.md','today-*.md','recent.md','archive.md','core-memories.md'] },
  { id: 'git-mem',  label: 'Git Memory',         kind: 'memory', sub: '~/.claude/projects/.../memory · GitHub-backed', size: 0.9,
    files: ['MEMORY.md','project_*.md','failures.md','feedback_*.md'] },
  { id: 'hook',     label: 'SessionStart Hook',  kind: 'hook',   sub: 'session-start.sh · vault-first tiered load', size: 1.1,
    files: ['session-start.sh','Tier 1: CRITICAL_FACTS','Tier 2: North Star','Tier 3: active projects','Tier 4: now.md'] },
  { id: 'wiki',     label: 'claude-wiki',         kind: 'vault',  sub: 'claude-wiki-two.vercel.app · Quartz publish', size: 0.8 },

  // Agents
  { id: 'tac',      label: 'TAC',               kind: 'agent',  sub: 'Claude Code · primary architect', size: 1.8 },
  { id: 'jr',       label: 'Hermes Jr',          kind: 'agent',  sub: 'claude -p · Max OAuth · no API cost', size: 1.2 },
  { id: 'hermes',   label: 'Hermes',             kind: 'agent',  sub: 'gateway · cron · iMessage', size: 1.2 },
  { id: 'wba',      label: 'wba daemon',          kind: 'agent',  sub: 'background queue · cron', size: 1.1 },
  { id: 'sm',       label: 'SiteManager',         kind: 'agent',  sub: 'orthobiologic · LBS Pro', size: 0.9 },
  { id: 'qwen-a',   label: 'Qwen Agent',          kind: 'agent',  sub: 'local · tac-hermes', size: 0.9 },

  // Models
  { id: 'haiku',    label: 'Haiku 4.5',          kind: 'model',  sub: '~1/10 cost · mechanical', size: 0.9 },
  { id: 'sonnet',   label: 'Sonnet 4.6',          kind: 'model',  sub: 'default · architecture', size: 1.2 },
  { id: 'opus',     label: 'Opus 4.7',            kind: 'model',  sub: 'strategic · 10× cost', size: 1.0 },
  { id: 'qwen',     label: 'Qwen 3.6-27B',        kind: 'model',  sub: 'local · :8090 · 128k ctx', size: 1.0 },

  // Skill clusters
  { id: 'sk-frontend', label: 'Frontend',         kind: 'skill',  sub: 'Next.js · React · Tailwind · shadcn', size: 0.85 },
  { id: 'sk-platform', label: 'Platform',          kind: 'skill',  sub: 'Vercel · Supabase · Cloudflare', size: 0.85 },
  { id: 'sk-seo',      label: 'SEO · 1,460',      kind: 'skill',  sub: 'AEO blog · audit · keywords', size: 1.0 },
  { id: 'sk-agents',   label: 'Agent Arch',        kind: 'skill',  sub: 'multi-agent · parallel · SPARC', size: 0.85 },
  { id: 'sk-ruflo',    label: 'Ruflo Suite',       kind: 'skill',  sub: 'RAG · swarm · GOAP · security', size: 0.85 },
  { id: 'sk-haiku',    label: 'Haiku Cluster',     kind: 'skill',  sub: 'git · npm · curl · rename', size: 0.75 },
  { id: 'sk-gstack',   label: 'GStack',            kind: 'skill',  sub: '/review · /qa · /ship · /cso', size: 0.75 },

  // Rules
  { id: 'r-quality',  label: 'quality-gate',      kind: 'rule',   sub: 'tsc · lint · build · visual', size: 0.7 },
  { id: 'r-visual',   label: 'visual-review',     kind: 'rule',   sub: '4-viewport · screenshot · record', size: 0.7 },
  { id: 'r-research', label: 'research-first',    kind: 'rule',   sub: 'scores.md gate · no code first', size: 0.7 },
  { id: 'r-auto',     label: 'autonomous-ops',    kind: 'rule',   sub: '5-method rule · deploy wall', size: 0.7 },
  { id: 'r-skill',    label: 'skill-invocation',  kind: 'rule',   sub: 'skill before reasoning', size: 0.7 },
]

const GRAPH_EDGES: GEdge[] = [
  // Hook loads vault
  { source: 'hook', target: 'vault', strength: 2 },
  { source: 'hook', target: 'remember', strength: 1.5 },
  { source: 'hook', target: 'git-mem', strength: 1 },
  // Vault connections
  { source: 'vault', target: 'agentdb', strength: 1.5 },
  { source: 'vault', target: 'wiki', strength: 1 },
  // TAC reads everything
  { source: 'tac', target: 'vault', strength: 2 },
  { source: 'tac', target: 'agentdb', strength: 2 },
  { source: 'tac', target: 'remember', strength: 1.5 },
  { source: 'tac', target: 'hook', strength: 1.5 },
  // Agent → model
  { source: 'tac', target: 'sonnet', strength: 2 },
  { source: 'tac', target: 'haiku', strength: 1.5 },
  { source: 'tac', target: 'opus', strength: 1 },
  { source: 'jr', target: 'sonnet', strength: 1.5 },
  { source: 'hermes', target: 'sonnet', strength: 1.5 },
  { source: 'wba', target: 'sonnet', strength: 1 },
  { source: 'wba', target: 'haiku', strength: 1 },
  { source: 'sm', target: 'sonnet', strength: 1 },
  { source: 'qwen-a', target: 'qwen', strength: 2 },
  // Agents share agentdb
  { source: 'jr', target: 'agentdb', strength: 1 },
  { source: 'wba', target: 'agentdb', strength: 1 },
  { source: 'hermes', target: 'git-mem', strength: 1 },
  // TAC → skill clusters
  { source: 'tac', target: 'sk-frontend', strength: 1.5 },
  { source: 'tac', target: 'sk-platform', strength: 1.5 },
  { source: 'tac', target: 'sk-seo', strength: 1 },
  { source: 'tac', target: 'sk-agents', strength: 1.5 },
  { source: 'tac', target: 'sk-ruflo', strength: 1 },
  { source: 'tac', target: 'sk-haiku', strength: 1 },
  { source: 'tac', target: 'sk-gstack', strength: 1 },
  // Skills → models
  { source: 'sk-haiku', target: 'haiku', strength: 1 },
  { source: 'sk-frontend', target: 'sonnet', strength: 1 },
  { source: 'sk-platform', target: 'sonnet', strength: 1 },
  { source: 'sk-agents', target: 'opus', strength: 1 },
  // TAC → rules
  { source: 'tac', target: 'r-quality', strength: 1 },
  { source: 'tac', target: 'r-visual', strength: 1 },
  { source: 'tac', target: 'r-research', strength: 1 },
  { source: 'tac', target: 'r-auto', strength: 1 },
  { source: 'tac', target: 'r-skill', strength: 1 },
  // Agent mesh
  { source: 'tac', target: 'jr', strength: 1.5 },
  { source: 'tac', target: 'hermes', strength: 1.5 },
  { source: 'tac', target: 'wba', strength: 1.5 },
  { source: 'tac', target: 'sm', strength: 1 },
  { source: 'tac', target: 'qwen-a', strength: 1 },
]

// ─── Color + size per kind ───────────────────────────────────────────────────

const KIND_COLOR: Record<GNodeKind, string> = {
  vault:  '#34d399',
  memory: '#38bdf8',
  hook:   '#fb923c',
  agent:  '#818cf8',
  model:  '#f59e0b',
  skill:  '#22d3ee',
  rule:   '#f43f5e',
}

// ─── Force simulation (runs in JS, updates Three.js positions) ───────────────

interface SimNode extends GNode {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
}

function initSim(nodes: GNode[], edges: GEdge[]): SimNode[] {
  // Seed positions in clusters by kind
  const kindOffsets: Record<GNodeKind, [number,number,number]> = {
    vault:  [0, 4, 0],
    memory: [3, 3, 0],
    hook:   [-3, 3, 0],
    agent:  [0, 0, 0],
    model:  [0, -4, 0],
    skill:  [0, -2, 4],
    rule:   [0, -2, -4],
  }
  return nodes.map(n => {
    const [ox, oy, oz] = kindOffsets[n.kind]
    return {
      ...n,
      x: ox + (Math.random() - 0.5) * 4,
      y: oy + (Math.random() - 0.5) * 4,
      z: oz + (Math.random() - 0.5) * 4,
      vx: 0, vy: 0, vz: 0,
    }
  })
}

function tickSim(nodes: SimNode[], edges: GEdge[], alpha: number) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const REPULSE = 8
  const SPRING_LEN = 3.5
  const DAMP = 0.88
  const CENTER_PULL = 0.005

  // Repulsion between all pairs
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j]
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 0.01
      const force = (REPULSE / (dist * dist)) * alpha
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      const fz = (dz / dist) * force
      a.vx -= fx; a.vy -= fy; a.vz -= fz
      b.vx += fx; b.vy += fy; b.vz += fz
    }
  }

  // Spring attraction along edges
  for (const edge of edges) {
    const a = nodeMap.get(edge.source), b = nodeMap.get(edge.target)
    if (!a || !b) continue
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 0.01
    const stretch = (dist - SPRING_LEN) * 0.04 * (edge.strength ?? 1) * alpha
    const fx = (dx / dist) * stretch
    const fy = (dy / dist) * stretch
    const fz = (dz / dist) * stretch
    a.vx += fx; a.vy += fy; a.vz += fz
    b.vx -= fx; b.vy -= fy; b.vz -= fz
  }

  // Integrate + damp + center pull
  for (const n of nodes) {
    n.vx = (n.vx - n.x * CENTER_PULL) * DAMP
    n.vy = (n.vy - n.y * CENTER_PULL) * DAMP
    n.vz = (n.vz - n.z * CENTER_PULL) * DAMP
    n.x += n.vx; n.y += n.vy; n.z += n.vz
  }
}

// ─── Edge lines component ────────────────────────────────────────────────────

function EdgeLines({ nodes, edges }: { nodes: SimNode[]; edges: GEdge[] }) {
  const ref = useRef<THREE.LineSegments>(null)
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])

  useFrame(() => {
    if (!ref.current) return
    const geo = ref.current.geometry
    const positions = geo.attributes.position as THREE.BufferAttribute
    let idx = 0
    for (const e of edges) {
      const a = nodeMap.get(e.source), b = nodeMap.get(e.target)
      if (!a || !b) { idx += 6; continue }
      positions.setXYZ(idx / 3, a.x, a.y, a.z)
      positions.setXYZ(idx / 3 + 1, b.x, b.y, b.z)
      idx += 6
    }
    positions.needsUpdate = true
  })

  const posArray = useMemo(() => new Float32Array(edges.length * 6), [edges.length])

  return (
    <lineSegments ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[posArray, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#334155" transparent opacity={0.35} />
    </lineSegments>
  )
}

// ─── Single node sphere ──────────────────────────────────────────────────────

function GraphNode({
  node, selected, onClick,
}: {
  node: SimNode
  selected: boolean
  onClick: (n: SimNode) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const color = KIND_COLOR[node.kind]
  const size = node.size ?? 0.8

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.position.set(node.x, node.y, node.z)
    // Gentle pulse on selected
    if (selected) {
      const s = 1 + Math.sin(Date.now() * 0.004) * 0.08
      meshRef.current.scale.setScalar(s)
    } else {
      meshRef.current.scale.setScalar(1)
    }
  })

  return (
    <mesh
      ref={meshRef}
      onClick={e => { e.stopPropagation(); onClick(node) }}
    >
      <sphereGeometry args={[size * 0.32, 20, 20]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={selected ? 1.2 : 0.55}
        roughness={0.2}
        metalness={0.4}
      />
    </mesh>
  )
}

// ─── Labels (Html overlay) ───────────────────────────────────────────────────

function NodeLabel({ node, selected }: { node: SimNode; selected: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const color = KIND_COLOR[node.kind]
  const size = node.size ?? 0.8

  useFrame(() => {
    if (ref.current) ref.current.position.set(node.x, node.y + size * 0.35 + 0.18, node.z)
  })

  return (
    <group ref={ref}>
      <Html center distanceFactor={18} zIndexRange={[0, 10]}>
        <div style={{
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          fontSize: selected ? 11 : 9,
          fontWeight: selected ? 700 : 500,
          color: selected ? color : '#94a3b8',
          fontFamily: 'monospace',
          textShadow: `0 0 8px ${color}88`,
          transition: 'all 0.2s',
        }}>
          {node.label}
        </div>
      </Html>
    </group>
  )
}

// ─── Scene (runs simulation + renders everything) ────────────────────────────

function Scene({ selectedId, onSelect }: { selectedId: string | null; onSelect: (n: SimNode | null) => void }) {
  const simNodes = useMemo(() => initSim(GRAPH_NODES, GRAPH_EDGES), [])
  const alphaRef = useRef(1)
  const tickRef = useRef(0)

  useFrame(() => {
    if (alphaRef.current > 0.005) {
      tickSim(simNodes, GRAPH_EDGES, alphaRef.current)
      alphaRef.current *= 0.995
    }
    tickRef.current++
  })

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[10, 10, 10]} intensity={0.6} color="#818cf8" />
      <pointLight position={[-10, -5, -10]} intensity={0.4} color="#34d399" />

      <EdgeLines nodes={simNodes} edges={GRAPH_EDGES} />

      {simNodes.map(n => (
        <GraphNode
          key={n.id}
          node={n}
          selected={selectedId === n.id}
          onClick={onSelect}
        />
      ))}

      {simNodes.map(n => (
        <NodeLabel key={`lbl-${n.id}`} node={n} selected={selectedId === n.id} />
      ))}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        autoRotate
        autoRotateSpeed={0.4}
        minDistance={5}
        maxDistance={40}
      />
    </>
  )
}

// ─── Legend strip ─────────────────────────────────────────────────────────────

const LEGEND = [
  { kind: 'vault'  as GNodeKind, label: 'Vault / Wiki' },
  { kind: 'memory' as GNodeKind, label: 'Memory store' },
  { kind: 'hook'   as GNodeKind, label: 'Hook / Bootstrap' },
  { kind: 'agent'  as GNodeKind, label: 'Agent' },
  { kind: 'model'  as GNodeKind, label: 'LLM Model' },
  { kind: 'skill'  as GNodeKind, label: 'Skill cluster' },
  { kind: 'rule'   as GNodeKind, label: 'Rule file' },
]

// ─── Main export ─────────────────────────────────────────────────────────────

export default function NeuralGraph3D() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null)

  const handleSelect = useCallback((n: SimNode | null) => {
    setSelectedId(n?.id ?? null)
    setSelectedNode(n)
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#020409', borderRadius: 12, overflow: 'hidden', border: '1px solid #1e293b' }}>
      <Canvas camera={{ position: [0, 0, 22], fov: 55 }} dpr={[1, 2]}>
        <Scene selectedId={selectedId} onSelect={handleSelect} />
      </Canvas>

      {/* Legend */}
      <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', flexWrap: 'wrap', gap: '8px 14px' }}>
        {LEGEND.map(l => (
          <div key={l.kind} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: KIND_COLOR[l.kind], boxShadow: `0 0 6px ${KIND_COLOR[l.kind]}` }} />
            <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Controls hint */}
      <div style={{ position: 'absolute', top: 12, right: 12, fontSize: 9, color: '#334155', fontFamily: 'monospace', textAlign: 'right', lineHeight: 1.8 }}>
        drag · scroll · click node
      </div>

      {/* Selected node panel */}
      {selectedNode && (
        <div style={{
          position: 'absolute', top: 12, left: 12, width: 220,
          background: '#0f172aee', backdropFilter: 'blur(8px)',
          border: `1.5px solid ${KIND_COLOR[selectedNode.kind]}55`,
          borderRadius: 10, padding: 14,
          boxShadow: `0 8px 32px ${KIND_COLOR[selectedNode.kind]}22`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: KIND_COLOR[selectedNode.kind] }}>{selectedNode.label}</span>
            <button onClick={() => handleSelect(null)} style={{ color: '#475569', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
          <p style={{ fontSize: 9, color: '#64748b', marginBottom: 10, lineHeight: 1.5 }}>{selectedNode.sub}</p>
          {selectedNode.files && (
            <div>
              {selectedNode.files.map((f, i) => (
                <div key={i} style={{ fontSize: 8.5, color: '#94a3b8', fontFamily: 'monospace', padding: '2px 0', borderBottom: '1px solid #1e293b' }}>{f}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'
import { useCallback, useState, useMemo, useEffect } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  type Node, type Edge, type Connection,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Copy, Check, Download, Zap, ChevronDown, ChevronUp,
  Play, RefreshCw, Loader2, AlertCircle,
} from 'lucide-react'
import {
  PIPELINE_AGENTS,
  type AgentContext,
  type AgentStatus,
  type AgentNodeState,
} from '@/lib/pipelineAgents'
import { AgentNode, type AgentNodeData } from './AgentNode'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Site {
  id: string; name: string; url: string | null; stack: string | null
  github_repo: string | null; notes: string | null
}

interface Props {
  site: Site
  initialCtx?: Partial<AgentContext>
}

const nodeTypes = { agent: AgentNode }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function buildContext(site: Site, overrides: Partial<AgentContext> = {}): AgentContext {
  const slug = toSlug(site.name)
  const repo = site.github_repo ?? `adobetoby-maker/${slug}`
  return {
    siteName: site.name,
    siteId: site.id,
    siteType: 'general',
    stack: site.stack ?? 'nextjs',
    slug,
    localPath: `/Users/drive/${repo.split('/')[1] ?? slug}`,
    githubRepo: repo,
    domain: site.url?.replace(/^https?:\/\//, '') || `${slug}.worker-bee.app`,
    subjectName: site.name,
    referenceUrls: [],
    buildMode: 'new',
    enhancements: { framerMotion: true, lenis: true, sentry: true },
    blueprintSummary: '(wire blueprint cards to populate)',
    researchBriefPath: `/tmp/research-brief-${slug}.json`,
    ...overrides,
  }
}

function makeAgentNodes(
  ctx: AgentContext,
  stateMap: Record<string, AgentNodeState>,
  onDispatch: (id: string) => void,
): Node[] {
  return PIPELINE_AGENTS.map((agent, i) => {
    const state = stateMap[agent.id]
    const data: AgentNodeData = {
      agentId: agent.id,
      name: agent.name,
      role: agent.role,
      model: agent.model,
      color: agent.color,
      estimatedMinutes: agent.estimatedMinutes,
      status: (state?.status ?? 'idle') as AgentStatus,
      startedAt: state?.startedAt,
      completedAt: state?.completedAt,
      errors: state?.errors ?? [],
      onDispatch,
    }
    return {
      id: agent.id,
      type: 'agent',
      position: { x: i * 260, y: i % 2 === 0 ? 60 : 180 },
      data: data as unknown as Record<string, unknown>,
    }
  })
}

function makeAgentEdges(): Edge[] {
  return PIPELINE_AGENTS.slice(0, -1).map((agent, i) => ({
    id: `e-${agent.id}-${PIPELINE_AGENTS[i + 1].id}`,
    source: agent.id,
    target: PIPELINE_AGENTS[i + 1].id,
    type: 'smoothstep',
    style: { stroke: agent.color + '60', strokeWidth: 2 },
    markerEnd: { type: 'arrowclosed' as const, color: agent.color + '60' },
    animated: false,
  }))
}

// ─── Prompt Modal ─────────────────────────────────────────────────────────────

function PromptModal({
  agentId,
  ctx,
  onClose,
}: {
  agentId: string
  ctx: AgentContext
  onClose: () => void
}) {
  const agent = PIPELINE_AGENTS.find(a => a.id === agentId)
  const [copied, setCopied] = useState(false)
  const prompt = useMemo(() => agent?.prompt(ctx) ?? '', [agent, ctx])

  async function copy() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function download() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([prompt], { type: 'text/markdown' }))
    a.download = `wb-${agentId}.md`
    a.click()
  }

  if (!agent) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 680, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
          background: '#0f172a', borderRadius: 16,
          border: `1.5px solid ${agent.color}44`,
          boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px ${agent.color}22`,
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>{agent.name} Agent Prompt</div>
            <div style={{ fontSize: 11, color: agent.color, marginTop: 2 }}>{agent.role}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={copy}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
                padding: '6px 12px', borderRadius: 8, fontWeight: 600,
                background: `${agent.color}22`, color: agent.color,
                border: `1px solid ${agent.color}44`, cursor: 'pointer',
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={download}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
                padding: '6px 12px', borderRadius: 8, fontWeight: 600,
                background: 'rgba(255,255,255,0.04)', color: '#94a3b8',
                border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
              }}
            >
              <Download size={12} /> .md
            </button>
            <button
              onClick={onClose}
              style={{
                fontSize: 12, padding: '6px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.04)', color: '#64748b',
                border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Prompt body */}
        <pre style={{
          flex: 1, overflow: 'auto', padding: '16px 20px',
          fontSize: 11.5, fontFamily: 'monospace', lineHeight: 1.6,
          color: '#cbd5e1', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          margin: 0,
        }}>
          {prompt}
        </pre>

        {/* jr dispatch row */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>Dispatch via:</span>
          <code style={{
            flex: 1, fontSize: 10.5, color: '#818cf8', fontFamily: 'monospace',
            background: 'rgba(99,102,241,0.08)', padding: '4px 10px', borderRadius: 6,
            border: '1px solid rgba(99,102,241,0.15)', overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {`jr "$(cat wb-${agentId}.md)"`}
          </code>
        </div>
      </div>
    </div>
  )
}

// ─── Context Editor (collapsed sidebar) ───────────────────────────────────────

function ContextEditor({
  ctx,
  onChange,
}: {
  ctx: AgentContext
  onChange: (c: Partial<AgentContext>) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      position: 'absolute', top: 12, right: 12, zIndex: 10,
      background: '#0f172a', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.08)',
      width: open ? 320 : 'auto',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', fontSize: 12, fontWeight: 600,
          color: '#94a3b8', cursor: 'pointer', width: '100%',
          background: 'transparent', border: 'none',
        }}
      >
        <Zap size={12} style={{ color: '#6366f1' }} />
        Pipeline Context
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([
            { key: 'siteType', label: 'Site Type', type: 'select',
              options: ['medical','legal','local-service','restaurant','saas','ecommerce','agency','real-estate','general'] },
            { key: 'subjectName', label: 'Subject Name', type: 'text', placeholder: ctx.siteName },
            { key: 'localPath', label: 'Local Path', type: 'text', placeholder: ctx.localPath },
            { key: 'domain', label: 'Domain', type: 'text', placeholder: ctx.domain },
            { key: 'referenceUrls', label: 'Reference URLs (comma-separated)', type: 'text', placeholder: 'https://...' },
            { key: 'buildMode', label: 'Build Mode', type: 'select', options: ['new', 'iteration'] },
          ] as const).map(field => (
            <div key={field.key}>
              <label style={{ display: 'block', fontSize: 10, color: '#475569', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {field.label}
              </label>
              {field.type === 'select' ? (
                <select
                  value={field.key === 'buildMode' ? ctx.buildMode : ctx.siteType}
                  onChange={e => onChange({ [field.key]: e.target.value })}
                  style={{
                    width: '100%', padding: '5px 8px', fontSize: 11, borderRadius: 6,
                    background: '#1e293b', color: '#f1f5f9',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={
                    field.key === 'referenceUrls'
                      ? ctx.referenceUrls.join(', ')
                      : String(ctx[field.key as keyof AgentContext] ?? '')
                  }
                  placeholder={field.placeholder}
                  onChange={e => {
                    const val = field.key === 'referenceUrls'
                      ? e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      : e.target.value
                    onChange({ [field.key]: val })
                  }}
                  style={{
                    width: '100%', padding: '5px 8px', fontSize: 11, borderRadius: 6,
                    background: '#1e293b', color: '#f1f5f9',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AgentPipelineGraph({ site, initialCtx }: Props) {
  const [ctx, setCtx] = useState<AgentContext>(() => buildContext(site, initialCtx))
  const [stateMap, setStateMap] = useState<Record<string, AgentNodeState>>({})
  const [modalAgentId, setModalAgentId] = useState<string | null>(null)
  const [dispatching, setDispatching] = useState<string | null>(null)

  // Poll build log for status updates
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/build-log?siteId=${site.id}`)
        if (!res.ok) return
        const data = await res.json() as {
          phases?: Array<{ id: string; status: string; startedAt?: string; completedAt?: string; errors: string[] }>
        }
        if (!data.phases) return
        const map: Record<string, AgentNodeState> = {}
        for (const p of data.phases) {
          map[p.id] = {
            agentId: p.id,
            status: p.status as AgentStatus,
            startedAt: p.startedAt,
            completedAt: p.completedAt,
            errors: p.errors ?? [],
            log: '',
            outputArtifacts: [],
          }
        }
        setStateMap(map)
      } catch {
        // silently ignore
      }
    }
    poll()
    const interval = setInterval(poll, 8000)
    return () => clearInterval(interval)
  }, [site.id])

  const handleDispatch = useCallback(async (agentId: string) => {
    setModalAgentId(agentId)
  }, [])

  const nodes = useMemo(() =>
    makeAgentNodes(ctx, stateMap, handleDispatch),
    [ctx, stateMap, handleDispatch]
  )

  const edges = useMemo(() => makeAgentEdges(), [])

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(nodes)
  const [rfEdges, , onEdgesChange] = useEdgesState(edges)

  // Sync when ctx or stateMap changes
  useEffect(() => {
    setRfNodes(makeAgentNodes(ctx, stateMap, handleDispatch))
  }, [ctx, stateMap, handleDispatch, setRfNodes])

  const totalMinutes = PIPELINE_AGENTS.reduce((sum, a) => sum + a.estimatedMinutes, 0)
  const doneCount = PIPELINE_AGENTS.filter(a => stateMap[a.id]?.status === 'done').length
  const hasRunning = PIPELINE_AGENTS.some(a => stateMap[a.id]?.status === 'running')

  return (
    <div style={{ position: 'relative', height: 500, borderRadius: 16, overflow: 'hidden',
      background: '#060d1a', border: '1px solid rgba(255,255,255,0.06)' }}>

      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        background: 'linear-gradient(to bottom, rgba(6,13,26,0.98), transparent)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Agent Pipeline
        </div>
        <div style={{ flex: 1 }}>
          {/* Progress bar */}
          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
            <div style={{
              height: '100%', borderRadius: 2, transition: 'width 0.5s ease',
              background: 'linear-gradient(90deg, #6366f1, #10b981)',
              width: `${(doneCount / PIPELINE_AGENTS.length) * 100}%`,
            }} />
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>
          {doneCount}/{PIPELINE_AGENTS.length} • ~{totalMinutes}m total
        </div>
        {hasRunning && (
          <Loader2 size={12} style={{ color: '#f59e0b', animation: 'spin 1s linear infinite' }} />
        )}
      </div>

      {/* Context editor */}
      <ContextEditor ctx={ctx} onChange={patch => setCtx(c => ({ ...c, ...patch }))} />

      {/* XyFlow canvas */}
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        panOnDrag
        zoomOnScroll
        minZoom={0.4}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#1e293b" gap={24} size={1} />
        <Controls
          showZoom
          showFitView
          showInteractive={false}
          style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)' }}
        />
        <MiniMap
          nodeColor={n => {
            const d = n.data as unknown as { color: string }
            return d.color ?? '#6b7280'
          }}
          maskColor="rgba(6,13,26,0.8)"
          style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}
        />
      </ReactFlow>

      {/* Prompt modal */}
      {modalAgentId && (
        <PromptModal
          agentId={modalAgentId}
          ctx={ctx}
          onClose={() => setModalAgentId(null)}
        />
      )}
    </div>
  )
}

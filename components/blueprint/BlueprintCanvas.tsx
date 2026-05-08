'use client'
import { useCallback, useState, useRef, useEffect } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  type Node, type Edge, type Connection,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Plus, FileText, Layout, Box, Cpu, Database, Save, GitBranch, Merge, RotateCcw, ChevronDown, X, Check, Hammer } from 'lucide-react'
import Link from 'next/link'
import { IndexCardNode } from './IndexCardNode'
import { StringEdge } from './StringEdge'
import { CardEditor } from './CardEditor'
import type { CardData, CardType } from './types'

const nodeTypes = { card: IndexCardNode }
const edgeTypes = { string: StringEdge }

const TYPE_ICONS: Record<CardType, React.ReactNode> = {
  page: <FileText size={11} />,
  section: <Layout size={11} />,
  component: <Box size={11} />,
  api: <Cpu size={11} />,
  data: <Database size={11} />,
}

const TYPE_COLOR: Record<CardType, string> = {
  page: '#3b82f6', section: '#8b5cf6', component: '#f59e0b', api: '#10b981', data: '#ef4444',
}

function makeCard(type: CardType, position: { x: number; y: number }): Node {
  return {
    id: `card-${Date.now()}`,
    type: 'card',
    position,
    data: {
      title: '',
      type,
      description: '',
      claudePrompt: '',
      status: 'planned',
      rotation: (Math.random() - 0.5) * 5,
    } satisfies CardData,
  }
}

interface BranchRecord {
  nodes: object[]
  edges: object[]
  updatedAt: string
}

interface Props {
  siteId: string
  siteName: string
  initialNodes?: Node[]
  initialEdges?: Edge[]
  initialBranch?: string
  allBranches?: string[]
  allBranchData?: Record<string, BranchRecord>
}

type Modal = null | 'start-over' | 'new-branch' | 'merge'

export function BlueprintCanvas({
  siteId, siteName,
  initialNodes = [], initialEdges = [],
  initialBranch = 'main',
  allBranches: initBranches = ['main'],
  allBranchData: initBranchData = {},
}: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [branchMenuOpen, setBranchMenuOpen] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [currentBranch, setCurrentBranch] = useState(initialBranch)
  const [branches, setBranches] = useState<string[]>(initBranches)
  const [branchData, setBranchData] = useState<Record<string, BranchRecord>>(initBranchData)
  const [modal, setModal] = useState<Modal>(null)
  const [newBranchName, setNewBranchName] = useState('')
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Persistence ──────────────────────────────────────────────────
  const persistFull = useCallback(async (updatedBranchData: Record<string, BranchRecord>, activeBranch: string) => {
    setSaveState('saving')
    try {
      await fetch(`/api/sites/${siteId}/blueprint`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentBranch: activeBranch, branches: updatedBranchData }),
      })
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('idle')
    }
  }, [siteId])

  const triggerSave = useCallback((ns: Node[], es: Edge[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveState('saving')
    saveTimer.current = setTimeout(() => {
      const updated = {
        ...branchData,
        [currentBranch]: { nodes: ns as object[], edges: es as object[], updatedAt: new Date().toISOString() },
      }
      setBranchData(updated)
      persistFull(updated, currentBranch)
    }, 1200)
  }, [siteId, currentBranch, branchData, persistFull])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  // ── Canvas ops ───────────────────────────────────────────────────
  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => {
      const next = addEdge({ ...params, type: 'string' }, eds)
      triggerSave(nodes, next)
      return next
    })
  }, [setEdges, nodes, triggerSave])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => setSelectedNode(node), [])
  const onPaneClick = useCallback(() => { setSelectedNode(null); setAddMenuOpen(false); setBranchMenuOpen(false) }, [])

  const onNodesChangeWrapped = useCallback((changes: Parameters<typeof onNodesChange>[0]) => {
    onNodesChange(changes)
    const hasDragEnd = changes.some(c => c.type === 'position' && !('dragging' in c && c.dragging))
    if (hasDragEnd) triggerSave(nodes, edges)
  }, [onNodesChange, nodes, edges, triggerSave])

  function addCard(type: CardType) {
    const center = { x: 300 + Math.random() * 200, y: 200 + Math.random() * 150 }
    const card = makeCard(type, center)
    setNodes(ns => { const next = [...ns, card]; triggerSave(next, edges); return next })
    setAddMenuOpen(false)
  }

  function updateCard(id: string, data: Partial<CardData>) {
    setNodes(ns => {
      const next = ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...data } } : n)
      triggerSave(next, edges)
      return next
    })
    setSelectedNode(prev => prev?.id === id ? { ...prev, data: { ...prev.data, ...data } } : prev)
  }

  function deleteCard(id: string) {
    setNodes(ns => {
      const next = ns.filter(n => n.id !== id)
      setEdges(es => {
        const nextEdges = es.filter(e => e.source !== id && e.target !== id)
        triggerSave(next, nextEdges)
        return nextEdges
      })
      return next
    })
  }

  // ── Start Over ───────────────────────────────────────────────────
  function confirmStartOver() {
    setNodes([])
    setEdges([])
    const updated = { ...branchData, [currentBranch]: { nodes: [], edges: [], updatedAt: new Date().toISOString() } }
    setBranchData(updated)
    persistFull(updated, currentBranch)
    setModal(null)
  }

  // ── Branch ops ───────────────────────────────────────────────────
  function switchBranch(name: string) {
    const bd = branchData[name]
    if (!bd) return
    setNodes((bd.nodes ?? []) as Node[])
    setEdges((bd.edges ?? []) as Edge[])
    setCurrentBranch(name)
    setBranchMenuOpen(false)
    setSelectedNode(null)
    // Update currentBranch in storage
    persistFull(branchData, name)
  }

  function createBranch() {
    const name = newBranchName.trim()
    if (!name || branches.includes(name)) return
    const snapshot: BranchRecord = {
      nodes: nodes as object[],
      edges: edges as object[],
      updatedAt: new Date().toISOString(),
    }
    const updated = { ...branchData, [name]: snapshot }
    setBranchData(updated)
    setBranches(b => [...b, name])
    setCurrentBranch(name)
    persistFull(updated, name)
    setNewBranchName('')
    setModal(null)
  }

  function mergeToMain() {
    if (currentBranch === 'main') return
    const snapshot: BranchRecord = {
      nodes: nodes as object[],
      edges: edges as object[],
      updatedAt: new Date().toISOString(),
    }
    const updated = { ...branchData, main: snapshot }
    setBranchData(updated)
    setCurrentBranch('main')
    persistFull(updated, 'main')
    setModal(null)
  }

  // ── Stats ────────────────────────────────────────────────────────
  const stats = {
    done: nodes.filter(n => (n.data as unknown as CardData).status === 'done').length,
    inProgress: nodes.filter(n => (n.data as unknown as CardData).status === 'in-progress').length,
    planned: nodes.filter(n => (n.data as unknown as CardData).status === 'planned').length,
    total: nodes.length,
  }
  const pct = nodes.length ? Math.round((stats.done / nodes.length) * 100) : 0
  const isMain = currentBranch === 'main'

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#080d14', display: 'flex', flexDirection: 'column' }}>

      {/* ── Top bar ────────────────────────────────────────────── */}
      <div style={{
        height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', background: 'rgba(8,13,20,0.95)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, zIndex: 50, gap: 8,
      }}>
        {/* Left: breadcrumb + progress + save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <div style={{ flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{siteName} /</span>
            <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 700, marginLeft: 6 }}>Blueprint</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 14, borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: 72, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #10b981, #059669)', borderRadius: 4, transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{pct}%</span>
            <div style={{ display: 'flex', gap: 6, fontSize: 11, color: '#64748b' }}>
              <span style={{ color: '#10b981' }}>✓{stats.done}</span>
              <span style={{ color: '#d97706' }}>◎{stats.inProgress}</span>
              <span>·{stats.planned}</span>
            </div>
          </div>
          {saveState !== 'idle' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: saveState === 'saved' ? '#10b981' : '#475569', flexShrink: 0 }}>
              <Save size={10} />
              {saveState === 'saving' ? 'Saving…' : 'Saved'}
            </div>
          )}
        </div>

        {/* Right: branch controls + add card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

          {/* Branch selector */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setBranchMenuOpen(v => !v); setAddMenuOpen(false) }} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7,
              background: isMain ? '#0f172a' : 'rgba(129,140,248,0.12)',
              border: `1px solid ${isMain ? 'rgba(255,255,255,0.1)' : 'rgba(129,140,248,0.3)'}`,
              color: isMain ? '#94a3b8' : '#818cf8', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>
              <GitBranch size={12} />
              {currentBranch}
              <ChevronDown size={10} />
            </button>
            {branchMenuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 180,
                background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                boxShadow: '0 16px 40px rgba(0,0,0,0.7)', overflow: 'hidden', zIndex: 300,
              }}>
                <div style={{ padding: '8px 12px 6px', fontSize: 9, fontWeight: 700, color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Branches</div>
                {branches.map(b => (
                  <button key={b} onClick={() => switchBranch(b)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', background: 'none', border: 'none',
                    color: b === currentBranch ? '#e2e8f0' : '#64748b', fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    {b === currentBranch && <Check size={11} style={{ color: '#818cf8' }} />}
                    {b !== currentBranch && <div style={{ width: 11 }} />}
                    <GitBranch size={11} />
                    {b}
                    {b === 'main' && <span style={{ marginLeft: 'auto', fontSize: 9, color: '#334155', fontWeight: 700, textTransform: 'uppercase' }}>main</span>}
                  </button>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '4px 0' }} />
                <button onClick={() => { setModal('new-branch'); setBranchMenuOpen(false) }} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', background: 'none', border: 'none',
                  color: '#64748b', fontSize: 11, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <Plus size={11} /> New branch from here
                </button>
                {!isMain && (
                  <button onClick={() => { setModal('merge'); setBranchMenuOpen(false) }} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', background: 'none', border: 'none',
                    color: '#818cf8', fontSize: 11, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(129,140,248,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <Merge size={11} /> Merge "{currentBranch}" → main
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Build it */}
          <Link href={`/sites/${siteId}/build`} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            textDecoration: 'none', letterSpacing: '0.03em',
          }}>
            <Hammer size={12} /> Build It
          </Link>

          {/* Start over */}
          <button onClick={() => setModal('start-over')} title="Start over" style={{
            padding: '6px 8px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)',
            background: 'none', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#475569'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
          >
            <RotateCcw size={13} />
          </button>

          {/* Add card */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setAddMenuOpen(v => !v); setBranchMenuOpen(false) }} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7,
              background: addMenuOpen ? '#1e293b' : '#0f172a', border: '1px solid rgba(255,255,255,0.12)',
              color: '#e2e8f0', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              <Plus size={13} /> Add Card
            </button>
            {addMenuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 155,
                background: '#0f1419', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,0,0,0.6)', zIndex: 200,
              }}>
                {(['page', 'section', 'component', 'api', 'data'] as CardType[]).map(t => (
                  <button key={t} onClick={() => addCard(t)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px', background: 'none', border: 'none',
                    color: '#cbd5e1', fontSize: 12, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{ color: TYPE_COLOR[t] }}>{TYPE_ICONS[t]}</span>
                    <span style={{ textTransform: 'capitalize' }}>{t}</span>
                    <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: TYPE_COLOR[t], opacity: 0.8 }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Canvas ─────────────────────────────────────────────── */}
      <div ref={reactFlowWrapper} style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChangeWrapped}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          style={{ background: 'transparent' }}
          defaultEdgeOptions={{ type: 'string' }}
        >
          <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(255,255,255,0.04)" />
          <Controls style={{ background: 'rgba(15,20,30,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }} />
          <MiniMap
            style={{ background: 'rgba(8,13,20,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
            nodeColor={n => TYPE_COLOR[(n.data as unknown as CardData).type] ?? '#475569'}
            maskColor="rgba(0,0,0,0.6)"
          />
        </ReactFlow>

        {nodes.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>No cards on {currentBranch}</div>
            <div style={{ fontSize: 11, color: '#1e293b', marginTop: 4 }}>Use Add Card to start planning</div>
          </div>
        )}

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 16, left: 16,
          background: 'rgba(8,13,20,0.85)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8,
          padding: '9px 13px', display: 'flex', gap: 12, fontSize: 10,
          fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          {(['page', 'section', 'component', 'api', 'data'] as CardType[]).map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b' }}>
              <div style={{ width: 7, height: 7, borderRadius: 1, background: TYPE_COLOR[t] }} />
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* ── Card editor ────────────────────────────────────────── */}
      <CardEditor node={selectedNode} onClose={() => setSelectedNode(null)} onUpdate={updateCard} onDelete={deleteCard} />

      {/* ── Modals ─────────────────────────────────────────────── */}
      {modal && (
        <div onClick={() => setModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#0f1419', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
            padding: 28, width: 360, boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
          }}>

            {/* Start Over */}
            {modal === 'start-over' && <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <RotateCcw size={18} style={{ color: '#ef4444' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Start Over</div>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
                This will clear all cards and connections on <strong style={{ color: '#94a3b8' }}>{currentBranch}</strong>. This cannot be undone.
                {isMain ? '' : ' Consider branching first to preserve your work.'}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={confirmStartOver} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Clear Everything</button>
              </div>
            </>}

            {/* New Branch */}
            {modal === 'new-branch' && <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <GitBranch size={18} style={{ color: '#818cf8' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>New Branch</div>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                Creates a copy of <strong style={{ color: '#94a3b8' }}>{currentBranch}</strong> you can edit independently.
              </div>
              <input
                autoFocus
                value={newBranchName}
                onChange={e => setNewBranchName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createBranch()}
                placeholder="e.g. v2-redesign, mobile-first, client-review"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 7, color: '#e2e8f0', fontSize: 13, padding: '9px 12px',
                  outline: 'none', boxSizing: 'border-box', marginBottom: 16, fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={createBranch} disabled={!newBranchName.trim()} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: !newBranchName.trim() ? '#1e293b' : 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: !newBranchName.trim() ? '#475569' : '#fff', fontSize: 12, fontWeight: 700, cursor: !newBranchName.trim() ? 'default' : 'pointer' }}>Create Branch</button>
              </div>
            </>}

            {/* Merge */}
            {modal === 'merge' && <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Merge size={18} style={{ color: '#818cf8' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Merge to Main</div>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
                Copies all cards from <strong style={{ color: '#818cf8' }}>{currentBranch}</strong> into <strong style={{ color: '#e2e8f0' }}>main</strong>, overwriting it. The branch is kept so you can compare later.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={mergeToMain} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Merge → Main</button>
              </div>
            </>}

          </div>
        </div>
      )}
    </div>
  )
}

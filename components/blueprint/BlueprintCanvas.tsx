'use client'
import { useCallback, useState, useRef, useEffect, useMemo } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  type Node, type Edge, type Connection,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Plus, FileText, Layout, Box, Cpu, Database, Save, GitBranch, Merge,
  RotateCcw, ChevronDown, X, Check, Hammer, Wand2, Loader2, Sparkles,
  PanelLeftClose, PanelLeftOpen, Video, RefreshCw, Network,
} from 'lucide-react'
import { analyzeGraph, getClusterColor, CLUSTER_COLORS, type GraphAnalysis } from '@/lib/graphAnalysis'
import Link from 'next/link'
import { IndexCardNode } from './IndexCardNode'
import { StringEdge } from './StringEdge'
import { CardEditor } from './CardEditor'
import type { CardData, CardType } from './types'
import type { WizardInput } from '@/lib/blueprintStore'

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
  siteNotes?: string
  initialNodes?: Node[]
  initialEdges?: Edge[]
  initialBranch?: string
  allBranches?: string[]
  allBranchData?: Record<string, BranchRecord>
  initialWizardInput?: WizardInput
  initialVideoUrl?: string
}

type Modal = null | 'start-over' | 'new-branch' | 'merge' | 'ai-wizard' | 'apply-github'

function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null
  const loom = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
  if (loom) return `https://www.loom.com/embed/${loom[1]}`
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

export function BlueprintCanvas({
  siteId, siteName, siteNotes = '',
  initialNodes = [], initialEdges = [],
  initialBranch = 'main',
  allBranches: initBranches = ['main'],
  allBranchData: initBranchData = {},
  initialWizardInput,
  initialVideoUrl = '',
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
  const [modal, setModal] = useState<Modal>(() => initialNodes.length === 0 ? 'ai-wizard' : null)
  const [newBranchName, setNewBranchName] = useState('')
  const [wizardBusiness, setWizardBusiness] = useState(initialWizardInput?.business ?? siteNotes ?? siteName)
  const [wizardGoal, setWizardGoal] = useState(initialWizardInput?.goal ?? 'Convert visitors into consultation bookings')
  const [wizardExtra, setWizardExtra] = useState(initialWizardInput?.extra ?? '')
  const [wizardLoading, setWizardLoading] = useState(false)
  const [wizardError, setWizardError] = useState('')
  const [storedWizardInput, setStoredWizardInput] = useState<WizardInput | undefined>(initialWizardInput)
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl)
  const [panelOpen, setPanelOpen] = useState(!!initialWizardInput)
  const [dispatchState, setDispatchState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [dispatchResult, setDispatchResult] = useState<{ actionsUrl: string; pullsUrl: string; workflowInstalled?: boolean } | null>(null)
  const [dispatchError, setDispatchError] = useState('')
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [graphMode, setGraphMode] = useState(false)
  const [graphAnalysis, setGraphAnalysis] = useState<GraphAnalysis | null>(null)

  const [tourStep, setTourStep] = useState<1|2|3>(() => {
    if (typeof window === 'undefined') return initialNodes.length > 0 ? 2 : 1
    const saved = localStorage.getItem(`wb-tour-${siteId}`)
    if (saved === 'done') return 3
    return initialNodes.length > 0 ? 2 : 1
  })
  const [tourDismissed, setTourDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem(`wb-tour-${siteId}`)
    return !saved && initialNodes.length > 0
  })

  // ── Persistence ──────────────────────────────────────────────────
  const persistFull = useCallback(async (
    updatedBranchData: Record<string, BranchRecord>,
    activeBranch: string,
    meta?: { wizardInput?: WizardInput; videoUrl?: string },
  ) => {
    setSaveState('saving')
    try {
      await fetch(`/api/sites/${siteId}/blueprint`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentBranch: activeBranch, branches: updatedBranchData, ...meta }),
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
      persistFull(updated, currentBranch, { wizardInput: storedWizardInput, videoUrl })
    }, 1200)
  }, [siteId, currentBranch, branchData, persistFull, storedWizardInput, videoUrl])

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  // ── Graph Analysis ───────────────────────────────────────────────
  useEffect(() => {
    if (!graphMode) { setGraphAnalysis(null); return }
    setGraphAnalysis(analyzeGraph(nodes, edges))
  }, [graphMode, nodes, edges])

  // Derived display nodes/edges — enriched with cluster/importance/bridge data
  // Never modifies canonical `nodes`/`edges` state (which triggerSave serializes)
  const displayNodes = useMemo((): Node[] => {
    if (!graphMode || !graphAnalysis) return nodes
    const prValues = Object.values(graphAnalysis.pageRank)
    const maxPR = prValues.length ? Math.max(...prValues) : 1
    const btValues = Object.values(graphAnalysis.betweenness)
    const maxBT = btValues.length ? Math.max(...btValues) : 1
    const bridgeThreshold = maxBT > 0 ? maxBT * 0.25 : 1

    return nodes.map(n => ({
      ...n,
      data: {
        ...n.data,
        _clusterColor: getClusterColor(graphAnalysis.clusters[n.id] ?? 0),
        _importance: maxPR > 0 ? (graphAnalysis.pageRank[n.id] ?? 0) / maxPR : 0,
        _isBridgeNode: (graphAnalysis.betweenness[n.id] ?? 0) >= bridgeThreshold,
      },
    }))
  }, [nodes, graphMode, graphAnalysis])

  const displayEdges = useMemo((): Edge[] => {
    if (!graphMode || !graphAnalysis) return edges
    return edges.map(e => ({
      ...e,
      data: { ...(e.data ?? {}), isBridge: graphAnalysis.bridges.has(e.id) },
    }))
  }, [edges, graphMode, graphAnalysis])

  function advanceTour(step: 1|2|3) {
    setTourStep(step)
    localStorage.setItem(`wb-tour-${siteId}`, step === 3 ? 'done' : String(step))
  }

  function saveVideoUrl(url: string) {
    setVideoUrl(url)
    const updated = {
      ...branchData,
      [currentBranch]: { nodes: nodes as object[], edges: edges as object[], updatedAt: new Date().toISOString() },
    }
    persistFull(updated, currentBranch, { wizardInput: storedWizardInput, videoUrl: url })
  }

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
    if (tourStep === 1) advanceTour(2)
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

  // ── GitHub dispatch ──────────────────────────────────────────────
  async function dispatchToGitHub() {
    setDispatchState('loading')
    setDispatchError('')
    setDispatchResult(null)
    try {
      const res = await fetch(`/api/sites/${siteId}/dispatch-apply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ branch: currentBranch }),
      })
      const data = await res.json()
      if (!res.ok) { setDispatchError(data.error ?? 'Dispatch failed'); setDispatchState('error'); return }
      setDispatchResult({ actionsUrl: data.actionsUrl, pullsUrl: data.pullsUrl, workflowInstalled: data.workflowInstalled })
      setDispatchState('done')
    } catch (err) {
      setDispatchError(err instanceof Error ? err.message : String(err))
      setDispatchState('error')
    }
  }

  // ── AI Wizard ────────────────────────────────────────────────────
  async function generateFromAI() {
    setWizardLoading(true)
    setWizardError('')
    try {
      const res = await fetch('/api/blueprint-wizard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate',
          business: wizardBusiness,
          goal: wizardGoal,
          features: ['hero', 'about', 'services', 'testimonials', 'contact'],
          extra: wizardExtra,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setWizardError(data.error ?? 'Generation failed'); return }
      const newNodes = (data.nodes as Node[]).map(n => ({ ...n, type: 'card' }))
      const newEdges = (data.edges as Edge[]).map(e => ({ ...e, type: 'string' }))
      setNodes(newNodes)
      setEdges(newEdges)

      const input: WizardInput = {
        business: wizardBusiness,
        goal: wizardGoal,
        extra: wizardExtra,
        generatedAt: new Date().toISOString(),
      }
      setStoredWizardInput(input)

      const updated = { ...branchData, [currentBranch]: { nodes: newNodes as object[], edges: newEdges as object[], updatedAt: new Date().toISOString() } }
      setBranchData(updated)
      persistFull(updated, currentBranch, { wizardInput: input, videoUrl })
      setModal(null)
      setPanelOpen(true)
      advanceTour(2)
    } catch (e) {
      setWizardError(String(e))
    } finally {
      setWizardLoading(false)
    }
  }

  // ── Start Over ───────────────────────────────────────────────────
  function confirmStartOver() {
    setNodes([])
    setEdges([])
    const updated = { ...branchData, [currentBranch]: { nodes: [], edges: [], updatedAt: new Date().toISOString() } }
    setBranchData(updated)
    persistFull(updated, currentBranch, { wizardInput: storedWizardInput, videoUrl })
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
    persistFull(branchData, name, { wizardInput: storedWizardInput, videoUrl })
  }

  function createBranch() {
    const name = newBranchName.trim()
    if (!name || branches.includes(name)) return
    const snapshot: BranchRecord = { nodes: nodes as object[], edges: edges as object[], updatedAt: new Date().toISOString() }
    const updated = { ...branchData, [name]: snapshot }
    setBranchData(updated)
    setBranches(b => [...b, name])
    setCurrentBranch(name)
    persistFull(updated, name, { wizardInput: storedWizardInput, videoUrl })
    setNewBranchName('')
    setModal(null)
  }

  function mergeToMain() {
    if (currentBranch === 'main') return
    const snapshot: BranchRecord = { nodes: nodes as object[], edges: edges as object[], updatedAt: new Date().toISOString() }
    const updated = { ...branchData, main: snapshot }
    setBranchData(updated)
    setCurrentBranch('main')
    persistFull(updated, 'main', { wizardInput: storedWizardInput, videoUrl })
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
  const PANEL_W = 300

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#080d14', display: 'flex', flexDirection: 'row' }}>

      {/* ── Left Input Panel ──────────────────────────────────── */}
      {panelOpen && (
        <div style={{
          width: PANEL_W, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: '#0a0f18', borderRight: '1px solid rgba(255,255,255,0.07)',
          overflowY: 'auto', zIndex: 60,
        }}>
          {/* Panel header */}
          <div style={{
            height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg,#10b981,#059669)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Input</span>
            </div>
            <button onClick={() => setPanelOpen(false)} style={{ background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: 4 }}>
              <PanelLeftClose size={14} />
            </button>
          </div>

          {/* Input fields */}
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>

            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Business / Client Identity</label>
              <textarea
                value={wizardBusiness}
                onChange={e => setWizardBusiness(e.target.value)}
                rows={5}
                placeholder="Describe the business, specialty, credentials, unique identity..."
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 7, color: '#e2e8f0', fontSize: 11, padding: '8px 10px', resize: 'vertical',
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5,
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Primary Goal</label>
              <input
                value={wizardGoal}
                onChange={e => setWizardGoal(e.target.value)}
                placeholder="e.g. Convert visitors into bookings"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 7, color: '#e2e8f0', fontSize: 11, padding: '8px 10px',
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Design Identity / Notes</label>
              <textarea
                value={wizardExtra}
                onChange={e => setWizardExtra(e.target.value)}
                rows={3}
                placeholder="Palette, typography, tone, unique angles..."
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 7, color: '#e2e8f0', fontSize: 11, padding: '8px 10px', resize: 'vertical',
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5,
                }}
              />
            </div>

            <button
              onClick={() => { setWizardError(''); generateFromAI() }}
              disabled={wizardLoading || !wizardBusiness.trim()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px 0', borderRadius: 7, border: 'none', fontSize: 11, fontWeight: 700,
                background: wizardLoading || !wizardBusiness.trim() ? '#1e293b' : 'linear-gradient(135deg, #059669, #10b981)',
                color: wizardLoading || !wizardBusiness.trim() ? '#475569' : '#fff',
                cursor: wizardLoading || !wizardBusiness.trim() ? 'default' : 'pointer',
              }}
            >
              {wizardLoading
                ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                : <><RefreshCw size={11} /> Re-generate Blueprint</>
              }
            </button>

            {wizardError && (
              <div style={{ padding: '8px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, fontSize: 11, color: '#fca5a5' }}>
                {wizardError}
              </div>
            )}

            {storedWizardInput && (
              <div style={{ fontSize: 10, color: '#1e293b', textAlign: 'center' }}>
                Last generated: {new Date(storedWizardInput.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />

            {/* Video URL */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
                <Video size={10} /> Video Preview
              </label>
              <input
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                onBlur={e => saveVideoUrl(e.target.value)}
                placeholder="Loom, YouTube, or Vimeo URL"
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 7, color: '#e2e8f0', fontSize: 11, padding: '8px 10px',
                  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
              {videoUrl && getVideoEmbedUrl(videoUrl) && (
                <div style={{ marginTop: 8, borderRadius: 7, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', aspectRatio: '16/9' }}>
                  <iframe
                    src={getVideoEmbedUrl(videoUrl)!}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── Panel toggle strip (when closed) ─────────────────── */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          title="Open Input Panel"
          style={{
            width: 20, flexShrink: 0, background: '#0a0f18', border: 'none',
            borderRight: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#334155', zIndex: 60, transition: 'color 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#64748b' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#334155' }}
        >
          <PanelLeftOpen size={11} />
        </button>
      )}

      {/* ── Right side: topbar + canvas ──────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* ── Top bar ────────────────────────────────────────── */}
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
                      <Merge size={11} /> Merge &quot;{currentBranch}&quot; → main
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Step indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginRight: 2 }}>
              {([1,2,3] as const).map(s => (
                <div key={s} style={{
                  width: 20, height: 20, borderRadius: '50%', fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s < tourStep ? '#10b981' : s === tourStep ? '#6366f1' : 'rgba(255,255,255,0.07)',
                  color: s <= tourStep ? 'white' : '#334155',
                  transition: 'background 0.3s',
                }}>
                  {s < tourStep ? '✓' : s}
                </div>
              ))}
            </div>

            {/* Apply to GitHub → PR */}
            <button
              onClick={() => { setDispatchState('idle'); setDispatchError(''); setDispatchResult(null); setModal('apply-github') }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7,
                background: 'linear-gradient(135deg, #166534, #15803d)',
                border: '1px solid rgba(34,197,94,0.35)',
                color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em',
              }}
              title="Apply this blueprint branch to the GitHub repo — opens a PR with Vercel preview"
            >
              <Hammer size={12} /> Apply → GitHub PR
            </button>

            {/* Send to Worker Bee */}
            <Link href={`/sites/${siteId}/build`} onClick={() => advanceTour(3)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7,
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              border: tourStep === 2 ? '1px solid rgba(129,140,248,0.6)' : 'none',
              color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              textDecoration: 'none', letterSpacing: '0.03em',
              boxShadow: tourStep === 2 ? '0 0 18px rgba(99,102,241,0.55)' : 'none',
              transition: 'box-shadow 0.3s',
            }}>
              <Hammer size={12} /> Send to Worker Bee
            </Link>

            {/* AI Generate */}
            <button onClick={() => { setWizardError(''); setModal('ai-wizard') }} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 7,
              background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))',
              border: '1px solid rgba(16,185,129,0.35)', color: '#10b981', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.25))' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))' }}
            >
              <Wand2 size={12} /> AI Generate
            </button>

            {/* Graph Analysis toggle */}
            <button
              onClick={() => setGraphMode(v => !v)}
              title={graphMode ? 'Exit graph analysis' : 'Graph analysis — clusters, key nodes, weak links'}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 7,
                background: graphMode
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.25))'
                  : 'rgba(255,255,255,0.04)',
                border: graphMode
                  ? '1px solid rgba(99,102,241,0.5)'
                  : '1px solid rgba(255,255,255,0.08)',
                color: graphMode ? '#a5b4fc' : '#475569',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Network size={12} /> Graph
            </button>

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

        {/* ── Step 2 guide banner ──────────────────────────────── */}
        {tourStep === 2 && !tourDismissed && (
          <div style={{
            background: 'rgba(99,102,241,0.09)', borderBottom: '1px solid rgba(99,102,241,0.22)',
            padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, zIndex: 40,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: '#6366f1',
              color: 'white', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>2</div>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Review your cards — click any card to edit details, drag to rearrange, draw lines to show page flow.
            </span>
            <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600, whiteSpace: 'nowrap' }}>
              When ready →
            </span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6,
              background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(129,140,248,0.4)',
              fontSize: 11, fontWeight: 700, color: '#a5b4fc', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              <Hammer size={11} /> Send to Worker Bee
            </div>
            <button
              onClick={() => setTourDismissed(true)}
              title="Dismiss"
              style={{ marginLeft: 'auto', padding: '2px 6px', background: 'none', border: 'none', color: '#334155', fontSize: 13, cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#64748b' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#334155' }}
            >✕</button>
          </div>
        )}

        {/* ── Canvas ──────────────────────────────────────────── */}
        <div ref={reactFlowWrapper} style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={displayNodes} edges={displayEdges}
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
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, pointerEvents: 'none' }}>
              <div style={{ fontSize: 28, opacity: 0.1 }}>◈</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, color: '#e2e8f0', fontWeight: 700, marginBottom: 6 }}>Plan your site in 3 steps</div>
                <div style={{ fontSize: 12, color: '#334155' }}>Describe it, review the plan, then send it to Worker Bee to build</div>
              </div>
              <div style={{ display: 'flex', gap: 10, pointerEvents: 'all' }}>
                <button
                  onClick={() => { setWizardError(''); setModal('ai-wizard') }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '10px 20px', borderRadius: 10,
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', boxShadow: '0 0 24px rgba(99,102,241,0.4)',
                  }}>
                  <Sparkles size={14} /> AI Blueprint Wizard
                </button>
                <button
                  onClick={() => addCard('page')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '10px 16px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#94a3b8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                  + Add Card
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 4 }}>
                {[
                  { n: 1, label: 'Describe the site', sub: 'AI Wizard' },
                  { n: 2, label: 'Review cards', sub: 'Edit & connect' },
                  { n: 3, label: 'Send to Worker Bee', sub: 'One-click build' },
                ].map((s, i) => (
                  <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center', width: 120 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', margin: '0 auto 6px',
                        background: i === 0 ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${i === 0 ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, color: i === 0 ? '#818cf8' : '#334155',
                      }}>{s.n}</div>
                      <div style={{ fontSize: 11, color: i === 0 ? '#94a3b8' : '#334155', fontWeight: 600, lineHeight: 1.3 }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: '#1e293b', marginTop: 2 }}>{s.sub}</div>
                    </div>
                    {i < 2 && <div style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.06)', flexShrink: 0, marginBottom: 20 }} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card type legend (hidden in graph mode) */}
          {!graphMode && (
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
          )}

          {/* Graph Analysis Legend */}
          {graphMode && graphAnalysis && (
            <div style={{
              position: 'absolute', bottom: 16, left: 16,
              background: 'rgba(8,13,20,0.92)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10,
              padding: '12px 14px', minWidth: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#334155', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
                Graph Analysis
              </div>

              {/* Clusters */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>
                  Clusters ({graphAnalysis.clusterCount})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {Array.from({ length: Math.min(graphAnalysis.clusterCount, 8) }, (_, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '2px 6px', borderRadius: 4,
                      background: `${CLUSTER_COLORS[i]}22`,
                      border: `1px solid ${CLUSTER_COLORS[i]}44`,
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: CLUSTER_COLORS[i] }} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: CLUSTER_COLORS[i] }}>C{i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edge types */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <svg width="28" height="6">
                    <line x1="0" y1="3" x2="28" y2="3" stroke="#c9a96e" strokeWidth="1.5" opacity="0.75" />
                  </svg>
                  <span style={{ fontSize: 9, color: '#475569', fontWeight: 600 }}>Normal connection</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <svg width="28" height="6">
                    <line x1="0" y1="3" x2="28" y2="3" stroke="#f97316" strokeWidth="2" strokeDasharray="5 3" />
                  </svg>
                  <span style={{ fontSize: 9, color: '#f97316', fontWeight: 600 }}>Bridge / weak link</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#a5b4fc', flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: '#475569', fontWeight: 600 }}>Pin size = PageRank</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ fontSize: 7, fontWeight: 800, color: '#fff', background: '#f97316', padding: '1px 4px', borderRadius: 2 }}>BRIDGE</div>
                  <span style={{ fontSize: 9, color: '#475569', fontWeight: 600 }}>High betweenness node</span>
                </div>
              </div>

              {/* Stats */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 4, display: 'flex', gap: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#6366f1' }}>{graphAnalysis.clusterCount}</div>
                  <div style={{ fontSize: 8, color: '#334155', fontWeight: 700, textTransform: 'uppercase' }}>Clusters</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#f97316' }}>{graphAnalysis.bridges.size}</div>
                  <div style={{ fontSize: 8, color: '#334155', fontWeight: 700, textTransform: 'uppercase' }}>Bridges</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>{nodes.length}</div>
                  <div style={{ fontSize: 8, color: '#334155', fontWeight: 700, textTransform: 'uppercase' }}>Nodes</div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>{/* end right column */}

      {/* ── Card editor ──────────────────────────────────────── */}
      <CardEditor node={selectedNode} onClose={() => setSelectedNode(null)} onUpdate={updateCard} onDelete={deleteCard} />

      {/* ── Modals ───────────────────────────────────────────── */}
      {modal && modal !== 'ai-wizard' && (
        <div onClick={() => setModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#0f1419', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
            padding: 28, width: 360, boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
          }}>

            {modal === 'start-over' && <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <RotateCcw size={18} style={{ color: '#ef4444' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Start Over</div>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
                This will clear all cards and connections on <strong style={{ color: '#94a3b8' }}>{currentBranch}</strong>. This cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={confirmStartOver} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Clear Everything</button>
              </div>
            </>}

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

            {modal === 'merge' && <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Merge size={18} style={{ color: '#818cf8' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Merge to Main</div>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 20 }}>
                Copies all cards from <strong style={{ color: '#818cf8' }}>{currentBranch}</strong> into <strong style={{ color: '#e2e8f0' }}>main</strong>, overwriting it.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setModal(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={mergeToMain} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Merge → Main</button>
              </div>
            </>}

          </div>
        </div>
      )}

      {/* ── Apply → GitHub PR Modal ──────────────────────────── */}
      {modal === 'apply-github' && (
        <div onClick={() => dispatchState !== 'loading' && setModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#0a0f18', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 16,
            padding: 28, width: 460, maxWidth: '90vw', boxShadow: '0 24px 80px rgba(0,0,0,0.9)',
          }}>
            {dispatchState !== 'done' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Hammer size={18} style={{ color: '#22c55e' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Apply to GitHub</div>
                <div style={{ marginLeft: 'auto', fontSize: 11, color: '#334155', fontFamily: 'monospace' }}>{currentBranch}</div>
              </div>
            )}

            {dispatchState === 'idle' && (
              <>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.65, marginBottom: 20 }}>
                  This will:
                  <ol style={{ marginTop: 8, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <li>Install the Worker Bee GitHub Action in <strong style={{ color: '#94a3b8' }}>{siteName}</strong> (first time only)</li>
                    <li>Check out the repo and apply each fix card using Claude Code</li>
                    <li>Open a PR with a <strong style={{ color: '#94a3b8' }}>live Vercel preview URL</strong></li>
                    <li>You review the preview → merge → Vercel deploys to production</li>
                  </ol>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#475569' }}>
                  Requires <code style={{ color: '#94a3b8' }}>ANTHROPIC_API_KEY</code> set as a GitHub secret in the client repo.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setModal(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={dispatchToGitHub} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #166534, #15803d)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    <Hammer size={13} /> Apply branch &ldquo;{currentBranch}&rdquo;
                  </button>
                </div>
              </>
            )}

            {dispatchState === 'loading' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Loader2 size={28} style={{ color: '#22c55e', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600, marginBottom: 6 }}>Dispatching to GitHub…</div>
                <div style={{ fontSize: 12, color: '#475569' }}>Installing workflow if needed, then triggering the run</div>
              </div>
            )}

            {dispatchState === 'done' && dispatchResult && (
              <>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>🐝</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>Running on GitHub</div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                    The action is applying your fix cards. A PR with a Vercel preview URL will appear in a few minutes.
                    {dispatchResult.workflowInstalled && <span style={{ display: 'block', marginTop: 6, color: '#22c55e' }}>✓ Workflow installed on first run</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  <a href={dispatchResult.actionsUrl} target="_blank" rel="noopener noreferrer" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '11px 0', borderRadius: 8, background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', fontSize: 12, fontWeight: 700, textDecoration: 'none',
                  }}>
                    Watch action run →
                  </a>
                  <a href={dispatchResult.pullsUrl} target="_blank" rel="noopener noreferrer" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '11px 0', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 12, fontWeight: 600, textDecoration: 'none',
                  }}>
                    View PRs (preview URL will appear here)
                  </a>
                </div>
                <button onClick={() => setModal(null)} style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Close</button>
              </>
            )}

            {dispatchState === 'error' && (
              <>
                <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 12, color: '#fca5a5', marginBottom: 16 }}>
                  {dispatchError}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setModal(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Close</button>
                  <button onClick={dispatchToGitHub} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#1e293b', color: '#94a3b8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── AI Wizard Modal ───────────────────────────────────── */}
      {modal === 'ai-wizard' && (
        <div onClick={() => !wizardLoading && setModal(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#0a0f18', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16,
            padding: 28, width: 480, maxWidth: '90vw', boxShadow: '0 24px 80px rgba(0,0,0,0.9)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Wand2 size={18} style={{ color: '#10b981' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>AI Blueprint Generator</div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: '#334155' }}>{siteName}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Business / Client Identity</label>
                <textarea
                  value={wizardBusiness}
                  onChange={e => setWizardBusiness(e.target.value)}
                  rows={4}
                  placeholder="Describe the business, specialty, credentials, unique identity..."
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, color: '#e2e8f0', fontSize: 12, padding: '10px 12px', resize: 'vertical',
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Primary Goal</label>
                <input
                  value={wizardGoal}
                  onChange={e => setWizardGoal(e.target.value)}
                  placeholder="e.g. Convert visitors into consultation bookings"
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, color: '#e2e8f0', fontSize: 12, padding: '10px 12px',
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Design Identity / Extra Notes</label>
                <textarea
                  value={wizardExtra}
                  onChange={e => setWizardExtra(e.target.value)}
                  rows={3}
                  placeholder="Palette, typography, tone, unique angles to emphasize..."
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, color: '#e2e8f0', fontSize: 12, padding: '10px 12px', resize: 'vertical',
                    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5,
                  }}
                />
              </div>
            </div>

            {wizardError && (
              <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: 12, color: '#fca5a5' }}>
                {wizardError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button onClick={() => setModal(null)} disabled={wizardLoading} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={generateFromAI}
                disabled={wizardLoading || !wizardBusiness.trim()}
                style={{
                  flex: 2, padding: '10px 0', borderRadius: 8, border: 'none',
                  background: wizardLoading || !wizardBusiness.trim() ? '#1e293b' : 'linear-gradient(135deg, #059669, #10b981)',
                  color: wizardLoading || !wizardBusiness.trim() ? '#475569' : '#fff',
                  fontSize: 12, fontWeight: 700, cursor: wizardLoading || !wizardBusiness.trim() ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}
              >
                {wizardLoading
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating blueprint…</>
                  : <><Wand2 size={13} /> Generate Blueprint</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

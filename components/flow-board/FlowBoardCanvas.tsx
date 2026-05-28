'use client'
import { useCallback, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  getBezierPath,
  type Node, type Edge, type Connection, type EdgeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { FlowNode } from './FlowNode'
import { MEDICAL_SIGNUP_NODES, MEDICAL_SIGNUP_EDGES } from './flows/medical-signup'

// ── Custom edge — cork board string style ─────────────────────────────────
function FlowStringEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, labelStyle, labelBgStyle }: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  return (
    <g>
      <path d={path} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth={2.5}
        strokeLinecap="round" style={{ transform: 'translate(1px,2px)', filter: 'blur(1.5px)' }} />
      <path id={id} d={path} fill="none"
        stroke="#c9a96e" strokeWidth={1.5} strokeLinecap="round" opacity={0.8} />
      <path d={path} fill="none"
        stroke="rgba(255,235,180,0.3)" strokeWidth={0.5} strokeLinecap="round" />
      {label && (
        <g transform={`translate(${labelX},${labelY})`}>
          <rect x={-22} y={-8} width={44} height={16} rx={2}
            fill={(labelBgStyle as { fill?: string })?.fill ?? '#faf6ee'} fillOpacity={0.9}
            stroke="#c9a96e" strokeWidth={0.5} />
          <text x={0} y={4} textAnchor="middle"
            style={{ fontFamily: 'monospace', fontSize: 9, fill: '#78716c' }}>
            {String(label)}
          </text>
        </g>
      )}
    </g>
  )
}

const nodeTypes = { flow: FlowNode }
const edgeTypes = { 'flow-string': FlowStringEdge }

const BOARDS: { id: string; label: string; nodes: Node[]; edges: Edge[] }[] = [
  {
    id: 'medical-signup',
    label: 'medicalspanish.app — Signup Flow',
    nodes: MEDICAL_SIGNUP_NODES as unknown as Node[],
    edges: MEDICAL_SIGNUP_EDGES,
  },
]

export function FlowBoardCanvas() {
  const [activeBoard, setActiveBoard] = useState(BOARDS[0].id)
  const board = BOARDS.find(b => b.id === activeBoard) ?? BOARDS[0]

  const [nodes, setNodes, onNodesChange] = useNodesState(board.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(board.edges)

  const onConnect = useCallback((c: Connection) => setEdges(es => addEdge({ ...c, type: 'flow-string' }, es)), [setEdges])

  function switchBoard(id: string) {
    const b = BOARDS.find(x => x.id === id)
    if (!b) return
    setActiveBoard(id)
    setNodes(b.nodes as Node[])
    setEdges(b.edges)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
        background: '#1a1408', borderBottom: '1px solid #3d3019', flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#c9a96e' }}>
          📌 Flow Boards
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {BOARDS.map(b => (
            <button
              key={b.id}
              onClick={() => switchBoard(b.id)}
              style={{
                fontFamily: 'monospace', fontSize: 10,
                padding: '4px 10px', borderRadius: 4,
                border: activeBoard === b.id ? '1px solid #c9a96e' : '1px solid #3d3019',
                background: activeBoard === b.id ? '#2d2010' : 'transparent',
                color: activeBoard === b.id ? '#c9a96e' : '#78716c',
                cursor: 'pointer',
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          {[
            { color: '#22c55e', label: 'Start / Success' },
            { color: '#fbbf24', label: 'Screen' },
            { color: '#38bdf8', label: 'User action' },
            { color: '#fb923c', label: 'Decision' },
            { color: '#c084fc', label: 'External / API' },
            { color: '#f87171', label: 'Gap / Problem' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#78716c' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.08}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            color="#8b6a1a"
            style={{ backgroundColor: '#2d1f08' }}
            gap={24}
            size={0.8}
            variant={'dots' as never}
          />
          <Controls
            style={{
              background: '#1a1408', border: '1px solid #3d3019',
              borderRadius: 6, overflow: 'hidden',
            }}
          />
          <MiniMap
            nodeColor={(n) => {
              const type = (n.data as { type?: string })?.type ?? 'screen'
              const colorMap: Record<string, string> = {
                start: '#22c55e', screen: '#fbbf24', action: '#38bdf8',
                decision: '#fb923c', external: '#c084fc', gap: '#f87171', success: '#4ade80',
              }
              return colorMap[type] ?? '#78716c'
            }}
            style={{
              background: '#1a1408', border: '1px solid #3d3019',
              borderRadius: 6,
            }}
          />
        </ReactFlow>
      </div>
    </div>
  )
}

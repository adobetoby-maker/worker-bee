'use client'
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

type Milestone = {
  id: string
  title: string
  description: string | null
  status: 'pending' | 'in_progress' | 'complete' | 'blocked'
  sort_order: number
  completed_at: string | null
}

const STATUS_CONFIG = {
  pending:     { icon: '○', label: 'Pending',     color: '#6b7280', bg: 'rgba(107,114,128,0.1)',  border: 'rgba(107,114,128,0.3)' },
  in_progress: { icon: '◐', label: 'In Progress', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.3)'  },
  complete:    { icon: '●', label: 'Complete',    color: '#10b981', bg: 'rgba(16,185,129,0.1)',   border: 'rgba(16,185,129,0.3)'  },
  blocked:     { icon: '✕', label: 'Blocked',     color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.3)'   },
}

interface Props {
  siteName: string
  siteUrl: string
  milestones: Milestone[]
  blueprintNodes: Node[]
  blueprintEdges: Edge[]
}

export function ClientPortal({ siteName, siteUrl, milestones, blueprintNodes, blueprintEdges }: Props) {
  const complete  = milestones.filter(m => m.status === 'complete').length
  const total     = milestones.length
  const pct       = total > 0 ? Math.round((complete / total) * 100) : 0

  return (
    <div className="min-h-screen" style={{ background: '#060c18', color: '#c8d8f0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: 'rgba(12,21,40,0.9)', borderBottom: '1px solid #1e2d45', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: '#4a6080', letterSpacing: '0.1em', marginBottom: 4 }}>CLIENT PORTAL</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>{siteName}</h1>
            <a href={siteUrl} target="_blank" rel="noreferrer"
               style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none' }}>
              {siteUrl} ↗
            </a>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{pct}%</div>
            <div style={{ fontSize: 12, color: '#4a6080' }}>{complete} of {total} gates complete</div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px' }}>
        {/* Progress bar */}
        <div style={{ marginBottom: 32, background: '#0c1528', borderRadius: 12, padding: '16px 20px', border: '1px solid #1e2d45' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: '#8ca0be' }}>Overall Progress</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>{pct}%</span>
          </div>
          <div style={{ height: 8, background: '#111e38', borderRadius: 99 }}>
            <div style={{ height: 8, background: 'linear-gradient(90deg,#6366f1,#10b981)', borderRadius: 99, width: `${pct}%`, transition: 'width 0.6s ease' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Milestones / Gates */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Project Gates</h2>
            {milestones.length === 0 ? (
              <div style={{ color: '#4a6080', fontSize: 14, padding: '20px 0' }}>No milestones set yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {milestones.map((m, i) => {
                  const cfg = STATUS_CONFIG[m.status]
                  return (
                    <div key={m.id} style={{ background: '#0c1528', border: '1px solid #1e2d45', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      {/* Step number */}
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.status === 'complete' ? '#10b981' : '#111e38', border: `2px solid ${m.status === 'complete' ? '#10b981' : '#1e2d45'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: m.status === 'complete' ? '#fff' : '#4a6080', flexShrink: 0 }}>
                        {m.status === 'complete' ? '✓' : i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{m.title}</span>
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </div>
                        {m.description && (
                          <div style={{ fontSize: 13, color: '#6b85a8', marginTop: 4 }}>{m.description}</div>
                        )}
                        {m.completed_at && (
                          <div style={{ fontSize: 11, color: '#10b981', marginTop: 4 }}>
                            ✓ Completed {new Date(m.completed_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Blueprint cork board — read-only */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Project Blueprint</h2>
            {blueprintNodes.length === 0 ? (
              <div style={{ background: '#0c1528', border: '1px solid #1e2d45', borderRadius: 12, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a6080', fontSize: 14 }}>
                Blueprint coming soon
              </div>
            ) : (
              <div style={{ height: 440, borderRadius: 12, overflow: 'hidden', border: '1px solid #1e2d45' }}>
                <ReactFlow
                  nodes={blueprintNodes}
                  edges={blueprintEdges}
                  fitView
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  panOnDrag={true}
                  zoomOnScroll={true}
                  colorMode="dark"
                >
                  <Background color="#1e2d45" gap={20} />
                  <Controls showInteractive={false} />
                  <MiniMap nodeColor="#6366f1" maskColor="rgba(6,12,24,0.8)" />
                </ReactFlow>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 48, textAlign: 'center', fontSize: 12, color: '#4a6080', borderTop: '1px solid #1e2d45', paddingTop: 24 }}>
          Powered by <span style={{ color: '#6366f1', fontWeight: 600 }}>worker-bee.app</span> · Read-only view
        </div>
      </div>
    </div>
  )
}

'use client'
import { Handle, Position, type NodeProps } from '@xyflow/react'

export type FlowNodeType =
  | 'start'
  | 'screen'
  | 'action'
  | 'decision'
  | 'external'
  | 'gap'
  | 'success'

export interface FlowNodeData extends Record<string, unknown> {
  label: string
  sublabel?: string
  type: FlowNodeType
  note?: string
  rotation?: number
  url?: string
}

const NODE_STYLE: Record<FlowNodeType, { bg: string; border: string; accent: string; pin: string; emoji: string }> = {
  start:    { bg: 'linear-gradient(150deg,#d1fae5,#a7f3d0)', border: '#10b981', accent: '#065f46', pin: '#34d399', emoji: '▶' },
  screen:   { bg: 'linear-gradient(150deg,#fef9c3,#fde68a)', border: '#f59e0b', accent: '#78350f', pin: '#fbbf24', emoji: '🖥' },
  action:   { bg: 'linear-gradient(150deg,#e0f2fe,#bae6fd)', border: '#0ea5e9', accent: '#0c4a6e', pin: '#38bdf8', emoji: '👆' },
  decision: { bg: 'linear-gradient(150deg,#ffedd5,#fed7aa)', border: '#f97316', accent: '#7c2d12', pin: '#fb923c', emoji: '⑂' },
  external: { bg: 'linear-gradient(150deg,#f3e8ff,#e9d5ff)', border: '#a855f7', accent: '#3b0764', pin: '#c084fc', emoji: '⬡' },
  gap:      { bg: 'linear-gradient(150deg,#fee2e2,#fecaca)', border: '#ef4444', accent: '#7f1d1d', pin: '#f87171', emoji: '⚠' },
  success:  { bg: 'linear-gradient(150deg,#dcfce7,#bbf7d0)', border: '#22c55e', accent: '#14532d', pin: '#4ade80', emoji: '✓' },
}

export function FlowNode({ data, selected }: NodeProps) {
  const d = data as unknown as FlowNodeData
  const s = NODE_STYLE[d.type] ?? NODE_STYLE.screen
  const rot = d.rotation ?? 0

  return (
    <div style={{
      transform: `rotate(${rot}deg)`,
      width: 200,
      background: s.bg,
      border: `2px solid ${s.border}`,
      borderRadius: 3,
      boxShadow: selected
        ? `4px 8px 28px rgba(0,0,0,0.55), 0 0 0 2px ${s.border}`
        : `3px 6px 18px rgba(0,0,0,0.45), 1px 2px 4px rgba(0,0,0,0.25)`,
      position: 'relative',
      cursor: 'grab',
      userSelect: 'none',
      transition: 'box-shadow 0.15s',
    }}>
      {/* Cork pin */}
      <div style={{
        position: 'absolute', top: -11, left: '50%',
        transform: 'translateX(-50%)', zIndex: 20,
        width: 16, height: 16, borderRadius: '50%',
        background: `radial-gradient(circle at 5px 5px, ${s.pin}, ${s.border})`,
        boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
      }} />

      {/* Top accent bar */}
      <div style={{ height: 5, background: s.border, borderRadius: '1px 1px 0 0' }} />

      {/* Ruled lines */}
      <div style={{ position: 'absolute', inset: '5px 0 0 0', pointerEvents: 'none', overflow: 'hidden', opacity: 0.07 }}>
        {[28, 48, 68, 88, 108].map(t => (
          <div key={t} style={{ position: 'absolute', top: t, left: 12, right: 12, height: 1, background: s.accent }} />
        ))}
      </div>

      <div style={{ padding: '9px 12px 12px', position: 'relative' }}>
        {/* Type badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontFamily: 'monospace', fontSize: 8.5, fontWeight: 800,
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: s.accent, marginBottom: 5, opacity: 0.8,
        }}>
          <span>{s.emoji}</span>
          <span>{d.type}</span>
        </div>

        {/* Label */}
        <div style={{
          fontFamily: '"Georgia", serif', fontSize: 14, fontWeight: 700,
          color: '#1c1917', lineHeight: 1.3, marginBottom: d.sublabel ? 3 : 6,
        }}>
          {d.label}
        </div>

        {/* Sublabel */}
        {d.sublabel && (
          <div style={{
            fontFamily: 'monospace', fontSize: 9.5, color: '#57534e',
            lineHeight: 1.45, marginBottom: 6,
          }}>
            {d.sublabel}
          </div>
        )}

        {/* Note */}
        {d.note && (
          <div style={{
            fontFamily: 'monospace', fontSize: 9, color: s.accent,
            lineHeight: 1.45, fontStyle: 'italic',
            background: 'rgba(0,0,0,0.06)', padding: '4px 7px',
            borderLeft: `2px solid ${s.border}`, borderRadius: '0 2px 2px 0',
            marginTop: 4,
          }}>
            {d.note}
          </div>
        )}

        {/* URL */}
        {d.url && (
          <div style={{
            fontFamily: 'monospace', fontSize: 8.5, color: s.border,
            marginTop: 6, wordBreak: 'break-all', opacity: 0.85,
          }}>
            {d.url}
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Top}
        style={{ background: s.border, border: `2px solid #fffbeb`, width: 10, height: 10, top: -5 }} />
      <Handle type="source" position={Position.Bottom}
        style={{ background: s.border, border: `2px solid #fffbeb`, width: 10, height: 10, bottom: -5 }} />
      <Handle type="target" position={Position.Left}
        style={{ background: s.border, border: `2px solid #fffbeb`, width: 8, height: 8, left: -4 }} />
      <Handle type="source" position={Position.Right}
        style={{ background: s.border, border: `2px solid #fffbeb`, width: 8, height: 8, right: -4 }} />
    </div>
  )
}

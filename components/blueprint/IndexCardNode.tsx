'use client'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { CardData } from './types'
import { TYPE_COLOR, STATUS_META } from './types'

export function IndexCardNode({ data, selected }: NodeProps) {
  const d = data as unknown as CardData
  const typeColor = TYPE_COLOR[d.type] ?? '#6b7280'
  const status = STATUS_META[d.status]

  const clusterColor = d._clusterColor
  const importance = d._importance ?? 0
  const isBridgeNode = d._isBridgeNode ?? false

  // Pin size grows with importance (8px base → 18px at max)
  const pinSize = clusterColor ? Math.round(8 + importance * 10) : 16

  return (
    <div style={{
      transform: `rotate(${d.rotation ?? 0}deg)`,
      width: 220,
      background: 'linear-gradient(160deg, #faf6ee 0%, #f0ead8 100%)',
      borderRadius: 2,
      boxShadow: selected
        ? `3px 6px 24px rgba(0,0,0,0.6), 0 0 0 2px ${clusterColor ?? typeColor}, inset 0 1px 0 rgba(255,255,255,0.6)`
        : `3px 6px 18px rgba(0,0,0,0.5), 1px 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.6)`,
      cursor: 'grab',
      userSelect: 'none',
      position: 'relative',
      transition: 'box-shadow 0.15s ease',
      // Cluster border: left stripe when graph mode on
      borderLeft: clusterColor ? `4px solid ${clusterColor}` : undefined,
    }}>

      {/* Cork pin — size/glow reflects PageRank importance */}
      <div style={{
        position: 'absolute', top: -pinSize / 2 - 4, left: '50%',
        transform: 'translateX(-50%)', zIndex: 20,
        width: pinSize, height: pinSize, borderRadius: '50%',
        background: clusterColor
          ? `radial-gradient(circle at 35% 35%, ${clusterColor}cc, ${clusterColor})`
          : 'radial-gradient(circle at 5px 5px, #f5d87a, #c8910a)',
        boxShadow: clusterColor && importance > 0.5
          ? `0 2px 5px rgba(0,0,0,0.5), 0 0 ${Math.round(4 + importance * 10)}px ${clusterColor}88`
          : '0 2px 5px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(0,0,0,0.2)',
        transition: 'all 0.2s ease',
      }} />

      {/* Top type stripe */}
      <div style={{ height: 5, borderRadius: '2px 2px 0 0', background: typeColor }} />

      {/* Cluster + bridge badges (top-right) */}
      {clusterColor && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          display: 'flex', gap: 3, alignItems: 'center', zIndex: 10,
        }}>
          {isBridgeNode && (
            <div style={{
              fontFamily: 'monospace', fontSize: 7, fontWeight: 800,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#fff', background: '#f97316',
              padding: '1px 4px', borderRadius: 2,
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}>BRIDGE</div>
          )}
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: clusterColor,
            boxShadow: `0 0 4px ${clusterColor}88`,
            flexShrink: 0,
          }} />
        </div>
      )}

      {/* Ruled lines (paper feel) */}
      <div style={{ position: 'absolute', inset: '5px 0 0 0', pointerEvents: 'none', overflow: 'hidden', opacity: 0.08 }}>
        {[30, 52, 74, 96, 118, 140].map(top => (
          <div key={top} style={{ position: 'absolute', top, left: 14, right: 14, height: 1, background: '#78716c' }} />
        ))}
      </div>

      <div style={{ padding: '10px 13px 13px', position: 'relative' }}>
        {/* Type label */}
        <div style={{
          fontFamily: 'var(--font-mono, monospace)', fontSize: 9, fontWeight: 700,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: typeColor,
          marginBottom: 4, opacity: 0.85,
        }}>{d.type}</div>

        {/* Title */}
        <div style={{
          fontFamily: '"Georgia", serif', fontSize: 15, fontWeight: 700,
          color: '#1c1917', lineHeight: 1.25, marginBottom: 7,
          letterSpacing: '-0.01em',
        }}>{d.title || 'Untitled'}</div>

        {/* Description */}
        {d.description ? (
          <div style={{
            fontFamily: 'monospace', fontSize: 10, color: '#57534e',
            lineHeight: 1.55, marginBottom: 8,
            paddingBottom: 8, borderBottom: '1px dashed #c7bfb0',
          }}>{d.description}</div>
        ) : null}

        {/* Claude prompt preview */}
        {d.claudePrompt ? (
          <div style={{
            fontFamily: 'monospace', fontSize: 9.5, color: '#44403c',
            lineHeight: 1.45, fontStyle: 'italic',
            background: 'rgba(0,0,0,0.04)', padding: '4px 7px',
            borderLeft: `2px solid ${typeColor}`, borderRadius: '0 2px 2px 0',
            marginBottom: 10, opacity: 0.8,
          }}>
            "{d.claudePrompt.slice(0, 72)}{d.claudePrompt.length > 72 ? '…' : ''}"
          </div>
        ) : (
          <div style={{
            fontFamily: 'monospace', fontSize: 9, color: '#a8a29e',
            fontStyle: 'italic', marginBottom: 10,
          }}>No prompt yet…</div>
        )}

        {/* Status stamp */}
        <div style={{
          display: 'inline-block',
          fontFamily: 'monospace', fontSize: 8.5, fontWeight: 800,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          color: status.color,
          border: `1.5px solid ${status.color}`,
          padding: '2px 7px', borderRadius: 1,
          transform: 'rotate(-2deg)',
          opacity: d.status === 'planned' ? 0.5 : 0.85,
        }}>{status.label}</div>

        {/* Importance bar (graph mode only) */}
        {clusterColor && importance > 0 && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 3, background: 'rgba(0,0,0,0.08)',
            borderRadius: '0 0 2px 0',
          }}>
            <div style={{
              height: '100%', width: `${Math.round(importance * 100)}%`,
              background: clusterColor,
              borderRadius: 'inherit',
              transition: 'width 0.3s ease',
            }} />
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left}
        style={{ background: clusterColor ?? typeColor, border: '2px solid #faf6ee', width: 10, height: 10, left: -5 }} />
      <Handle type="source" position={Position.Right}
        style={{ background: clusterColor ?? typeColor, border: '2px solid #faf6ee', width: 10, height: 10, right: -5 }} />
    </div>
  )
}

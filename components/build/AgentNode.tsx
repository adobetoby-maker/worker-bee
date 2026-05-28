'use client'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Loader2, CheckCircle2, XCircle, Clock, Play, SkipForward } from 'lucide-react'
import type { AgentStatus } from '@/lib/pipelineAgents'

export interface AgentNodeData {
  agentId: string
  name: string
  role: string
  model: string
  color: string
  estimatedMinutes: number
  status: AgentStatus
  startedAt?: string
  completedAt?: string
  errors: string[]
  onDispatch?: (agentId: string) => void
}

function StatusIcon({ status, color }: { status: AgentStatus; color: string }) {
  switch (status) {
    case 'running':
      return <Loader2 size={14} style={{ color, animation: 'spin 1s linear infinite' }} />
    case 'done':
      return <CheckCircle2 size={14} style={{ color: '#10b981' }} />
    case 'error':
      return <XCircle size={14} style={{ color: '#ef4444' }} />
    case 'skipped':
      return <SkipForward size={14} style={{ color: '#64748b' }} />
    default:
      return <Clock size={14} style={{ color: '#475569' }} />
  }
}

function elapsed(startedAt?: string, completedAt?: string): string {
  if (!startedAt) return ''
  const start = new Date(startedAt).getTime()
  const end = completedAt ? new Date(completedAt).getTime() : Date.now()
  const s = Math.round((end - start) / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export function AgentNode({ data, selected }: NodeProps) {
  const d = data as unknown as AgentNodeData
  const isActive = d.status === 'running'
  const isDone = d.status === 'done'
  const isError = d.status === 'error'

  const borderColor = isError ? '#ef4444' : isDone ? '#10b981' : isActive ? d.color : 'rgba(255,255,255,0.08)'
  const glowColor = isActive ? d.color + '44' : isDone ? '#10b98122' : 'transparent'

  return (
    <div
      style={{
        width: 220,
        background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 12,
        border: `1.5px solid ${borderColor}`,
        boxShadow: selected
          ? `0 0 0 2px ${d.color}, 0 8px 32px ${glowColor}`
          : `0 4px 16px rgba(0,0,0,0.5), 0 0 0 0px transparent, 0 0 24px ${glowColor}`,
        overflow: 'hidden',
        cursor: 'default',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      {/* Top accent bar */}
      <div style={{
        height: 3,
        background: isDone ? '#10b981' : isError ? '#ef4444' : d.color,
        opacity: d.status === 'idle' ? 0.4 : 1,
      }} />

      <div style={{ padding: '12px 14px 14px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <StatusIcon status={d.status} color={d.color} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#f1f5f9',
              letterSpacing: '-0.01em', lineHeight: 1.2,
            }}>{d.name}</div>
            <div style={{ fontSize: 9, color: d.color, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 1 }}>
              {d.model}
            </div>
          </div>
          {/* Estimated time badge */}
          <div style={{
            fontSize: 9, color: '#475569', fontFamily: 'monospace',
            background: 'rgba(255,255,255,0.04)',
            padding: '2px 6px', borderRadius: 4,
          }}>~{d.estimatedMinutes}m</div>
        </div>

        {/* Role */}
        <div style={{
          fontSize: 10.5, color: '#94a3b8', lineHeight: 1.45, marginBottom: 10,
        }}>{d.role}</div>

        {/* Timing */}
        {(d.status === 'running' || d.status === 'done') && d.startedAt && (
          <div style={{
            fontSize: 9, color: '#475569', fontFamily: 'monospace', marginBottom: 8,
          }}>{elapsed(d.startedAt, d.completedAt)}</div>
        )}

        {/* Error count */}
        {isError && d.errors.length > 0 && (
          <div style={{
            fontSize: 9.5, color: '#f87171', background: 'rgba(239,68,68,0.08)',
            padding: '4px 8px', borderRadius: 6, marginBottom: 8,
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            {d.errors.length} error{d.errors.length > 1 ? 's' : ''}
          </div>
        )}

        {/* Dispatch button */}
        <button
          onClick={() => d.onDispatch?.(d.agentId)}
          disabled={d.status === 'running'}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            width: '100%', padding: '6px 10px', borderRadius: 7,
            fontSize: 11, fontWeight: 600, cursor: d.status === 'running' ? 'not-allowed' : 'pointer',
            background: d.status === 'running' ? 'rgba(255,255,255,0.04)' : `${d.color}22`,
            color: d.status === 'running' ? '#475569' : d.color,
            border: `1px solid ${d.status === 'running' ? 'rgba(255,255,255,0.06)' : d.color + '44'}`,
            transition: 'all 0.15s ease',
          }}
        >
          {d.status === 'running'
            ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
            : <Play size={10} />}
          {d.status === 'running' ? 'Running…' : d.status === 'done' ? 'Re-run' : 'Dispatch'}
        </button>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        style={{ background: d.color, border: '2px solid #0f172a', width: 10, height: 10, left: -5 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: d.color, border: '2px solid #0f172a', width: 10, height: 10, right: -5 }}
      />
    </div>
  )
}

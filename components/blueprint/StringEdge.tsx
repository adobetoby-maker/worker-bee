'use client'
import { getBezierPath, type EdgeProps } from '@xyflow/react'

interface EdgeData {
  isBridge?: boolean
}

export function StringEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const isBridge = (data as EdgeData | undefined)?.isBridge ?? false

  if (isBridge) {
    return (
      <g>
        {/* Glow layer */}
        <path d={path} fill="none" stroke="rgba(249,115,22,0.3)" strokeWidth={8}
          strokeLinecap="round" style={{ filter: 'blur(3px)' }} />
        {/* Shadow */}
        <path d={path} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={2.5}
          strokeLinecap="round" style={{ transform: 'translate(1px,2px)', filter: 'blur(1.5px)' }} />
        {/* Bridge string — dashed orange */}
        <path id={id} d={path} fill="none"
          stroke="#f97316" strokeWidth={2} strokeLinecap="round"
          strokeDasharray="6 4"
          style={{ opacity: 0.9 }} />
        {/* Highlight */}
        <path d={path} fill="none"
          stroke="rgba(255,180,100,0.4)" strokeWidth={0.5} strokeLinecap="round" />
      </g>
    )
  }

  return (
    <g>
      {/* Pin-string shadow */}
      <path d={path} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={2.5}
        strokeLinecap="round" style={{ transform: 'translate(1px,2px)', filter: 'blur(1.5px)' }} />
      {/* The string */}
      <path id={id} d={path} fill="none"
        stroke="#c9a96e" strokeWidth={1.5} strokeLinecap="round"
        style={{ opacity: 0.75 }} />
      {/* Subtle highlight */}
      <path d={path} fill="none"
        stroke="rgba(255,235,180,0.3)" strokeWidth={0.5} strokeLinecap="round" />
    </g>
  )
}

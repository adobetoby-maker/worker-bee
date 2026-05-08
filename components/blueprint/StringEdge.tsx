'use client'
import { getBezierPath, type EdgeProps } from '@xyflow/react'

export function StringEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }: EdgeProps) {
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

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

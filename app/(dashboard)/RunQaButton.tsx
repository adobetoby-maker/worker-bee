'use client'
// Built by ATLAS — 2026-07-05
// "Run QA" — POSTs { type: 'run-qa', payload: { slug } } to /api/atlas/commands.
// The Bridge turns it into a qa-verify NEED in ~/.atlas/needs; ATLAS's normal
// loop runs the QA. Busy → queued state; never executes anything itself.

import { useState } from 'react'
import { PlayCircle, Check, CircleAlert } from 'lucide-react'

export default function RunQaButton({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'queued' | 'error'>('idle')

  async function run() {
    if (state === 'busy' || state === 'queued') return
    setState('busy')
    try {
      const res = await fetch('/api/atlas/commands', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'run-qa', payload: { slug } }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setState('queued')
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const label = state === 'busy' ? 'Queuing…'
    : state === 'queued' ? 'Queued'
    : state === 'error' ? 'Failed'
    : 'Run QA'
  const color = state === 'queued' ? '#34d399' : state === 'error' ? '#f87171' : '#818cf8'
  const Icon = state === 'queued' ? Check : state === 'error' ? CircleAlert : PlayCircle

  return (
    <button
      onClick={run}
      disabled={state === 'busy' || state === 'queued'}
      title={`Queue an ATLAS QA run for ${slug}`}
      className={`inline-flex items-center gap-1 rounded-md font-semibold uppercase tracking-wide transition-colors cursor-pointer disabled:cursor-default hover:bg-white/10 ${
        compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1.5 text-[10px]'
      }`}
      style={{ background: `${color}14`, color, border: `1px solid ${color}30` }}>
      <Icon size={compact ? 9 : 11} />
      {label}
    </button>
  )
}

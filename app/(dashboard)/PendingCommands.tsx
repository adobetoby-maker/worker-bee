'use client'
// Built by ATLAS — 2026-07-05
// Pending-commands section for Today — command path DOWN (PRD §4.2 Phase 3).
// "Queue for ATLAS" opens an inline form (need/mission + summary) → POST
// /api/atlas/commands → optimistic row. Status chips: pending amber,
// dispatched blue, completed green, rejected red (lib/atlas-console.ts).

import { useState } from 'react'
import { Terminal, Plus, X } from 'lucide-react'
import { relTime, commandStatusColor, commandSummary, type CommandRow } from '@/lib/atlas-console'

function StatusChip({ status }: { status: string | null }) {
  const color = commandStatusColor(status)
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
      {status ?? '—'}
    </span>
  )
}

export default function PendingCommands({ initial }: { initial: CommandRow[] }) {
  const [commands, setCommands] = useState<CommandRow[]>(initial)
  const [formOpen, setFormOpen] = useState(false)
  const [kind, setKind] = useState<'queue-need' | 'queue-mission'>('queue-need')
  const [summary, setSummary] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const text = summary.trim()
    if (!text || submitting) return
    setSubmitting(true)
    setError(null)
    // Optimistic row — replaced by the server row on success, removed on error
    const tempId = `optimistic-${Date.now()}`
    const optimistic: CommandRow = {
      id: tempId, type: kind, payload: { summary: text }, status: 'pending',
      requested_by: 'console', created_at: new Date().toISOString(),
      dispatched_at: null, completed_at: null, result: null,
    }
    setCommands(prev => [optimistic, ...prev])
    try {
      const res = await fetch('/api/atlas/commands', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: kind, payload: { summary: text } }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setCommands(prev => prev.map(c => (c.id === tempId ? (json.command as CommandRow) : c)))
      setSummary('')
      setFormOpen(false)
    } catch (e) {
      setCommands(prev => prev.filter(c => c.id !== tempId))
      setError(e instanceof Error ? e.message : 'Failed to queue command')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3 mt-8">
        <Terminal size={13} style={{ color: 'var(--muted)' }} />
        <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Pending commands
        </h2>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums"
          style={{ background: 'var(--surface2)', color: 'var(--muted-light)' }}>{commands.length}</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <button
          onClick={() => { setFormOpen(o => !o); setError(null) }}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer hover:bg-white/10"
          style={{ background: 'var(--surface2)', color: '#818cf8', border: '1px solid var(--border)' }}>
          {formOpen ? <X size={11} /> : <Plus size={11} />}
          {formOpen ? 'Close' : 'Queue for ATLAS'}
        </button>
      </div>

      {formOpen && (
        <div className="card rounded-xl px-4 py-3 mb-3 flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={kind}
            onChange={e => setKind(e.target.value as 'queue-need' | 'queue-mission')}
            className="rounded-lg px-2 py-1.5 text-xs cursor-pointer outline-none"
            style={{ background: 'var(--surface2)', color: 'white', border: '1px solid var(--border)' }}>
            <option value="queue-need">NEED</option>
            <option value="queue-mission">Mission</option>
          </select>
          <input
            value={summary}
            onChange={e => setSummary(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder={kind === 'queue-need' ? 'Describe the NEED for ATLAS…' : 'Describe the mission for ATLAS…'}
            className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none"
            style={{ background: 'var(--surface2)', color: 'white', border: '1px solid var(--border)' }}
            autoFocus
          />
          <button
            onClick={submit}
            disabled={submitting || !summary.trim()}
            className="rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500/30"
            style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.3)' }}>
            {submitting ? 'Queuing…' : 'Queue'}
          </button>
        </div>
      )}
      {error && (
        <div className="rounded-lg px-3 py-2 mb-3 text-[11px]"
          style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
          {error}
        </div>
      )}

      {commands.length === 0 ? (
        <div className="card rounded-lg px-4 py-2.5 text-xs" style={{ color: 'var(--muted)' }}>
          No commands yet — queue one for ATLAS above.
        </div>
      ) : (
        <div className="card rounded-xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left" style={{ color: 'var(--muted)' }}>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]">Type</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]">Payload</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]">Status</th>
                <th className="px-4 py-2.5 font-semibold uppercase tracking-wider text-[10px]">Requested</th>
              </tr>
            </thead>
            <tbody>
              {commands.map(c => (
                <tr key={c.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-2.5 font-mono text-white whitespace-nowrap">{c.type ?? '—'}</td>
                  <td className="px-4 py-2.5 max-w-xs truncate" style={{ color: 'var(--muted-light)' }}>
                    {commandSummary(c)}
                  </td>
                  <td className="px-4 py-2.5"><StatusChip status={c.status} /></td>
                  <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                    {relTime(c.created_at)}{c.requested_by ? ` · ${c.requested_by}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

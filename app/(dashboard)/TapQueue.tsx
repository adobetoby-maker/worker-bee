'use client'
// Built by ATLAS — 2026-07-05
// Tap queue — approve-tap commands the Bridge created from
// ~/.atlas/acquisition/taps.jsonl (PRD §4.2 §4). ATLAS prepares the package →
// Bridge inserts a pending_operator row → Toby's APPROVE here PATCHes it to
// approved_by_operator → Bridge queues the ACQUISITION NEED. The tap is the
// authorization artifact; first-contact SEND stays behind ATLAS's gate.

import { useState } from 'react'
import { Fingerprint, Check } from 'lucide-react'
import { relTime, commandStatusColor, type CommandRow } from '@/lib/atlas-console'

export default function TapQueue({ initial }: { initial: CommandRow[] }) {
  const [taps, setTaps] = useState<CommandRow[]>(initial)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function approve(id: string) {
    if (busyId) return
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch('/api/atlas/commands', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, action: 'approve' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
      setTaps(prev => prev.map(t => (t.id === id ? (json.command as CommandRow) : t)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3 mt-8">
        <Fingerprint size={13} style={{ color: 'var(--muted)' }} />
        <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Tap queue
        </h2>
        {taps.length > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums"
            style={{ background: 'var(--surface2)', color: 'var(--muted-light)' }}>{taps.length}</span>
        )}
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      {error && (
        <div className="rounded-lg px-3 py-2 mb-3 text-[11px]"
          style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
          {error}
        </div>
      )}

      {taps.length === 0 ? (
        <div className="card rounded-lg px-4 py-2.5 text-xs" style={{ color: 'var(--muted)' }}>
          No packages awaiting your tap.
        </div>
      ) : (
        <div className="card rounded-xl divide-y" style={{ borderColor: 'var(--border)' }}>
          {taps.map(t => {
            const p = (t.payload ?? {}) as Record<string, unknown>
            const prospect = String(p.prospect ?? 'Unknown prospect')
            const gap = typeof p.gap === 'string' ? p.gap : null
            const pkg = typeof p.package_path === 'string' ? p.package_path : null
            const color = commandStatusColor(t.status)
            const awaiting = t.status === 'pending_operator'
            return (
              <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">{prospect}</div>
                  <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                    {gap ?? 'package prepared'}{pkg ? ` · ${pkg}` : ''} · {relTime(t.created_at)}
                  </div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
                  style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
                  {t.status ?? '—'}
                </span>
                {awaiting && (
                  <button
                    onClick={() => approve(t.id)}
                    disabled={busyId === t.id}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-500/25"
                    style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.35)' }}>
                    <Check size={11} />
                    {busyId === t.id ? 'Approving…' : 'Approve'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

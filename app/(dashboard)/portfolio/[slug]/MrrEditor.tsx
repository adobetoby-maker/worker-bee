'use client'
// Built by ATLAS — 2026-07-05
// Inline MRR editor for a Portfolio property — PATCH /api/portfolio/[slug]/mrr
// (admin cookie required; middleware default-deny + in-route check).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Check, X } from 'lucide-react'

export default function MrrEditor({ slug, mrrCents }: { slug: string; mrrCents: number }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(mrrCents > 0 ? String(mrrCents / 100) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    const dollars = Number(value === '' ? '0' : value)
    if (!Number.isFinite(dollars) || dollars < 0) {
      setError('non-negative number')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/portfolio/${encodeURIComponent(slug)}/mrr`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mrr_cents: Math.round(dollars * 100) }),
      })
      if (!res.ok) {
        setError('save failed')
        return
      }
      setEditing(false)
      router.refresh()
    } catch {
      setError('save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1.5">
        {mrrCents > 0 ? (
          <span style={{ color: '#34d399' }}>${(mrrCents / 100).toLocaleString()}/mo</span>
        ) : (
          <span style={{ color: 'var(--muted)' }}>—</span>
        )}
        <button
          onClick={() => setEditing(true)}
          title="Edit MRR"
          aria-label="Edit MRR"
          className="cursor-pointer p-0.5 rounded transition-colors hover:bg-white/10"
        >
          <Pencil size={10} style={{ color: 'var(--muted)' }} />
        </button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="text-[11px]" style={{ color: 'var(--muted)' }}>$</span>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') { setEditing(false); setError('') }
        }}
        autoFocus
        inputMode="decimal"
        placeholder="0"
        className="w-20 rounded px-1.5 py-0.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
        style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
      />
      <span className="text-[11px]" style={{ color: 'var(--muted)' }}>/mo</span>
      <button onClick={save} disabled={saving} title="Save"
        className="cursor-pointer p-0.5 rounded transition-colors hover:bg-white/10 disabled:opacity-50">
        <Check size={11} style={{ color: '#34d399' }} />
      </button>
      <button onClick={() => { setEditing(false); setError('') }} title="Cancel"
        className="cursor-pointer p-0.5 rounded transition-colors hover:bg-white/10">
        <X size={11} style={{ color: 'var(--muted)' }} />
      </button>
      {error && <span className="text-[10px]" style={{ color: '#f87171' }}>{error}</span>}
    </span>
  )
}

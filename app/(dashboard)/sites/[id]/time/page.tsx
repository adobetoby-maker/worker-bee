'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Plus, Trash2, RefreshCw, CheckCircle, Circle } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface TimeEntry {
  id: string
  site_id: string
  date: string
  hours: number
  rate_cents: number
  description: string | null
  billed: boolean
  invoice_id: string | null
  created_at: string
}

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}` }
function fmtHours(h: number) { return `${h.toFixed(1)}h` }

// ── Component ─────────────────────────────────────────────────────────────────
export default function TimePage() {
  const params = useParams()
  const siteId = params.id as string

  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [markingBilled, setMarkingBilled] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    hours: '',
    rate: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/time-entries?site_id=${siteId}`)
      const data = await res.json()
      setEntries(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }, [siteId])

  useEffect(() => { load() }, [load])

  async function addEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!form.hours) return
    setSaving(true)
    try {
      await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, site_id: siteId }),
      })
      setForm({ date: new Date().toISOString().split('T')[0], description: '', hours: '', rate: '' })
      setShowForm(false)
      load()
    } catch {}
    setSaving(false)
  }

  async function deleteEntry(id: string) {
    if (!confirm('Delete this time entry?')) return
    setDeleting(id)
    try {
      await fetch(`/api/time-entries/${id}`, { method: 'DELETE' })
      load()
    } catch {}
    setDeleting(null)
  }

  async function markBilled() {
    if (selected.size === 0) return
    setMarkingBilled(true)
    try {
      await Promise.all([...selected].map(id =>
        fetch(`/api/time-entries/${id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ billed: true }),
        })
      ))
      setSelected(new Set())
      load()
    } catch {}
    setMarkingBilled(false)
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    const unbilled = entries.filter(e => !e.billed).map(e => e.id)
    if (selected.size === unbilled.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(unbilled))
    }
  }

  // ── Totals ──
  const totalHours    = entries.reduce((s, e) => s + e.hours, 0)
  const totalValue    = entries.reduce((s, e) => s + e.hours * e.rate_cents, 0)
  const unbilledHours = entries.filter(e => !e.billed).reduce((s, e) => s + e.hours, 0)
  const unbilledValue = entries.filter(e => !e.billed).reduce((s, e) => s + e.hours * e.rate_cents, 0)
  const unbilledIds   = entries.filter(e => !e.billed).map(e => e.id)

  return (
    <div className="max-w-5xl">
      <Link href={`/sites/${siteId}`}
        className="flex items-center gap-1.5 text-sm mb-6 hover:text-indigo-400 transition-colors"
        style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={14} /> Back to Site
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Clock size={22} style={{ color: '#60a5fa' }} />
            <h1 className="text-2xl font-bold text-white">Time Tracking</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Log hours and track billable work for this project
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={markBilled} disabled={markingBilled}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
              {markingBilled ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
              Mark {selected.size} Billed
            </button>
          )}
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
            <Plus size={14} /> Log Time
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-3 mb-6">
        <StatChip label="Total Hours" value={fmtHours(totalHours)} color="#60a5fa" />
        <StatChip label="Total Value" value={fmt(totalValue)} color="#a78bfa" />
        <StatChip label="Unbilled Hours" value={fmtHours(unbilledHours)} color="#f59e0b" />
        <StatChip label="Unbilled Value" value={fmt(unbilledValue)} color="#f87171" highlight />
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={addEntry}
          className="rounded-xl border p-5 mb-6"
          style={{ background: 'rgba(96,165,250,0.05)', borderColor: 'rgba(96,165,250,0.2)' }}>
          <p className="text-sm font-semibold text-white mb-4">Log Time Entry</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What did you work on?"
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Hours</label>
              <input type="number" step="0.25" min="0" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
                placeholder="2.0"
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Rate ($/hr)</label>
              <input type="number" step="1" min="0" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                placeholder="100"
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
            {form.hours && form.rate && (
              <div className="flex items-end pb-2">
                <span className="text-sm font-semibold" style={{ color: '#34d399' }}>
                  = {fmt(Math.round(parseFloat(form.hours) * parseFloat(form.rate) * 100))}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: '#6366f1', color: '#fff' }}>
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />} Save Entry
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-light)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm" style={{ color: 'var(--muted)' }}>
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading entries…
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border text-center"
          style={{ borderColor: 'var(--border)' }}>
          <Clock size={36} className="mb-3 opacity-20 text-white" />
          <p className="text-sm font-medium text-white mb-1">No time logged yet</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Click &quot;Log Time&quot; to track your first entry</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <th className="px-4 py-3 w-8">
                  <input type="checkbox"
                    checked={selected.size === unbilledIds.length && unbilledIds.length > 0}
                    onChange={toggleAll}
                    className="rounded" />
                </th>
                {['Date', 'Description', 'Hours', 'Rate', 'Total', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const total = e.hours * e.rate_cents
                return (
                  <tr key={e.id}
                    style={{ borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                    <td className="px-4 py-3">
                      {!e.billed && (
                        <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleSelect(e.id)}
                          className="rounded cursor-pointer" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                      {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-light)' }}>
                      {e.description ?? <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-white">{fmtHours(e.hours)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>
                      {e.rate_cents > 0 ? fmt(e.rate_cents) + '/hr' : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#a78bfa' }}>
                      {e.rate_cents > 0 ? fmt(total) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {e.billed ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                          style={{ color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}>
                          <CheckCircle size={10} /> Billed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                          style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                          <Circle size={10} /> Unbilled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteEntry(e.id)} disabled={deleting === e.id}
                        className="flex items-center justify-center w-7 h-7 rounded-lg transition-all opacity-40 hover:opacity-100"
                        style={{ color: '#f87171' }}
                        onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
                        onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                        {deleting === e.id ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatChip({ label, value, color, highlight = false }: {
  label: string; value: string; color: string; highlight?: boolean
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
      style={{
        background: highlight ? `${color}18` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${highlight ? color + '35' : 'var(--border)'}`,
      }}>
      <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="font-bold" style={{ color }}>{value}</span>
    </div>
  )
}

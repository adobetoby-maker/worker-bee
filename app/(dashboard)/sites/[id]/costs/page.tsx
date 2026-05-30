'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, DollarSign, Plus, Trash2, RefreshCw, ToggleLeft, ToggleRight,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Cost {
  id: string
  site_id: string
  service: string
  label: string
  amount_cents: number
  billing_cycle: 'monthly' | 'annual' | 'one-time'
  notes: string | null
  active: boolean
  created_at: string
}

// ── Service badge config ───────────────────────────────────────────────────────
const SERVICE_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  vercel:    { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
  supabase:  { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  railway:   { color: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.3)' },
  fal:       { color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.3)'  },
  comfy:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
  domain:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)' },
  cloudflare:{ color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.3)'  },
  github:    { color: '#e2e8f0', bg: 'rgba(226,232,240,0.08)', border: 'rgba(226,232,240,0.2)' },
  openai:    { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  other:     { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)' },
}

const SERVICES = ['vercel', 'supabase', 'railway', 'fal', 'comfy', 'domain', 'cloudflare', 'github', 'openai', 'other']
const CYCLES: ('monthly' | 'annual' | 'one-time')[] = ['monthly', 'annual', 'one-time']

function ServiceBadge({ service }: { service: string }) {
  const s = SERVICE_COLORS[service] ?? SERVICE_COLORS.other
  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium capitalize"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {service}
    </span>
  )
}

function CycleBadge({ cycle }: { cycle: string }) {
  const map: Record<string, { label: string; color: string }> = {
    monthly:  { label: 'Monthly',  color: '#60a5fa' },
    annual:   { label: 'Annual',   color: '#34d399' },
    'one-time': { label: 'One-Time', color: '#f59e0b' },
  }
  const c = map[cycle] ?? { label: cycle, color: '#94a3b8' }
  return (
    <span className="text-xs font-medium" style={{ color: c.color }}>{c.label}</span>
  )
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function toMonthly(cost: Cost): number {
  if (!cost.active) return 0
  if (cost.billing_cycle === 'monthly') return cost.amount_cents
  if (cost.billing_cycle === 'annual') return Math.round(cost.amount_cents / 12)
  return 0
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CostsPage() {
  const params = useParams()
  const siteId = params.id as string

  const [costs, setCosts] = useState<Cost[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    service: 'vercel',
    label: '',
    amount: '',
    billing_cycle: 'monthly' as 'monthly' | 'annual' | 'one-time',
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/project-costs?site_id=${siteId}`)
      const data = await res.json()
      setCosts(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }, [siteId])

  useEffect(() => { load() }, [load])

  async function addCost(e: React.FormEvent) {
    e.preventDefault()
    if (!form.label.trim() || !form.amount) return
    setSaving(true)
    try {
      await fetch('/api/project-costs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, site_id: siteId }),
      })
      setForm({ service: 'vercel', label: '', amount: '', billing_cycle: 'monthly', notes: '' })
      setShowForm(false)
      load()
    } catch {}
    setSaving(false)
  }

  async function deleteCost(id: string) {
    if (!confirm('Delete this cost?')) return
    setDeleting(id)
    try {
      await fetch(`/api/project-costs/${id}`, { method: 'DELETE' })
      load()
    } catch {}
    setDeleting(null)
  }

  async function toggleActive(cost: Cost) {
    setToggling(cost.id)
    try {
      await fetch(`/api/project-costs/${cost.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ active: !cost.active }),
      })
      load()
    } catch {}
    setToggling(null)
  }

  // ── Grouped + totals ──
  const byGroup: Record<string, Cost[]> = { monthly: [], annual: [], 'one-time': [] }
  for (const c of costs) byGroup[c.billing_cycle]?.push(c)

  const monthlyTotal  = costs.filter(c => c.billing_cycle === 'monthly').reduce((s, c) => s + (c.active ? c.amount_cents : 0), 0)
  const annualTotal   = costs.filter(c => c.billing_cycle === 'annual').reduce((s, c) => s + (c.active ? c.amount_cents : 0), 0)
  const onetimeTotal  = costs.filter(c => c.billing_cycle === 'one-time').reduce((s, c) => s + (c.active ? c.amount_cents : 0), 0)
  const grandMonthly  = costs.reduce((s, c) => s + toMonthly(c), 0)

  const groupLabels: Record<string, string> = {
    monthly: 'Monthly', annual: 'Annual', 'one-time': 'One-Time',
  }

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
            <DollarSign size={22} style={{ color: '#34d399' }} />
            <h1 className="text-2xl font-bold text-white">Project Costs</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Track all recurring and one-time costs for this site
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
          <Plus size={14} /> Add Cost
        </button>
      </div>

      {/* Summary stat chips */}
      <div className="flex flex-wrap gap-3 mb-6">
        <StatChip label="Monthly" value={fmt(monthlyTotal)} color="#60a5fa" />
        <StatChip label="Annual" value={fmt(annualTotal)} color="#34d399" />
        <StatChip label="One-Time" value={fmt(onetimeTotal)} color="#f59e0b" />
        <StatChip label="Monthly Equiv." value={fmt(grandMonthly)} color="#a78bfa" highlight />
      </div>

      {/* Inline add form */}
      {showForm && (
        <form onSubmit={addCost}
          className="rounded-xl border p-5 mb-6"
          style={{ background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.25)' }}>
          <p className="text-sm font-semibold text-white mb-4">New Cost</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Service</label>
              <select value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Label</label>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Vercel Pro Plan"
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Amount ($)</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="20.00"
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Billing Cycle</label>
              <select value={form.billing_cycle} onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value as typeof form.billing_cycle }))}
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                {CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
                className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: '#6366f1', color: '#fff' }}>
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />} Add Cost
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-light)', border: '1px solid var(--border)' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Cost groups */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm" style={{ color: 'var(--muted)' }}>
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading costs…
        </div>
      ) : costs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border"
          style={{ borderColor: 'var(--border)' }}>
          <DollarSign size={36} className="mb-3 opacity-20 text-white" />
          <p className="text-sm font-medium text-white mb-1">No costs tracked yet</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Click &quot;Add Cost&quot; to start tracking project expenses</p>
        </div>
      ) : (
        <div className="space-y-5">
          {CYCLES.map(cycle => {
            const group = byGroup[cycle]
            if (!group || group.length === 0) return null
            const groupTotal = group.reduce((s, c) => s + (c.active ? c.amount_cents : 0), 0)
            return (
              <div key={cycle}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                    {groupLabels[cycle]}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  <span className="text-xs font-semibold" style={{ color: '#94a3b8' }}>
                    {fmt(groupTotal)} / {cycle === 'annual' ? 'yr' : cycle === 'monthly' ? 'mo' : 'total'}
                  </span>
                </div>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                        {['Service', 'Label', 'Amount', 'Cycle', 'Active', ''].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.map((c, i) => (
                        <tr key={c.id}
                          style={{
                            borderBottom: i < group.length - 1 ? '1px solid var(--border)' : 'none',
                            opacity: c.active ? 1 : 0.45,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-4 py-3"><ServiceBadge service={c.service} /></td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-light)' }}>
                            {c.label}
                            {c.notes && <span className="ml-2 opacity-50">{c.notes}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-white">{fmt(c.amount_cents)}</td>
                          <td className="px-4 py-3"><CycleBadge cycle={c.billing_cycle} /></td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleActive(c)}
                              disabled={toggling === c.id}
                              className="transition-colors"
                              title={c.active ? 'Deactivate' : 'Activate'}>
                              {toggling === c.id
                                ? <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--muted)' }} />
                                : c.active
                                  ? <ToggleRight size={18} style={{ color: '#34d399' }} />
                                  : <ToggleLeft size={18} style={{ color: 'var(--muted)' }} />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => deleteCost(c.id)}
                              disabled={deleting === c.id}
                              className="flex items-center justify-center w-7 h-7 rounded-lg transition-all opacity-40 hover:opacity-100"
                              style={{ color: '#f87171' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              {deleting === c.id ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

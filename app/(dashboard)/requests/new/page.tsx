'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Inbox, RefreshCw } from 'lucide-react'

interface Client { id: string; name: string }
interface Site   { id: string; name: string; client_id: string | null }

const SOURCES = [
  { value: 'phone',   label: '📞 Phone' },
  { value: 'form',    label: '📋 Form' },
  { value: 'email',   label: '✉️ Email' },
  { value: 'message', label: '💬 Message' },
  { value: 'other',   label: '❓ Other' },
]

export default function NewRequestPage() {
  const router = useRouter()

  const [clients, setClients] = useState<Client[]>([])
  const [sites,   setSites]   = useState<Site[]>([])
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const [form, setForm] = useState({
    client_id:       '',
    site_id:         '',
    source:          'phone',
    title:           '',
    description:     '',
    estimated_hours: '',
    estimated_rate:  '',
    notes:           '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/sites').then(r => r.json()),
    ]).then(([c, s]) => {
      setClients(Array.isArray(c) ? c : [])
      setSites(Array.isArray(s) ? s : [])
    }).catch(() => {})
  }, [])

  const filteredSites = form.client_id
    ? sites.filter(s => s.client_id === form.client_id)
    : sites

  const estimatedTotal = form.estimated_hours && form.estimated_rate
    ? parseFloat(form.estimated_hours) * parseFloat(form.estimated_rate)
    : null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/project-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to save')
        setSaving(false)
        return
      }
      router.push('/requests')
    } catch {
      setError('Network error')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <Link href="/requests"
        className="flex items-center gap-1.5 text-sm mb-6 hover:text-indigo-400 transition-colors"
        style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={14} /> Back to Requests
      </Link>

      <div className="flex items-center gap-2.5 mb-6">
        <Inbox size={22} style={{ color: '#f59e0b' }} />
        <h1 className="text-2xl font-bold text-white">Log Request</h1>
      </div>

      <form onSubmit={submit}
        className="rounded-xl border p-6 space-y-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

        {/* Client + Site */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Client</label>
            <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value, site_id: '' }))}
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <option value="">— No client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Site</label>
            <select value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}
              className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <option value="">— No site —</option>
              {filteredSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Source */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Source</label>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map(s => (
              <button key={s.value} type="button"
                onClick={() => setForm(f => ({ ...f, source: s.value }))}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  color:      form.source === s.value ? '#a5b4fc' : 'var(--muted-light)',
                  background: form.source === s.value ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                  border:     form.source === s.value ? '1px solid rgba(99,102,241,0.35)' : '1px solid var(--border)',
                }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
            Title <span style={{ color: '#f87171' }}>*</span>
          </label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Add booking form to homepage"
            className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Description</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="More detail about what's needed…" rows={3}
            className="w-full text-sm rounded-lg px-3 py-2.5 outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>

        {/* Estimate */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Estimate</label>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <input type="number" min="0" step="0.5" value={form.estimated_hours}
                onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value }))}
                placeholder="Hours"
                className="flex-1 text-sm rounded-lg px-3 py-2.5 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>hrs</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>@</span>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>$</span>
              <input type="number" min="0" step="1" value={form.estimated_rate}
                onChange={e => setForm(f => ({ ...f, estimated_rate: e.target.value }))}
                placeholder="Rate"
                className="flex-1 text-sm rounded-lg px-3 py-2.5 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }} />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>/hr</span>
            </div>
            {estimatedTotal !== null && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold shrink-0"
                style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa' }}>
                ${estimatedTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Internal notes, context, follow-up actions…" rows={2}
            className="w-full text-sm rounded-lg px-3 py-2.5 outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </div>

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg"
            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: '#6366f1', color: '#fff' }}>
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Inbox size={14} />}
            {saving ? 'Saving…' : 'Log Request'}
          </button>
          <Link href="/requests"
            className="flex items-center px-5 py-2.5 rounded-lg text-sm transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted-light)', border: '1px solid var(--border)' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

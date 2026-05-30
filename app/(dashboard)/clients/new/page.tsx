'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, ArrowLeft, Save, Loader2 } from 'lucide-react'

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder = '',
  hint,
}: {
  label: string
  name: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  placeholder?: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
        {label} {required && <span style={{ color: '#f87171' }}>*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm rounded-lg outline-none transition-colors focus:ring-1"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'
          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.3)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
      {hint && <p className="text-xs" style={{ color: 'var(--muted)' }}>{hint}</p>}
    </div>
  )
}

export default function NewClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
  })

  function set(field: keyof typeof form) {
    return (value: string) => setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }

    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create client')
        setSaving(false)
        return
      }
      router.push(`/clients/${data.id}`)
    } catch {
      setError('Network error — please try again')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl">
      {/* Header */}
      <div className="mb-7">
        <Link
          href="/clients"
          className="flex items-center gap-1.5 text-xs mb-4 hover:text-indigo-300 transition-colors"
          style={{ color: 'var(--muted)' }}
        >
          <ArrowLeft size={12} /> All Clients
        </Link>
        <div className="flex items-center gap-2.5 mb-1">
          <Users size={20} style={{ color: '#818cf8' }} />
          <h1 className="text-2xl font-bold text-white">New Client</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
          Add a client to link sites, projects, and billing together.
        </p>
      </div>

      {/* Form card */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border p-6 space-y-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <Field
          label="Name"
          name="name"
          value={form.name}
          onChange={set('name')}
          required
          placeholder="Jane Smith"
        />
        <Field
          label="Email"
          name="email"
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="jane@example.com"
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={set('phone')}
          placeholder="(208) 555-0100"
        />
        <Field
          label="Company"
          name="company"
          value={form.company}
          onChange={set('company')}
          placeholder="Acme LLC"
        />

        {/* Notes textarea */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Notes
          </label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={e => set('notes')(e.target.value)}
            rows={3}
            placeholder="Any relevant background info…"
            className="w-full px-3 py-2.5 text-sm rounded-lg outline-none resize-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)'
              e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.3)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
        </div>

        {error && (
          <div
            className="text-sm px-4 py-3 rounded-lg"
            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/clients"
            className="text-sm px-4 py-2 rounded-lg transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border)',
              color: 'var(--muted-light)',
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: 'rgba(99,102,241,0.2)',
              border: '1px solid rgba(99,102,241,0.45)',
              color: '#818cf8',
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Creating…' : 'Create Client'}
          </button>
        </div>
      </form>
    </div>
  )
}

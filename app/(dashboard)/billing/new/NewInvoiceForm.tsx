'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, ArrowLeft, Bot, Server, Wrench, Share2 } from 'lucide-react'
import { formatCents, parseDollars } from '@/lib/billing'

type SiteOption = { id: string; name: string; url: string }

type LineItem = {
  description: string
  category: string
  quantity: number
  unit_price_dollars: string
}

const CATEGORY_OPTIONS = [
  { value: 'service', label: 'Service' },
  { value: 'ai-cost', label: 'AI Cost' },
  { value: 'hosting', label: 'Hosting' },
  { value: 'affiliate-setup', label: 'Affiliate Setup' },
  { value: 'maintenance', label: 'Maintenance' },
]

const QUICK_ADD = [
  {
    label: '+ AI Build Cost',
    icon: Bot,
    item: { description: 'AI-assisted site build (Claude API)', category: 'ai-cost', quantity: 1, unit_price_dollars: '64.00' },
  },
  {
    label: '+ Monthly Hosting',
    icon: Server,
    item: { description: 'Vercel hosting – monthly', category: 'hosting', quantity: 1, unit_price_dollars: '20.00' },
  },
  {
    label: '+ Affiliate Setup',
    icon: Share2,
    item: { description: 'Affiliate program integration & setup', category: 'affiliate-setup', quantity: 1, unit_price_dollars: '150.00' },
  },
  {
    label: '+ Maintenance',
    icon: Wrench,
    item: { description: 'Monthly site maintenance & updates', category: 'maintenance', quantity: 1, unit_price_dollars: '75.00' },
  },
]

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#e2e8f0',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  outline: 'none',
  width: '100%',
}

const labelStyle: React.CSSProperties = {
  color: 'var(--muted)',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.07em',
  marginBottom: 4,
  display: 'block',
}

export default function NewInvoiceForm({ sites }: { sites: SiteOption[] }) {
  const router = useRouter()

  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [siteId, setSiteId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [taxRatePct, setTaxRatePct] = useState(0)
  const [notes, setNotes] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [items, setItems] = useState<LineItem[]>([
    { description: '', category: 'service', quantity: 1, unit_price_dollars: '0.00' },
  ])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  // Fetch next invoice number on mount
  useEffect(() => {
    fetch('/api/invoices/next-number')
      .then(r => r.json())
      .then((d: { invoiceNumber?: string }) => {
        if (d.invoiceNumber) setInvoiceNumber(d.invoiceNumber)
      })
      .catch(() => null)
  }, [])

  // Calculate totals
  const itemTotals = items.map(item => {
    const unitCents = parseDollars(item.unit_price_dollars)
    return Math.round(item.quantity * unitCents)
  })
  const subtotalCents = itemTotals.reduce((sum, t) => sum + t, 0)
  const taxCents = Math.round(subtotalCents * taxRatePct / 100)
  const totalCents = subtotalCents + taxCents

  const updateItem = useCallback(<K extends keyof LineItem>(index: number, key: K, value: LineItem[K]) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [key]: value } : item))
  }, [])

  const addItem = useCallback((preset?: Partial<LineItem>) => {
    setItems(prev => [...prev, {
      description: preset?.description ?? '',
      category: preset?.category ?? 'service',
      quantity: preset?.quantity ?? 1,
      unit_price_dollars: preset?.unit_price_dollars ?? '0.00',
    }])
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  async function handleSubmit(status: 'draft' | 'sent') {
    setError(null)
    if (!clientName.trim()) { setError('Client name is required'); return }
    if (!invoiceNumber.trim()) { setError('Invoice number is required'); return }
    if (items.length === 0) { setError('Add at least one line item'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site_id: siteId || undefined,
          client_name: clientName.trim(),
          client_email: clientEmail.trim() || undefined,
          invoice_number: invoiceNumber.trim(),
          due_date: dueDate || undefined,
          tax_rate_pct: taxRatePct,
          notes: notes.trim() || undefined,
          status,
          items: items.map(item => ({
            description: item.description,
            category: item.category,
            quantity: item.quantity,
            unit_price_cents: parseDollars(item.unit_price_dollars),
          })),
        }),
      })

      const data = await res.json() as { invoice?: { id: string }; error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Failed to create invoice')
        return
      }
      if (data.invoice?.id) {
        router.push(`/billing/${data.invoice.id}`)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/billing"
          className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/5"
          style={{ color: 'var(--muted)' }}
        >
          <ArrowLeft size={12} /> All Invoices
        </Link>
      </div>
      <h1 className="text-xl font-bold text-white mb-6">New Invoice</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: Form */}
        <div className="space-y-5">
          {/* Basic info */}
          <div
            className="rounded-xl border p-5"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <h2 className="text-sm font-semibold text-white mb-4">Invoice Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Invoice #</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  style={inputStyle}
                  placeholder="INV-2026-001"
                />
              </div>
              <div>
                <label style={labelStyle}>Issued Date</label>
                <input
                  type="text"
                  value={today}
                  readOnly
                  style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Client Name *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  style={inputStyle}
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label style={labelStyle}>Client Email</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  style={inputStyle}
                  placeholder="billing@acme.com"
                />
              </div>
              <div>
                <label style={labelStyle}>Site</label>
                <select
                  value={siteId}
                  onChange={e => setSiteId(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">No specific site</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Tax Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRatePct}
                  onChange={e => setTaxRatePct(parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Line items */}
          <div
            className="rounded-xl border p-5"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Line Items</h2>
            </div>

            {/* Quick add buttons */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {QUICK_ADD.map(({ label, icon: Icon, item }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => addItem(item)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors hover:bg-white/5"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}
                >
                  <Icon size={10} />
                  {label}
                </button>
              ))}
            </div>

            {/* Items table header */}
            <div
              className="grid text-xs font-semibold uppercase tracking-wider pb-2 mb-1"
              style={{
                gridTemplateColumns: '1fr 140px 60px 90px 80px 30px',
                gap: 8,
                color: 'var(--muted)',
              }}
            >
              <span>Description</span>
              <span>Category</span>
              <span>Qty</span>
              <span>Unit ($)</span>
              <span>Total</span>
              <span></span>
            </div>

            {/* Item rows */}
            <div className="space-y-2">
              {items.map((item, i) => {
                const unitCents = parseDollars(item.unit_price_dollars)
                const lineCents = Math.round(item.quantity * unitCents)
                return (
                  <div
                    key={i}
                    className="grid items-center"
                    style={{ gridTemplateColumns: '1fr 140px 60px 90px 80px 30px', gap: 8 }}
                  >
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => updateItem(i, 'description', e.target.value)}
                      placeholder="Description"
                      style={{ ...inputStyle, padding: '6px 10px', fontSize: 12 }}
                    />
                    <select
                      value={item.category}
                      onChange={e => updateItem(i, 'category', e.target.value)}
                      style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, cursor: 'pointer' }}
                    >
                      {CATEGORY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.01"
                      step="1"
                      value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', Math.max(0.01, parseFloat(e.target.value) || 1))}
                      style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, textAlign: 'right' }}
                    />
                    <input
                      type="text"
                      value={item.unit_price_dollars}
                      onChange={e => updateItem(i, 'unit_price_dollars', e.target.value)}
                      onBlur={e => {
                        const cents = parseDollars(e.target.value)
                        updateItem(i, 'unit_price_dollars', (cents / 100).toFixed(2))
                      }}
                      placeholder="0.00"
                      style={{ ...inputStyle, padding: '6px 8px', fontSize: 12, textAlign: 'right' }}
                    />
                    <div className="text-xs font-semibold text-right" style={{ color: '#e2e8f0', paddingRight: 4 }}>
                      {formatCents(lineCents)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      disabled={items.length === 1}
                      className="flex items-center justify-center rounded-lg transition-colors disabled:opacity-20"
                      style={{ color: '#f87171', padding: 4 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Add item */}
            <button
              type="button"
              onClick={() => addItem()}
              className="flex items-center gap-1.5 text-xs mt-3 px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
              style={{ borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8' }}
            >
              <Plus size={12} /> Add item
            </button>
          </div>

          {/* Notes */}
          <div
            className="rounded-xl border p-5"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <label style={{ ...labelStyle, marginBottom: 8 }}>Notes / Payment Instructions</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Payment due within 14 days. Bank transfer or PayPal accepted."
              rows={3}
              style={{
                ...inputStyle,
                resize: 'vertical',
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="text-sm px-4 py-3 rounded-lg border"
              style={{ borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#f87171' }}
            >
              {error}
            </div>
          )}

          {/* Submit buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSubmit('draft')}
              disabled={submitting}
              className="text-sm px-5 py-2.5 rounded-lg border font-semibold transition-colors disabled:opacity-60"
              style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}
            >
              {submitting ? 'Saving…' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('sent')}
              disabled={submitting}
              className="text-sm px-5 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-60"
              style={{
                background: 'rgba(99,102,241,0.25)',
                color: '#818cf8',
                border: '1px solid rgba(99,102,241,0.4)',
              }}
            >
              {submitting ? 'Creating…' : 'Create & Send'}
            </button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="hidden lg:block">
          <div
            className="sticky top-4 rounded-xl border overflow-hidden"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            {/* Preview header */}
            <div
              className="px-4 py-3 border-b"
              style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.02)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold text-white">
                  {invoiceNumber || 'INV-XXXX-XXX'}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(107,114,128,0.2)', color: '#9ca3af' }}
                >
                  draft
                </span>
              </div>
              <div className="text-xs font-semibold text-white">{clientName || 'Client Name'}</div>
              {clientEmail && <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{clientEmail}</div>}
            </div>

            {/* Preview items */}
            <div className="px-4 py-3">
              {items.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: 'var(--muted)' }}>No items</p>
              ) : (
                <div className="space-y-1 mb-3">
                  {items.map((item, i) => {
                    const unitCents = parseDollars(item.unit_price_dollars)
                    const lineCents = Math.round(item.quantity * unitCents)
                    return (
                      <div key={i} className="flex items-start justify-between gap-2 text-xs">
                        <span className="flex-1 truncate text-white">{item.description || <span style={{ color: 'var(--muted)' }}>Item {i + 1}</span>}</span>
                        <span style={{ color: 'var(--muted-light)', whiteSpace: 'nowrap' }}>
                          {item.quantity} × {formatCents(unitCents)}
                        </span>
                        <span className="font-semibold text-white w-16 text-right">{formatCents(lineCents)}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Preview totals */}
              <div className="border-t pt-2 space-y-1 text-xs" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex justify-between" style={{ color: 'var(--muted-light)' }}>
                  <span>Subtotal</span>
                  <span>{formatCents(subtotalCents)}</span>
                </div>
                {taxRatePct > 0 && (
                  <div className="flex justify-between" style={{ color: 'var(--muted-light)' }}>
                    <span>Tax ({taxRatePct}%)</span>
                    <span>{formatCents(taxCents)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-white pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                  <span>Total</span>
                  <span>{formatCents(totalCents)}</span>
                </div>
              </div>

              {notes && (
                <p className="mt-3 text-xs italic" style={{ color: 'var(--muted)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                  {notes}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

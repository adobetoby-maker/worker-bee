export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase'
import { formatCents, getInvoiceStatusColor } from '@/lib/billing'
import type { InvoiceWithItems } from '@/lib/billing'
import { ArrowLeft } from 'lucide-react'
import InvoiceActions from './InvoiceActions'

const db = supabaseAdmin as any

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const CATEGORY_LABELS: Record<string, string> = {
  service: 'Service',
  'ai-cost': 'AI Cost',
  hosting: 'Hosting',
  'affiliate-setup': 'Affiliate Setup',
  maintenance: 'Maintenance',
}

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data, error } = await db
    .from('invoices')
    .select(`
      *,
      invoice_items ( * ),
      sites ( name, url )
    `)
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoice = data as unknown as InvoiceWithItems

  const statusColor = getInvoiceStatusColor(invoice.status)
  const taxCents = invoice.total_cents - invoice.subtotal_cents

  // Sort items: services first, then ai-cost, hosting, etc.
  const items = [...(invoice.invoice_items ?? [])].sort((a, b) =>
    a.category.localeCompare(b.category)
  )

  return (
    <div className="max-w-3xl">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/billing"
          className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/5"
          style={{ color: 'var(--muted)' }}
        >
          <ArrowLeft size={12} /> All Invoices
        </Link>
      </div>

      {/* Invoice document */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Invoice header band */}
        <div
          className="px-8 py-6 border-b"
          style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="flex items-start justify-between gap-4">
            {/* Left: from */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1L12.196 4V10L7 13L1.804 10V4L7 1Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                    <circle cx="7" cy="7" r="1.5" fill="white" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Worker-Bee Agency</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>manage.worker-bee.app</div>
                </div>
              </div>
              <div className="text-xs uppercase tracking-widest font-bold" style={{ color: 'var(--muted)', letterSpacing: '0.15em' }}>
                Invoice
              </div>
            </div>

            {/* Right: invoice number + status */}
            <div className="text-right">
              <div className="text-xl font-mono font-bold text-white mb-2">
                {invoice.invoice_number}
              </div>
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize"
                style={{
                  background: `${statusColor}18`,
                  color: statusColor,
                  border: `1px solid ${statusColor}40`,
                }}
              >
                {invoice.status}
              </span>
            </div>
          </div>
        </div>

        {/* Bill to + dates */}
        <div
          className="px-8 py-5 grid grid-cols-2 gap-8 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
              Bill To
            </div>
            <div className="text-sm font-semibold text-white">{invoice.client_name}</div>
            {invoice.client_email && (
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted-light)' }}>
                {invoice.client_email}
              </div>
            )}
            {invoice.sites?.name && (
              <div className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
                Site: {invoice.sites.name}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs content-start">
            <div>
              <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Issued</span>
              <div className="mt-0.5 text-white">{formatDate(invoice.issued_date)}</div>
            </div>
            <div>
              <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Due</span>
              <div className="mt-0.5" style={{ color: invoice.status === 'overdue' ? '#ef4444' : '#e2e8f0' }}>
                {formatDate(invoice.due_date)}
              </div>
            </div>
            {invoice.paid_at && (
              <div className="col-span-2">
                <span className="font-semibold uppercase tracking-wider" style={{ color: '#10b981' }}>Paid</span>
                <div className="mt-0.5" style={{ color: '#34d399' }}>{formatDate(invoice.paid_at)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="px-8 py-5">
          {/* Items header */}
          <div
            className="grid text-xs font-semibold uppercase tracking-wider pb-2 mb-1 border-b"
            style={{
              gridTemplateColumns: '1fr 130px 60px 90px 90px',
              gap: 12,
              borderColor: 'rgba(255,255,255,0.08)',
              color: 'var(--muted)',
            }}
          >
            <span>Description</span>
            <span>Category</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit</span>
            <span className="text-right">Total</span>
          </div>

          {/* Item rows */}
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            {items.map(item => (
              <div
                key={item.id}
                className="grid py-3 text-sm items-center"
                style={{ gridTemplateColumns: '1fr 130px 60px 90px 90px', gap: 12 }}
              >
                <div className="text-white">{item.description}</div>
                <div className="text-xs" style={{ color: 'var(--muted-light)' }}>
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </div>
                <div className="text-right text-xs" style={{ color: 'var(--muted-light)' }}>
                  {item.quantity}
                </div>
                <div className="text-right text-xs" style={{ color: 'var(--muted-light)' }}>
                  {formatCents(item.unit_price_cents)}
                </div>
                <div className="text-right font-semibold text-white">
                  {formatCents(item.total_cents)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div
            className="mt-4 pt-4 border-t"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <div className="flex flex-col items-end gap-1.5 text-sm">
              <div className="flex items-center gap-8">
                <span style={{ color: 'var(--muted)' }}>Subtotal</span>
                <span className="text-white font-medium w-24 text-right">
                  {formatCents(invoice.subtotal_cents)}
                </span>
              </div>
              <div className="flex items-center gap-8">
                <span style={{ color: 'var(--muted)' }}>
                  Tax ({invoice.tax_rate_pct ?? 0}%)
                </span>
                <span className="text-white font-medium w-24 text-right">
                  {formatCents(taxCents)}
                </span>
              </div>
              <div
                className="flex items-center gap-8 pt-2 mt-1 border-t"
                style={{ borderColor: 'rgba(255,255,255,0.15)' }}
              >
                <span className="font-bold text-white">Total</span>
                <span className="font-bold text-white text-lg w-24 text-right">
                  {formatCents(invoice.total_cents)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div
            className="px-8 py-4 border-t text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}
          >
            <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              Notes:{' '}
            </span>
            {invoice.notes}
          </div>
        )}

        {/* Actions */}
        <div
          className="px-8 py-4 border-t flex items-center gap-3"
          style={{ borderColor: 'var(--border)', background: 'rgba(255,255,255,0.01)' }}
        >
          <InvoiceActions invoiceId={invoice.id} currentStatus={invoice.status} />
        </div>
      </div>
    </div>
  )
}

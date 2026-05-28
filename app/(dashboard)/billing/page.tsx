export const dynamic = 'force-dynamic'

import Link from 'next/link'
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabaseAdmin } from '@/lib/supabase'
import { formatCents, getInvoiceStatusColor } from '@/lib/billing'
import type { InvoiceWithMeta } from '@/lib/billing'
import { Plus, FileText } from 'lucide-react'

const db = supabaseAdmin as any

export const metadata = { title: 'Billing — Worker-Bee' }

function StatusBadge({ status }: { status: string }) {
  const color = getInvoiceStatusColor(status)
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}33`,
      }}
    >
      {status}
    </span>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-1"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--muted)' }}>{sub}</p>}
    </div>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function BillingPage() {
  // Fetch invoices joined with sites
  const { data, error } = await db
    .from('invoices')
    .select(`
      *,
      sites ( name, url ),
      invoice_items ( id )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="max-w-5xl">
        <p className="text-red-400 text-sm">Error loading invoices: {error.message}</p>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoices: InvoiceWithMeta[] = (data ?? []).map((inv: any) => ({
    ...inv,
    site_name: inv.sites?.name ?? null,
    site_url: inv.sites?.url ?? null,
    item_count: Array.isArray(inv.invoice_items) ? inv.invoice_items.length : 0,
    sites: undefined,
    invoice_items: undefined,
  }))

  // Summary calculations
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const totalInvoiced = invoices
    .filter(inv => inv.status !== 'draft')
    .reduce((sum, inv) => sum + inv.total_cents, 0)

  const outstanding = invoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.total_cents, 0)

  const paidThisMonth = invoices
    .filter(inv => inv.status === 'paid' && inv.paid_at && inv.paid_at >= thisMonthStart)
    .reduce((sum, inv) => sum + inv.total_cents, 0)

  const draftCount = invoices.filter(inv => inv.status === 'draft').length

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Billing &amp; Invoices</h1>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link
          href="/billing/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{
            background: 'rgba(99,102,241,0.2)',
            color: '#818cf8',
            border: '1px solid rgba(99,102,241,0.35)',
          }}
        >
          <Plus size={15} />
          New Invoice
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Invoiced" value={formatCents(totalInvoiced)} sub="excl. drafts" />
        <StatCard label="Outstanding" value={formatCents(outstanding)} sub="sent + overdue" />
        <StatCard label="Paid This Month" value={formatCents(paidThisMonth)} />
        <StatCard label="Drafts" value={String(draftCount)} sub="not yet sent" />
      </div>

      {/* Invoice table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <FileText size={40} style={{ color: 'var(--muted)', opacity: 0.3 }} />
            <div className="text-center">
              <p className="text-sm font-semibold text-white mb-1">No invoices yet</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Create your first invoice to get started.
              </p>
            </div>
            <Link
              href="/billing/new"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: 'rgba(99,102,241,0.4)', color: '#818cf8' }}
            >
              <Plus size={12} /> New Invoice
            </Link>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div
              className="hidden md:grid px-5 py-2.5 border-b text-xs font-semibold uppercase tracking-wider"
              style={{
                gridTemplateColumns: '130px 1fr 160px 100px 100px 90px 90px 70px',
                gap: 12,
                borderColor: 'rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
                color: 'var(--muted)',
              }}
            >
              <span>#</span>
              <span>Client</span>
              <span>Site</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Issued</span>
              <span>Due</span>
              <span></span>
            </div>

            {/* Table rows */}
            <div>
              {invoices.map((inv, i) => (
                <div
                  key={inv.id}
                  className="grid px-5 py-3.5 items-center border-b last:border-b-0 hover:bg-white/[0.02] transition-colors"
                  style={{
                    gridTemplateColumns: '130px 1fr 160px 100px 100px 90px 90px 70px',
                    gap: 12,
                    borderColor: 'rgba(255,255,255,0.05)',
                  }}
                >
                  {/* Invoice number */}
                  <div className="font-mono text-xs font-semibold text-white truncate">
                    {inv.invoice_number}
                  </div>

                  {/* Client */}
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{inv.client_name}</div>
                    {inv.client_email && (
                      <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                        {inv.client_email}
                      </div>
                    )}
                  </div>

                  {/* Site */}
                  <div className="text-xs truncate" style={{ color: 'var(--muted-light)' }}>
                    {inv.site_name ?? <span style={{ color: 'var(--muted)' }}>—</span>}
                  </div>

                  {/* Amount */}
                  <div className="text-sm font-semibold text-white">
                    {formatCents(inv.total_cents)}
                  </div>

                  {/* Status badge */}
                  <div>
                    <StatusBadge status={inv.status} />
                  </div>

                  {/* Issued */}
                  <div className="text-xs" style={{ color: 'var(--muted-light)' }}>
                    {formatDate(inv.issued_date)}
                  </div>

                  {/* Due */}
                  <div className="text-xs" style={{ color: inv.status === 'overdue' ? '#ef4444' : 'var(--muted-light)' }}>
                    {formatDate(inv.due_date)}
                  </div>

                  {/* View */}
                  <div>
                    <Link
                      href={`/billing/${inv.id}`}
                      className="text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

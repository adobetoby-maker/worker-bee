/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const db = supabaseAdmin as any

const CATEGORY_LABELS: Record<string, string> = {
  service: 'Service',
  'ai-cost': 'AI Cost',
  hosting: 'Hosting',
  'affiliate-setup': 'Affiliate Setup',
  maintenance: 'Maintenance',
}

function fmtCents(cents: number): string {
  return '$' + (cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { data } = await db
    .from('invoices')
    .select('invoice_number, client_name')
    .eq('public_token', token)
    .single()
  if (!data) return { title: 'Invoice — Worker-Bee Agency' }
  return { title: `Invoice ${data.invoice_number} for ${data.client_name} — Worker-Bee Agency` }
}

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const { data, error } = await db
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('public_token', token)
    .single()

  if (error || !data) notFound()

  const invoice = data as any
  const items = [...(invoice.invoice_items ?? [])].sort((a: any, b: any) =>
    a.category.localeCompare(b.category)
  )
  const taxCents = invoice.total_cents - invoice.subtotal_cents
  const taxPct = Number(invoice.tax_rate_pct ?? 0)
  const isPaid = invoice.status === 'paid'
  const pdfUrl = `/api/invoice-pdf/${invoice.id}?token=${token}`

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '32px 16px 64px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Top bar */}
      <div style={{ maxWidth: 720, margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L12.196 4V10L7 13L1.804 10V4L7 1Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="7" cy="7" r="1.5" fill="white"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Worker-Bee Agency</div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>manage.worker-bee.app</div>
          </div>
        </div>
        <a
          href={pdfUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            background: '#1e293b',
            color: '#f8fafc',
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download PDF
        </a>
      </div>

      {/* Invoice card */}
      <div style={{ maxWidth: 720, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '32px 40px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Worker-Bee Agency</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>manage.worker-bee.app</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Invoice</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{invoice.invoice_number}</div>
            <div style={{ marginTop: 8 }}>
              {isPaid ? (
                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, background: '#dcfce7', color: '#15803d', fontSize: 10, fontWeight: 700 }}>PAID</span>
              ) : (
                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, background: '#dbeafe', color: '#1d4ed8', fontSize: 10, fontWeight: 700 }}>{invoice.status.toUpperCase()}</span>
              )}
            </div>
          </div>
        </div>

        {/* Meta: Bill To + Dates */}
        <div style={{ padding: '24px 40px', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Bill To</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{invoice.client_name}</div>
            {invoice.client_email && (
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{invoice.client_email}</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Issued</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{fmtDate(invoice.issued_date ?? invoice.created_at)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Due</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: invoice.status === 'overdue' ? '#dc2626' : '#1e293b' }}>{fmtDate(invoice.due_date)}</div>
          </div>
        </div>

        {/* Line items */}
        <div style={{ padding: '24px 40px' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 50px 90px 90px', gap: 12, padding: '8px 12px', background: '#f1f5f9', borderRadius: 6, marginBottom: 4 }}>
            {(['Description', 'Category', 'Qty', 'Unit Price', 'Total']).map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: i >= 2 ? 'right' : 'left' }}>
                {h}
              </div>
            ))}
          </div>

          {/* Item rows */}
          {items.map((item: any, idx: number) => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 50px 90px 90px', gap: 12, padding: '11px 12px', borderBottom: '1px solid #f1f5f9', background: idx % 2 === 1 ? '#fafafa' : 'transparent' }}>
              <div style={{ fontSize: 13, color: '#0f172a' }}>{item.description}</div>
              <div style={{ fontSize: 11, color: '#64748b' }}>{CATEGORY_LABELS[item.category] ?? item.category}</div>
              <div style={{ fontSize: 11, color: '#64748b', textAlign: 'right' }}>{item.quantity}</div>
              <div style={{ fontSize: 11, color: '#64748b', textAlign: 'right' }}>{fmtCents(item.unit_price_cents)}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>{fmtCents(item.total_cents)}</div>
            </div>
          ))}

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <div style={{ width: 240 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Subtotal</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{fmtCents(invoice.subtotal_cents)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Tax ({taxPct}%)</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{fmtCents(taxCents)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', marginTop: 4, borderTop: '2px solid #0f172a' }}>
                {isPaid ? (
                  <>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#15803d' }}>PAID</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#15803d' }}>{fmtCents(invoice.total_cents)}</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Amount Due</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{fmtCents(invoice.total_cents)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div style={{ padding: '20px 40px', borderTop: '1px solid #e2e8f0', background: '#fafafa' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Notes</div>
            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{invoice.notes}</div>
          </div>
        )}

        {/* Bottom download CTA */}
        <div style={{ padding: '20px 40px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' }}>
          <a
            href={pdfUrl}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 24px',
              borderRadius: 8,
              background: '#0f172a',
              color: '#f8fafc',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download PDF
          </a>
        </div>
      </div>

      {/* Page footer */}
      <div style={{ maxWidth: 720, margin: '24px auto 0', textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
        Sent by Worker-Bee Agency
      </div>
    </div>
  )
}

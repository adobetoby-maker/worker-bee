/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const db = supabaseAdmin as any

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  agencyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  agencyUrl: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  invoiceLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    letterSpacing: 1.5,
    marginBottom: 4,
    textAlign: 'right',
  },
  invoiceNumber: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    textAlign: 'right',
  },
  statusBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-end',
  },
  statusText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metaBlock: {
    flexDirection: 'column',
    flex: 1,
  },
  metaLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  metaValueSub: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  colDesc: { flex: 1 },
  colCat: { width: 90 },
  colQty: { width: 40 },
  colUnit: { width: 70 },
  colTotal: { width: 70 },
  cellText: { fontSize: 9, color: '#1e293b' },
  cellMuted: { fontSize: 9, color: '#64748b' },
  cellRight: { textAlign: 'right' },
  totalsSection: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  totalsTable: {
    width: 220,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalsRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#0f172a',
  },
  totalsLabel: { fontSize: 9, color: '#64748b' },
  totalsValue: { fontSize: 9, color: '#1e293b', fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  totalsFinalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  totalsFinalValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#0f172a', textAlign: 'right' },
  notesSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  notesLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    textAlign: 'center',
    fontSize: 8,
    color: '#cbd5e1',
  },
})

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
  if (!d) return 'Upon receipt'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function statusColors(status: string): { bg: string; text: string } {
  switch (status) {
    case 'paid':    return { bg: '#dcfce7', text: '#15803d' }
    case 'sent':    return { bg: '#dbeafe', text: '#1d4ed8' }
    case 'overdue': return { bg: '#fee2e2', text: '#b91c1c' }
    default:        return { bg: '#f1f5f9', text: '#475569' }
  }
}

function buildPdf(invoice: any, items: any[]) {
  const taxCents = invoice.total_cents - invoice.subtotal_cents
  const sc = statusColors(invoice.status)
  const taxPct = Number(invoice.tax_rate_pct ?? 0)

  return createElement(Document, { title: 'Invoice ' + invoice.invoice_number },
    createElement(Page, { size: 'A4', style: styles.page },
      // Header row: agency name | invoice number
      createElement(View, { style: styles.header },
        createElement(View, null,
          createElement(Text, { style: styles.agencyName }, 'Worker-Bee Agency'),
          createElement(Text, { style: styles.agencyUrl }, 'manage.worker-bee.app'),
        ),
        createElement(View, null,
          createElement(Text, { style: styles.invoiceLabel }, 'INVOICE'),
          createElement(Text, { style: styles.invoiceNumber }, invoice.invoice_number),
          createElement(View, { style: [styles.statusBadge, { backgroundColor: sc.bg }] },
            createElement(Text, { style: [styles.statusText, { color: sc.text }] }, invoice.status.toUpperCase()),
          ),
        ),
      ),

      // Bill To + dates
      createElement(View, { style: styles.metaRow },
        createElement(View, { style: styles.metaBlock },
          createElement(Text, { style: styles.metaLabel }, 'BILL TO'),
          createElement(Text, { style: styles.metaValue }, invoice.client_name),
          invoice.client_email ? createElement(Text, { style: styles.metaValueSub }, invoice.client_email) : null,
        ),
        createElement(View, { style: [styles.metaBlock, { alignItems: 'flex-end' }] },
          createElement(Text, { style: styles.metaLabel }, 'ISSUED'),
          createElement(Text, { style: styles.metaValue }, fmtDate(invoice.issued_date ?? invoice.created_at)),
        ),
        createElement(View, { style: [styles.metaBlock, { alignItems: 'flex-end' }] },
          createElement(Text, { style: styles.metaLabel }, 'DUE'),
          createElement(Text, { style: styles.metaValue }, fmtDate(invoice.due_date)),
        ),
      ),

      // Table header
      createElement(View, { style: styles.tableHeader },
        createElement(Text, { style: [styles.tableHeaderCell, styles.colDesc] }, 'DESCRIPTION'),
        createElement(Text, { style: [styles.tableHeaderCell, styles.colCat] }, 'CATEGORY'),
        createElement(Text, { style: [styles.tableHeaderCell, styles.colQty, styles.cellRight] }, 'QTY'),
        createElement(Text, { style: [styles.tableHeaderCell, styles.colUnit, styles.cellRight] }, 'UNIT'),
        createElement(Text, { style: [styles.tableHeaderCell, styles.colTotal, styles.cellRight] }, 'TOTAL'),
      ),

      // Item rows
      ...items.map((item: any, idx: number) =>
        createElement(View, { key: idx.toString(), style: idx % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow },
          createElement(Text, { style: [styles.cellText, styles.colDesc] }, item.description),
          createElement(Text, { style: [styles.cellMuted, styles.colCat] }, CATEGORY_LABELS[item.category] ?? item.category),
          createElement(Text, { style: [styles.cellMuted, styles.colQty, styles.cellRight] }, String(item.quantity)),
          createElement(Text, { style: [styles.cellMuted, styles.colUnit, styles.cellRight] }, fmtCents(item.unit_price_cents)),
          createElement(Text, { style: [styles.cellText, styles.colTotal, styles.cellRight] }, fmtCents(item.total_cents)),
        )
      ),

      // Totals
      createElement(View, { style: styles.totalsSection },
        createElement(View, { style: styles.totalsTable },
          createElement(View, { style: styles.totalsRow },
            createElement(Text, { style: styles.totalsLabel }, 'Subtotal'),
            createElement(Text, { style: styles.totalsValue }, fmtCents(invoice.subtotal_cents)),
          ),
          createElement(View, { style: styles.totalsRow },
            createElement(Text, { style: styles.totalsLabel }, 'Tax (' + taxPct + '%)'),
            createElement(Text, { style: styles.totalsValue }, fmtCents(taxCents)),
          ),
          createElement(View, { style: styles.totalsRowFinal },
            createElement(Text, { style: styles.totalsFinalLabel }, 'Total Due'),
            createElement(Text, { style: styles.totalsFinalValue }, fmtCents(invoice.total_cents)),
          ),
        ),
      ),

      // Notes
      invoice.notes ? createElement(View, { style: styles.notesSection },
        createElement(Text, { style: styles.notesLabel }, 'NOTES'),
        createElement(Text, { style: styles.notesText }, invoice.notes),
      ) : null,

      // Footer
      createElement(Text, { style: styles.footer },
        'Worker-Bee Agency · manage.worker-bee.app · Generated ' + new Date().toLocaleDateString('en-US', { dateStyle: 'long' }),
      ),
    ),
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const tokenParam = req.nextUrl.searchParams.get('token')

  const { data, error } = await db
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  // Token mode (client portal): the `token` param, if present at all, must be
  // non-empty AND match. An empty `?token=` must NOT skip this check — the
  // middleware only exempts non-empty tokens, and this guard is the backstop
  // if that ever regresses (IDOR found in adversarial review 2026-07-05).
  if (tokenParam !== null) {
    if (!tokenParam || !data.public_token || data.public_token !== tokenParam) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const items = [...(data.invoice_items ?? [])].sort((a: any, b: any) =>
    a.category.localeCompare(b.category)
  )

  try {
    const doc = buildPdf(data, items)
    const buffer = await renderToBuffer(doc)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="invoice-' + data.invoice_number + '.pdf"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'PDF generation failed: ' + msg }, { status: 500 })
  }
}

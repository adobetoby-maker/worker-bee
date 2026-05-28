/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const db = supabaseAdmin as any

// GET /api/invoices — list all invoices joined with site info
export async function GET() {
  const { data, error } = await db
    .from('invoices')
    .select(`
      *,
      sites ( name, url ),
      invoice_items ( id )
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const invoices = (data ?? []).map((inv: any) => ({
    ...inv,
    site_name: inv.sites?.name ?? null,
    site_url: inv.sites?.url ?? null,
    item_count: Array.isArray(inv.invoice_items) ? inv.invoice_items.length : 0,
    sites: undefined,
    invoice_items: undefined,
  }))

  return NextResponse.json({ invoices })
}

// POST /api/invoices — create a new invoice with items
export async function POST(req: NextRequest) {
  const body = await req.json() as {
    site_id?: string
    client_name: string
    client_email?: string
    invoice_number: string
    due_date?: string
    tax_rate_pct?: number
    notes?: string
    status?: string
    items: Array<{
      description: string
      category: string
      quantity: number
      unit_price_cents: number
    }>
  }

  if (!body.client_name) {
    return NextResponse.json({ error: 'client_name is required' }, { status: 400 })
  }
  if (!body.invoice_number) {
    return NextResponse.json({ error: 'invoice_number is required' }, { status: 400 })
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'at least one item is required' }, { status: 400 })
  }

  const taxRate = body.tax_rate_pct ?? 0
  const itemsWithTotals = body.items.map(item => ({
    description: item.description,
    category: item.category,
    quantity: item.quantity,
    unit_price_cents: item.unit_price_cents,
    total_cents: Math.round(item.quantity * item.unit_price_cents),
  }))

  const subtotalCents = itemsWithTotals.reduce((sum, i) => sum + i.total_cents, 0)
  const taxCents = Math.round(subtotalCents * taxRate / 100)
  const totalCents = subtotalCents + taxCents

  const today = new Date().toISOString().split('T')[0]

  const { data: invoice, error: invError } = await db
    .from('invoices')
    .insert({
      site_id: body.site_id ?? null,
      client_name: body.client_name,
      client_email: body.client_email ?? null,
      invoice_number: body.invoice_number,
      status: body.status ?? 'draft',
      issued_date: today,
      due_date: body.due_date ?? null,
      subtotal_cents: subtotalCents,
      tax_rate_pct: taxRate,
      total_cents: totalCents,
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (invError) return NextResponse.json({ error: invError.message }, { status: 400 })

  const { error: itemsError } = await db
    .from('invoice_items')
    .insert(itemsWithTotals.map((item: any) => ({ ...item, invoice_id: invoice.id })))

  if (itemsError) {
    // Rollback: delete the invoice if items failed
    await db.from('invoices').delete().eq('id', invoice.id)
    return NextResponse.json({ error: itemsError.message }, { status: 400 })
  }

  return NextResponse.json({ invoice }, { status: 201 })
}

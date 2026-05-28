/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const db = supabaseAdmin as any

// GET /api/invoices/[id] — fetch invoice with all items
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  return NextResponse.json({ invoice: data })
}

// PATCH /api/invoices/[id] — update status or paid_at
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json() as { status?: string; paid_at?: string | null }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.status !== undefined) updates.status = body.status
  if (body.paid_at !== undefined) updates.paid_at = body.paid_at

  const { data, error } = await db
    .from('invoices')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ invoice: data })
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const db = supabaseAdmin as any

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if ('billed' in body) updates.billed = body.billed
  if ('invoice_id' in body) updates.invoice_id = body.invoice_id
  if ('description' in body) updates.description = body.description
  if ('hours' in body) updates.hours = parseFloat(body.hours)
  if ('rate_cents' in body) updates.rate_cents = body.rate_cents
  if ('rate' in body) updates.rate_cents = Math.round(parseFloat(body.rate) * 100)
  if ('date' in body) updates.date = body.date

  const { data, error } = await db.from('time_entries').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await db.from('time_entries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

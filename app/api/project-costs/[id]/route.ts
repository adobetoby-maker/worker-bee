/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const db = supabaseAdmin as any

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if ('active' in body) updates.active = body.active
  if ('label' in body) updates.label = body.label
  if ('amount_cents' in body) updates.amount_cents = body.amount_cents
  if ('amount' in body) updates.amount_cents = Math.round(parseFloat(body.amount) * 100)
  if ('billing_cycle' in body) updates.billing_cycle = body.billing_cycle
  if ('notes' in body) updates.notes = body.notes
  if ('service' in body) updates.service = body.service

  const { data, error } = await db.from('project_costs').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await db.from('project_costs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

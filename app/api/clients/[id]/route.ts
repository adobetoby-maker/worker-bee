/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const db = supabaseAdmin as any

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data, error } = await db
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const allowed = ['name', 'email', 'phone', 'company', 'notes', 'stripe_customer_id']
  const update: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) {
      update[key] = typeof body[key] === 'string' ? body[key].trim() || null : body[key]
    }
  }

  if (update.name !== undefined && !update.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const { data, error } = await db
    .from('clients')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await db.from('clients').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

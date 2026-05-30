/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const db = supabaseAdmin as any

export async function GET() {
  const { data, error } = await db
    .from('clients')
    .select('*')
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const clean = {
    name: body.name.trim(),
    email: body.email?.trim() || null,
    phone: body.phone?.trim() || null,
    company: body.company?.trim() || null,
    notes: body.notes?.trim() || null,
    stripe_customer_id: body.stripe_customer_id?.trim() || null,
  }

  const { data, error } = await db.from('clients').insert(clean).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

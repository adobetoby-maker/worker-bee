/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const db = supabaseAdmin as any

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('site_id')
  if (!siteId) return NextResponse.json({ error: 'site_id required' }, { status: 400 })

  const { data, error } = await db
    .from('project_costs')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.site_id) return NextResponse.json({ error: 'site_id required' }, { status: 400 })
  if (!body.service) return NextResponse.json({ error: 'service required' }, { status: 400 })
  if (!body.label?.trim()) return NextResponse.json({ error: 'label required' }, { status: 400 })

  const clean = {
    site_id: body.site_id,
    service: body.service.trim(),
    label: body.label.trim(),
    amount_cents: Math.round((parseFloat(body.amount ?? 0)) * 100),
    billing_cycle: body.billing_cycle ?? 'monthly',
    notes: body.notes?.trim() || null,
    active: body.active ?? true,
  }

  const { data, error } = await db.from('project_costs').insert(clean).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

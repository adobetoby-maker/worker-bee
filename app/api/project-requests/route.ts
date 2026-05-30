/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const db = supabaseAdmin as any

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status')

  let query = db
    .from('project_requests')
    .select('*, clients(id, name), sites(id, name)')
    .order('received_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const estimated_total_cents = body.estimated_hours && body.estimated_rate
    ? Math.round(parseFloat(body.estimated_hours) * parseFloat(body.estimated_rate) * 100)
    : null

  const clean = {
    client_id: body.client_id || null,
    site_id: body.site_id || null,
    source: body.source ?? 'other',
    title: body.title.trim(),
    description: body.description?.trim() || null,
    estimated_hours: body.estimated_hours ? parseFloat(body.estimated_hours) : null,
    estimated_rate_cents: body.estimated_rate ? Math.round(parseFloat(body.estimated_rate) * 100) : null,
    estimated_total_cents,
    notes: body.notes?.trim() || null,
    status: 'new',
    received_at: new Date().toISOString(),
  }

  const { data, error } = await db.from('project_requests').insert(clean).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

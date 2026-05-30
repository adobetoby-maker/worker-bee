/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const db = supabaseAdmin as any

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('site_id')
  if (!siteId) return NextResponse.json({ error: 'site_id required' }, { status: 400 })

  const { data, error } = await db
    .from('time_entries')
    .select('*')
    .eq('site_id', siteId)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.site_id) return NextResponse.json({ error: 'site_id required' }, { status: 400 })
  if (!body.date) return NextResponse.json({ error: 'date required' }, { status: 400 })
  if (!body.hours) return NextResponse.json({ error: 'hours required' }, { status: 400 })

  const clean = {
    site_id: body.site_id,
    date: body.date,
    hours: parseFloat(body.hours),
    rate_cents: Math.round((parseFloat(body.rate ?? 0)) * 100),
    description: body.description?.trim() || null,
    billed: body.billed ?? false,
    invoice_id: body.invoice_id ?? null,
  }

  const { data, error } = await db.from('time_entries').insert(clean).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

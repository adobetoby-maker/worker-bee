import { NextRequest, NextResponse } from 'next/server'
import { marketingAuth } from '@/lib/apiKeyAuth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any
const auth = marketingAuth

// GET /api/marketing/campaigns?site_id=&status=
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { searchParams } = req.nextUrl
  let q = db.from('marketing_campaigns').select('*, sites(name, url, stack)').order('created_at', { ascending: false })
  const site_id = searchParams.get('site_id')
  const status = searchParams.get('status')
  if (site_id) q = q.eq('site_id', site_id)
  if (status) q = q.eq('status', status)
  const { data, error } = await q.limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/marketing/campaigns — create campaign
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  const { site_id, name, site_type, platforms, content_types, week_start, timezone } = body
  if (!site_id || !name || !site_type || !week_start) {
    return NextResponse.json({ error: 'site_id, name, site_type, week_start required' }, { status: 400 })
  }
  const { data, error } = await db.from('marketing_campaigns').insert({
    site_id, name, site_type,
    platforms: platforms ?? [],
    content_types: content_types ?? [],
    week_start,
    timezone: timezone ?? 'America/Boise',
    status: 'draft',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

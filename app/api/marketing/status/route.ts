import { NextRequest, NextResponse } from 'next/server'
import { marketingAuth } from '@/lib/apiKeyAuth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'


const auth = marketingAuth

// POST /api/marketing/status — droid status ping with optional report payload
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { droid, status, channel, timestamp, report, sites_processed } = body

  if (!droid) return NextResponse.json({ error: 'droid required' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any

  const { data, error } = await db.from('marketing_droid_status').upsert({
    droid_id: droid,
    status: status ?? 'ran',
    channel: channel ?? null,
    last_ran_at: timestamp ?? new Date().toISOString(),
    report: report ?? null,
    sites_processed: sites_processed ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'droid_id' }).select().single()

  if (error) {
    // Table may not exist yet — return 200 so droid doesn't fail
    console.error('[/api/marketing/status] upsert error:', error.message)
    return NextResponse.json({ ok: true, warning: error.message })
  }

  return NextResponse.json({ ok: true, record: data })
}

// GET /api/marketing/status?droid=droid-reporter
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const droid = req.nextUrl.searchParams.get('droid')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any

  let query = db.from('marketing_droid_status').select('*').order('last_ran_at', { ascending: false })
  if (droid) query = query.eq('droid_id', droid)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ droids: data })
}
// cache bust Sat May 30 20:47:59 MDT 2026

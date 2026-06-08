import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params

  const { data, error } = await db
    .from('prospects')
    .select('*, outreach_campaigns(name, region)')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()

  // Only allow safe field updates
  const allowed = [
    'stage', 'owner_name', 'phone', 'email', 'city', 'state', 'category',
    'demo_url', 'demo_screenshot_url', 'notes', 'cold_call_opener',
    'current_touch', 'sequence_start_date', 'next_touch_date',
    'archived_at', 'reactivate_after', 'outreach_campaign_id',
    'deal_value', 'monthly_value', 'has_existing_site', 'skip_reason',
  ]
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const { data, error } = await db
    .from('prospects')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

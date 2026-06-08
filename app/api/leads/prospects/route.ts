import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get('campaign_id')
  const stage = searchParams.get('stage')

  let query = db
    .from('prospects')
    .select('*, outreach_campaigns(name, region)')
    .order('created_at', { ascending: false })

  if (campaignId) query = query.eq('outreach_campaign_id', campaignId)
  if (stage) query = query.eq('stage', stage)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prospects: data ?? [], total: (data ?? []).length })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    business_name, owner_name, phone, email, city, state, category,
    demo_url, demo_screenshot_url, outreach_campaign_id, notes,
    cold_call_opener, has_existing_site,
  } = body

  if (!business_name) return NextResponse.json({ error: 'business_name required' }, { status: 400 })

  const { data, error } = await db
    .from('prospects')
    .insert({
      business_name, owner_name, phone, email, city,
      state: state ?? 'ID', category, demo_url, demo_screenshot_url,
      outreach_campaign_id, notes, cold_call_opener,
      has_existing_site: Boolean(has_existing_site),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

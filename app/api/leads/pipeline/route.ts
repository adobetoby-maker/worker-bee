import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

export async function GET() {
  const { data, error } = await db
    .from('prospects')
    .select('id, business_name, city, state, category, demo_url, stage, current_touch, next_touch_date, outreach_campaign_id, created_at, outreach_campaigns(name)')
    .not('stage', 'in', '(won,lost,archived)')
    .order('next_touch_date', { ascending: true, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by stage
  const stages: Record<string, unknown[]> = {
    new: [], active: [], engaged: [], hot: [],
    in_conversation: [], proposal_sent: [],
  }
  for (const p of data ?? []) {
    const s = p.stage as string
    if (s in stages) stages[s].push(p)
  }

  return NextResponse.json({ stages, all: data ?? [] })
}

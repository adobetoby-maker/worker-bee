import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

export async function GET() {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await db
    .from('prospects')
    .select('id, business_name, city, category, demo_url, stage, current_touch, next_touch_date')
    .lte('next_touch_date', today)
    .not('stage', 'in', '(won,lost,archived)')
    .order('next_touch_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prospects: data ?? [], count: (data ?? []).length })
}

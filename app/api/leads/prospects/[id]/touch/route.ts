import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

// Touch number → next touch date offset in days
const TOUCH_SCHEDULE: Record<number, number> = {
  1: 4,   // Email 1 → Text 1 in 4 days
  2: 3,   // Text 1  → Call 1 in 3 days
  3: 3,   // Call 1  → Email 2 in 3 days
  4: 4,   // Email 2 → Text 2 in 4 days
  5: 3,   // Text 2  → Call 2 in 3 days
  6: 4,   // Call 2  → Email 3 in 4 days
  7: 3,   // Email 3 → Text 3 in 3 days
  8: 4,   // Text 3  → Call 3 in 4 days
  9: 32,  // Call 3  → Archive in 32 days
}

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const TOUCH_TO_STAGE: Record<number, string> = {
  1: 'active', 2: 'active', 3: 'active',
  4: 'active', 5: 'active', 6: 'active',
  7: 'active', 8: 'active', 9: 'active',
}

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const { touch_number, channel, status, notes, email_subject, email_template_id, call_outcome, call_duration_seconds } = body

  if (!touch_number || !channel) {
    return NextResponse.json({ error: 'touch_number and channel required' }, { status: 400 })
  }

  // Insert the contact event
  const { error: eventError } = await db
    .from('contact_events')
    .insert({
      prospect_id: id,
      touch_number,
      channel,
      status: status ?? 'sent',
      notes,
      email_subject,
      email_template_id,
      call_outcome,
      call_duration_seconds,
    })

  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 })

  // Update prospect: advance touch, set next_touch_date, maybe update stage
  const offsetDays = TOUCH_SCHEDULE[touch_number]
  const nextTouchDate = offsetDays ? addDays(offsetDays) : null

  const prospectUpdate: Record<string, unknown> = {
    current_touch: touch_number,
    next_touch_date: nextTouchDate,
  }

  // Touch 1 = Email 1 sent — start the sequence timer
  if (touch_number === 1) {
    prospectUpdate.sequence_start_date = new Date().toISOString().split('T')[0]
    prospectUpdate.stage = 'active'
  } else if (touch_number in TOUCH_TO_STAGE) {
    prospectUpdate.stage = TOUCH_TO_STAGE[touch_number]
  }

  // Touch 9 (Call 3) → auto-archive
  if (touch_number === 9) {
    prospectUpdate.stage = 'archived'
    prospectUpdate.archived_at = new Date().toISOString()
    prospectUpdate.reactivate_after = addDays(180)
    prospectUpdate.next_touch_date = null
  }

  const { data, error: updateError } = await db
    .from('prospects')
    .update(prospectUpdate)
    .eq('id', id)
    .select()
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ ok: true, prospect: data })
}

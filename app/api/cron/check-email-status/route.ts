import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

// Runs every 30 min via Vercel cron.
// Checks Resend API for status of emails sent in the last 7 days
// and logs new open/click/bounce events to prospect_events.

const RESEND_API = 'https://api.resend.com'
const STAGE_ON_OPEN:  Record<string, string> = { new: 'active', active: 'engaged' }
const STAGE_ON_CLICK: Record<string, string> = { new: 'active', active: 'engaged', engaged: 'hot' }

async function resendGet(path: string) {
  const res = await fetch(`${RESEND_API}${path}`, {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  })
  if (!res.ok) return null
  return res.json()
}

export async function GET() {
  const key = process.env.RESEND_API_KEY
  if (!key) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })

  // Pull sent events from last 7 days that have a resend_email_id
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const { data: sentEvents } = await db
    .from('prospect_events')
    .select('id, prospect_id, touch_number, resend_email_id, status')
    .not('resend_email_id', 'is', null)
    .eq('status', 'sent')
    .gte('created_at', sevenDaysAgo)
    .limit(100)

  if (!sentEvents?.length) {
    return NextResponse.json({ ok: true, checked: 0 })
  }

  let promoted = 0
  let logged   = 0

  for (const ev of sentEvents) {
    const detail = await resendGet(`/emails/${ev.resend_email_id}`)
    if (!detail) continue

    const remoteStatus: string = detail.last_event ?? ''

    const newStatus =
      remoteStatus === 'clicked'   ? 'opened'    :
      remoteStatus === 'opened'    ? 'opened'     :
      remoteStatus === 'delivered' ? 'delivered'  :
      remoteStatus === 'bounced'   ? 'bounced'    : null

    if (!newStatus || newStatus === ev.status) continue

    // Log tracking event
    await db.from('prospect_events').insert({
      prospect_id:     ev.prospect_id,
      touch_number:    ev.touch_number,
      channel:         'email',
      status:          newStatus,
      resend_email_id: ev.resend_email_id,
      notes:           `Polled from Resend: ${remoteStatus}`,
    })
    logged++

    // Promote stage
    const { data: prospect } = await db.from('prospects')
      .select('stage').eq('id', ev.prospect_id).single()

    const stageMap = remoteStatus === 'clicked' ? STAGE_ON_CLICK : STAGE_ON_OPEN
    if (prospect && stageMap[prospect.stage]) {
      await db.from('prospects')
        .update({ stage: stageMap[prospect.stage], updated_at: new Date().toISOString() })
        .eq('id', ev.prospect_id)
      promoted++
    }
  }

  return NextResponse.json({ ok: true, checked: sentEvents.length, logged, promoted })
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

// Stage promotions triggered by email events
const STAGE_ON_OPEN:  Record<string, string> = { new: 'active', active: 'engaged' }
const STAGE_ON_CLICK: Record<string, string> = { new: 'active', active: 'engaged', engaged: 'hot' }

export async function POST(req: NextRequest) {
  // Verify Resend webhook signature (set RESEND_WEBHOOK_SECRET in env)
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (secret) {
    const sig = req.headers.get('svix-signature') ?? req.headers.get('webhook-signature')
    if (!sig) return NextResponse.json({ error: 'missing signature' }, { status: 401 })
    // In production add full svix signature verification here
  }

  const body = await req.json().catch(() => null)
  if (!body?.type || !body?.data) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
  }

  const { type, data } = body
  const resendId: string = data?.email_id ?? data?.id ?? ''

  // Find the prospect event that triggered this email
  const { data: events } = await db
    .from('prospect_events')
    .select('id, prospect_id, touch_number, resend_email_id')
    .eq('resend_email_id', resendId)
    .limit(1)

  const event = events?.[0]

  if (!event) {
    // Silently ack — email not from our outreach system
    return NextResponse.json({ ok: true, note: 'untracked email' })
  }

  const prospectId = event.prospect_id

  // Fetch current prospect stage
  const { data: prospect } = await db
    .from('prospects')
    .select('id, stage')
    .eq('id', prospectId)
    .single()

  let channel = 'email'
  let status  = 'sent'
  let stageUpdate: Record<string, string> | null = null

  switch (type) {
    case 'email.delivered':
      status = 'delivered'
      break

    case 'email.opened':
      status = 'opened'
      if (prospect && STAGE_ON_OPEN[prospect.stage]) {
        stageUpdate = { stage: STAGE_ON_OPEN[prospect.stage] }
      }
      break

    case 'email.clicked':
      status = 'opened' // clicked implies opened
      channel = 'email'
      status  = 'opened'
      // Use a richer status for clicked
      if (prospect && STAGE_ON_CLICK[prospect.stage]) {
        stageUpdate = { stage: STAGE_ON_CLICK[prospect.stage] }
      }
      break

    case 'email.bounced':
    case 'email.complained':
      status = 'bounced'
      break

    default:
      return NextResponse.json({ ok: true, note: `unhandled event: ${type}` })
  }

  // Log the tracking event
  await db.from('prospect_events').insert({
    prospect_id:     prospectId,
    touch_number:    event.touch_number,
    channel,
    status,
    resend_email_id: resendId,
    notes:           `Resend webhook: ${type}`,
  })

  // Promote prospect stage on meaningful events
  if (stageUpdate && prospect) {
    await db.from('prospects')
      .update({ ...stageUpdate, updated_at: new Date().toISOString() })
      .eq('id', prospectId)
  }

  return NextResponse.json({ ok: true, type, status })
}

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Toby Anderton <toby@andertongroup.com>'

// Days to next touch after each touch number
const NEXT_TOUCH_DAYS: Record<number, number> = {
  1: 3,   // E1 → Text 1 in 3 days
  2: 2,   // T1 → Call 1 in 2 days
  3: 3,   // C1 → Email 2 in 3 days
  4: 4,   // E2 → Text 2 in 4 days
  5: 2,   // T2 → Call 2 in 2 days
  6: 4,   // C2 → Email 3 in 4 days
  7: 4,   // E3 → Text 3 in 4 days
  8: 3,   // T3 → Call 3 in 3 days
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

function addDays(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { template_id } = await req.json()

  if (!template_id) return NextResponse.json({ error: 'template_id required' }, { status: 400 })

  const { data: prospect, error: pErr } = await db
    .from('prospects')
    .select('*')
    .eq('id', id)
    .single()

  if (pErr || !prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
  if (!prospect.email) return NextResponse.json({ error: 'Prospect has no email address' }, { status: 400 })

  const { data: template, error: tErr } = await db
    .from('email_templates')
    .select('*')
    .eq('id', template_id)
    .single()

  if (tErr || !template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const seqStart = prospect.sequence_start_date
  const daysSinceEmail1 = seqStart
    ? Math.floor((Date.now() - new Date(seqStart).getTime()) / 86400000)
    : 0

  const vars: Record<string, string> = {
    business_name:        prospect.business_name ?? '',
    owner_name:           prospect.owner_name ?? 'there',
    city:                 prospect.city ?? '',
    category:             prospect.category ?? '',
    demo_url:             prospect.demo_url ?? '',
    demo_screenshot_url:  prospect.demo_screenshot_url ?? '',
    phone:                prospect.phone ?? '',
    cold_call_opener:     prospect.cold_call_opener ?? '',
    days_since_email_1:   String(daysSinceEmail1),
    payment_link:         prospect.payment_link ?? 'https://andertongroup.com/start',
    email:                prospect.email ?? '',
  }

  const subject   = interpolate(template.subject_template ?? '', vars)
  const html      = interpolate(template.html_body ?? '', vars)
  const plainText = interpolate(template.plain_text_body ?? '', vars)

  const { data: sent, error: sendErr } = await resend.emails.send({
    from:     FROM,
    to:       [prospect.email],
    subject,
    html,
    text:     plainText,
    replyTo: 'toby@andertongroup.com',
  })

  if (sendErr) {
    return NextResponse.json({ error: sendErr.message ?? 'Resend error' }, { status: 500 })
  }

  const touchNum = template.touch_number ?? prospect.current_touch + 1

  // Log to prospect_events — store resend_email_id for webhook/polling tracking
  await db.from('prospect_events').insert({
    prospect_id:     id,
    touch_number:    touchNum,
    channel:         'email',
    status:          'sent',
    email_subject:   subject,
    resend_email_id: sent?.id ?? null,
    notes:           `Sent via Resend from toby@andertongroup.com`,
  })

  // Advance touch counter and set next touch date
  const nextTouch     = touchNum + 1
  const daysToNext    = NEXT_TOUCH_DAYS[touchNum] ?? 3
  const nextTouchDate = nextTouch <= 9 ? addDays(daysToNext) : null

  const stageUpdate: Record<string, unknown> = {
    current_touch:   touchNum,
    next_touch_date: nextTouchDate,
    updated_at:      new Date().toISOString(),
  }

  // Move prospect from 'new' to 'active' on first email
  if (prospect.stage === 'new' && touchNum === 1) {
    stageUpdate.stage              = 'active'
    stageUpdate.sequence_start_date = new Date().toISOString().split('T')[0]
  }

  await db.from('prospects').update(stageUpdate).eq('id', id)

  // Auto-trigger marketing push campaign on first email sent
  if (prospect.stage === 'new' && touchNum === 1 && prospect.demo_url) {
    const siteId   = prospect.demo_url.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/\./g, '-')
    const siteName = prospect.business_name ?? siteId
    const niche    = 'localbiz'

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://manage.worker-bee.app'}/api/marketing/launch-campaign`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747' },
      body: JSON.stringify({
        campaignName: `${siteName} — Email 1 auto-launch`,
        triggerType:  'email_send',
        niche,
        sites: [{ id: siteId, name: siteName, url: prospect.demo_url, niche }],
      }),
    }).catch(() => { /* fire and forget — don't block email send */ })
  }

  return NextResponse.json({ ok: true, resend_id: sent?.id, subject, next_touch_date: nextTouchDate })
}

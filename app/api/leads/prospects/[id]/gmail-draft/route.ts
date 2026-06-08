import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

type Params = { params: Promise<{ id: string }> }

// Returns a Gmail compose URL + rendered content.
// The client opens this URL so Toby sees a pre-filled compose window.
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { template_id } = await req.json()

  if (!template_id) return NextResponse.json({ error: 'template_id required' }, { status: 400 })

  const { data: prospect } = await db.from('prospects').select('*').eq('id', id).single()
  if (!prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })

  const { data: template } = await db.from('email_templates').select('*').eq('id', template_id).single()
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  const seqStart = prospect.sequence_start_date
  const daysSinceEmail1 = seqStart
    ? Math.floor((Date.now() - new Date(seqStart).getTime()) / 86400000)
    : 0

  const vars: Record<string, string> = {
    business_name: prospect.business_name ?? '',
    owner_name: prospect.owner_name ?? 'there',
    city: prospect.city ?? '',
    category: prospect.category ?? '',
    demo_url: prospect.demo_url ?? '',
    demo_screenshot_url: prospect.demo_screenshot_url ?? '',
    phone: prospect.phone ?? '',
    cold_call_opener: prospect.cold_call_opener ?? '',
    days_since_email_1: String(daysSinceEmail1),
  }

  const subject = interpolate(template.subject_template ?? '', vars)
  const plainText = interpolate(template.plain_text_body ?? '', vars)
  const html = interpolate(template.html_body ?? '', vars)

  // Build Gmail compose URL (opens compose window with pre-filled subject + plain text)
  const to = prospect.email ?? ''
  const gmailUrl = `https://mail.google.com/mail/u/0/?view=cm&fs=1${to ? `&to=${encodeURIComponent(to)}` : ''}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`

  // Log a draft-created event
  await db.from('contact_events').insert({
    prospect_id: id,
    touch_number: template.touch_number,
    channel: 'email',
    status: 'draft_created',
    email_subject: subject,
    email_template_id: template_id,
    notes: 'Gmail compose URL generated',
  })

  return NextResponse.json({ ok: true, gmail_url: gmailUrl, subject, html, plain_text: plainText })
}

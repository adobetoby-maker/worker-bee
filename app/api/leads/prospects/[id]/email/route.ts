import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
}

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const { template_id } = await req.json()

  if (!template_id) return NextResponse.json({ error: 'template_id required' }, { status: 400 })

  // Fetch prospect
  const { data: prospect, error: pErr } = await db
    .from('prospects')
    .select('*')
    .eq('id', id)
    .single()

  if (pErr) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })

  // Fetch template
  const { data: template, error: tErr } = await db
    .from('email_templates')
    .select('*')
    .eq('id', template_id)
    .single()

  if (tErr) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  // Build variable map
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
  const html = interpolate(template.html_body ?? '', vars)
  const plainText = interpolate(template.plain_text_body ?? '', vars)

  return NextResponse.json({ subject, html, plain_text: plainText, vars, template_name: template.name })
}

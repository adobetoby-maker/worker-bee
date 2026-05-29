import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'

function requireApiKey(req: NextRequest): boolean {
  return req.headers.get('x-api-key') === API_KEY
}

// GET /api/campaigns?site=X&status=draft
export async function GET(req: NextRequest) {
  if (!requireApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const site = searchParams.get('site')
  const status = searchParams.get('status')

  if (!site) {
    return NextResponse.json({ error: 'site parameter required' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any

  // Get campaigns
  let campaignQuery = db
    .from('campaigns')
    .select('*')
    .eq('site_id', site)
    .order('created_at', { ascending: false })

  if (status) {
    campaignQuery = campaignQuery.eq('status', status)
  }

  const { data: campaigns, error: campaignError } = await campaignQuery

  if (campaignError) {
    console.error('campaigns GET error:', campaignError)
    return NextResponse.json({ error: campaignError.message }, { status: 500 })
  }

  // Enrich each campaign with live recipient_count (subscribed contacts for the site)
  const { count: recipientCount } = await db
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', site)
    .eq('subscribed', true)

  const enriched = ((campaigns ?? []) as Record<string, unknown>[]).map(c => ({
    ...c,
    recipient_count: (c.recipient_count as number | null) ?? recipientCount ?? 0,
  }))

  return NextResponse.json({ campaigns: enriched })
}

// POST /api/campaigns
export async function POST(req: NextRequest) {
  if (!requireApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    name?: string
    siteId?: string
    type?: string
    subject?: string
    fromName?: string
    fromEmail?: string
    htmlBody?: string
    aiPrompt?: string
    previewText?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, siteId, type = 'broadcast', subject, fromName, fromEmail, htmlBody, aiPrompt, previewText } = body

  if (!name || !siteId) {
    return NextResponse.json({ error: 'name and siteId required' }, { status: 400 })
  }

  if (!['broadcast', 'drip'].includes(type)) {
    return NextResponse.json({ error: 'type must be broadcast or drip' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db2 = supabaseAdmin as any
  const { data: campaign, error } = await db2
    .from('campaigns')
    .insert({
      name,
      site_id: siteId,
      type,
      status: 'draft',
      subject: subject ?? null,
      preview_text: previewText ?? null,
      from_name: fromName ?? null,
      from_email: fromEmail ?? null,
      html_body: htmlBody ?? null,
      ai_prompt: aiPrompt ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('campaigns POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, campaign }, { status: 201 })
}

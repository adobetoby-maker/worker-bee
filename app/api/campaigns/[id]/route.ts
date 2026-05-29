import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'

function requireApiKey(req: NextRequest): boolean {
  return req.headers.get('x-api-key') === API_KEY
}

// GET /api/campaigns/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any

  const { data: campaign, error } = await db
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Include drip steps if applicable
  let dripSteps = null
  if ((campaign as Record<string, unknown>).type === 'drip') {
    const { data: steps } = await db
      .from('drip_steps')
      .select('*')
      .eq('campaign_id', id)
      .order('step_number', { ascending: true })
    dripSteps = steps ?? []
  }

  return NextResponse.json({ campaign, dripSteps })
}

// PATCH /api/campaigns/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any

  let body: {
    name?: string
    subject?: string
    previewText?: string
    fromName?: string
    fromEmail?: string
    htmlBody?: string
    aiPrompt?: string
    status?: string
    scheduledAt?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const VALID_STATUSES = ['draft', 'scheduled', 'sending', 'sent', 'paused']
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 },
    )
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) updates.name = body.name
  if (body.subject !== undefined) updates.subject = body.subject
  if (body.previewText !== undefined) updates.preview_text = body.previewText
  if (body.fromName !== undefined) updates.from_name = body.fromName
  if (body.fromEmail !== undefined) updates.from_email = body.fromEmail
  if (body.htmlBody !== undefined) updates.html_body = body.htmlBody
  if (body.aiPrompt !== undefined) updates.ai_prompt = body.aiPrompt
  if (body.status !== undefined) updates.status = body.status
  if (body.scheduledAt !== undefined) updates.scheduled_at = body.scheduledAt

  const { data: campaign, error } = await db
    .from('campaigns')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    console.error('campaigns patch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, campaign })
}

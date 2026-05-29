import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? 're_7yAskh9s_B5fERdUz4C4CGS7JoytQQ8DW'

function requireApiKey(req: NextRequest): boolean {
  return req.headers.get('x-api-key') === API_KEY
}

function getAudienceId(siteId: string): string | null {
  const map: Record<string, string | undefined> = {
    medicalspanish: process.env.RESEND_AUDIENCE_MEDICALSPANISH,
    constructionspanish: process.env.RESEND_AUDIENCE_CONSTRUCTIONSPANISH,
  }
  return map[siteId] ?? null
}

// DELETE /api/contacts/[id] — unsubscribe and remove from Resend audience
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any

  // Fetch contact first to get site_id and resend_contact_id
  const { data: contact, error: fetchError } = await db
    .from('contacts')
    .select('id, email, site_id, resend_contact_id')
    .eq('id', id)
    .single()

  if (fetchError || !contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  // Set subscribed = false
  const { error: updateError } = await db
    .from('contacts')
    .update({ subscribed: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (updateError) {
    console.error('contacts delete error:', updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Remove from Resend audience
  const audienceId = getAudienceId(contact.site_id)
  if (audienceId && contact.resend_contact_id) {
    try {
      await fetch(
        `https://api.resend.com/audiences/${audienceId}/contacts/${contact.resend_contact_id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
        },
      )
    } catch (err) {
      console.error('Resend unsubscribe error:', err)
    }
  } else if (audienceId && contact.email) {
    // Fallback: unsubscribe by email if no resend_contact_id
    try {
      await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: contact.email, unsubscribed: true }),
      })
    } catch (err) {
      console.error('Resend unsubscribe fallback error:', err)
    }
  }

  return NextResponse.json({ ok: true })
}

// PATCH /api/contacts/[id] — update name, tags, metadata
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any

  let body: { name?: string; tags?: string[]; metadata?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.name !== undefined) updates.name = body.name
  if (body.tags !== undefined) updates.tags = body.tags
  if (body.metadata !== undefined) updates.metadata = body.metadata

  const { data: contact, error } = await db
    .from('contacts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }
    console.error('contacts patch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, contact })
}

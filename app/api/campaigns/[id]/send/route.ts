import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Large sends can take a while

const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? 're_7yAskh9s_B5fERdUz4C4CGS7JoytQQ8DW'

function requireApiKey(req: NextRequest): boolean {
  return req.headers.get('x-api-key') === API_KEY
}

function interpolate(html: string, contact: { name?: string | null; email: string }): string {
  return html
    .replace(/\{\{name\}\}/gi, contact.name ?? contact.email.split('@')[0])
    .replace(/\{\{email\}\}/gi, contact.email)
}

// POST /api/campaigns/[id]/send
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any

  // Fetch campaign
  const { data: campaignRaw, error: campaignError } = await db
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (campaignError || !campaignRaw) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const campaign = campaignRaw as {
    id: string
    site_id: string
    subject: string | null
    html_body: string | null
    from_email: string | null
    from_name: string | null
    status: string
  }

  if (!campaign.subject || !campaign.html_body || !campaign.from_email) {
    return NextResponse.json(
      { error: 'Campaign must have subject, html_body, and from_email set before sending' },
      { status: 400 },
    )
  }

  if (campaign.status === 'sent') {
    return NextResponse.json({ error: 'Campaign already sent' }, { status: 409 })
  }

  // Fetch all subscribed contacts for this site
  const { data: contactsRaw, error: contactsError } = await db
    .from('contacts')
    .select('id, email, name')
    .eq('site_id', campaign.site_id)
    .eq('subscribed', true)

  const contacts = (contactsRaw ?? []) as { id: string; email: string; name: string | null }[]

  if (contactsError) {
    console.error('contacts fetch error:', contactsError)
    return NextResponse.json({ error: (contactsError as { message: string }).message }, { status: 500 })
  }

  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0, message: 'No subscribed contacts' })
  }

  // Mark as sending
  await db
    .from('campaigns')
    .update({ status: 'sending', updated_at: new Date().toISOString() })
    .eq('id', id)

  let sent = 0
  let failed = 0
  const sendResults: { contactId: string; status: 'sent' | 'failed'; resendEmailId?: string }[] = []

  // Send to each contact — sequential to avoid Resend rate limits
  for (const contact of contacts) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${campaign.from_name ?? campaign.from_email} <${campaign.from_email}>`,
          to: contact.email,
          subject: campaign.subject,
          html: interpolate(campaign.html_body, contact),
        }),
      })

      if (res.ok) {
        const resendData = await res.json()
        sendResults.push({ contactId: contact.id, status: 'sent', resendEmailId: resendData?.id })
        sent++
      } else {
        sendResults.push({ contactId: contact.id, status: 'failed' })
        failed++
      }
    } catch {
      sendResults.push({ contactId: contact.id, status: 'failed' })
      failed++
    }
  }

  // Bulk insert campaign_sends
  if (sendResults.length > 0) {
    const now = new Date().toISOString()
    const rows = sendResults.map(r => ({
      campaign_id: id,
      contact_id: r.contactId,
      status: r.status,
      resend_email_id: r.resendEmailId ?? null,
      sent_at: r.status === 'sent' ? now : null,
    }))

    await db
      .from('campaign_sends')
      .upsert(rows, { onConflict: 'campaign_id,contact_id', ignoreDuplicates: false })
  }

  // Update campaign status
  await db
    .from('campaigns')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipient_count: sent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json({ ok: true, sent, failed })
}

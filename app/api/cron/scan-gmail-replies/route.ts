import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

// Scans Gmail for replies from prospects and logs them.
// Requires GOOGLE_REFRESH_TOKEN and GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in env.
// One-time setup: run /api/auth/google to get the refresh token.

async function getGoogleAccessToken(): Promise<string | null> {
  const { GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env
  if (!GOOGLE_REFRESH_TOKEN || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: GOOGLE_REFRESH_TOKEN,
      client_id:     GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token ?? null
}

export async function GET(req: Request) {
  const accessToken = await getGoogleAccessToken()

  if (!accessToken) {
    return NextResponse.json({
      ok: false,
      setup_required: true,
      message: 'Add GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET to env. Visit /api/auth/google to authorize.',
    })
  }

  // Get all active prospect emails to scan for
  const { data: prospects } = await db
    .from('prospects')
    .select('id, email, business_name, stage')
    .not('email', 'is', null)
    .not('stage', 'in', '("won","lost","archived")')
    .limit(200)

  if (!prospects?.length) return NextResponse.json({ ok: true, scanned: 0 })

  const emailSet = new Set<string>(prospects.map((p: { email: string }) => p.email.toLowerCase()))
  const prospectByEmail = new Map(prospects.map((p: { email: string; id: string }) => [p.email.toLowerCase(), p]))

  // Search Gmail for emails from any prospect in the last 30 days
  const query = encodeURIComponent(`in:inbox newer_than:30d from:(${[...emailSet].join(' OR ')})`)
  const gmailRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!gmailRes.ok) {
    return NextResponse.json({ ok: false, error: 'Gmail API error', status: gmailRes.status })
  }

  const gmailData = await gmailRes.json()
  const messages = gmailData.messages ?? []
  let logged = 0

  for (const msg of messages.slice(0, 20)) {
    // Get message details
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From,Subject,Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!detailRes.ok) continue
    const detail = await detailRes.json()

    const headers: { name: string; value: string }[] = detail.payload?.headers ?? []
    const fromHeader = headers.find(h => h.name === 'From')?.value ?? ''
    const subject    = headers.find(h => h.name === 'Subject')?.value ?? ''
    const dateStr    = headers.find(h => h.name === 'Date')?.value ?? ''

    // Extract email from "Name <email@domain.com>" format
    const emailMatch = fromHeader.match(/<([^>]+)>/) ?? fromHeader.match(/([^\s]+@[^\s]+)/)
    const fromEmail  = (emailMatch?.[1] ?? fromHeader).toLowerCase().trim()

    const prospect = prospectByEmail.get(fromEmail)
    if (!prospect) continue

    // Check if already logged
    const { data: existing } = await db
      .from('prospect_events')
      .select('id')
      .eq('prospect_id', prospect.id)
      .eq('status', 'replied')
      .eq('notes', `Gmail message: ${msg.id}`)
      .limit(1)

    if (existing?.length) continue

    // Log the reply
    await db.from('prospect_events').insert({
      prospect_id:   prospect.id,
      channel:       'email',
      status:        'replied',
      email_subject: subject,
      notes:         `Gmail message: ${msg.id}`,
    })

    // Promote stage to 'engaged' or higher
    const stagePromotion: Record<string, string> = {
      new: 'engaged', active: 'engaged', engaged: 'hot',
    }
    if (stagePromotion[prospect.stage]) {
      await db.from('prospects').update({
        stage:      stagePromotion[prospect.stage],
        updated_at: new Date().toISOString(),
      }).eq('id', prospect.id)
    }

    logged++
    console.log(`Reply logged: ${prospect.business_name} (${fromEmail}) — "${subject}" on ${dateStr}`)
  }

  return NextResponse.json({ ok: true, scanned: messages.length, logged })
}

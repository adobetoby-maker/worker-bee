import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const BLUEPRINT_API_KEY = process.env.BLUEPRINT_API_KEY ?? '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? 're_7yAskh9s_B5fERdUz4C4CGS7JoytQQ8DW'
const RESEND_AUDIENCE_WORKERBEE = process.env.RESEND_AUDIENCE_WORKERBEE ?? '558a4229-3b49-4685-a0fd-9b1ebf48549a'
const FROM_ADDRESS = 'Toby Anderton — Anderton & Associates <hello@andertongroup.com>'
const NOTIFY_TO = 'adobetoby@gmail.com'

function requireApiKey(req: NextRequest): boolean {
  return req.headers.get('x-api-key') === BLUEPRINT_API_KEY
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function buildAutoReplyHtml(name: string, services: string[]): string {
  const servicesList = services
    .map(s => `<li style="margin:4px 0;padding:6px 12px;background:#2a2a2a;border-left:3px solid #F39C12;border-radius:2px;color:#e0e0e0;font-size:14px;">${s}</li>`)
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Thanks for reaching out</title>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1a1a1a;border-radius:8px;overflow:hidden;border:1px solid #2a2a2a;">

          <!-- Header -->
          <tr>
            <td style="background:#1a1a1a;border-bottom:2px solid #F39C12;padding:32px 40px 24px;">
              <p style="margin:0 0 4px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#F39C12;font-weight:600;">Anderton &amp; Associates</p>
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">Thanks for reaching out, ${name}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 20px;font-size:16px;color:#c0c0c0;line-height:1.7;">
                Thank you for your interest in working with Anderton &amp; Associates.
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#a0a0a0;line-height:1.7;">
                We've received your project inquiry and will review the details within 24&nbsp;hours.
                You'll hear from us directly to discuss your project and next steps.
              </p>

              <!-- Services selected -->
              <p style="margin:0 0 12px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#F39C12;font-weight:600;">Services you selected</p>
              <ul style="margin:0 0 32px;padding:0;list-style:none;">
                ${servicesList}
              </ul>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#F39C12;border-radius:6px;">
                    <a href="https://andertongroup.com/start?submitted=1"
                       style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#111111;text-decoration:none;letter-spacing:0.5px;">
                      View Your Submission →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #2a2a2a;margin:0 0 24px;" />

              <!-- Signature -->
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#e0e0e0;">Toby Anderton</p>
              <p style="margin:0 0 2px;font-size:13px;color:#888888;">Anderton &amp; Associates</p>
              <p style="margin:0 0 2px;font-size:13px;color:#888888;">
                <a href="mailto:hello@andertongroup.com" style="color:#F39C12;text-decoration:none;">hello@andertongroup.com</a>
              </p>
              <p style="margin:0;font-size:13px;color:#888888;">
                <a href="https://andertongroup.com" style="color:#F39C12;text-decoration:none;">andertongroup.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#141414;border-top:1px solid #2a2a2a;padding:16px 40px;">
              <p style="margin:0;font-size:12px;color:#555555;line-height:1.5;">
                This is an automated confirmation. Reply to this email to reach us directly.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildNotificationHtml(fields: {
  name: string
  email: string
  phone?: string | null
  business_name?: string | null
  city?: string | null
  services: string[]
  current_site?: string | null
  budget?: string | null
  timeline?: string | null
  source?: string | null
  source_offer?: string | null
  notes?: string | null
}): string {
  const row = (label: string, value: string | null | undefined) =>
    value
      ? `<tr><td style="padding:6px 12px;color:#888;font-size:13px;width:130px;vertical-align:top;">${label}</td><td style="padding:6px 12px;color:#e0e0e0;font-size:13px;">${value}</td></tr>`
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>New lead</title></head>
<body style="margin:0;padding:24px;background:#111111;font-family:monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;overflow:hidden;">
    <tr><td style="background:#F39C12;padding:12px 20px;">
      <strong style="color:#111;font-size:14px;">New lead from andertongroup.com</strong>
    </td></tr>
    <tr><td style="padding:4px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${row('Name', fields.name)}
        ${row('Email', fields.email)}
        ${row('Phone', fields.phone)}
        ${row('Business', fields.business_name)}
        ${row('City', fields.city)}
        ${row('Services', fields.services.join(', '))}
        ${row('Current site', fields.current_site)}
        ${row('Budget', fields.budget)}
        ${row('Timeline', fields.timeline)}
        ${row('Source', fields.source)}
        ${row('Offer', fields.source_offer)}
        ${row('Notes', fields.notes)}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

async function sendEmail(opts: {
  to: string
  from: string
  replyTo?: string
  subject: string
  html: string
}): Promise<void> {
  const payload: Record<string, unknown> = {
    from: opts.from,
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
  }
  if (opts.replyTo) payload.reply_to = opts.replyTo

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend error ${res.status}: ${text}`)
  }
}

async function addToResendAudience(name: string, email: string): Promise<void> {
  const nameParts = name.trim().split(/\s+/)
  await fetch(`https://api.resend.com/audiences/${RESEND_AUDIENCE_WORKERBEE}/contacts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      first_name: nameParts[0] ?? '',
      last_name: nameParts.slice(1).join(' ') || undefined,
      unsubscribed: false,
    }),
  })
  // Non-fatal — caller does not need to await a throw
}

// POST /api/leads — public, no auth required
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate required fields
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const services = Array.isArray(body.services)
    ? (body.services as unknown[]).filter((s): s is string => typeof s === 'string')
    : []

  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!email || !isValidEmail(email)) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  if (services.length === 0) return NextResponse.json({ error: 'At least one service is required' }, { status: 400 })

  // Optional fields
  const phone = typeof body.phone === 'string' ? body.phone.trim() || null : null
  const business_name = typeof body.business_name === 'string' ? body.business_name.trim() || null : null
  const city = typeof body.city === 'string' ? body.city.trim() || null : null
  const current_site = typeof body.current_site === 'string' ? body.current_site.trim() || null : null
  const budget = typeof body.budget === 'string' ? body.budget.trim() || null : null
  const timeline = typeof body.timeline === 'string' ? body.timeline.trim() || null : null
  const source = typeof body.source === 'string' ? body.source.trim() || null : null
  const source_offer = typeof body.source_offer === 'string' ? body.source_offer.trim() || null : null
  const notes = typeof body.notes === 'string' ? body.notes.trim() || null : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any

  const { data: lead, error: insertError } = await db
    .from('leads')
    .insert({
      name,
      email,
      phone,
      business_name,
      city,
      services,
      current_site,
      budget,
      timeline,
      source,
      source_offer,
      notes,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('leads insert error:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const leadId: string = lead.id
  let resendSent = false

  // Send emails + add to audience — non-fatal on failure
  try {
    const displayName = business_name ?? name
    const servicesLabel = services.join(', ')

    await Promise.all([
      // Auto-reply to submitter
      sendEmail({
        to: email,
        from: FROM_ADDRESS,
        subject: 'Thanks for reaching out — here\'s what happens next',
        html: buildAutoReplyHtml(name, services),
      }),

      // Notification to Toby
      sendEmail({
        to: NOTIFY_TO,
        from: FROM_ADDRESS,
        replyTo: email,
        subject: `New lead: ${displayName} — ${servicesLabel}`,
        html: buildNotificationHtml({
          name, email, phone, business_name, city, services,
          current_site, budget, timeline, source, source_offer, notes,
        }),
      }),

      // Add to Resend audience
      addToResendAudience(name, email),
    ])

    resendSent = true
  } catch (err) {
    console.error('Email send error:', err)
    // Still mark partially — update only on full success
  }

  // Update resend_sent flag
  if (resendSent) {
    await db.from('leads').update({ resend_sent: true }).eq('id', leadId)
  }

  return NextResponse.json({ ok: true, id: leadId }, { status: 201 })
}

// GET /api/leads — protected by BLUEPRINT_API_KEY
export async function GET(req: NextRequest) {
  if (!requireApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any

  let query = db
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('leads GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ leads: data ?? [], total: (data ?? []).length })
}

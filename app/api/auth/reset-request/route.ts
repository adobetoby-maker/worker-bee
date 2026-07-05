// Built by ATLAS — 2026-07-05
// POST /api/auth/reset-request — email a password-reset link to the operator.
//
// No body accepted, no recipient accepted — the recipient is HARDCODED to the
// operator. Always responds { ok: true } (no enumeration), except a naive
// in-module 60s rate limit that returns 429.

import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createResetToken } from '@/lib/resetToken'

export const dynamic = 'force-dynamic'

const OPERATOR_EMAIL = 'adobetoby@gmail.com' // hardcoded — never from the request
const FROM = 'Worker Bee <noreply@andertongroup.com>'
const BASE_URL = 'https://manage.worker-bee.app'
const MIN_INTERVAL_MS = 60_000

let lastSentAt = 0

export async function POST() {
  const now = Date.now()
  if (now - lastSentAt < MIN_INTERVAL_MS) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  lastSentAt = now

  try {
    const token = createResetToken()
    const link = `${BASE_URL}/reset-password?token=${encodeURIComponent(token)}`

    const resend = new Resend(process.env.RESEND_API_KEY)
    const result = await resend.emails.send({
      from: FROM,
      to: OPERATOR_EMAIL,
      subject: 'Worker Bee — admin password reset',
      html: [
        '<div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px">',
        '<h2 style="margin:0 0 12px">Reset your admin password</h2>',
        '<p style="color:#555;line-height:1.5">A password reset was requested for the Worker-Bee management console. This link expires in 15 minutes.</p>',
        `<p style="margin:24px 0"><a href="${link}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;display:inline-block">Reset password</a></p>`,
        `<p style="color:#888;font-size:13px;line-height:1.5">Or paste this URL into your browser:<br>${link}</p>`,
        '<p style="color:#888;font-size:13px">If you did not request this, ignore this email — nothing changes until the link is used.</p>',
        '</div>',
      ].join(''),
    })
    console.log('[reset-request] Resend response:', JSON.stringify(result))
  } catch (err) {
    // Still { ok: true } — no enumeration / no error surface to the caller.
    console.error('[reset-request] send failed:', err)
  }

  return NextResponse.json({ ok: true })
}

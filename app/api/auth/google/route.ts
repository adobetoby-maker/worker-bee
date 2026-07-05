// Built by ATLAS — 2026-07-05
// POST /api/auth/google { credential }
// Verifies a Google Identity Services ID token server-side via Google's
// tokeninfo endpoint, gates on client ID + verified email + email allowlist,
// then issues the SAME wb_admin_session cookie as /api/auth/login.
//
// 404 until GOOGLE_CLIENT_ID is configured (feature is credential-gated).

import { NextRequest, NextResponse } from 'next/server'
import { signToken, COOKIE } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

const DEFAULT_ALLOWED_EMAILS = 'adobetoby@gmail.com'

function allowedEmails(): string[] {
  return (process.env.ALLOWED_ADMIN_EMAILS ?? DEFAULT_ALLOWED_EMAILS)
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export async function POST(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Google sign-in not configured' }, { status: 404 })
  }

  let credential: unknown
  try {
    ;({ credential } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (typeof credential !== 'string' || !credential) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Server-side verification — Google validates signature + expiry and
  // returns the claims. Non-200 = invalid/expired token.
  const resp = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    { cache: 'no-store' },
  )
  if (!resp.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const info = (await resp.json()) as {
    aud?: string
    email?: string
    email_verified?: string
  }

  if (info.aud !== clientId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (info.email_verified !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email = (info.email ?? '').toLowerCase()
  if (!email || !allowedEmails().includes(email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Same cookie, same code path as /api/auth/login.
  const token = signToken('wb_admin')
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}

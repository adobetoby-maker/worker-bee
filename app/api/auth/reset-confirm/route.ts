// Built by ATLAS — 2026-07-05
// POST /api/auth/reset-confirm { token, password }
// Verifies the stateless HMAC reset token (signature + 15-min expiry), writes
// the new scrypt hash to storage via setAdminPassword, then issues the SAME
// wb_admin_session cookie as /api/auth/login (auto-login).

import { NextRequest, NextResponse } from 'next/server'
import { signToken, COOKIE } from '@/lib/adminAuth'
import { verifyResetToken } from '@/lib/resetToken'
import { setAdminPassword } from '@/lib/adminPassword'

export const dynamic = 'force-dynamic'

const MIN_PASSWORD_LENGTH = 12

export async function POST(req: NextRequest) {
  let token: unknown
  let password: unknown
  try {
    ;({ token, password } = await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (typeof token !== 'string' || !verifyResetToken(token)) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
      { status: 400 },
    )
  }

  await setAdminPassword(password)

  // Same cookie, same code path as /api/auth/login.
  const sessionToken = signToken('wb_admin')
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}

// Built by ATLAS — 2026-07-05
// Stateless password-reset tokens for the single-admin console.
//
// Format: base64url(JSON{exp}) + '.' + base64url(HMAC-SHA256(payload, ADMIN_SECRET))
// No DB row, no nonce — the token is valid for 15 minutes and single-admin,
// so replay within the window is equivalent to the window itself. Signed with
// the same ADMIN_SECRET that signs the wb_admin_session cookie.

import { createHmac, timingSafeEqual } from 'node:crypto'

const SECRET = process.env.ADMIN_SECRET ?? 'dev-secret-change-me'
export const RESET_TOKEN_TTL_MS = 15 * 60 * 1000

function sign(payload: string): string {
  return createHmac('sha256', SECRET).update(payload).digest('base64url')
}

export function createResetToken(ttlMs: number = RESET_TOKEN_TTL_MS): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + ttlMs })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/** Server-side check: HMAC signature valid AND not expired. */
export function verifyResetToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false
  const dot = token.lastIndexOf('.')
  if (dot === -1) return false
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  const expected = sign(payload)
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return false

  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      exp?: number
    }
    return typeof exp === 'number' && Date.now() < exp
  } catch {
    return false
  }
}

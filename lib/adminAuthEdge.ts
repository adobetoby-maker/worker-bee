// Built by ATLAS — 2026-07-05
// Edge-safe admin session validator for middleware.ts.
//
// lib/adminAuth.ts uses node:crypto (createHmac) and next/headers, which are
// unavailable in the Edge runtime that Next.js middleware runs in. This module
// re-implements the same HMAC-SHA256 cookie check with Web Crypto
// (crypto.subtle) so middleware can validate the wb_admin_session cookie.
//
// Token format (must stay in lockstep with lib/adminAuth.ts signToken):
//   `${value}.${hex(hmacSha256(ADMIN_SECRET, value))}`
// The login route only ever signs the literal value 'wb_admin', so this
// validator additionally pins the value — strictly stronger than
// adminAuth.verifyToken, never weaker.

export const ADMIN_COOKIE = 'wb_admin_session'
const ADMIN_VALUE = 'wb_admin'

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Constant-time string comparison (both inputs are hex of equal-length MACs). */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Validate the admin session cookie in an Edge runtime.
 * Mirrors lib/adminAuth.ts verifyToken (same secret, same fallback) but async
 * and Web Crypto-based.
 */
export async function verifyAdminTokenEdge(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  const dot = token.lastIndexOf('.')
  if (dot === -1) return false
  const value = token.slice(0, dot)
  if (value !== ADMIN_VALUE) return false
  const sig = token.slice(dot + 1)

  // Same fallback as lib/adminAuth.ts so dev behavior matches node routes.
  const secret = process.env.ADMIN_SECRET ?? 'dev-secret-change-me'

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(value))
  return timingSafeEqualStr(sig, toHex(mac))
}

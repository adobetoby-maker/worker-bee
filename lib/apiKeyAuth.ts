// Built by ATLAS — 2026-07-05
// Shared request auth for machine API routes (node runtime only — uses crypto
// via adminAuth). Two accepted credentials:
//   1. x-api-key header matching a server-side env key (fails CLOSED when the
//      env var is unset — no hardcoded fallbacks, ever)
//   2. a valid wb_admin_session cookie (dashboard pages calling these routes
//      from the browser — the cookie rides along on same-origin fetches)

import type { NextRequest } from 'next/server'
import { COOKIE, verifyToken } from '@/lib/adminAuth'

/** True only when the env key is set AND the x-api-key header matches it. */
export function hasApiKey(req: NextRequest, key: string | undefined): boolean {
  const header = req.headers.get('x-api-key')
  return Boolean(key && header && header === key)
}

/** True when the request carries a valid signed admin-session cookie. */
export function hasAdminSession(req: NextRequest): boolean {
  const token = req.cookies.get(COOKIE)?.value
  return Boolean(token && verifyToken(token))
}

/** /api/marketing/* — droids send MARKETING_API_KEY; dashboard uses cookie. */
export function marketingAuth(req: NextRequest): boolean {
  return hasApiKey(req, process.env.MARKETING_API_KEY) || hasAdminSession(req)
}

/** Internal machine endpoints keyed to BLUEPRINT_API_KEY (contacts, campaigns,
 *  ai, mods, healthcare-outreach, leads). Middleware already default-denies
 *  these; this is defense in depth. */
export function blueprintAuth(req: NextRequest): boolean {
  return hasApiKey(req, process.env.BLUEPRINT_API_KEY) || hasAdminSession(req)
}

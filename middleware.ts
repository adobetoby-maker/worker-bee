// Built by ATLAS — 2026-07-05
// Default-deny auth middleware for manage.worker-bee.app.
//
// Everything is protected by the wb_admin_session cookie UNLESS a path is on
// the explicit public allowlist below. Protected pages redirect to /login;
// protected /api/* routes return 401 JSON.
//
// Protected by default (non-exhaustive — default-deny covers all of these):
//   All (dashboard) route-group URL paths: /analytics /audits /batch /billing
//   /build-offer /build-studio /build-zone /builds /campaigns /clients
//   /configurator /contacts /flow-boards /help /invoices /iterations
//   /language-lens /leads /maintenance /marketing /marketing-command
//   /marketing-push /mods /monetization /monitor /neural-map /requests
//   /ship-ready /sitemap-visual /sites /submissions /tetrad /vault
//   /white-label /white-labels — and ALL /api/* routes not listed below.

import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, verifyAdminTokenEdge } from '@/lib/adminAuthEdge'

// ── Public pages ────────────────────────────────────────────────────────────
// '/'               — marketing landing (app/page.tsx), no data
// '/login'          — admin login form
// '/reset-password' — password reset landing (token-gated server-side in reset-confirm)
// '/plan'           — public blueprint/plan wizard funnel
// '/evaluate'       — public site-evaluation funnel
// '/request'        — public maintenance-request funnel
// '/pipeline'       — public blueprint pipeline funnel
const PUBLIC_PAGES = new Set(['/', '/login', '/reset-password', '/plan', '/evaluate', '/request', '/pipeline'])

// '/client/<token>'  — tokenized client portal (server-side token lookup)
// '/invoice/<token>' — tokenized public invoice view (server-side token lookup)
const PUBLIC_PAGE_PREFIXES = ['/client/', '/invoice/']

// ── Public APIs ─────────────────────────────────────────────────────────────
const PUBLIC_API_EXACT = new Set([
  // auth
  '/api/auth/login',          // sets the admin cookie
  '/api/auth/logout',         // clears the admin cookie
  '/api/auth/reset-request',  // emails reset link to hardcoded operator; 60s rate limit
  '/api/auth/reset-confirm',  // HMAC reset token verified in-route; sets the admin cookie
  '/api/auth/google',         // Google ID token verified in-route; sets the admin cookie

  // called by public /evaluate funnel (app/evaluate/page.tsx)
  '/api/site-audit',
  '/api/audit-blueprint',
  '/api/audits/save',
  '/api/blueprints/import-audit',

  // called by public /plan funnel (app/plan/page.tsx)
  '/api/blueprint-cleanup', // also used by /pipeline
  '/api/blueprint-wizard',
  '/api/blueprints/submit',
  '/api/build-trigger',

  // called by public /pipeline funnel (app/pipeline/page.tsx)
  '/api/blueprint-research',

  // called by public /request funnel (app/request/page.tsx)
  '/api/maintenance/cleanup',
  '/api/maintenance/submit',

  // machine endpoints that enforce their own x-api-key (verified in code)
  '/api/blueprints/update', // checks x-api-key === BLUEPRINT_API_KEY

  // machine endpoint — WARNING: wb-run does NOT check any key (see commit msg)
  '/api/wb-run',

  // inbound webhook — route checks svix-signature header presence
  '/api/webhooks/resend',
])

const PUBLIC_API_PREFIXES = [
  '/api/marketing/', // every marketing route enforces x-api-key itself (verified all 11)
  '/api/cron/',      // routes now enforce Authorization: Bearer CRON_SECRET themselves
]

function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  return !!secret && req.headers.get('authorization') === `Bearer ${secret}`
}

function isPublic(req: NextRequest): boolean {
  const { pathname, searchParams } = req.nextUrl

  if (PUBLIC_PAGES.has(pathname)) return true
  if (PUBLIC_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) return true

  if (PUBLIC_API_EXACT.has(pathname)) return true
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return true

  // /plan polls /api/build-status/<jobId>. /api/build-status/list stays admin-only.
  if (pathname.startsWith('/api/build-status/') && pathname !== '/api/build-status/list') {
    return true
  }

  // Public invoice page links /api/invoice-pdf/<id>?token=<public_token>.
  // Only public when a NON-EMPTY token is supplied — the route 401s on mismatch.
  // `.has('token')` is true for an empty `?token=`, which the route's own
  // `tokenParam &&` guard then skips — an IDOR found in adversarial review
  // 2026-07-05. Require a truthy value so empty/missing tokens fall through
  // to the admin-cookie check.
  if (pathname.startsWith('/api/invoice-pdf/') && searchParams.get('token')) return true

  return false
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublic(req)) return NextResponse.next()

  // /api/monitor is both a Vercel cron target (vercel.json) and a dashboard
  // fetch — allow cron bearer OR admin cookie.
  if (pathname === '/api/monitor' && isCronAuthorized(req)) return NextResponse.next()

  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (await verifyAdminTokenEdge(token)) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.search = ''
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Skip Next internals and static assets; everything else goes through auth.
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|map|txt|woff2?)$).*)',
  ],
}

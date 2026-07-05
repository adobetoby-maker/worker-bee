// Built by ATLAS — 2026-07-05
// PATCH /api/portfolio/[slug]/mrr — inline MRR edit from the Portfolio detail page.
//
// Auth: middleware.ts default-deny already 401s this route without the admin
// cookie, AND the cookie is re-verified here — belt and braces after the
// requireAdmin-never-called hole (see CLAUDE.md Failure Patterns).

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase'
import { COOKIE, verifyToken } from '@/lib/adminAuth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  // requireAdmin() redirects (page semantics) — API routes return 401 JSON.
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params

  let body: { mrr_cents?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const mrr = body.mrr_cents
  if (typeof mrr !== 'number' || !Number.isInteger(mrr) || mrr < 0 || mrr > 100_000_000) {
    return NextResponse.json(
      { error: 'mrr_cents must be a non-negative integer number of cents' },
      { status: 400 },
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any
  const { data, error } = await db
    .from('properties')
    .update({ mrr_cents: mrr, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select('slug, mrr_cents')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  return NextResponse.json(data)
}

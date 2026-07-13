// Built by ATLAS — 2026-07-12
import { NextRequest, NextResponse } from 'next/server'
import { hasAdminSession } from '@/lib/apiKeyAuth'
import { MISSION_SLUG_RE, getMission } from '@/lib/missionStore'

// Admin-only, enforced IN-ROUTE (defense in depth): middleware default-denies
// this path already; this check keeps it safe if the matcher ever regresses.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!hasAdminSession(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params
  if (!MISSION_SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'invalid slug' }, { status: 400 })
  }

  try {
    const record = await getMission(slug)
    if (!record) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json(record)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

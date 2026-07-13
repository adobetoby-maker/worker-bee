// Built by ATLAS — 2026-07-12
import { NextRequest, NextResponse } from 'next/server'
import { hasAdminSession } from '@/lib/apiKeyAuth'
import { listMissions } from '@/lib/missionStore'

// Admin-only, enforced IN-ROUTE (defense in depth): middleware default-denies
// this path already; this check keeps it safe if the matcher ever regresses.
export async function GET(req: NextRequest) {
  if (!hasAdminSession(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const missions = await listMissions()
    return NextResponse.json({ missions })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

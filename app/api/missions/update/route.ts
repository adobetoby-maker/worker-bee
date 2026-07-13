// Built by ATLAS — 2026-07-12
import { NextRequest, NextResponse } from 'next/server'
import { blueprintAuth } from '@/lib/apiKeyAuth'
import { parseMissionState, saveMissionState } from '@/lib/missionStore'

export async function POST(req: NextRequest) {
  if (!blueprintAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const state = parseMissionState(body)
  if (!state) {
    return NextResponse.json({ error: 'invalid mission state' }, { status: 400 })
  }

  try {
    const record = await saveMissionState(state)
    return NextResponse.json({ ok: true, slug: state.slug, receivedAt: record.receivedAt })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

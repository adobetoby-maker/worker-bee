import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const BUCKET = 'build-logs'

interface Phase {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  startedAt?: string
  completedAt?: string
  errors: string[]
}

interface BuildLog {
  siteId: string
  status: 'running' | 'idle' | 'done' | 'error'
  phases: Phase[]
  updatedAt: string
}

const DEFAULT_PHASES: Phase[] = [
  { id: 'design',       label: 'Design',       status: 'pending', errors: [] },
  { id: 'architecture', label: 'Architecture',  status: 'pending', errors: [] },
  { id: 'content',      label: 'Content / SEO', status: 'pending', errors: [] },
  { id: 'qa',           label: 'QA',            status: 'pending', errors: [] },
  { id: 'ship',         label: 'Ship',          status: 'pending', errors: [] },
]

// GET /api/build-log?siteId=xxx
export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId')
  if (!siteId) {
    return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(`${siteId}.json`)

  if (error || !data) {
    // No log yet — return idle state
    const idle: BuildLog = {
      siteId,
      status: 'idle',
      phases: DEFAULT_PHASES,
      updatedAt: new Date().toISOString(),
    }
    return NextResponse.json(idle)
  }

  try {
    const text = await data.text()
    const parsed = JSON.parse(text) as BuildLog
    return NextResponse.json(parsed)
  } catch {
    const idle: BuildLog = {
      siteId,
      status: 'idle',
      phases: DEFAULT_PHASES,
      updatedAt: new Date().toISOString(),
    }
    return NextResponse.json(idle)
  }
}

// POST /api/build-log — write/update build state
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<BuildLog> & { siteId: string }
    if (!body.siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 })
    }

    const log: BuildLog = {
      siteId: body.siteId,
      status: body.status ?? 'idle',
      phases: body.phases ?? DEFAULT_PHASES,
      updatedAt: new Date().toISOString(),
    }

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(`${body.siteId}.json`, JSON.stringify(log), {
        contentType: 'application/json',
        upsert: true,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, log })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

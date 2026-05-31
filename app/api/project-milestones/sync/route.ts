import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

// Lifecycle sort order — auto milestones appear before manual ones (manual adds from max+1)
const EVENT_ORDER: Record<string, number> = {
  project_started:     1,
  first_commit:        2,
  claude_md_created:   3,
  prd_created:         4,
  design_system_added: 5,
  blueprint_mapped:    6,
  github_repo_added:   7,
  vercel_wired:        8,
  site_live:           9,
}

interface EventPayload {
  event_type: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'complete' | 'blocked'
}

// POST /api/project-milestones/sync
// { site_id, events: EventPayload[] }
// Protected by BLUEPRINT_API_KEY (same key used by droid scripts)
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== process.env.BLUEPRINT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { site_id, events } = body as { site_id: string; events: EventPayload[] }

  if (!site_id) return NextResponse.json({ error: 'site_id required' }, { status: 400 })
  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ upserted: 0 }, { status: 200 })
  }

  const results: { event_type: string; action: string }[] = []

  for (const ev of events) {
    if (!ev.event_type || !ev.title) continue

    // Check if already exists for this site
    const { data: existing } = await db
      .from('project_milestones')
      .select('id, status')
      .eq('site_id', site_id)
      .eq('event_type', ev.event_type)
      .maybeSingle()

    if (existing) {
      // Only update if status actually changed (don't overwrite manual edits to title/desc)
      if (existing.status !== ev.status) {
        const updates: Record<string, unknown> = { status: ev.status }
        if (ev.status === 'complete') updates.completed_at = new Date().toISOString()
        if (ev.status !== 'complete') updates.completed_at = null
        await db.from('project_milestones').update(updates).eq('id', existing.id)
        results.push({ event_type: ev.event_type, action: 'updated' })
      } else {
        results.push({ event_type: ev.event_type, action: 'no_change' })
      }
    } else {
      // Insert new auto milestone
      const sortOrder = EVENT_ORDER[ev.event_type] ?? 50
      await db.from('project_milestones').insert({
        site_id,
        title: ev.title,
        description: ev.description ?? null,
        status: ev.status,
        source: 'auto',
        event_type: ev.event_type,
        sort_order: sortOrder,
        completed_at: ev.status === 'complete' ? new Date().toISOString() : null,
      })
      results.push({ event_type: ev.event_type, action: 'inserted' })
    }
  }

  const upserted = results.filter(r => r.action !== 'no_change').length
  return NextResponse.json({ ok: true, upserted, results })
}

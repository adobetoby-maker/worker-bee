import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hasAdminSession } from '@/lib/apiKeyAuth'
import type { BuildJob } from '@/app/api/build-trigger/route'

// GET /api/build-status/list
// Returns all build jobs, sorted newest first.
// Admin-only, enforced IN-ROUTE (defense in depth): the middleware allowlists
// /api/build-status/<jobId> for the public /plan poller and excludes /list via
// a negative string match — this check makes /list safe even if that matcher
// logic ever regresses. Uses the same signed-cookie verification as
// lib/adminAuth.requireAdmin(), but returns 401 JSON instead of a login
// redirect because this is an API route (node runtime).
export async function GET(req: NextRequest) {
  if (!hasAdminSession(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await supabaseAdmin.storage
    .from('build-logs')
    .list('jobs', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ jobs: [] })
  }

  // Fetch each job file in parallel (cap at 20 most recent)
  const files = data.slice(0, 20)
  const jobs = await Promise.all(
    files.map(async (file) => {
      const { data: fileData } = await supabaseAdmin.storage
        .from('build-logs')
        .download(`jobs/${file.name}`)
      if (!fileData) return null
      try {
        const text = await fileData.text()
        return JSON.parse(text) as BuildJob
      } catch {
        return null
      }
    })
  )

  return NextResponse.json({
    jobs: jobs.filter(Boolean).sort((a, b) =>
      new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime()
    ),
  })
}

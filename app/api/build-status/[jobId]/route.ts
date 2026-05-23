import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { BuildJob } from '@/app/api/build-trigger/route'

// GET /api/build-status/{jobId}
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  const { data, error } = await supabaseAdmin.storage
    .from('build-logs')
    .download(`jobs/${jobId}.json`)

  if (error || !data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  try {
    const text = await data.text()
    const job = JSON.parse(text) as BuildJob
    return NextResponse.json(job)
  } catch {
    return NextResponse.json({ error: 'Failed to parse job' }, { status: 500 })
  }
}

// PATCH /api/build-status/{jobId}
// Body: Partial<BuildJob> — update any fields on the job record
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  try {
    const updates = await req.json() as Partial<BuildJob>

    // Fetch current job
    const { data, error } = await supabaseAdmin.storage
      .from('build-logs')
      .download(`jobs/${jobId}.json`)

    if (error || !data) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const text = await data.text()
    const job = JSON.parse(text) as BuildJob

    // Merge updates
    const updated: BuildJob = {
      ...job,
      ...updates,
      log: updates.log ? [...job.log, ...updates.log] : job.log,
      scores: updates.scores ?? job.scores,
      updatedAt: new Date().toISOString(),
    }

    await supabaseAdmin.storage
      .from('build-logs')
      .upload(`jobs/${jobId}.json`, JSON.stringify(updated, null, 2), {
        contentType: 'application/json',
        upsert: true,
      })

    return NextResponse.json({ ok: true, job: updated })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

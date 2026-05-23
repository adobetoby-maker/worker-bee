import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 10

const BUCKET_LOGS = 'build-logs'
const BUCKET_BLUEPRINTS = 'blueprints'

export interface BuildJob {
  jobId: string
  submissionId: string
  siteId?: string
  status: 'queued' | 'building' | 'iterating' | 'deploying' | 'done' | 'error'
  iteration: number
  maxIterations: number
  scores: Array<{ i: number; total: number; worst: string }>
  currentScore: number
  deployUrl?: string
  phases: {
    research: 'pending' | 'running' | 'done' | 'error'
    scaffold: 'pending' | 'running' | 'done' | 'error'
    'visual-loop': 'pending' | 'running' | 'done' | 'error'
    deploy: 'pending' | 'running' | 'done' | 'error'
  }
  log: string[]
  createdAt: string
  updatedAt: string
}

function makeJob(submissionId: string, siteId?: string): BuildJob {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  return {
    jobId,
    submissionId,
    siteId,
    status: 'queued',
    iteration: 0,
    maxIterations: 10,
    scores: [],
    currentScore: 0,
    phases: {
      research: 'pending',
      scaffold: 'pending',
      'visual-loop': 'pending',
      deploy: 'pending',
    },
    log: [`Build job created — submission ${submissionId}`],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

async function writeJob(job: BuildJob): Promise<void> {
  await supabaseAdmin.storage
    .from(BUCKET_LOGS)
    .upload(`jobs/${job.jobId}.json`, JSON.stringify(job, null, 2), {
      contentType: 'application/json',
      upsert: true,
    })
}

async function updateSubmissionStatus(submissionId: string, jobId: string): Promise<void> {
  try {
    // Download current submission
    const { data } = await supabaseAdmin.storage
      .from(BUCKET_BLUEPRINTS)
      .download(`submissions/${submissionId}.json`)
    if (!data) return

    const text = await data.text()
    const payload = JSON.parse(text)
    payload.status = 'building'
    payload.jobId = jobId

    await supabaseAdmin.storage
      .from(BUCKET_BLUEPRINTS)
      .upload(`submissions/${submissionId}.json`, JSON.stringify(payload, null, 2), {
        contentType: 'application/json',
        upsert: true,
      })
  } catch {
    // Non-fatal — job still runs even if we can't update the submission
  }
}

// POST /api/build-trigger
// Body: { submissionId: string, siteId?: string }
// Returns: { jobId, status: 'queued', pipelineGuide: string }
export async function POST(req: NextRequest) {
  try {
    const { submissionId, siteId } = await req.json()

    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId is required' }, { status: 400 })
    }

    const job = makeJob(submissionId, siteId)
    await writeJob(job)
    await updateSubmissionStatus(submissionId, job.jobId)

    return NextResponse.json({
      jobId: job.jobId,
      status: 'queued',
      statusUrl: `/api/build-status/${job.jobId}`,
      pipelineGuide: '/pipeline/00-overview.md',
      message: 'Build job queued. Follow pipeline/00-overview.md to execute.',
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

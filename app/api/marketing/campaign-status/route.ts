import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

const API_KEY = process.env.INTERNAL_API_KEY ?? '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'

export async function GET(req: NextRequest) {
  const key = req.headers.get('x-api-key')
  if (key !== API_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const campaignId = searchParams.get('campaignId')

  if (campaignId) {
    // Fetch a specific campaign with all jobs
    const { data: campaign, error } = await db
      .from('push_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (error || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    const { data: jobs } = await db
      .from('push_campaign_jobs')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('channel_id')

    // Recount statuses from actual jobs
    const jobRows = jobs ?? []
    const done    = jobRows.filter((j: { status: string }) => j.status === 'done').length
    const failed  = jobRows.filter((j: { status: string }) => j.status === 'failed').length
    const queued  = jobRows.filter((j: { status: string }) => j.status === 'queued' || j.status === 'running').length
    const pending = jobRows.filter((j: { status: string }) => j.status === 'pending_user').length
    const skipped = jobRows.filter((j: { status: string }) => j.status === 'skipped').length

    return NextResponse.json({ campaign, jobs: jobRows, counts: { done, failed, queued, pending, skipped } })
  }

  // Fetch recent campaigns (last 24h)
  const since = new Date(Date.now() - 86400 * 1000).toISOString()
  const { data: campaigns } = await db
    .from('push_campaigns')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ campaigns: campaigns ?? [] })
}

export async function PATCH(req: NextRequest) {
  const key = req.headers.get('x-api-key')
  if (key !== API_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Mark a specific job as done (user manually completed a pending_user job)
  const { jobId, status, resultUrl } = await req.json()
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

  await db.from('push_campaign_jobs').update({
    status:       status ?? 'done',
    result_url:   resultUrl ?? null,
    completed_at: new Date().toISOString(),
  }).eq('id', jobId)

  return NextResponse.json({ ok: true })
}

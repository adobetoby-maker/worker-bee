import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = require('@/lib/supabase').supabaseAdmin as any

export const dynamic = 'force-dynamic'

// Machine endpoint — every known caller is a script (gather.sh daily brief,
// push-to-worker-bee skill). No browser callers, so CORS was dropped and
// x-api-key === WB_RUN_API_KEY is enforced on BOTH methods. Fails CLOSED
// when the env var is unset. Hardened 2026-07-05 (security review — this
// route previously accepted anonymous reads AND writes).
function auth(req: NextRequest): boolean {
  const key = process.env.WB_RUN_API_KEY
  const header = req.headers.get('x-api-key')
  return Boolean(key && header && header === key)
}

// GET /api/wb-run?siteId=xxx          → last 10 runs for that site
// GET /api/wb-run?all=1               → most recent run per site (for daily brief)
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  const all = searchParams.get('all') === '1'

  if (all) {
    // One row per site — most recent run (for gather.sh polling)
    const { data, error } = await supabaseAdmin
      .from('wb_pipeline_runs')
      .select('id, site_id, run_at, phases, seo_score, cso_score, changes, recommendations, monetization_summary, summary, status, sites(name, url)')
      .order('run_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Deduplicate — keep only the latest run per site
    const seen = new Set<string>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const latest = (data ?? []).filter((r: any) => {
      if (seen.has(r.site_id)) return false
      seen.add(r.site_id)
      return true
    })
    return NextResponse.json({ runs: latest })
  }

  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('wb_pipeline_runs')
    .select('*')
    .eq('site_id', siteId)
    .order('run_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ runs: data ?? [] })
}

// POST /api/wb-run  — record a new run (called by the push-to-worker-bee skill)
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    site_id, triggered_by = 'claude', phases = {}, seo_score, cso_score,
    changes = [], recommendations = [], affiliate_matches = [],
    monetization_summary, summary, status = 'complete',
  } = body

  if (!site_id) return NextResponse.json({ error: 'site_id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('wb_pipeline_runs')
    .insert({
      site_id, triggered_by, phases, seo_score, cso_score,
      changes, recommendations, affiliate_matches,
      monetization_summary, summary, status,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ run: data }, { status: 201 })
}

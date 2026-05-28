import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAdmin = require('@/lib/supabase').supabaseAdmin as any

export const dynamic = 'force-dynamic'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// GET /api/wb-run?siteId=xxx          → last 10 runs for that site
// GET /api/wb-run?all=1               → most recent run per site (for daily brief)
export async function GET(req: NextRequest) {
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
    return NextResponse.json({ runs: latest }, { headers: CORS })
  }

  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400, headers: CORS })

  const { data, error } = await supabaseAdmin
    .from('wb_pipeline_runs')
    .select('*')
    .eq('site_id', siteId)
    .order('run_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS })
  return NextResponse.json({ runs: data ?? [] }, { headers: CORS })
}

// POST /api/wb-run  — record a new run (called by wb-push.sh or Claude)
export async function POST(req: NextRequest) {
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS })
  return NextResponse.json({ run: data }, { status: 201, headers: CORS })
}

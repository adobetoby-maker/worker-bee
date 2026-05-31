export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Plus, Package, Paintbrush } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import { SiteList } from './SiteList'

type WbRun = {
  site_id: string
  run_at: string
  seo_score: number | null
  cso_score: number | null
  changes: string[]
  recommendations: string[]
  phases: Record<string, boolean | string>
  status: string
  summary: string | null
}

export default async function SitesPage() {
  const sitesRes = await supabaseAdmin.from('sites').select('*').order('name', { ascending: true })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runsRes = await (supabaseAdmin as any)
    .from('wb_pipeline_runs')
    .select('site_id, run_at, seo_score, cso_score, changes, recommendations, phases, status, summary')
    .order('run_at', { ascending: false })
    .limit(500)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sites = (sitesRes.data ?? []) as any[]
  const runs = ((runsRes.data ?? []) as WbRun[])

  // Build latest-run map keyed by site_id
  const latestRun: Record<string, WbRun> = {}
  for (const r of runs) {
    if (!latestRun[r.site_id]) latestRun[r.site_id] = r
  }

  const sitesWithRun = sites.map((s: any) => ({
    id: s.id as string,
    name: s.name as string,
    url: s.url as string,
    stack: s.stack as string,
    status: s.status as string,
    github_repo: (s.github_repo ?? null) as string | null,
    vercel_project_id: (s.vercel_project_id ?? null) as string | null,
    created_at: s.created_at as string,
    lastRun: latestRun[s.id as string] ?? null,
  }))

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Sites</h1>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            {sites?.length ?? 0} registered &middot; {Object.keys(latestRun).length} WB-processed
          </p>
        </div>
        <Link href="/sites/new"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus size={15} /> Add Site
        </Link>
      </div>
      {/* Products & White Labels quick links */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/white-labels"
          className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
          <Package size={15} style={{ color: '#f59e0b' }} />
          <div>
            <div className="text-xs font-semibold text-white">Products</div>
            <div className="text-xs" style={{ color: '#64748b' }}>LMS Pro + white labels</div>
          </div>
        </Link>
        <Link href="/white-labels"
          className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
          style={{ background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.18)' }}>
          <Paintbrush size={15} style={{ color: '#818cf8' }} />
          <div>
            <div className="text-xs font-semibold text-white">White Labels</div>
            <div className="text-xs" style={{ color: '#64748b' }}>Command center →</div>
          </div>
        </Link>
      </div>

      <SiteList sites={sitesWithRun} />
    </div>
  )
}

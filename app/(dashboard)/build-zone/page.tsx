export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import BuildZoneClient from './BuildZoneClient'

export const metadata = { title: 'Build Zone — Worker-Bee' }

export default async function BuildZonePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any

  // Sites with intake data (notes contains intake_submitted_at)
  const { data: sites } = await db
    .from('sites')
    .select('id, name, url, status, github_repo, notes, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  // Parse notes and filter to those with intake data
  const intakes = (sites ?? [])
    .map((s: Record<string, unknown>) => {
      let meta: Record<string, unknown> = {}
      try { meta = JSON.parse(s.notes as string ?? '{}') } catch { /* ok */ }
      return { ...s, meta }
    })
    .filter((s: { meta: Record<string, unknown> }) => s.meta.intake_submitted_at)
    .sort((a: { meta: Record<string, unknown> }, b: { meta: Record<string, unknown> }) =>
      String(b.meta.intake_submitted_at ?? '').localeCompare(String(a.meta.intake_submitted_at ?? ''))
    )

  // All sites for the generate-link panel
  const allSites = (sites ?? []).map((s: Record<string, unknown>) => ({
    id: s.id, name: s.name, url: s.url,
  }))

  return <BuildZoneClient intakes={intakes} allSites={allSites} />
}

export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { supabaseAdmin as _db } from '@/lib/supabase'
const db = _db as any

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: siteId } = await params

  // ── 1. Look up Sanity config keys ──
  const { data: configs } = await db
    .from('project_configs')
    .select('key, value')
    .eq('site_id', siteId)
    .in('key', ['NEXT_PUBLIC_SANITY_PROJECT_ID', 'NEXT_PUBLIC_SANITY_DATASET', 'SANITY_API_TOKEN'])

  const projectId = configs?.find((c: { key: string }) => c.key === 'NEXT_PUBLIC_SANITY_PROJECT_ID')?.value
  const dataset   = configs?.find((c: { key: string }) => c.key === 'NEXT_PUBLIC_SANITY_DATASET')?.value ?? 'production'
  const token     = configs?.find((c: { key: string }) => c.key === 'SANITY_API_TOKEN')?.value

  if (!projectId) {
    return NextResponse.json(
      { error: 'Sanity project ID not configured. Add NEXT_PUBLIC_SANITY_PROJECT_ID in the Config panel.' },
      { status: 422 }
    )
  }

  const apiBase = `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  // ── 2. Parallel GROQ queries ──
  const queries = {
    pressReleases: `*[_type == "pressRelease"] | order(publishedAt desc)[0...10] { _id, title, publishedAt, source, excerpt }`,
    events:        `*[_type == "event"] | order(eventDate asc)[0...10] { _id, title, eventDate, location, eventType }`,
    executives:    `*[_type == "executive"] | order(order asc)[0...10] { _id, name, title, linkedIn }`,
    counts:        `{ "pressReleases": count(*[_type == "pressRelease"]), "events": count(*[_type == "event"]), "executives": count(*[_type == "executive"]), "governanceDocs": count(*[_type == "governanceDoc"]) }`,
  }

  const fetches = await Promise.allSettled(
    Object.entries(queries).map(async ([key, query]) => {
      const res = await fetch(`${apiBase}?query=${encodeURIComponent(query)}`, { headers, cache: 'no-store' })
      const json = await res.json()
      return [key, json.result]
    })
  )

  const result: Record<string, unknown> = {}
  for (const f of fetches) {
    if (f.status === 'fulfilled') {
      const [key, data] = f.value
      result[key] = data
    }
  }

  return NextResponse.json({
    projectId,
    dataset,
    studioUrl: null, // filled by client from site URL
    ...result,
  })
}

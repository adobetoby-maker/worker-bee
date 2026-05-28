import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
// Increase timeout for pinging multiple sites
export const maxDuration = 30

interface Site {
  id: string
  name: string
  url: string
  stack: string
  status: string
  created_at: string
  ga4_property_id: string | null
  ga4_hostname: string | null
}

async function pingSite(url: string): Promise<{
  ok: boolean
  code: number | null
  ms: number | null
  error: string | null
}> {
  if (!url) return { ok: false, code: null, ms: null, error: 'no URL' }
  const normalized = url.startsWith('http') ? url : `https://${url}`
  const t0 = Date.now()
  try {
    const res = await fetch(normalized, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
      headers: { 'User-Agent': 'WorkerBee-Monitor/1.0' },
    })
    return { ok: res.ok, code: res.status, ms: Date.now() - t0, error: null }
  } catch (e) {
    return { ok: false, code: null, ms: Date.now() - t0, error: String(e).slice(0, 80) }
  }
}

export async function GET() {
  const { data: sites, error } = await supabaseAdmin
    .from('sites')
    .select('id,name,url,stack,status,created_at,ga4_property_id,ga4_hostname')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!sites?.length) return NextResponse.json([])

  const results = await Promise.all(
    (sites as Site[]).map(async (site) => {
      const ping = await pingSite(site.url)
      return {
        id: site.id,
        name: site.name,
        url: site.url,
        stack: site.stack,
        status: site.status,
        created_at: site.created_at,
        ga4_property_id: site.ga4_property_id,
        ga4_hostname: site.ga4_hostname,
        ping_ok: ping.ok,
        ping_code: ping.code,
        ping_ms: ping.ms,
        ping_error: ping.error,
        checked_at: new Date().toISOString(),
      }
    })
  )

  return NextResponse.json(results)
}

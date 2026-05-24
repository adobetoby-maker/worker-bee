export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { supabaseAdmin as _db } from '@/lib/supabase'
const db = _db as any

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: siteId } = await params

  // ── 1. Look up this site's Supabase credentials from manage-worker-bee config ──
  const { data: configs } = await db
    .from('project_configs')
    .select('key, value')
    .eq('site_id', siteId)
    .in('key', ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'])

  if (!configs || configs.length < 2) {
    return NextResponse.json(
      { error: 'Supabase credentials not configured for this site. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the Config panel.' },
      { status: 422 }
    )
  }

  const url = configs.find((c: { key: string }) => c.key === 'NEXT_PUBLIC_SUPABASE_URL')?.value
  const key = configs.find((c: { key: string }) => c.key === 'SUPABASE_SERVICE_ROLE_KEY')?.value

  if (!url || !key) {
    return NextResponse.json({ error: 'Missing Supabase URL or service role key.' }, { status: 422 })
  }

  // ── 2. Connect to the site's own Supabase ──
  const client = createClient(url, key, { auth: { persistSession: false } })

  // ── 3. Fetch all investor data in parallel ──
  const [investorsRes, activityRes, accessLogRes] = await Promise.all([
    client
      .from('investors')
      .select('id, email, full_name, organization, investment_type, tier, kyc_verified_at, nda_signed_at, accredited_certified_at, accredited_self_certified, created_at')
      .order('created_at', { ascending: false }),
    client
      .from('investor_activity')
      .select('id, action, metadata, created_at, investor_id')
      .order('created_at', { ascending: false })
      .limit(30),
    client
      .from('document_access_log')
      .select('id, document_id, accessed_at, ip, investor_id')
      .order('accessed_at', { ascending: false })
      .limit(20),
  ])

  const investors = investorsRes.data ?? []
  const activity  = activityRes.data ?? []
  const accessLog = accessLogRes.data ?? []

  // ── 4. Compute stats ──
  const stats = {
    total:       investors.length,
    kyc:         investors.filter((i: { kyc_verified_at: string | null }) => i.kyc_verified_at).length,
    nda:         investors.filter((i: { nda_signed_at: string | null }) => i.nda_signed_at).length,
    accredited:  investors.filter((i: { accredited_certified_at: string | null }) => i.accredited_certified_at).length,
  }

  return NextResponse.json({ stats, investors, activity, accessLog })
}

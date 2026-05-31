import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any
const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'
const auth = (req: NextRequest) => req.headers.get('x-api-key') === API_KEY

// GET /api/marketing/campaigns/[id]/tasks
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  let q = db.from('marketing_tasks').select('*').eq('campaign_id', id).order('created_at', { ascending: true })
  if (status) q = q.eq('approval_status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/marketing/campaigns/[id]/tasks — add a task to a campaign
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id: campaignId } = await params
  const body = await req.json()
  const { platform, slot, copy, asset_url, site_type } = body
  if (!platform || !copy) return NextResponse.json({ error: 'platform and copy required' }, { status: 400 })

  const { data, error } = await db.from('marketing_tasks').insert({
    campaign_id: campaignId,
    droid_id: `droid-${platform}`,
    type: 'todo',
    text: copy,
    platform,
    slot: slot ?? null,
    site_type: site_type ?? null,
    approval_status: 'pending_approval',
    content_brief: { copy, asset_url, platform, slot },
    generated_assets: asset_url ? { asset_url } : {},
    done: false,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

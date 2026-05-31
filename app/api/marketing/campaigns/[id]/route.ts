import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any
const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'
const auth = (req: NextRequest) => req.headers.get('x-api-key') === API_KEY

// GET /api/marketing/campaigns/[id] — campaign + tasks
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const [campaignRes, tasksRes] = await Promise.all([
    db.from('marketing_campaigns').select('*, sites(name, url, stack)').eq('id', id).single(),
    db.from('marketing_tasks').select('*').eq('campaign_id', id).order('created_at', { ascending: true }),
  ])
  if (campaignRes.error) return NextResponse.json({ error: campaignRes.error.message }, { status: 404 })
  return NextResponse.json({ campaign: campaignRes.data, tasks: tasksRes.data ?? [] })
}

// PATCH /api/marketing/campaigns/[id] — update status or fields
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const allowed = ['status', 'name', 'platforms', 'content_types']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  const { data, error } = await db.from('marketing_campaigns').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

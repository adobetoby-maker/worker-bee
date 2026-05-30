/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const db = supabaseAdmin as any

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('site_id')
  if (!siteId) return NextResponse.json({ error: 'site_id required' }, { status: 400 })

  const { data, error } = await db
    .from('project_milestones')
    .select('*')
    .eq('site_id', siteId)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.site_id) return NextResponse.json({ error: 'site_id required' }, { status: 400 })
  if (!body.title?.trim()) return NextResponse.json({ error: 'title required' }, { status: 400 })

  // get current max sort_order
  const { data: existing } = await db
    .from('project_milestones')
    .select('sort_order')
    .eq('site_id', body.site_id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const maxOrder = existing?.[0]?.sort_order ?? 0

  const clean = {
    site_id: body.site_id,
    title: body.title.trim(),
    description: body.description?.trim() || null,
    status: body.status ?? 'pending',
    sort_order: maxOrder + 1,
    completed_at: null,
  }

  const { data, error } = await db.from('project_milestones').insert(clean).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

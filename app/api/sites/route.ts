/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const db = supabaseAdmin as any

export async function GET() {
  const { data, error } = await db.from('sites').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const clean = {
    name: body.name,
    url: body.url ?? '',
    stack: body.stack ?? 'nextjs',
    status: body.status ?? 'active',
    github_repo: body.github_repo || null,
    vercel_project_id: body.vercel_project_id || null,
    wp_api_url: body.wp_api_url || null,
    notes: body.notes || null,
  }
  const { data, error } = await db.from('sites').insert(clean).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

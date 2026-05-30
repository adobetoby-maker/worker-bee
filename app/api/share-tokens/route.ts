/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

const db = supabaseAdmin as any

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.site_id) return NextResponse.json({ error: 'site_id required' }, { status: 400 })

  const token = crypto.randomBytes(24).toString('hex')
  const label = body.label?.trim() || 'Client Share Link'

  const clean = {
    site_id: body.site_id,
    token,
    label,
    active: true,
  }

  const { data, error } = await db.from('share_tokens').insert(clean).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const url = `https://manage.worker-bee.app/client/${token}`
  return NextResponse.json({ ...data, url }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('site_id')
  if (!siteId) return NextResponse.json({ error: 'site_id required' }, { status: 400 })

  const { data, error } = await db
    .from('share_tokens')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const withUrls = (data ?? []).map((t: any) => ({
    ...t,
    url: `https://manage.worker-bee.app/client/${t.token}`,
  }))

  return NextResponse.json(withUrls)
}

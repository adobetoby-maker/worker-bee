/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GET /api/client-intake/html?token=xxx
 * Returns a self-contained HTML intake form for the client.
 * No login required — token-gated.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateIntakeHTML } from './template'

const db = supabaseAdmin as any

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return new NextResponse('Missing token', { status: 400 })

  const { data: tokenRow } = await db
    .from('share_tokens')
    .select('site_id, label, active')
    .eq('token', token)
    .single()

  if (!tokenRow?.active) return new NextResponse('Invalid or expired link', { status: 404 })

  const { data: site } = await db
    .from('sites')
    .select('name, url, notes')
    .eq('id', tokenRow.site_id)
    .single()

  const meta = (() => { try { return JSON.parse(site?.notes ?? '{}') } catch { return {} } })()

  const html = generateIntakeHTML({
    token,
    siteName:   site?.name ?? 'Your Business',
    product:    meta.product ?? 'WL Service Company',
    label:      tokenRow.label,
    apiBase:    'https://manage.worker-bee.app',
    submitted:  !!meta.intake_submitted_at,
  })

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

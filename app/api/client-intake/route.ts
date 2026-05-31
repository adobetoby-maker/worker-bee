/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const db = supabaseAdmin as any

export const dynamic = 'force-dynamic'

// ── GET — verify token and return site config for the intake form ────────────
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const { data: tokenRow } = await db
    .from('share_tokens')
    .select('site_id, label, active')
    .eq('token', token)
    .single()

  if (!tokenRow?.active) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })

  const { data: site } = await db
    .from('sites')
    .select('id, name, url, notes')
    .eq('id', tokenRow.site_id)
    .single()

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

  const meta = (() => { try { return JSON.parse(site.notes ?? '{}') } catch { return {} } })()

  return NextResponse.json({
    site_id:    site.id,
    site_name:  site.name,
    site_url:   site.url,
    label:      tokenRow.label,
    product:    meta.product ?? 'WL Service Company',
    submitted:  !!meta.intake_submitted_at,
  })
}

// ── POST — receive intake form submission ────────────────────────────────────
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const { data: tokenRow } = await db
    .from('share_tokens')
    .select('site_id, active')
    .eq('token', token)
    .single()

  if (!tokenRow?.active) return NextResponse.json({ error: 'Invalid link' }, { status: 403 })

  const body = await req.json()

  // Load existing notes to merge
  const { data: site } = await db
    .from('sites')
    .select('notes')
    .eq('id', tokenRow.site_id)
    .single()

  const existingNotes = (() => { try { return JSON.parse(site?.notes ?? '{}') } catch { return {} } })()

  const intake = {
    ...existingNotes,
    intake_submitted_at: new Date().toISOString(),
    intake_status: 'pending',
    // Company
    company_name:    body.company_name,
    legal_name:      body.legal_name,
    tagline:         body.tagline,
    // Contact
    phone:           body.phone,
    phone2:          body.phone2,
    email:           body.email,
    website:         body.website,
    // Address
    address:         body.address,
    city:            body.city,
    state:           body.state,
    zip:             body.zip,
    // Brand
    primary_color:   body.primary_color,
    logo_url:        body.logo_url,
    // Services
    services:        body.services,
    service_area:    body.service_area,
    // Hours
    hours:           body.hours,
    // Social
    facebook_url:    body.facebook_url,
    google_maps_url: body.google_maps_url,
    yelp_url:        body.yelp_url,
    // Photos
    photo_urls:      body.photo_urls,
    // Notes
    client_notes:    body.notes,
  }

  const { error } = await db
    .from('sites')
    .update({ notes: JSON.stringify(intake), status: 'intake_received' })
    .eq('id', tokenRow.site_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Also upsert client record if email provided
  if (body.email && body.company_name) {
    await db.from('clients').upsert({
      name:   body.company_name,
      email:  body.email,
      phone:  body.phone,
      status: 'active',
      notes:  `Intake submitted ${new Date().toLocaleDateString()}. Site ID: ${tokenRow.site_id}`,
    }, { onConflict: 'email', ignoreDuplicates: false }).catch(() => {})
  }

  return NextResponse.json({ ok: true, message: 'Intake received — your project is queued for build.' })
}

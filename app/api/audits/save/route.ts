import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { AuditSavePayload, AuditSaveResponse } from '@/lib/types/audit'

export const dynamic = 'force-dynamic'

function slugify(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40)
  } catch {
    return 'unknown'
  }
}

export async function POST(req: NextRequest) {
  let body: AuditSavePayload
  try {
    body = await req.json() as AuditSavePayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { url, audit, blueprint, clientNotes, mode, contactName, contactEmail } = body

  if (!url || !audit) {
    return NextResponse.json({ error: 'url and audit are required' }, { status: 400 })
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const slug = slugify(url)
  const filename = `${id}-${slug}.json`

  const payload = {
    id,
    type: 'audit',
    url,
    audit,
    blueprint: blueprint ?? null,
    clientNotes: clientNotes ?? '',
    mode: mode ?? 'patch',
    contactName: contactName ?? '',
    contactEmail: contactEmail ?? '',
    savedAt: new Date().toISOString(),
    status: 'pending',
  }

  // Try saving to Supabase Storage — audits/ prefix in blueprints bucket
  // Fall back to build-logs bucket if blueprints bucket fails
  const buckets = ['blueprints', 'build-logs'] as const

  for (const bucket of buckets) {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(`audits/${filename}`, JSON.stringify(payload, null, 2), {
        contentType: 'application/json',
        upsert: false,
      })

    if (!error) {
      const response: AuditSaveResponse = { id, saved: true }
      return NextResponse.json(response)
    }

    console.error(`audits/save: upload to ${bucket} failed:`, error.message)

    // If the bucket doesn't exist, try the next one
    if (error.message.includes('Bucket not found') || error.message.includes('does not exist')) {
      continue
    }

    // Other errors — return them
    return NextResponse.json({ error: `Storage error: ${error.message}` }, { status: 500 })
  }

  // Both buckets failed — try creating build-logs and retrying once
  try {
    await supabaseAdmin.storage.createBucket('build-logs', { public: false })
    const { error: retryErr } = await supabaseAdmin.storage
      .from('build-logs')
      .upload(`audits/${filename}`, JSON.stringify(payload, null, 2), {
        contentType: 'application/json',
        upsert: false,
      })
    if (retryErr) throw new Error(retryErr.message)

    const response: AuditSaveResponse = { id, saved: true }
    return NextResponse.json(response)
  } catch (err) {
    console.error('audits/save: all storage attempts failed:', String(err))
    return NextResponse.json({ error: `Could not save audit: ${String(err).slice(0, 200)}` }, { status: 500 })
  }
}

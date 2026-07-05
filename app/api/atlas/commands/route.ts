// Built by ATLAS — 2026-07-05
// /api/atlas/commands — the command path DOWN (PRD-atlas-platform §4.1/§4.2).
// Console buttons insert rows here; the ATLAS Bridge polls the table and
// enqueues into ~/.atlas queue files. The web app NEVER executes work.
//
// Auth: middleware default-denies /api/atlas/* already; hasAdminSession() is
// enforced IN-ROUTE too (defense in depth — same pattern as
// app/api/build-status/list). Dashboard fetches ride the wb_admin_session
// cookie on same-origin requests.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hasAdminSession } from '@/lib/apiKeyAuth'

const db = supabaseAdmin as any

// Command types v1 (PRD §4.1). approve-tap rows are normally CREATED by the
// Bridge (from ~/.atlas/acquisition/taps.jsonl) — the console only PATCHes
// them to approved_by_operator — but the type stays valid here so the full
// v1 set round-trips.
const VALID_TYPES = new Set(['queue-need', 'queue-mission', 'run-qa', 'approve-tap'])

// GET → last 50 commands, newest first.
export async function GET(req: NextRequest) {
  if (!hasAdminSession(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { data, error } = await db
    .from('atlas_commands')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ commands: data ?? [] })
}

// POST { type, payload } → insert pending command (requested_by: 'console').
export async function POST(req: NextRequest) {
  if (!hasAdminSession(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: { type?: unknown; payload?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const type = typeof body.type === 'string' ? body.type.trim() : ''
  if (!VALID_TYPES.has(type)) {
    return NextResponse.json(
      { error: `Invalid type — must be one of: ${[...VALID_TYPES].join(', ')}` },
      { status: 400 }
    )
  }
  const payload =
    body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload)
      ? body.payload as Record<string, unknown>
      : {}
  // Per-type payload sanity (the Bridge rejects malformed rows too — this
  // just fails fast at the console instead of a silent rejected chip later).
  if ((type === 'queue-need' || type === 'queue-mission') &&
      !String(payload.summary ?? payload.text ?? payload.title ?? '').trim()) {
    return NextResponse.json({ error: 'payload.summary is required' }, { status: 400 })
  }
  if (type === 'run-qa' && !String(payload.slug ?? '').trim()) {
    return NextResponse.json({ error: 'payload.slug is required' }, { status: 400 })
  }
  const { data, error } = await db
    .from('atlas_commands')
    .insert({ type, payload, status: 'pending', requested_by: 'console' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ command: data }, { status: 201 })
}

// PATCH { id, action: 'approve' } → approve-tap only:
// pending_operator → approved_by_operator. The Bridge sees the new status,
// marks the taps.jsonl entry approved, and queues the ACQUISITION NEED.
// First-contact SEND still happens only via ATLAS's acquisition gate.
export async function PATCH(req: NextRequest) {
  if (!hasAdminSession(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: { id?: unknown; action?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const id = typeof body.id === 'string' ? body.id : ''
  const action = typeof body.action === 'string' ? body.action : ''
  if (!id || action !== 'approve') {
    return NextResponse.json({ error: 'Expected { id, action: "approve" }' }, { status: 400 })
  }
  const { data: row, error: readErr } = await db
    .from('atlas_commands')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
  if (!row) return NextResponse.json({ error: 'Command not found' }, { status: 404 })
  if (row.type !== 'approve-tap') {
    return NextResponse.json({ error: 'Only approve-tap commands can be approved' }, { status: 400 })
  }
  if (row.status !== 'pending_operator') {
    return NextResponse.json(
      { error: `Command is ${row.status} — only pending_operator can be approved` },
      { status: 409 }
    )
  }
  const { data, error } = await db
    .from('atlas_commands')
    .update({
      status: 'approved_by_operator',
      result: { ...(row.result ?? {}), approved_at: new Date().toISOString(), approved_via: 'console' },
    })
    .eq('id', id)
    .eq('status', 'pending_operator') // guard against a concurrent Bridge write
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ command: data })
}

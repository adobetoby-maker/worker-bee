/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const db = supabaseAdmin as any

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const updates: Record<string, unknown> = {}
  if ('status' in body) {
    updates.status = body.status
    updates.completed_at = body.status === 'complete' ? new Date().toISOString() : null
  }
  if ('title' in body) updates.title = body.title
  if ('description' in body) updates.description = body.description
  if ('sort_order' in body) updates.sort_order = body.sort_order

  const { data, error } = await db.from('project_milestones').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await db.from('project_milestones').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

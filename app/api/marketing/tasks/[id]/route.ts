import { NextRequest, NextResponse } from 'next/server'
import { marketingAuth } from '@/lib/apiKeyAuth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'


// PATCH /api/marketing/tasks/[id] — mark done, promote could_do→todo, update any field
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!marketingAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any
  const { data, error } = await db
    .from('marketing_tasks')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

// DELETE /api/marketing/tasks/[id] — remove a task
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!marketingAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any
  const { error } = await db
    .from('marketing_tasks')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

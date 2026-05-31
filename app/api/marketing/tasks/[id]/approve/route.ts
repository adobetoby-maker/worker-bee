import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any
const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'

// POST /api/marketing/tasks/[id]/approve
// Marks task as approved and triggers publish via campaign publish endpoint
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== API_KEY) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { action, revision_note } = body  // action: 'approve' | 'reject' | 'revise'

  if (!['approve', 'reject', 'revise'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve | reject | revise' }, { status: 400 })
  }

  const statusMap: Record<string, string> = {
    approve: 'approved',
    reject: 'rejected',
    revise: 'draft',
  }

  const updatePayload: Record<string, unknown> = {
    approval_status: statusMap[action],
  }

  // Append revision_note to content_brief if provided
  if (revision_note) {
    const { data: existing } = await db.from('marketing_tasks').select('content_brief').eq('id', id).single()
    updatePayload.content_brief = { ...(existing?.content_brief ?? {}), revision_note }
  }

  const { data: task, error } = await db.from('marketing_tasks')
    .update(updatePayload)
    .eq('id', id)
    .select('*, marketing_campaigns(id, site_id)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // If approved, trigger publish (fire-and-forget — non-blocking)
  if (action === 'approve' && task.campaign_id) {
    const publishPayload = {
      task_id: id,
      platform: task.platform,
      copy: task.content_brief?.copy ?? task.text,
      asset_url: task.generated_assets?.asset_url ?? null,
    }
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://manage.worker-bee.app'
    fetch(`${baseUrl}/api/marketing/campaigns/${task.campaign_id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
      body: JSON.stringify(publishPayload),
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true, action, task_id: id, status: statusMap[action] })
}

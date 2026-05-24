import { NextRequest, NextResponse } from 'next/server'
import { upsertConfig, deleteConfig } from '@/lib/configStore'

// PATCH /api/configs/[id] — update value or flags
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    // We re-upsert via site_id+key — id is used for DELETE only
    // For PATCH we expect { site_id, key, ...changes }
    const updated = await upsertConfig({ ...body })
    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE /api/configs/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await deleteConfig(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

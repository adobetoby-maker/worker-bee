import { NextRequest, NextResponse } from 'next/server'
import { getBlueprint, saveBlueprint } from '@/lib/blueprintStore'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const blueprint = await getBlueprint(id)
  if (!blueprint) return NextResponse.json(null)
  return NextResponse.json(blueprint)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    await saveBlueprint(id, body)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

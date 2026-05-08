import { NextRequest, NextResponse } from 'next/server'
import { getBlueprint, saveBlueprint } from '@/lib/blueprintStore'

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== process.env.BLUEPRINT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { siteId, nodes, edges, summary, branch = 'main' } = await req.json()
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

    const existing = await getBlueprint(siteId)
    const now = new Date().toISOString()

    const updated = {
      currentBranch: existing?.currentBranch ?? 'main',
      branches: {
        ...(existing?.branches ?? {}),
        [branch]: { nodes: nodes ?? [], edges: edges ?? [], updatedAt: now },
      },
      summary: summary ?? existing?.summary,
    }

    await saveBlueprint(siteId, updated)
    return NextResponse.json({ ok: true, siteId, branch, updatedAt: now })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

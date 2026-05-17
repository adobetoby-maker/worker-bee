import { NextRequest, NextResponse } from 'next/server'
import { getBlueprint, saveBlueprint } from '@/lib/blueprintStore'

// Internal route — no API key required (dashboard-only)
export async function POST(req: NextRequest) {
  try {
    const { siteId, branchName, nodes, edges } = await req.json()
    if (!siteId || !branchName || !Array.isArray(nodes)) {
      return NextResponse.json({ error: 'siteId, branchName, and nodes are required' }, { status: 400 })
    }

    const existing = await getBlueprint(siteId)
    const now = new Date().toISOString()

    const updated = {
      currentBranch: branchName,
      branches: {
        ...(existing?.branches ?? {}),
        [branchName]: { nodes, edges: edges ?? [], updatedAt: now },
      },
      summary: existing?.summary,
      wizardInput: existing?.wizardInput,
      videoUrl: existing?.videoUrl,
    }

    await saveBlueprint(siteId, updated)
    return NextResponse.json({ ok: true, siteId, branchName, updatedAt: now })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

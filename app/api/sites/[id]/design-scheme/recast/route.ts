import { NextRequest, NextResponse } from 'next/server'
import { getBlueprint, saveBlueprint, type DesignScheme } from '@/lib/blueprintStore'

const DEVTOOLS_URL = process.env.DEVTOOLS_LOCAL_URL ?? 'http://100.117.143.57:3333'

function nextBranchName(existing: Record<string, unknown>): string {
  const nums = Object.keys(existing)
    .map(k => parseInt(k.replace(/^v/, ''), 10))
    .filter(n => !isNaN(n))
  const next = nums.length ? Math.max(...nums) + 1 : 2
  return `v${next}`
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { description, branch: requestedBranch } = await req.json() as { description: string; branch?: string }
  if (!description) return NextResponse.json({ error: 'description required' }, { status: 400 })

  let raw: Response
  try {
    raw = await fetch(`${DEVTOOLS_URL}/run-uupm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, domains: ['color', 'typography', 'landing'] }),
      signal: AbortSignal.timeout(35000),
    })
  } catch {
    return NextResponse.json(
      { error: `Devtools unreachable at ${DEVTOOLS_URL}. Run: node ~/devtools/server.mjs` },
      { status: 503 }
    )
  }

  if (!raw.ok) return NextResponse.json({ error: await raw.text() }, { status: 502 })

  const result = (await raw.json()) as DesignScheme & { rawOutput?: string; domainOutputs?: string[] }
  const { rawOutput: _r, domainOutputs: _d, ...scheme } = result

  const bp = await getBlueprint(id)
  const existing = bp?.designSchemes ?? (bp?.designScheme ? { main: bp.designScheme } : {})
  const branch = requestedBranch ?? nextBranchName(existing)

  await saveBlueprint(id, {
    currentBranch: bp?.currentBranch ?? 'main',
    branches: bp?.branches ?? { main: { nodes: [], edges: [], updatedAt: new Date().toISOString() } },
    summary: bp?.summary,
    wizardInput: bp?.wizardInput,
    videoUrl: bp?.videoUrl,
    designSchemes: { ...existing, [branch]: scheme },
    activeDesignBranch: bp?.activeDesignBranch ?? 'main',
  })

  return NextResponse.json({ ok: true, branch, scheme })
}

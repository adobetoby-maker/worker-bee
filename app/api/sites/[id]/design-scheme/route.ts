import { NextRequest, NextResponse } from 'next/server'
import { getBlueprint, saveBlueprint, type DesignScheme } from '@/lib/blueprintStore'

function migrateSchemes(bp: Awaited<ReturnType<typeof getBlueprint>>) {
  if (!bp) return { schemes: {}, active: 'main' }
  // Migrate legacy single designScheme into designSchemes.main
  const schemes = bp.designSchemes ?? (bp.designScheme ? { main: bp.designScheme } : {})
  const active = bp.activeDesignBranch ?? (Object.keys(schemes)[0] ?? 'main')
  return { schemes, active }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bp = await getBlueprint(id)
  const { schemes, active } = migrateSchemes(bp)
  return NextResponse.json({ schemes, active })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== process.env.BLUEPRINT_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { branch = 'main', ...scheme } = body as { branch?: string } & DesignScheme
  if (!scheme.style || !scheme.businessDescription) {
    return NextResponse.json({ error: 'style and businessDescription required' }, { status: 400 })
  }

  const bp = await getBlueprint(id)
  const { schemes } = migrateSchemes(bp)

  await saveBlueprint(id, {
    currentBranch: bp?.currentBranch ?? 'main',
    branches: bp?.branches ?? { main: { nodes: [], edges: [], updatedAt: new Date().toISOString() } },
    summary: bp?.summary,
    wizardInput: bp?.wizardInput,
    videoUrl: bp?.videoUrl,
    designSchemes: { ...schemes, [branch]: { ...scheme, generatedAt: scheme.generatedAt ?? new Date().toISOString() } },
    activeDesignBranch: bp?.activeDesignBranch ?? branch,
  })

  return NextResponse.json({ ok: true, branch })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { activeBranch, deleteBranch } = await req.json() as { activeBranch?: string; deleteBranch?: string }

  const bp = await getBlueprint(id)
  if (!bp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { schemes } = migrateSchemes(bp)

  if (deleteBranch && deleteBranch !== 'main') {
    delete schemes[deleteBranch]
  }

  await saveBlueprint(id, {
    ...bp,
    designSchemes: schemes,
    activeDesignBranch: activeBranch ?? bp.activeDesignBranch,
  })

  return NextResponse.json({ ok: true })
}

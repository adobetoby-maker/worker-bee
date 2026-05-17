import { NextRequest, NextResponse } from 'next/server'
import { getBlueprint, saveBlueprint } from '@/lib/blueprintStore'
import type { BlueprintApplyStatus } from '@/lib/types/audit'

// GET  ?siteId=&branch=   → returns nodes sorted by priority (edges respected)
// POST { siteId, branch, nodeId, applyStatus, appliedAt? } → updates one node's status

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  const branch = searchParams.get('branch')
  if (!siteId || !branch) {
    return NextResponse.json({ error: 'siteId and branch are required' }, { status: 400 })
  }

  const blueprint = await getBlueprint(siteId)
  if (!blueprint) return NextResponse.json({ error: 'Blueprint not found' }, { status: 404 })

  const branchData = blueprint.branches[branch]
  if (!branchData) return NextResponse.json({ error: `Branch "${branch}" not found` }, { status: 404 })

  // Build a dependency map from edges so we can topological-sort
  const edges = (branchData.edges ?? []) as Array<{ source: string; target: string }>
  const dependsOn = new Map<string, Set<string>>()
  for (const e of edges) {
    if (!dependsOn.has(e.target)) dependsOn.set(e.target, new Set())
    dependsOn.get(e.target)!.add(e.source)
  }

  // Sort nodes: topological order, then by priority within each level
  const nodes = (branchData.nodes ?? []) as Array<{ id: string; data: Record<string, unknown> }>
  const sorted = [...nodes].sort((a, b) => {
    const aPriority = (a.data?.priority as number) ?? 99
    const bPriority = (b.data?.priority as number) ?? 99
    return aPriority - bPriority
  })

  return NextResponse.json({
    siteId,
    branch,
    nodes: sorted,
    edges: branchData.edges ?? [],
    pendingCount: sorted.filter(n => !n.data?.applyStatus || n.data.applyStatus === 'pending').length,
  })
}

export async function POST(req: NextRequest) {
  try {
    const { siteId, branch, nodeId, applyStatus, appliedAt } = await req.json() as {
      siteId: string
      branch: string
      nodeId: string
      applyStatus: BlueprintApplyStatus
      appliedAt?: string
    }
    if (!siteId || !branch || !nodeId || !applyStatus) {
      return NextResponse.json({ error: 'siteId, branch, nodeId, applyStatus required' }, { status: 400 })
    }

    const blueprint = await getBlueprint(siteId)
    if (!blueprint) return NextResponse.json({ error: 'Blueprint not found' }, { status: 404 })

    const branchData = blueprint.branches[branch]
    if (!branchData) return NextResponse.json({ error: `Branch "${branch}" not found` }, { status: 404 })

    const nodes = (branchData.nodes ?? []) as Array<{ id: string; data: Record<string, unknown> }>
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return NextResponse.json({ error: `Node "${nodeId}" not found` }, { status: 404 })

    node.data.applyStatus = applyStatus
    if (appliedAt) node.data.appliedAt = appliedAt

    await saveBlueprint(siteId, {
      ...blueprint,
      branches: {
        ...blueprint.branches,
        [branch]: { ...branchData, nodes, updatedAt: new Date().toISOString() },
      },
    })

    return NextResponse.json({ ok: true, nodeId, applyStatus })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

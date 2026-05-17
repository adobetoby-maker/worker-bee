import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getBlueprint, saveBlueprint } from '@/lib/blueprintStore'
import type { AuditResult, BlueprintResult } from '@/lib/types/audit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/sites/[id]/onboard
// Runs on new site creation: audit → blueprint → save as audit-initial branch
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: raw } = await supabaseAdmin.from('sites').select('*').eq('id', id).single()
  if (!raw) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const site = raw as any
  const url: string = site.url
  const githubRepo: string | null = site.github_repo ?? null

  if (!url) return NextResponse.json({ error: 'Site has no URL' }, { status: 400 })

  const base = new URL(req.url).origin

  // ── 1. Site audit ─────────────────────────────────────────────────────────
  const auditParams = new URLSearchParams({ url })
  if (githubRepo) auditParams.set('github', githubRepo)

  const auditRes = await fetch(`${base}/api/site-audit?${auditParams}`, {
    signal: AbortSignal.timeout(30_000),
  })
  if (!auditRes.ok) {
    return NextResponse.json({ error: 'Audit crawl failed', detail: await auditRes.text() }, { status: 500 })
  }
  const audit = (await auditRes.json()) as AuditResult

  // ── 2. Generate reverse blueprint ─────────────────────────────────────────
  const blueprintRes = await fetch(`${base}/api/audit-blueprint`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url, audit, mode: 'patch', siteId: id }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!blueprintRes.ok) {
    return NextResponse.json({ error: 'Blueprint generation failed', detail: await blueprintRes.text() }, { status: 500 })
  }
  const blueprintData = (await blueprintRes.json()) as BlueprintResult & { nodes: object[]; edges: object[] }

  // ── 3. Import as audit branch ─────────────────────────────────────────────
  const branchName = `audit-${new Date().toISOString().slice(0, 10)}`
  const existing = await getBlueprint(id)
  await saveBlueprint(id, {
    currentBranch: branchName,
    branches: {
      ...(existing?.branches ?? {}),
      [branchName]: {
        nodes: blueprintData.nodes ?? [],
        edges: blueprintData.edges ?? [],
        updatedAt: new Date().toISOString(),
      },
    },
    summary: blueprintData.summary ?? `Initial audit for ${url}`,
  })

  return NextResponse.json({
    done: true,
    branchName,
    nodeCount: (blueprintData.nodes ?? []).length,
    scores: audit.scores,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { getBlueprint, saveBlueprint, type DesignScheme, type DesignSwatch } from '@/lib/blueprintStore'

type BlendField = 'palette' | 'headingFont' | 'bodyFont' | 'fontImportUrl' | 'style' | 'styleKeywords' | 'landingPattern' | 'antiPatterns' | 'effects'
type MergeMap = Partial<Record<BlendField, 'a' | 'b'>>

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { branchA, branchB, mergeMap, newBranchName } = await req.json() as {
    branchA: string
    branchB: string
    mergeMap: MergeMap
    newBranchName: string
  }

  if (!branchA || !branchB || !mergeMap || !newBranchName) {
    return NextResponse.json({ error: 'branchA, branchB, mergeMap, newBranchName required' }, { status: 400 })
  }

  const bp = await getBlueprint(id)
  const schemes = bp?.designSchemes ?? {}

  const a = schemes[branchA]
  const b = schemes[branchB]
  if (!a || !b) return NextResponse.json({ error: 'Branch not found' }, { status: 404 })

  const pick = <T>(field: BlendField, fallback: T): T =>
    ((mergeMap[field] === 'a' ? a[field] : mergeMap[field] === 'b' ? b[field] : a[field]) as T) ?? fallback

  const blended: DesignScheme = {
    style: pick('style', a.style),
    styleKeywords: pick('styleKeywords', a.styleKeywords),
    palette: pick<DesignSwatch[]>('palette', a.palette),
    headingFont: pick('headingFont', a.headingFont),
    bodyFont: pick('bodyFont', a.bodyFont),
    fontImportUrl: pick('fontImportUrl', a.fontImportUrl),
    landingPattern: pick<string[]>('landingPattern', a.landingPattern),
    antiPatterns: pick<string[]>('antiPatterns', a.antiPatterns),
    effects: pick('effects', a.effects),
    businessDescription: a.businessDescription,
    generatedAt: new Date().toISOString(),
    overrides: `Blended from ${branchA} + ${branchB}`,
  }

  await saveBlueprint(id, {
    ...bp!,
    designSchemes: { ...schemes, [newBranchName]: blended },
    activeDesignBranch: newBranchName,
  })

  return NextResponse.json({ ok: true, branch: newBranchName, scheme: blended })
}

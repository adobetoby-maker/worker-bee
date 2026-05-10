export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { getBlueprint } from '@/lib/blueprintStore'
import { BlueprintCanvas } from '@/components/blueprint/BlueprintCanvas'
import type { Node, Edge } from '@xyflow/react'

export default async function BlueprintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: site } = await supabaseAdmin.from('sites').select('id, name, notes').eq('id', id).single()
  if (!site) notFound()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = site as any

  const blueprint = await getBlueprint(id)
  const currentBranch = blueprint?.currentBranch ?? 'main'
  const branchData = blueprint?.branches?.[currentBranch]
  const allBranches = Object.keys(blueprint?.branches ?? {})

  return (
    <BlueprintCanvas
      siteId={s.id}
      siteName={s.name}
      siteNotes={s.notes ?? ''}
      initialNodes={(branchData?.nodes ?? []) as Node[]}
      initialEdges={(branchData?.edges ?? []) as Edge[]}
      initialBranch={currentBranch}
      allBranches={allBranches.length ? allBranches : ['main']}
      allBranchData={blueprint?.branches ?? {}}
      initialWizardInput={blueprint?.wizardInput}
      initialVideoUrl={blueprint?.videoUrl ?? ''}
    />
  )
}

export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { getBlueprint } from '@/lib/blueprintStore'
import { BuildWorkflow } from '@/components/build/BuildWorkflow'

export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: site } = await (supabaseAdmin as any)
    .from('sites')
    .select('id, name, url, stack, github_repo, notes')
    .eq('id', id)
    .single()

  if (!site) notFound()

  const blueprint = await getBlueprint(id)
  const currentBranch = blueprint?.currentBranch ?? 'main'
  const branchData = blueprint?.branches?.[currentBranch]
  const nodes = branchData?.nodes ?? []
  const edges = branchData?.edges ?? []

  return (
    <BuildWorkflow
      site={site}
      nodes={nodes as object[]}
      edges={edges as object[]}
    />
  )
}

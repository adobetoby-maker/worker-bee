export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { getBlueprint } from '@/lib/blueprintStore'
import { BuildWorkflow } from '@/components/build/BuildWorkflow'
import { AgentPipelineGraph } from '@/components/build/AgentPipelineGraph'
import { BarChart2, BrainCircuit } from 'lucide-react'

interface SearchParams { tab?: string }

export default async function BuildPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<SearchParams>
}) {
  const { id } = await params
  const { tab = 'configure' } = await searchParams

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

  const tabStyle = (active: boolean) => ({
    ...(active ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--muted-light)', border: '1px solid var(--border)' }),
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex items-center gap-2">
        <Link
          href={`/sites/${id}/build?tab=configure`}
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg"
          style={tabStyle(tab === 'configure')}
        >
          Configure
        </Link>
        <Link
          href={`/sites/${id}/build?tab=agents`}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors"
          style={tabStyle(tab === 'agents')}
        >
          <BrainCircuit size={13} /> Agents
        </Link>
        <Link
          href={`/sites/${id}/build/progress`}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors hover:border-indigo-500/40"
          style={{ color: 'var(--muted-light)', border: '1px solid var(--border)' }}
        >
          <BarChart2 size={13} /> Progress
        </Link>
      </div>

      {tab === 'agents' ? (
        <AgentPipelineGraph site={site} />
      ) : (
        <BuildWorkflow
          site={site}
          nodes={nodes as object[]}
          edges={edges as object[]}
        />
      )}
    </div>
  )
}

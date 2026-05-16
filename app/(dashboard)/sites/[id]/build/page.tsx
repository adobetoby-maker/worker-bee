export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { getBlueprint } from '@/lib/blueprintStore'
import { BuildWorkflow } from '@/components/build/BuildWorkflow'
import { BarChart2 } from 'lucide-react'

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
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex items-center gap-2">
        <span
          className="text-sm font-semibold px-3 py-1.5 rounded-lg"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Configure
        </span>
        <Link
          href={`/sites/${id}/build/progress`}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors hover:border-indigo-500/40"
          style={{ color: 'var(--muted-light)', border: '1px solid var(--border)' }}
        >
          <BarChart2 size={13} /> Progress
        </Link>
      </div>

      <BuildWorkflow
        site={site}
        nodes={nodes as object[]}
        edges={edges as object[]}
      />
    </div>
  )
}

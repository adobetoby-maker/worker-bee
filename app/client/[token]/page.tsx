export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { getBlueprint } from '@/lib/blueprintStore'
import { ClientPortal } from './ClientPortal'
import type { Node, Edge } from '@xyflow/react'

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Validate share token
  const { data: shareToken } = await supabaseAdmin
    .from('share_tokens')
    .select('*, sites(id, name, url, status)')
    .eq('token', token)
    .eq('active', true)
    .single()

  if (!shareToken) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const site = (shareToken as any).sites
  if (!site) notFound()

  // Load milestones
  const { data: milestones } = await supabaseAdmin
    .from('project_milestones')
    .select('*')
    .eq('site_id', site.id)
    .order('sort_order')

  // Load blueprint nodes/edges for the cork board
  const blueprint = await getBlueprint(site.id)
  const currentBranch = blueprint?.currentBranch ?? 'main'
  const branchData = blueprint?.branches?.[currentBranch]

  return (
    <ClientPortal
      siteName={site.name}
      siteUrl={site.url}
      milestones={milestones ?? []}
      blueprintNodes={(branchData?.nodes ?? []) as Node[]}
      blueprintEdges={(branchData?.edges ?? []) as Edge[]}
    />
  )
}

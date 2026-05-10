export const dynamic = 'force-dynamic'
import { supabaseAdmin } from '@/lib/supabase'
import { BatchDispatch } from '@/components/build/BatchDispatch'

export default async function BatchPage() {
  const { data: sites } = await supabaseAdmin
    .from('sites')
    .select('id, name, url, github_repo, notes')
    .eq('status', 'active')
    .not('github_repo', 'is', null)
    .order('name')

  return <BatchDispatch sites={sites ?? []} />
}

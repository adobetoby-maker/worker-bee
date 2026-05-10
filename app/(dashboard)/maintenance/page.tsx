import { supabaseAdmin } from '@/lib/supabase'
import { MaintenanceHub } from '@/components/maintenance/MaintenanceHub'

export const dynamic = 'force-dynamic'

export default async function MaintenancePage() {
  const { data: sites } = await supabaseAdmin
    .from('sites')
    .select('id, name, url, github_repo, notes')
    .eq('status', 'active')
    .not('github_repo', 'is', null)
    .order('name')

  return <MaintenanceHub sites={sites ?? []} />
}

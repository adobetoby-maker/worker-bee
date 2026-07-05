export const dynamic = 'force-dynamic'
import { Sparkles } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import { ModsPanel } from '@/components/maintenance/ModsPanel'

export default async function ModsPage() {
  const { data: sites } = await supabaseAdmin
    .from('sites')
    .select('id, name, url, github_repo, notes')
    .eq('status', 'active')
    .not('github_repo', 'is', null)
    .order('name')

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Sparkles size={20} className="text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Mods</h1>
        </div>
        <p className="text-sm text-slate-400">
          Run Pronto translation or SEO improvements on any site — dispatches directly to the build machine.
        </p>
      </div>
      <ModsPanel sites={sites ?? []} />
    </div>
  )
}

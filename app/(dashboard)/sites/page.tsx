export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import { SiteList } from './SiteList'

export default async function SitesPage() {
  const { data } = await supabaseAdmin
    .from('sites')
    .select('*')
    .order('created_at', { ascending: false })

  const sites = (data ?? []) as Parameters<typeof SiteList>[0]['sites']

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Sites</h1>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>{sites.length} registered</p>
        </div>
        <Link href="/sites/new"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus size={15} /> Add Site
        </Link>
      </div>
      <SiteList sites={sites} />
    </div>
  )
}

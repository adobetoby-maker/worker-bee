export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'
import { listConfigs } from '@/lib/configStore'
import ConfigPanel from './ConfigPanel'

export default async function ConfigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: site } = await supabaseAdmin
    .from('sites')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!site) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = site as any
  const configs = await listConfigs(id)

  return (
    <div className="max-w-4xl">
      <Link
        href={`/sites/${id}`}
        className="flex items-center gap-1.5 text-sm mb-6 hover:text-indigo-400 transition-colors"
        style={{ color: 'var(--muted)' }}
      >
        <ArrowLeft size={14} /> Back to {s.name}
      </Link>

      <ConfigPanel
        initialConfigs={configs}
        siteId={id}
        siteName={s.name}
      />
    </div>
  )
}

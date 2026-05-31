export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import { WhiteLabelsClient } from './WhiteLabelsClient'

export const metadata = { title: 'White Labels — Worker-Bee' }

export default async function WhiteLabelsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allSites } = await (supabaseAdmin as any)
    .from('sites')
    .select('*')
    .order('name', { ascending: true })

  const sites = (allSites ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    meta: (() => {
      try { return JSON.parse(s.notes as string ?? '{}') } catch { return {} }
    })(),
  }))

  const whiteLabelSites = sites.filter((s: { meta: { category?: string } }) =>
    s.meta?.category === 'white-label'
  )
  const productSites = sites.filter((s: { meta: { category?: string } }) =>
    s.meta?.category === 'product'
  )

  return <WhiteLabelsClient whiteLabelSites={whiteLabelSites} productSites={productSites} />
}

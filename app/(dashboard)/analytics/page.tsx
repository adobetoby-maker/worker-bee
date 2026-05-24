export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase'
import { listConfigs } from '@/lib/configStore'
import AnalyticsClient from './AnalyticsClient'

export const metadata = { title: 'Analytics — Worker-Bee' }

type Site = {
  id: string
  name: string
  url: string
  stack: string
}

export default async function AnalyticsPage() {
  const { data } = await supabaseAdmin
    .from('sites')
    .select('id,name,url,stack')
    .order('name')
  const sites = (data ?? []) as Site[]

  // Load analytics config for all sites in parallel
  const configsBysite = await Promise.all(
    sites.map(async (site) => {
      try {
        const configs = await listConfigs(site.id)
        const measurementId =
          configs.find(c => c.key === 'NEXT_PUBLIC_GA_ID' || c.key === 'VITE_GA_ID')?.value ?? null
        const propertyId =
          configs.find(c => c.key === 'GA_PROPERTY_ID')?.value ?? null
        return { siteId: site.id, measurementId, propertyId }
      } catch {
        return { siteId: site.id, measurementId: null, propertyId: null }
      }
    })
  )

  const siteConfigs = Object.fromEntries(
    configsBysite.map(c => [c.siteId, { measurementId: c.measurementId, propertyId: c.propertyId }])
  )

  const hasSaKey = Boolean(process.env.GOOGLE_SA_KEY)
  const configured = configsBysite.filter(c => c.propertyId).length

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Analytics</h1>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            Google Analytics 4 · {configured}/{sites.length} sites connected
          </p>
        </div>
        {!hasSaKey && (
          <div className="text-xs px-3 py-2 rounded-lg border" style={{ borderColor: '#f59e0b33', background: '#f59e0b11', color: '#f59e0b' }}>
            Set <code className="font-mono">GOOGLE_SA_KEY</code> in Vercel env to enable live data
          </div>
        )}
      </div>

      {!hasSaKey && (
        <div className="mb-8 rounded-xl p-5 border" style={{ background: '#0f1117', borderColor: '#1e2130' }}>
          <h2 className="text-sm font-semibold text-white mb-3">Setup: GA4 Data API</h2>
          <ol className="space-y-2 text-sm" style={{ color: 'var(--muted-light)' }}>
            <li>1. Go to <span className="text-indigo-400">console.cloud.google.com</span> → IAM → Service Accounts → Create service account</li>
            <li>2. Generate a JSON key and add to Vercel as <code className="font-mono text-xs bg-white/10 px-1 rounded">GOOGLE_SA_KEY</code> (paste entire JSON)</li>
            <li>3. In <span className="text-indigo-400">analytics.google.com</span>, add the service account email as Viewer on each property</li>
            <li>4. For each site below, set <code className="font-mono text-xs bg-white/10 px-1 rounded">GA_PROPERTY_ID</code> in its Config panel (numeric ID, e.g. 123456789)</li>
          </ol>
        </div>
      )}

      <AnalyticsClient sites={sites} siteConfigs={siteConfigs} hasSaKey={hasSaKey} />
    </div>
  )
}

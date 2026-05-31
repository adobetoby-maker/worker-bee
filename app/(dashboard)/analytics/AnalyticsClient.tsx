'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Settings2, TrendingUp, Users, Eye, FileText, type LucideIcon } from 'lucide-react'

type Site = { id: string; name: string; url: string; stack: string }
type SiteConfig = { measurementId: string | null; propertyId: string | null }
type Metrics = {
  sessions: number; users: number; pageviews: number
  topPages: { page: string; views: number }[]
  error?: string
}

function MetricTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <div className="rounded-lg px-4 py-3 flex items-center gap-3" style={{ background: '#0b0d15' }}>
      <Icon size={15} style={{ color: 'var(--muted)' }} />
      <div>
        <div className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>{label}</div>
        <div className="text-base font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      </div>
    </div>
  )
}

function SiteCard({ site, config, hasSaKey }: { site: Site; config: SiteConfig; hasSaKey: boolean }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(false)
  const isConnected = Boolean(config.propertyId)

  useEffect(() => {
    if (!isConnected || !hasSaKey) return
    setLoading(true)
    fetch(`/api/analytics?propertyId=${config.propertyId}&days=7`)
      .then(r => r.json())
      .then((d: Metrics) => setMetrics(d))
      .catch(() => setMetrics({ sessions: 0, users: 0, pageviews: 0, topPages: [], error: 'Fetch failed' }))
      .finally(() => setLoading(false))
  }, [config.propertyId, isConnected, hasSaKey])

  return (
    <div className="rounded-xl p-5 border" style={{ background: '#0f1117', borderColor: '#1e2130' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: isConnected ? '#34d399' : '#4b5563' }}
            />
            <h3 className="text-sm font-semibold text-white truncate">{site.name}</h3>
          </div>
          {site.url && (
            <a
              href={site.url.startsWith('http') ? site.url : `https://${site.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex items-center gap-1 hover:text-indigo-400 transition-colors"
              style={{ color: 'var(--muted)' }}
            >
              {site.url} <ExternalLink size={10} />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={
              isConnected
                ? { background: '#34d39920', color: '#34d399' }
                : { background: '#ffffff10', color: 'var(--muted)' }
            }
          >
            {isConnected ? 'Connected' : 'Not configured'}
          </span>
          <Link
            href={`/sites/${site.id}/config`}
            className="p-1 rounded hover:text-indigo-400 transition-colors"
            style={{ color: 'var(--muted)' }}
            title="Open config"
          >
            <Settings2 size={13} />
          </Link>
        </div>
      </div>

      {/* Measurement ID badge */}
      {config.measurementId && (
        <div className="mb-3">
          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: '#ffffff08', color: 'var(--muted-light)' }}>
            {config.measurementId}
          </span>
        </div>
      )}

      {/* Metrics */}
      {isConnected && hasSaKey ? (
        loading ? (
          <div className="text-xs py-3" style={{ color: 'var(--muted)' }}>Loading 7-day data…</div>
        ) : metrics?.error ? (
          <div className="text-xs py-2 px-3 rounded-lg" style={{ background: '#ef444410', color: '#ef4444' }}>
            {metrics.error}
          </div>
        ) : metrics ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <MetricTile icon={TrendingUp} label="Sessions" value={metrics.sessions} />
              <MetricTile icon={Users} label="Users" value={metrics.users} />
              <MetricTile icon={Eye} label="Pageviews" value={metrics.pageviews} />
            </div>
            {metrics.topPages.length > 0 && (
              <div className="rounded-lg p-3" style={{ background: '#0b0d15' }}>
                <div className="text-xs mb-2 flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
                  <FileText size={11} /> Top pages (7d)
                </div>
                <div className="space-y-1">
                  {metrics.topPages.slice(0, 3).map(p => (
                    <div key={p.page} className="flex items-center justify-between">
                      <span className="text-xs font-mono truncate max-w-[75%]" style={{ color: 'var(--muted-light)' }}>{p.page}</span>
                      <span className="text-xs font-semibold text-white ml-2">{p.views.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null
      ) : (
        <div className="text-xs" style={{ color: 'var(--muted)' }}>
          {!isConnected
            ? <>Set <code className="font-mono bg-white/5 px-1 rounded">GA_PROPERTY_ID</code> in <Link href={`/sites/${site.id}/config`} className="text-indigo-400 hover:underline">Config</Link></>
            : 'Set GOOGLE_SA_KEY in Vercel env to load data'
          }
        </div>
      )}
    </div>
  )
}

export default function AnalyticsClient({
  sites,
  siteConfigs,
  hasSaKey,
}: {
  sites: Site[]
  siteConfigs: Record<string, SiteConfig>
  hasSaKey: boolean
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sites.map(site => (
        <SiteCard
          key={site.id}
          site={site}
          config={siteConfigs[site.id] ?? { measurementId: null, propertyId: null }}
          hasSaKey={hasSaKey}
        />
      ))}
    </div>
  )
}

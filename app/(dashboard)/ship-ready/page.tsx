import Link from 'next/link'
import { Rocket, Hammer, ExternalLink } from 'lucide-react'
import { SITE_MONETIZATION } from '@/lib/monetization'

export const metadata = { title: 'Ship Ready — Worker-Bee' }

export default function ShipReadyIndexPage() {
  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Rocket size={18} style={{ color: '#34d399' }} />
            <h1 className="text-2xl font-bold text-white">Ship Ready</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Final review — SEO, security, CEO, and client handoff for every site.
          </p>
        </div>
        <Link
          href="/build-studio"
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium"
          style={{ background: '#6366f118', color: '#818cf8', border: '1px solid #6366f130' }}
        >
          <Hammer size={13} /> Build Studio
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {SITE_MONETIZATION.map(site => (
          <div
            key={site.siteKey}
            className="rounded-xl border p-5 transition-colors"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="font-semibold text-white truncate">{site.siteName}</div>
                <a
                  href={site.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs flex items-center gap-1 mt-0.5 hover:text-indigo-400 transition-colors truncate"
                  style={{ color: 'var(--muted)' }}
                >
                  <ExternalLink size={10} />
                  {site.siteUrl.replace(/^https?:\/\//, '')}
                </a>
              </div>
            </div>

            {/* Quick stats */}
            <div className="flex gap-4 mb-4 text-xs" style={{ color: 'var(--muted)' }}>
              <span>{site.affiliates.length} affiliates</span>
              <span>{site.products.length} products</span>
              <span>{site.opportunityAudit.length} audit items</span>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/ship-ready/${site.siteKey}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ background: '#34d39918', color: '#34d399', border: '1px solid #34d39930' }}
              >
                <Rocket size={13} /> Review &amp; Ship
              </Link>
              <Link
                href={`/build-studio?url=${encodeURIComponent(site.siteUrl)}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--muted-light)', border: '1px solid var(--border)' }}
              >
                <Hammer size={12} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

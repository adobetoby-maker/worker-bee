import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Rocket } from 'lucide-react'
import { SITE_MONETIZATION } from '@/lib/monetization'
import ShipReadyClient from './ShipReadyClient'

export async function generateMetadata({ params }: { params: Promise<{ siteKey: string }> }) {
  const { siteKey } = await params
  const site = SITE_MONETIZATION.find(s => s.siteKey === siteKey)
  return { title: site ? `Ship ${site.siteName} — Worker-Bee` : 'Ship Ready' }
}

export default async function ShipReadyPage({
  params,
}: {
  params: Promise<{ siteKey: string }>
}) {
  const { siteKey } = await params
  const site = SITE_MONETIZATION.find(s => s.siteKey === siteKey)
  if (!site) notFound()

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 flex-shrink-0">
        <Link
          href="/ship-ready"
          className="flex items-center gap-1.5 text-xs transition-colors hover:text-indigo-400"
          style={{ color: 'var(--muted)' }}
        >
          <ArrowLeft size={12} /> All Sites
        </Link>
        <div className="flex items-center gap-2">
          <Rocket size={15} style={{ color: '#34d399' }} />
          <span className="font-bold text-white">{site.siteName}</span>
          <a
            href={site.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs hover:text-indigo-400 transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            {site.siteUrl.replace(/^https?:\/\//, '')}
          </a>
        </div>
      </div>

      <ShipReadyClient
        siteKey={siteKey}
        siteName={site.siteName}
        siteUrl={site.siteUrl}
      />
    </div>
  )
}

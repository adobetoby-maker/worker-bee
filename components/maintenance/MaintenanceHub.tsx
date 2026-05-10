'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Inbox, GitPullRequest, Wrench, Sparkles } from 'lucide-react'
import { SentryPanel } from './SentryPanel'
import { RequestsPanel, useRequestCount } from './RequestsPanel'
import { ReviewsPanel } from './ReviewsPanel'
import { MaintenanceDispatch } from './MaintenanceDispatch'
import { ModsPanel } from './ModsPanel'

interface Site {
  id: string
  name: string
  url: string | null
  github_repo: string | null
  notes: string | null
}

type Tab = 'sentry' | 'requests' | 'reviews' | 'dispatch' | 'mods'

interface Props {
  sites: Site[]
}

export function MaintenanceHub({ sites }: Props) {
  const [tab, setTab] = useState<Tab>('dispatch')
  const [prCount, setPrCount] = useState(0)
  const requestCount = useRequestCount()

  useEffect(() => {
    fetch('/api/maintenance/reviews')
      .then(r => r.json())
      .then((d: { prs?: unknown[] }) => setPrCount(d.prs?.length ?? 0))
      .catch(() => {})
  }, [])

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: 'sentry',   label: 'Sentry',    icon: AlertTriangle },
    { key: 'requests', label: 'Requests',  icon: Inbox,          badge: requestCount },
    { key: 'reviews',  label: 'Reviews',   icon: GitPullRequest, badge: prCount },
    { key: 'dispatch', label: 'Dispatch',  icon: Wrench },
    { key: 'mods',     label: 'Mods',      icon: Sparkles },
  ]

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-indigo-600/20">
            <Wrench size={20} className="text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Maintenance</h1>
        </div>
        <p className="text-sm text-slate-400">
          Sentry auto-fixes, client change requests, PR review &amp; approval.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {tabs.map(({ key, label, icon: Icon, badge }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: active ? '#6366f1' : 'transparent',
                color: active ? 'white' : 'rgba(255,255,255,0.5)',
              }}
            >
              <Icon size={13} />
              {label}
              {!!badge && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={{
                    background: active ? 'rgba(255,255,255,0.25)' : '#6366f1',
                    color: 'white',
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Panels */}
      {tab === 'sentry'   && <SentryPanel sites={sites} />}
      {tab === 'requests' && <RequestsPanel />}
      {tab === 'reviews'  && <ReviewsPanel />}
      {tab === 'dispatch' && <MaintenanceDispatch sites={sites} />}
      {tab === 'mods'     && <ModsPanel sites={sites} />}
    </div>
  )
}

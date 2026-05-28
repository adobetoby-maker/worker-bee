'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, XCircle, Clock, RefreshCw, ExternalLink,
  Wifi, WifiOff, Activity, AlertTriangle,
} from 'lucide-react'

interface SiteResult {
  id: string
  name: string
  url: string
  stack: string
  status: string
  created_at: string
  ga4_property_id: string | null
  ga4_hostname: string | null
  ping_ok: boolean
  ping_code: number | null
  ping_ms: number | null
  ping_error: string | null
  checked_at: string
}

const STACK_LABELS: Record<string, string> = {
  nextjs: 'Next.js', wordpress: 'WordPress', react: 'React',
  static: 'Static', vite: 'Vite', other: 'Other',
}

function latencyColor(ms: number | null): string {
  if (ms === null) return '#64748b'
  if (ms < 600) return '#34d399'
  if (ms < 1500) return '#fbbf24'
  return '#f87171'
}

function StatusBadge({ ok, code, ms }: { ok: boolean; code: number | null; ms: number | null }) {
  if (ok) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs font-semibold text-emerald-400">UP</span>
        {ms !== null && (
          <span className="text-xs tabular-nums" style={{ color: latencyColor(ms) }}>{ms}ms</span>
        )}
        {code && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
            {code}
          </span>
        )}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full bg-red-500" />
      <span className="text-xs font-semibold text-red-400">DOWN</span>
      {code && (
        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
          {code}
        </span>
      )}
    </div>
  )
}

function SiteThumb({ url }: { url: string }) {
  const src = url.startsWith('http') ? url : `https://${url}`
  return (
    <div className="rounded-lg overflow-hidden border relative"
      style={{ height: 120, background: '#0d1117', borderColor: 'var(--border)' }}>
      <div style={{ transform: 'scale(0.4)', transformOrigin: 'top left', width: '250%', height: '250%', pointerEvents: 'none' }}>
        <iframe
          src={src}
          title="Site preview"
          loading="lazy"
          style={{ width: '100%', height: '100%', border: 'none' }}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0"
        aria-label="Open site"
      />
    </div>
  )
}

function SiteCard({ site, loading }: { site: SiteResult; loading: boolean }) {
  const displayUrl = (site.url ?? '').replace(/^https?:\/\//, '')
  const addedDate = new Date(site.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const checkedTime = new Date(site.checked_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="rounded-2xl border overflow-hidden flex flex-col"
      style={{
        background: 'var(--surface)',
        borderColor: site.ping_ok ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)',
        boxShadow: site.ping_ok
          ? 'inset 0 0 0 1px rgba(52,211,153,0.06)'
          : 'inset 0 0 0 1px rgba(239,68,68,0.06)',
      }}>
      {/* Thumbnail */}
      {site.url && <SiteThumb url={site.url} />}

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/sites/${site.id}`} className="font-bold text-white text-sm hover:text-indigo-300 transition-colors truncate block">
              {site.name}
            </Link>
            <a href={site.url.startsWith('http') ? site.url : `https://${site.url}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs transition-colors hover:text-indigo-400 truncate"
              style={{ color: 'var(--muted)' }}>
              <ExternalLink size={9} />
              <span className="truncate">{displayUrl}</span>
            </a>
          </div>
          <span className="text-[10px] border px-1.5 py-0.5 rounded-full shrink-0"
            style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
            {STACK_LABELS[site.stack] ?? site.stack}
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-600 animate-pulse" />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>Checking…</span>
            </div>
          ) : (
            <StatusBadge ok={site.ping_ok} code={site.ping_code} ms={site.ping_ms} />
          )}
        </div>

        {site.ping_error && (
          <div className="flex items-start gap-1.5 rounded-lg px-2.5 py-2"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <AlertTriangle size={11} className="text-red-400 shrink-0 mt-0.5" />
            <span className="text-xs text-red-400 leading-snug">{site.ping_error}</span>
          </div>
        )}

        {/* Footer meta */}
        <div className="flex items-center justify-between pt-1 border-t"
          style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
            <Clock size={10} />
            <span>Added {addedDate}</span>
          </div>
          {!loading && (
            <span className="text-[10px] tabular-nums" style={{ color: 'var(--muted)' }}>
              Checked {checkedTime}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MonitorGrid() {
  const [sites, setSites] = useState<SiteResult[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStatus = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/monitor')
      if (res.ok) {
        const data = await res.json()
        setSites(data)
        setLastRefresh(new Date())
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 60_000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  const upCount = sites.filter(s => s.ping_ok).length
  const downCount = sites.filter(s => !s.ping_ok).length
  const avgLatency = sites.length > 0
    ? Math.round(sites.filter(s => s.ping_ms !== null).reduce((a, s) => a + (s.ping_ms ?? 0), 0) / sites.filter(s => s.ping_ms !== null).length)
    : null

  return (
    <div>
      {/* Summary bar */}
      {!loading && sites.length > 0 && (
        <div className="flex items-center gap-6 mb-6 p-4 rounded-2xl border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-indigo-400" />
            <span className="text-sm font-semibold text-white">{sites.length} sites</span>
          </div>
          <div className="flex items-center gap-2">
            <Wifi size={14} className="text-emerald-400" />
            <span className="text-sm font-semibold text-emerald-400">{upCount} up</span>
          </div>
          {downCount > 0 && (
            <div className="flex items-center gap-2">
              <WifiOff size={14} className="text-red-400" />
              <span className="text-sm font-semibold text-red-400">{downCount} down</span>
            </div>
          )}
          {avgLatency !== null && (
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              avg <span style={{ color: latencyColor(avgLatency) }}>{avgLatency}ms</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                Last checked {lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              onClick={fetchStatus}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
              <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Checking…' : 'Refresh'}
            </button>
          </div>
        </div>
      )}

      {/* Down sites alert */}
      {!loading && downCount > 0 && (
        <div className="flex items-center gap-3 mb-5 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <XCircle size={15} className="text-red-400 shrink-0" />
          <span className="text-sm text-red-400">
            {downCount} site{downCount > 1 ? 's are' : ' is'} not responding — check immediately.
          </span>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border animate-pulse"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', height: 280 }} />
          ))}
        </div>
      ) : sites.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <Activity size={36} className="mx-auto mb-3 text-slate-600" />
          <p className="text-sm mb-3" style={{ color: 'var(--muted-light)' }}>No sites registered yet.</p>
          <Link href="/sites/new" className="text-indigo-400 hover:text-indigo-300 text-sm underline">Add your first site</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map(site => (
            <SiteCard key={site.id} site={site} loading={refreshing && !lastRefresh} />
          ))}
        </div>
      )}
    </div>
  )
}

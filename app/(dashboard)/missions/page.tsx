// Built by ATLAS — 2026-07-12
'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface MissionBlockState { id: string; status: string }
interface MissionState {
  slug: string
  gates: { map: string; prd: string; blueprint: string }
  blocks: MissionBlockState[]
  final_say: string
  ts: string
}
interface MissionSummary { slug: string; latest: MissionState; receivedAt: string }

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'rgba(255,255,255,0.35)', BUILDING: '#6366f1',
  PASS: '#34d399', REWORK: '#f59e0b',
}
const GATE_COLOR = { approved: '#34d399', pending: 'rgba(255,255,255,0.35)' }
const FINAL_COLOR: Record<string, string> = { SHIP: '#34d399', HOLD: '#f87171' }
const POLL_MS = 8000

function relativeTime(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

function blockCounts(blocks: MissionBlockState[]): string {
  const counts: Record<string, number> = {}
  for (const b of blocks) counts[b.status] = (counts[b.status] ?? 0) + 1
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} ${s}`)
    .join(' · ')
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<MissionSummary[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMissions = useCallback(async () => {
    try {
      const res = await fetch('/api/missions/list')
      if (!res.ok) return
      const data = await res.json()
      setMissions(data.missions ?? [])
    } catch { /* non-fatal */ } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchMissions()
    const t = setInterval(fetchMissions, POLL_MS)
    return () => clearInterval(t)
  }, [fetchMissions])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white">Missions</h1>
      <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
        ATLAS 2.0 build pipeline — auto-refreshes every 8s
      </p>

      {loading && (
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Loading…</p>
      )}

      {!loading && missions.length === 0 && (
        <div className="rounded-xl border px-6 py-10 text-center"
          style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            No missions yet — state arrives via <code>mission-state.sh --post</code>
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {missions.map(m => {
          const { gates, blocks, final_say } = m.latest
          const counts = blockCounts(blocks)
          return (
            <Link key={m.slug} href={`/missions/${m.slug}`}
              className="block rounded-xl border px-5 py-4 hover:bg-white/5 transition-colors cursor-pointer"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center gap-4 flex-wrap">
                {/* Slug */}
                <p className="text-sm font-semibold text-white flex-1 min-w-0 truncate">{m.slug}</p>

                {/* Gate dots */}
                <div className="flex items-center gap-2">
                  {(['map', 'prd', 'blueprint'] as const).map(g => (
                    <span key={g} title={g} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full inline-block"
                        style={{ background: GATE_COLOR[gates[g] as keyof typeof GATE_COLOR] ?? GATE_COLOR.pending }} />
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{g}</span>
                    </span>
                  ))}
                </div>

                {/* Block counts */}
                {counts && (
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{counts}</span>
                )}

                {/* Final-say pill */}
                {final_say !== 'none' && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: `${FINAL_COLOR[final_say] ?? '#fff'}22`, color: FINAL_COLOR[final_say] ?? '#fff' }}>
                    {final_say}
                  </span>
                )}

                {/* Staleness */}
                <span className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {relativeTime(m.receivedAt)}
                </span>
              </div>

              {/* Block status strip */}
              {blocks.length > 0 && (
                <div className="flex gap-1 mt-3 flex-wrap">
                  {blocks.map(b => (
                    <span key={b.id} className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{
                        background: `${STATUS_COLOR[b.status] ?? STATUS_COLOR.PENDING}22`,
                        color: STATUS_COLOR[b.status] ?? STATUS_COLOR.PENDING,
                      }}>
                      {b.id.replace(/^\d+-/, '').replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

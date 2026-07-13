// Built by ATLAS — 2026-07-12
'use client'
import { use, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface MissionState {
  slug: string
  gates: { map: string; prd: string; blueprint: string }
  blocks: { id: string; status: string }[]
  final_say: string
  ts: string
}
interface MissionRecord {
  slug: string
  latest: MissionState
  receivedAt: string
  history: { state: MissionState; receivedAt: string }[]
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'rgba(255,255,255,0.35)', BUILDING: '#6366f1',
  PASS: '#34d399', REWORK: '#f59e0b',
}
const GATE_COLOR = { approved: '#34d399', pending: 'rgba(255,255,255,0.1)' }
const FINAL_COLOR: Record<string, string> = { SHIP: '#34d399', HOLD: '#f87171' }
const POLL_MS = 8000
const GATES = ['map', 'prd', 'blueprint'] as const

const blockLabel = (id: string) =>
  id.replace(/^\d+-/, '').replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase())

function staleness(iso: string): { text: string; color: string } {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  const color =
    secs > 600 ? '#f87171' :
    secs > 60  ? '#f59e0b' :
    'rgba(255,255,255,0.4)'
  if (secs < 60) return { text: `last update ${secs}s ago`, color }
  const mins = Math.floor(secs / 60)
  if (mins < 60) return { text: `last update ${mins}m ago`, color }
  return { text: `last update ${Math.floor(mins / 60)}h ago`, color }
}

export default function MissionBoardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [record, setRecord] = useState<MissionRecord | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [, setTick] = useState(0)

  const fetchMission = useCallback(async () => {
    try {
      const res = await fetch(`/api/missions/${slug}`)
      if (res.status === 404) { setNotFound(true); return }
      if (!res.ok) return
      const data: MissionRecord = await res.json()
      setRecord(data)
      setNotFound(false)
    } catch { /* non-fatal */ }
  }, [slug])

  useEffect(() => {
    fetchMission()
    const poll = setInterval(fetchMission, POLL_MS)
    // Re-render every second to update the staleness clock
    const tick = setInterval(() => setTick(t => t + 1), 1000)
    return () => { clearInterval(poll); clearInterval(tick) }
  }, [fetchMission])

  const CARD = {
    borderColor: 'rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.02)',
  }

  if (notFound) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/missions" className="inline-flex items-center gap-1.5 text-sm mb-6"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <ArrowLeft size={14} /> Missions
        </Link>
        <div className="rounded-xl border px-6 py-16 text-center mt-8" style={CARD}>
          <p className="text-white font-semibold mb-2">No state received for {slug} yet</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            State arrives via <code>mission-state.sh --post</code>
          </p>
        </div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Link href="/missions" className="inline-flex items-center gap-1.5 text-sm mb-6"
          style={{ color: 'rgba(255,255,255,0.4)' }}>
          <ArrowLeft size={14} /> Missions
        </Link>
        <p className="text-sm mt-8" style={{ color: 'rgba(255,255,255,0.35)' }}>Loading…</p>
      </div>
    )
  }

  const { latest, receivedAt } = record
  const { gates, blocks, final_say } = latest
  const stale = staleness(receivedAt)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <Link href="/missions" className="inline-flex items-center gap-1.5 text-sm mb-4"
        style={{ color: 'rgba(255,255,255,0.4)' }}>
        <ArrowLeft size={14} /> Missions
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">{slug}</h1>
      <p className="text-sm mb-6" style={{ color: stale.color }}>{stale.text}</p>

      {/* Gate strip */}
      <div className="flex gap-2 mb-6">
        {GATES.map(g => {
          const approved = gates[g] === 'approved'
          return (
            <div key={g} className="flex-1 text-center">
              <div className="h-1.5 rounded-full mb-1.5" style={{
                background: approved ? GATE_COLOR.approved : GATE_COLOR.pending,
              }} />
              <span className="text-xs font-medium" style={{
                color: approved ? '#34d399' : 'rgba(255,255,255,0.35)',
              }}>{g}</span>
            </div>
          )
        })}
      </div>

      {/* Final-say banner */}
      {final_say !== 'none' && (
        <div className="rounded-xl border px-5 py-3 mb-6 text-center font-bold text-sm" style={{
          borderColor: `${FINAL_COLOR[final_say] ?? '#fff'}44`,
          background: `${FINAL_COLOR[final_say] ?? '#fff'}22`,
          color: FINAL_COLOR[final_say] ?? '#fff',
        }}>
          {final_say === 'SHIP' ? 'SHIPPED — final say: SHIP' : 'HOLD — final say: HOLD'}
        </div>
      )}

      {/* Blocks grid */}
      {blocks.length === 0 ? (
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          No blocks yet — blueprint gate pending
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {blocks.map(b => {
            const color = STATUS_COLOR[b.status] ?? STATUS_COLOR.PENDING
            return (
              <div key={b.id} className="rounded-xl border px-4 py-3" style={CARD}>
                <p className="text-sm font-semibold text-white mb-1">{blockLabel(b.id)}</p>
                <p className="text-xs font-mono mb-2" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {b.id}
                </p>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{
                  background: `${color}22`,
                  color,
                }}>
                  {b.status}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

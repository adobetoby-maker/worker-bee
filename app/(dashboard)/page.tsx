// Built by ATLAS — 2026-07-05
// TODAY — the operator console home. PRD-atlas-platform §4.2 (Phases 1+2).
// The morning brief made ambient: staleness, brief, NEEDs, missions, QA, agents, taps, invoices.
export const dynamic = 'force-dynamic'

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { formatCents, getInvoiceStatusColor } from '@/lib/billing'
import { relTime, minutesSince, needTypeColor, qaStateStyle, qaLatestInfo, beautyColor, type QaRow, type CommandRow } from '@/lib/atlas-console'
import {
  Radio, FileText, ListTodo, Rocket, ShieldCheck, Activity,
  DollarSign, ExternalLink, CircleCheck, CircleAlert,
} from 'lucide-react'
import PendingCommands from './PendingCommands'
import TapQueue from './TapQueue'
import RunQaButton from './RunQaButton'

export const metadata = { title: 'Today — Worker-Bee' }

const db = supabaseAdmin as any

type NeedRow = {
  id: string; payload: any; type: string | null; state: string | null
  priority_score: number | null; source: string | null
  updated_at: string | null; synced_at: string | null
}
type MissionRow = {
  id: string; name: string | null; payload: any; gate_pass: boolean | null
  beauty: number | null; quality: string | null; state: string | null; synced_at: string | null
}
async function getData() {
  const [health, briefs, needs, missions, qa, commands, invoices] = await Promise.all([
    db.from('atlas_health').select('*'),
    db.from('atlas_briefs').select('*').order('date', { ascending: false }).limit(1),
    db.from('atlas_needs').select('*'),
    db.from('atlas_missions').select('*').order('synced_at', { ascending: false }),
    db.from('atlas_qa').select('*').order('slug'),
    db.from('atlas_commands').select('*').order('created_at', { ascending: false }).limit(50),
    db.from('invoices').select('id, invoice_number, status, total_cents, due_date, sites ( name )').in('status', ['sent', 'overdue']).order('due_date', { ascending: true }),
  ])
  return {
    health: (health.data ?? []) as { key: string; value: any; synced_at: string | null }[],
    brief: (briefs.data?.[0] ?? null) as { id: string; date: string | null; content: string | null } | null,
    needs: (needs.data ?? []) as NeedRow[],
    missions: (missions.data ?? []) as MissionRow[],
    qa: (qa.data ?? []) as QaRow[],
    commands: (commands.data ?? []) as CommandRow[],
    invoices: (invoices.data ?? []) as any[],
  }
}

function SectionHeader({ icon: Icon, label, count }: { icon: any; label: string; count?: number | string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-8">
      <Icon size={13} style={{ color: 'var(--muted)' }} />
      <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</h2>
      {count !== undefined && (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums"
          style={{ background: 'var(--surface2)', color: 'var(--muted-light)' }}>{count}</span>
      )}
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="card rounded-lg px-4 py-2.5 text-xs" style={{ color: 'var(--muted)' }}>
      {text}
    </div>
  )
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
      {label}
    </span>
  )
}

export default async function TodayPage() {
  const { health, brief, needs, missions, qa, commands, invoices } = await getData()

  // ── Staleness: max(synced_at) across atlas_health ──
  const lastSynced = health.reduce<string | null>((max, r) =>
    r.synced_at && (!max || r.synced_at > max) ? r.synced_at : max, null)
  const staleMins = minutesSince(lastSynced)
  const isStale = staleMins > 15

  // ── NEED queue: QUEUED/GENERATED first, then priority_score desc; top 10 ──
  const activeStates = new Set(['QUEUED', 'GENERATED'])
  const topNeeds = [...needs]
    .sort((a, b) => {
      const ra = activeStates.has((a.state ?? '').toUpperCase()) ? 0 : 1
      const rb = activeStates.has((b.state ?? '').toUpperCase()) ? 0 : 1
      if (ra !== rb) return ra - rb
      return (b.priority_score ?? -1) - (a.priority_score ?? -1)
    })
    .slice(0, 10)

  // ── Command path: approve-tap rows get their own Tap queue section;
  //    everything else renders in Pending commands (client, optimistic) ──
  const tapStatuses = new Set(['pending', 'pending_operator', 'approved_by_operator', 'dispatched'])
  const taps = commands.filter(c => c.type === 'approve-tap' && tapStatuses.has(c.status ?? ''))
  const otherCommands = commands.filter(c => c.type !== 'approve-tap')

  // ── Agent health: agent-status payload + bridge heartbeat ──
  const agentStatus = health.find(h => h.key === 'agent-status')?.value ?? null
  const bridge = health.find(h => h.key === 'bridge')?.value ?? null
  const agentTiles: { name: string; status: string }[] = agentStatus
    ? ['hermes', 'hermes_jr', 'workforce', 'gateway'].map(k => ({
        name: k.replace('_', ' '),
        status: String(agentStatus[k] ?? 'unknown'),
      }))
    : []

  return (
    <div className="max-w-5xl min-[1920px]:max-w-[1680px] min-[1920px]:mx-auto animate-fade-in pb-16">
      {/* ── Header + staleness banner ── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Today</h1>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · operator console
          </p>
        </div>
        {isStale ? (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
            style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
            <CircleAlert size={13} />
            ATLAS last heard {lastSynced ? relTime(lastSynced) : 'never'} — Bridge may be down
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34d399' }} />
            ATLAS live · synced {relTime(lastSynced)}
          </div>
        )}
      </div>

      {/* ── Latest daily brief ── */}
      <SectionHeader icon={FileText} label="Daily brief" />
      {brief?.content ? (
        <details className="card rounded-xl overflow-hidden group" open>
          <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 text-xs font-semibold select-none list-none"
            style={{ color: 'var(--muted-light)' }}>
            <Radio size={12} style={{ color: '#818cf8' }} />
            {brief.date ?? brief.id}
            <span className="ml-auto text-[10px] font-normal" style={{ color: 'var(--muted)' }}>click to collapse</span>
          </summary>
          <pre className="px-4 pb-4 pt-1 text-[11px] leading-relaxed whitespace-pre-wrap overflow-x-auto font-mono max-h-96 overflow-y-auto"
            style={{ color: '#cbd5e1' }}>
            {brief.content}
          </pre>
        </details>
      ) : (
        <EmptyState text="No brief synced yet — the 06:00 pipeline writes the first one." />
      )}

      {/* ── NEED queue ── */}
      <SectionHeader icon={ListTodo} label="NEED queue" count={needs.length} />
      {topNeeds.length === 0 ? (
        <EmptyState text="Queue clear — no NEEDs synced." />
      ) : (
        <div className="card rounded-xl divide-y" style={{ borderColor: 'var(--border)' }}>
          {topNeeds.map(n => {
            const color = needTypeColor(n.type)
            const p = n.payload ?? {}
            const summary = p.detail ?? p.summary ?? p.title ?? n.id
            const age = relTime(p.ts ?? n.updated_at ?? n.synced_at)
            return (
              <div key={n.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderColor: 'var(--border)' }}>
                <Pill label={n.type ?? '?'} color={color} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-white truncate">{String(summary)}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
                    {n.source ?? 'unknown source'} · {age}{p.slug ? ` · ${p.slug}` : ''}
                  </div>
                </div>
                {typeof n.priority_score === 'number' && (
                  <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: 'var(--muted-light)' }}>
                    {n.priority_score.toFixed(1)}
                  </span>
                )}
                <span className="text-[10px] uppercase tracking-wide shrink-0" style={{ color: 'var(--muted)' }}>
                  {n.state ?? '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Active missions ── */}
      <SectionHeader icon={Rocket} label="Missions" count={missions.length} />
      {missions.length === 0 ? (
        <EmptyState text="No missions synced." />
      ) : (
        <div className="card rounded-xl divide-y" style={{ borderColor: 'var(--border)' }}>
          {missions.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderColor: 'var(--border)' }}>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-white truncate">{(m.name ?? m.id).replace(/\*\*/g, '')}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>synced {relTime(m.synced_at)}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {m.gate_pass !== null && (
                  <Pill label={m.gate_pass ? 'gate ✓' : 'gate ✗'} color={m.gate_pass ? '#34d399' : '#f87171'} />
                )}
                {typeof m.beauty === 'number' && (
                  <Pill label={`beauty ${m.beauty.toFixed(1)}`} color={beautyColor(m.beauty)} />
                )}
                {m.quality && <Pill label={m.quality} color="#60a5fa" />}
                <Pill label={m.state ?? '—'}
                  color={(m.state ?? '').toUpperCase() === 'DONE' ? '#34d399'
                    : (m.state ?? '').toUpperCase() === 'EXECUTING' ? '#fbbf24' : '#64748b'} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── QA board strip ── */}
      <SectionHeader icon={ShieldCheck} label="QA board" count={qa.length} />
      {qa.length === 0 ? (
        <EmptyState text="No QA runs synced yet." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {qa.map(q => {
            const s = qaStateStyle(q.state)
            const info = qaLatestInfo(q.latest as any)
            const href = q.url ? `${q.url.replace(/\/$/, '')}/qa-status.json` : null
            return (
              <div key={q.slug} className="card card-glow rounded-lg px-3 py-2.5 flex items-center gap-2.5 transition-all h-full">
                <span className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={s.solid
                    ? { background: s.color }
                    : { background: 'transparent', border: `1.5px solid ${s.color}` }} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">{q.slug}</div>
                  <div className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>
                    {(q.state ?? 'unknown').toUpperCase()}
                    {typeof info.beauty === 'number' && (
                      <> · <span className="font-semibold" style={{ color: beautyColor(info.beauty) }}>{info.beauty.toFixed(1)}</span></>
                    )}
                    {info.ts ? ` · ${relTime(info.ts)}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <RunQaButton slug={q.slug} compact />
                  {href && (
                    <a href={href} target="_blank" rel="noopener noreferrer" title="qa-status.json"
                      className="inline-flex p-1 rounded transition-colors hover:bg-white/10">
                      <ExternalLink size={10} style={{ color: 'var(--muted)' }} />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Agent health ── */}
      <SectionHeader icon={Activity} label="Agent health" />
      {agentTiles.length === 0 && !bridge ? (
        <EmptyState text="No agent-status heartbeat synced yet." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {agentTiles.map(a => {
            const online = a.status === 'online'
            const partial = !online && a.status !== 'offline'
            const color = online ? '#34d399' : partial ? '#fbbf24' : '#ef4444'
            return (
              <div key={a.name} className="card rounded-lg px-3 py-2.5 flex items-center gap-2">
                {online
                  ? <CircleCheck size={13} style={{ color }} />
                  : <CircleAlert size={13} style={{ color }} />}
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white capitalize truncate">{a.name}</div>
                  <div className="text-[10px] truncate" style={{ color }}>{a.status}</div>
                </div>
              </div>
            )
          })}
          {bridge && (
            <div className="card rounded-lg px-3 py-2.5 flex items-center gap-2">
              <Radio size={13} style={{ color: '#818cf8' }} />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">bridge</div>
                <div className="text-[10px] truncate" style={{ color: 'var(--muted-light)' }}>
                  {relTime(bridge.last_run)}{bridge.host ? ` · ${String(bridge.host).replace('.local', '')}` : ''}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tap queue — approve-tap packages awaiting Toby (Phase 3) ── */}
      <TapQueue initial={taps} />

      {/* ── Pending commands — command path DOWN, live chips + queue form (Phase 3) ── */}
      <PendingCommands initial={otherCommands} />

      {/* ── Unpaid invoices ── */}
      <SectionHeader icon={DollarSign} label="Unpaid invoices" count={invoices.length} />
      {invoices.length === 0 ? (
        <EmptyState text="No unpaid invoices — nothing outstanding." />
      ) : (
        <div className="card rounded-xl divide-y" style={{ borderColor: 'var(--border)' }}>
          {invoices.map(inv => (
            <Link key={inv.id} href={`/billing/${inv.id}`}
              className="no-underline flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/5"
              style={{ borderColor: 'var(--border)' }}>
              <FileText size={13} style={{ color: getInvoiceStatusColor(inv.status) }} />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-white truncate">
                  {inv.invoice_number ?? inv.id} {inv.sites?.name ? `· ${inv.sites.name}` : ''}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  due {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </div>
              </div>
              <span className="text-xs font-bold tabular-nums text-white">{formatCents(inv.total_cents ?? 0)}</span>
              <Pill label={inv.status} color={getInvoiceStatusColor(inv.status)} />
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 text-[10px] text-center" style={{ color: 'var(--muted)' }}>
        synced by ATLAS Bridge every 5 min
      </div>
    </div>
  )
}

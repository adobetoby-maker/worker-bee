export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { Inbox, Plus, Phone, Mail, FileText, MessageSquare, HelpCircle, type LucideProps } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Request {
  id: string
  client_id: string | null
  site_id: string | null
  source: string
  title: string
  description: string | null
  status: string
  estimated_hours: number | null
  estimated_rate_cents: number | null
  estimated_total_cents: number | null
  notes: string | null
  received_at: string
  clients?: { id: string; name: string } | null
  sites?: { id: string; name: string } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(cents: number | null) {
  if (!cents) return null
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

type IconComp = React.FC<LucideProps>
const SOURCE_META: Record<string, { icon: IconComp; label: string; color: string }> = {
  phone:   { icon: Phone as IconComp,         label: 'Phone',   color: '#34d399' },
  form:    { icon: FileText as IconComp,       label: 'Form',    color: '#60a5fa' },
  email:   { icon: Mail as IconComp,           label: 'Email',   color: '#a78bfa' },
  message: { icon: MessageSquare as IconComp,  label: 'Message', color: '#f59e0b' },
  other:   { icon: HelpCircle as IconComp,     label: 'Other',   color: '#94a3b8' },
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  new:         { label: 'New',         color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)'  },
  in_progress: { label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  complete:    { label: 'Complete',    color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)'  },
  declined:    { label: 'Declined',    color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
  on_hold:     { label: 'On Hold',     color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)' },
}

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'complete', label: 'Complete' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

// ── Component ─────────────────────────────────────────────────────────────────
export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status = 'all' } = await searchParams

  let query = db
    .from('project_requests')
    .select('*, clients(id, name), sites(id, name)')
    .order('received_at', { ascending: false })

  if (status !== 'all') query = query.eq('status', status)

  const { data: requests } = await query
  const rows: Request[] = requests ?? []

  // Counts per tab
  const { data: allRequests } = await db.from('project_requests').select('status')
  const counts: Record<string, number> = { all: 0, new: 0, in_progress: 0, complete: 0 }
  for (const r of (allRequests ?? [])) {
    counts.all++
    if (r.status in counts) counts[r.status]++
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Inbox size={22} style={{ color: '#f59e0b' }} />
            <h1 className="text-2xl font-bold text-white">Requests</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Intake queue for client project requests
          </p>
        </div>
        <Link href="/requests/new"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: '#6366f1', color: '#fff' }}>
          <Plus size={14} /> Log Request
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 mb-6 flex-wrap">
        {TABS.map(tab => {
          const active = tab.key === status
          return (
            <Link key={tab.key} href={`/requests?status=${tab.key}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                color:      active ? '#a5b4fc' : 'var(--muted-light)',
                background: active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                border:     active ? '1px solid rgba(99,102,241,0.35)' : '1px solid var(--border)',
              }}>
              {tab.label}
              <span className="px-1.5 py-0.5 rounded text-xs"
                style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--muted)' }}>
                {counts[tab.key] ?? 0}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl border text-center"
          style={{ borderColor: 'var(--border)' }}>
          <Inbox size={40} className="mb-3 opacity-15 text-white" />
          <p className="text-sm font-medium text-white mb-1">No requests</p>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
            {status === 'all' ? 'Log your first request to get started' : `No ${status.replace('_', ' ')} requests`}
          </p>
          <Link href="/requests/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: '#6366f1', color: '#fff' }}>
            <Plus size={13} /> Log Request
          </Link>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                {['Source', 'Client', 'Title', 'Status', 'Est. Value', 'Received'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const src = SOURCE_META[r.source] ?? SOURCE_META.other
                const SrcIcon = src.icon
                const st  = STATUS_META[r.status] ?? STATUS_META.new
                return (
                  <tr key={r.id}
                    style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: src.color }}>
                        <SrcIcon size={12} /> {src.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-light)' }}>
                      {r.clients?.name ?? <span style={{ color: 'var(--muted)', opacity: 0.5 }}>—</span>}
                      {r.sites?.name && (
                        <span className="block text-xs" style={{ color: 'var(--muted)', opacity: 0.6 }}>{r.sites.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <Link href={`/requests/${r.id}`}
                        className="text-sm font-medium text-white hover:text-indigo-300 transition-colors block truncate">
                        {r.title}
                      </Link>
                      {r.description && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{r.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#a78bfa' }}>
                      {fmt(r.estimated_total_cents) ?? (
                        r.estimated_hours
                          ? <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>{r.estimated_hours}h</span>
                          : <span style={{ color: 'var(--muted)', opacity: 0.4 }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                      {new Date(r.received_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

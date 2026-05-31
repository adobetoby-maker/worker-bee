export const dynamic = 'force-dynamic'
import { supabaseAdmin } from '@/lib/supabase'

type Lead = {
  id: string
  name: string | null
  business_name: string | null
  email: string | null
  phone: string | null
  services: string[] | null
  budget: string | null
  status: string | null
  created_at: string
  notes: string | null
  source: string | null
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  new:       { label: 'New',       bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  contacted: { label: 'Contacted', bg: 'rgba(96,165,250,0.12)',  color: '#60a5fa' },
  scoped:    { label: 'Scoped',    bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' },
  won:       { label: 'Won',       bg: 'rgba(52,211,153,0.12)',  color: '#34d399' },
  lost:      { label: 'Lost',      bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
}

function StatusChip({ status }: { status: string | null }) {
  const s = status ?? 'new'
  const cfg = STATUS_CONFIG[s] ?? STATUS_CONFIG.new
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function ServiceTag({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
      style={{ background: 'rgba(129,140,248,0.1)', color: '#818cf8', border: '1px solid rgba(129,140,248,0.2)' }}>
      {label}
    </span>
  )
}

export default async function LeadsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const leads: Lead[] = data ?? []

  const statusCounts = leads.reduce<Record<string, number>>((acc, l) => {
    const s = l.status ?? 'new'
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Leads</h1>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            {leads.length} total
            {Object.entries(statusCounts).map(([s, n]) => (
              <span key={s}> &middot; {n} {s}</span>
            ))}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 mb-6 text-sm"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
          Could not load leads: {String(error.message ?? error)}
        </div>
      )}

      {leads.length === 0 && !error ? (
        <div className="rounded-xl px-6 py-16 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-4xl mb-4">📭</div>
          <div className="text-white font-semibold mb-1">No leads yet</div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Leads submitted via your pitch form or scoping page will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const services = Array.isArray(lead.services) ? lead.services : []
            const timeAgo = (() => {
              try {
                const diff = Date.now() - new Date(lead.created_at).getTime()
                const mins = Math.floor(diff / 60000)
                if (mins < 1) return 'just now'
                if (mins < 60) return `${mins}m ago`
                const hrs = Math.floor(mins / 60)
                if (hrs < 24) return `${hrs}h ago`
                const days = Math.floor(hrs / 24)
                if (days < 30) return `${days}d ago`
                return new Date(lead.created_at).toLocaleDateString()
              } catch { return lead.created_at }
            })()

            return (
              <div
                key={lead.id}
                className="rounded-xl px-5 py-4 grid gap-3"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  gridTemplateColumns: '1fr auto',
                }}>
                {/* Left: info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-white text-sm">
                      {lead.name ?? '—'}
                    </span>
                    {lead.business_name && (
                      <span className="text-sm" style={{ color: 'var(--muted-light)' }}>
                        · {lead.business_name}
                      </span>
                    )}
                    <StatusChip status={lead.status} />
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs mb-2" style={{ color: 'var(--muted)' }}>
                    {lead.email && (
                      <a href={`mailto:${lead.email}`} className="hover:text-indigo-400 transition-colors">
                        {lead.email}
                      </a>
                    )}
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`} className="hover:text-indigo-400 transition-colors">
                        {lead.phone}
                      </a>
                    )}
                    {lead.budget && (
                      <span style={{ color: '#34d399' }}>Budget: {lead.budget}</span>
                    )}
                    {lead.source && (
                      <span>via {lead.source}</span>
                    )}
                  </div>

                  {services.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {services.map((svc, i) => (
                        <ServiceTag key={i} label={svc} />
                      ))}
                    </div>
                  )}

                  {lead.notes && (
                    <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--muted)' }}>
                      {lead.notes}
                    </p>
                  )}
                </div>

                {/* Right: timestamp */}
                <div className="text-right shrink-0">
                  <div className="text-xs" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {timeAgo}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

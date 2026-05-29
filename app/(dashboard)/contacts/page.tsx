'use client'
import { useState, useEffect, useCallback } from 'react'
import { Users, Search, Download, Trash2, RefreshCw, ChevronLeft, ChevronRight, Tag, CheckCircle, XCircle } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Contact {
  id: string
  email: string
  name?: string
  site_id?: string
  source?: string
  subscribed: boolean
  tags?: string[]
  created_at: string
}

// ── Site config ───────────────────────────────────────────────────────────────
const SITES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  medicalspanish:       { label: 'Medical Spanish',      color: '#00D4A4', bg: 'rgba(0,212,164,0.12)',   border: 'rgba(0,212,164,0.3)' },
  constructionspanish:  { label: 'Construction Spanish', color: '#FF6B2B', bg: 'rgba(255,107,43,0.12)',  border: 'rgba(255,107,43,0.3)' },
  languagethreshold:    { label: 'Language Threshold',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)' },
  'worker-bee':         { label: 'Worker Bee',           color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
}

function SiteBadge({ siteId }: { siteId?: string }) {
  if (!siteId) return <span className="text-xs text-slate-500">—</span>
  const s = SITES[siteId]
  if (!s) return <span className="text-xs font-mono text-slate-400">{siteId}</span>
  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  )
}

function SubscribedBadge({ subscribed }: { subscribed: boolean }) {
  return subscribed ? (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}>
      <CheckCircle size={11} /> Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>
      <XCircle size={11} /> No
    </span>
  )
}

const PAGE_SIZE = 50

export default function ContactsPage() {
  const [contacts, setContacts]       = useState<Contact[]>([])
  const [total, setTotal]             = useState(0)
  const [siteCounts, setSiteCounts]   = useState<Record<string, number>>({})
  const [loading, setLoading]         = useState(true)
  const [deleting, setDeleting]       = useState<string | null>(null)

  const [site, setSite]   = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage]   = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (site) params.set('site', site)
    if (query) params.set('q', query)
    params.set('page', String(page))
    params.set('limit', String(PAGE_SIZE))
    try {
      const res  = await fetch(`/api/contacts?${params}`)
      const data = await res.json()
      setContacts(data.contacts ?? [])
      setTotal(data.total ?? 0)
      setSiteCounts(data.siteCounts ?? {})
    } catch {}
    setLoading(false)
  }, [site, query, page])

  useEffect(() => { load() }, [load])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [site, query])

  async function deleteContact(id: string, email: string) {
    if (!confirm(`Remove ${email} from contacts? This cannot be undone.`)) return
    setDeleting(id)
    try {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
      load()
    } catch {}
    setDeleting(null)
  }

  function exportCSV() {
    const header = 'Email,Name,Site,Source,Subscribed,Tags,Joined\n'
    const rows = contacts.map(c =>
      [
        c.email,
        c.name ?? '',
        SITES[c.site_id ?? '']?.label ?? c.site_id ?? '',
        c.source ?? '',
        c.subscribed ? 'Yes' : 'No',
        (c.tags ?? []).join(';'),
        new Date(c.created_at).toLocaleDateString(),
      ]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `contacts-${site || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Users size={22} style={{ color: '#34d399' }} />
            <h1 className="text-2xl font-bold text-white">Contacts</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            All subscribers across your sites
          </p>
        </div>

        {/* Stat chips */}
        <div className="flex flex-wrap gap-2">
          <StatChip label="Total" count={total} color="#94a3b8" />
          {Object.entries(siteCounts).map(([siteId, count]) => {
            const s = SITES[siteId]
            return s ? <StatChip key={siteId} label={s.label} count={count} color={s.color} /> : null
          })}
        </div>
      </div>

      {/* Filters bar */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3">
        {/* Site filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterBtn active={site === ''} onClick={() => setSite('')} label="All" />
          {Object.entries(SITES).map(([key, s]) => (
            <FilterBtn key={key} active={site === key} onClick={() => setSite(key)} label={s.label}
              activeColor={s.color} activeBg={s.bg} activeBorder={s.border} />
          ))}
        </div>

        <div className="flex gap-2 sm:ml-auto">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--muted)' }} />
            <input
              type="search"
              placeholder="Search email or name…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm rounded-lg outline-none w-52 transition-colors"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          {/* Refresh */}
          <button onClick={load} title="Refresh"
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--muted-light)' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Export */}
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all"
            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm" style={{ color: 'var(--muted)' }}>
            <RefreshCw size={16} className="animate-spin mr-2" /> Loading contacts…
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <Users size={36} className="mb-3 opacity-20 text-white" />
            <p className="text-sm font-medium text-white mb-1">No contacts yet</p>
            <p className="text-xs max-w-md" style={{ color: 'var(--muted)' }}>
              Contacts are added automatically when someone submits the trifold form on your sites.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Email', 'Name', 'Site', 'Source', 'Subscribed', 'Tags', 'Joined', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => (
                  <tr key={c.id}
                    className="transition-colors"
                    style={{
                      borderBottom: i < contacts.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text)', maxWidth: 220 }}>
                      <span className="truncate block">{c.email}</span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted-light)' }}>
                      {c.name ?? <span style={{ color: 'var(--muted)', opacity: 0.5 }}>—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <SiteBadge siteId={c.site_id} />
                    </td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--muted-light)' }}>
                      {c.source ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <SubscribedBadge subscribed={c.subscribed} />
                    </td>
                    <td className="px-4 py-3">
                      {c.tags && c.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded"
                              style={{ background: 'rgba(167,139,250,0.1)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.2)' }}>
                              <Tag size={9} /> {tag}
                            </span>
                          ))}
                          {c.tags.length > 3 && (
                            <span className="text-xs" style={{ color: 'var(--muted)' }}>+{c.tags.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)', opacity: 0.5, fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteContact(c.id, c.email)}
                        disabled={deleting === c.id}
                        title="Remove contact"
                        className="flex items-center justify-center w-7 h-7 rounded-lg transition-all opacity-40 hover:opacity-100"
                        style={{ color: '#f87171' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {deleting === c.id ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--muted-light)' }}>
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="px-2">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all disabled:opacity-30"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--muted-light)' }}>
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatChip({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--muted-light)' }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span style={{ color }}>{count}</span>
      <span>{label}</span>
    </div>
  )
}

function FilterBtn({
  active, onClick, label, activeColor = '#6366f1',
  activeBg = 'rgba(99,102,241,0.15)', activeBorder = 'rgba(99,102,241,0.4)',
}: {
  active: boolean; onClick: () => void; label: string
  activeColor?: string; activeBg?: string; activeBorder?: string
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        color:      active ? activeColor : 'var(--muted-light)',
        background: active ? activeBg    : 'rgba(255,255,255,0.04)',
        border:     active ? `1px solid ${activeBorder}` : '1px solid var(--border)',
      }}>
      {label}
    </button>
  )
}

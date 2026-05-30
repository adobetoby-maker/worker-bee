'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Plus, X } from 'lucide-react'

interface Site {
  id: string
  name: string
  url: string
  status: string
}

interface Props {
  clientId: string
  unlinkedSites: Site[]
}

export function LinkSitePanel({ clientId, unlinkedSites }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function link() {
    if (!selected) return
    setLoading(true)
    setErr('')
    const res = await fetch(`/api/sites/${selected}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    })
    setLoading(false)
    if (!res.ok) {
      setErr('Failed to link site')
      return
    }
    setOpen(false)
    setSelected('')
    router.refresh()
  }

  if (unlinkedSites.length === 0) return null

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}
        >
          <Link2 size={12} /> Link Existing Site
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="text-xs rounded-lg px-2 py-1.5 outline-none"
            style={{ background: '#111e38', border: '1px solid #2a4480', color: '#e2e8f0', minWidth: 180 }}
          >
            <option value="">— pick a site —</option>
            {unlinkedSites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            onClick={link}
            disabled={!selected || loading}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
            style={{ background: '#6366f1', color: '#fff' }}
          >
            <Plus size={12} /> {loading ? 'Linking…' : 'Link'}
          </button>
          <button
            onClick={() => { setOpen(false); setSelected(''); setErr('') }}
            className="p-1.5 rounded-lg transition-colors cursor-pointer"
            style={{ color: '#6b7280' }}
          >
            <X size={14} />
          </button>
          {err && <span className="text-xs" style={{ color: '#f87171' }}>{err}</span>}
        </div>
      )}
    </div>
  )
}

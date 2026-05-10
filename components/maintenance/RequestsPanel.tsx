'use client'

import { useState, useEffect, useCallback } from 'react'
import { Inbox, Clock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'

interface Request {
  id: string
  client_name: string
  client_email: string
  business_name: string | null
  cleaned_request: string
  status: string
  created_at: string
}

export function RequestsPanel() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/maintenance/requests')
      if (res.ok) {
        const data = await res.json() as { requests: Request[] }
        setRequests(data.requests ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRequests()
    const id = setInterval(fetchRequests, 30_000)
    return () => clearInterval(id)
  }, [fetchRequests])

  async function approve(req: Request) {
    setApprovingId(req.id)
    try {
      await fetch('/api/maintenance/requests', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: req.id, status: 'dispatched' }),
      })
      setRequests(prev => prev.filter(r => r.id !== req.id))
    } finally {
      setApprovingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2 text-sm">
        <Loader2 size={14} className="animate-spin" /> Loading requests…
      </div>
    )
  }

  if (!requests.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle2 size={36} className="text-slate-700 mb-4" />
        <p className="text-sm font-semibold text-slate-500">No pending requests</p>
        <p className="text-xs text-slate-600 mt-1">
          Share <span className="text-indigo-400">manage.worker-bee.app/request</span> with clients to collect change requests.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map(req => (
        <div key={req.id} className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-semibold text-white">{req.client_name}</span>
                {req.business_name && <span className="text-xs text-slate-500">· {req.business_name}</span>}
                <span className="flex items-center gap-1 text-xs text-slate-600 ml-auto shrink-0">
                  <Clock size={10} />
                  {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-2">{req.client_email}</p>
              <p className="text-sm text-slate-300 leading-relaxed">{req.cleaned_request}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
              {req.status === 'pending_review' ? 'Pending review' : req.status}
            </span>
            <button
              onClick={() => approve(req)}
              disabled={approvingId === req.id}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white' }}
            >
              {approvingId === req.id
                ? <><Loader2 size={11} className="animate-spin" /> Approving…</>
                : <><ArrowRight size={11} /> Approve &amp; move to Dispatch</>
              }
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function requestsBadge(requests: number) {
  if (!requests) return null
  return (
    <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white">
      {requests}
    </span>
  )
}

export function useRequestCount() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    fetch('/api/maintenance/requests')
      .then(r => r.json())
      .then((d: { requests?: unknown[] }) => setCount(d.requests?.length ?? 0))
      .catch(() => {})
    const id = setInterval(() => {
      fetch('/api/maintenance/requests')
        .then(r => r.json())
        .then((d: { requests?: unknown[] }) => setCount(d.requests?.length ?? 0))
        .catch(() => {})
    }, 30_000)
    return () => clearInterval(id)
  }, [])
  return count
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, CheckCircle, FileDown, Link2 } from 'lucide-react'

type Props = {
  invoiceId: string
  currentStatus: string
  publicToken?: string | null
}

export default function InvoiceActions({ invoiceId, currentStatus, publicToken }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function markAs(status: string) {
    setLoading(status)
    try {
      const body: Record<string, unknown> = { status }
      if (status === 'paid') {
        body.paid_at = new Date().toISOString()
      }
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        showToast(err.error ?? 'Update failed')
      } else {
        router.refresh()
      }
    } finally {
      setLoading(null)
    }
  }

  function openPdf() {
    window.open(`/api/invoice-pdf/${invoiceId}`, '_blank')
  }

  async function copyLink() {
    if (!publicToken) {
      showToast('No public token — re-run migration')
      return
    }
    const url = `${window.location.origin}/invoice/${publicToken}`
    try {
      await navigator.clipboard.writeText(url)
      showToast('Client link copied!')
    } catch {
      showToast('Copy failed — link: /invoice/' + publicToken)
    }
  }

  return (
    <div className="flex items-center gap-2.5 flex-wrap relative">
      {/* Mark as Sent */}
      {currentStatus === 'draft' && (
        <button
          onClick={() => markAs('sent')}
          disabled={loading === 'sent'}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-60"
          style={{
            borderColor: 'rgba(59,130,246,0.4)',
            color: '#60a5fa',
            background: 'rgba(59,130,246,0.08)',
          }}
        >
          <Send size={12} />
          {loading === 'sent' ? 'Updating…' : 'Mark as Sent'}
        </button>
      )}

      {/* Mark as Paid */}
      {(currentStatus === 'sent' || currentStatus === 'overdue' || currentStatus === 'draft') && (
        <button
          onClick={() => markAs('paid')}
          disabled={loading === 'paid'}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-60"
          style={{
            borderColor: 'rgba(16,185,129,0.4)',
            color: '#34d399',
            background: 'rgba(16,185,129,0.08)',
          }}
        >
          <CheckCircle size={12} />
          {loading === 'paid' ? 'Updating…' : 'Mark as Paid'}
        </button>
      )}

      {/* Mark as Overdue */}
      {currentStatus === 'sent' && (
        <button
          onClick={() => markAs('overdue')}
          disabled={loading === 'overdue'}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-60"
          style={{
            borderColor: 'rgba(239,68,68,0.3)',
            color: '#f87171',
            background: 'rgba(239,68,68,0.06)',
          }}
        >
          {loading === 'overdue' ? 'Updating…' : 'Mark as Overdue'}
        </button>
      )}

      {/* Download PDF */}
      <button
        onClick={openPdf}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
        style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}
      >
        <FileDown size={12} />
        Download PDF
      </button>

      {/* Copy client link */}
      {publicToken && (
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: 'rgba(99,102,241,0.35)', color: '#818cf8', background: 'rgba(99,102,241,0.07)' }}
        >
          <Link2 size={12} />
          Copy Client Link
        </button>
      )}

      {/* Toast */}
      {toast && (
        <span
          className="absolute -top-8 left-0 text-xs px-3 py-1.5 rounded-lg"
          style={{
            background: 'rgba(0,0,0,0.8)',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.1)',
            whiteSpace: 'nowrap',
          }}
        >
          {toast}
        </span>
      )}
    </div>
  )
}

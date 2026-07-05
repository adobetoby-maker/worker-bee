'use client'

import { useState } from 'react'
import { FileDown, Link2 } from 'lucide-react'

type Props = {
  invoiceId: string
  invoiceNumber: string
  publicToken?: string | null
}

export default function BillingRowActions({ invoiceId, invoiceNumber, publicToken }: Props) {
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function copyLink() {
    if (!publicToken) { showToast('No link yet'); return }
    const url = `${window.location.origin}/invoice/${publicToken}`
    try {
      await navigator.clipboard.writeText(url)
      showToast('Copied!')
    } catch {
      showToast('Failed')
    }
  }

  return (
    <div className="flex items-center gap-1.5 relative">
      <a
        href={`/api/invoice-pdf/${invoiceId}`}
        target="_blank"
        rel="noopener noreferrer"
        title={`Download PDF – ${invoiceNumber}`}
        className="flex items-center justify-center w-7 h-7 rounded-md border transition-colors"
        style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}
      >
        <FileDown size={12} />
      </a>
      {publicToken && (
        <button
          onClick={copyLink}
          title="Copy client link"
          className="flex items-center justify-center w-7 h-7 rounded-md border transition-colors"
          style={{ borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8' }}
        >
          <Link2 size={12} />
        </button>
      )}
      {toast && (
        <span
          className="absolute -top-7 left-0 text-xs px-2 py-1 rounded-md whitespace-nowrap z-10"
          style={{ background: 'rgba(0,0,0,0.85)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {toast}
        </span>
      )}
    </div>
  )
}

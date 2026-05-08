'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'

export default function DeleteSiteButton({ id }: { id: string }) {
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)

  async function del() {
    await fetch(`/api/sites/${id}`, { method: 'DELETE' })
    router.push('/sites')
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-400">Delete site?</span>
        <button onClick={del} className="text-xs font-semibold text-red-400 hover:text-red-300 border border-red-500/30 px-2 py-1 rounded-lg transition-colors">Yes</button>
        <button onClick={() => setConfirm(false)} className="text-xs text-slate-500 hover:text-white border border-white/10 px-2 py-1 rounded-lg transition-colors">No</button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirm(true)}
      className="flex items-center gap-1.5 text-sm border px-3 py-2 rounded-lg hover:border-red-500/40 hover:text-red-400 transition-colors"
      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
      <Trash2 size={13} /> Delete
    </button>
  )
}

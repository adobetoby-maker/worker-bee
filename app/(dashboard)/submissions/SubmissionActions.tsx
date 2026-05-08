'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Loader2 } from 'lucide-react'

interface Submission {
  id: string
  name: string
  email: string
  business: string
  nodes: object[]
  edges: object[]
}

export default function SubmissionActions({ submission }: { submission: Submission }) {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function buildSite() {
    setCreating(true)
    setError('')
    try {
      const name = submission.business || submission.name
      const siteName = `${name}'s Site`

      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: siteName,
          url: '',
          stack: 'nextjs',
          status: 'active',
          notes: `From blueprint submission. Contact: ${submission.name} <${submission.email}>`,
        }),
      })
      if (!res.ok) throw new Error('Failed to create site')
      const { id: siteId } = await res.json()

      await fetch(`/api/sites/${siteId}/blueprint`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          currentBranch: 'main',
          branches: {
            main: {
              nodes: submission.nodes,
              edges: submission.edges,
              updatedAt: new Date().toISOString(),
            },
          },
          summary: `Imported from client submission (${submission.name})`,
        }),
      })

      router.push(`/sites/${siteId}/build`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <button onClick={buildSite} disabled={creating}
        className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
        style={{
          background: creating ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)',
          border: `1px solid ${creating ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.4)'}`,
          color: creating ? '#6ee7b7' : '#10b981',
          cursor: creating ? 'default' : 'pointer',
        }}>
        {creating ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
        {creating ? 'Setting up…' : 'Build Site'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}

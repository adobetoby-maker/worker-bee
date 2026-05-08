'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'

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
  const router = useRouter()

  async function createSite() {
    setCreating(true)
    try {
      // Create the site
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

      // Migrate the blueprint to the new site
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

      router.push(`/sites/${siteId}/blueprint`)
    } catch (err) {
      console.error(err)
      setCreating(false)
    }
  }

  return (
    <button onClick={createSite} disabled={creating}
      className="flex items-center gap-1.5 text-sm border px-3 py-2 rounded-lg transition-colors shrink-0"
      style={{
        borderColor: creating ? 'var(--border)' : 'rgba(99,102,241,0.4)',
        color: creating ? 'var(--muted)' : '#818cf8',
        background: creating ? 'transparent' : 'rgba(99,102,241,0.08)',
      }}>
      {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
      {creating ? 'Creating…' : 'Create Site'}
    </button>
  )
}

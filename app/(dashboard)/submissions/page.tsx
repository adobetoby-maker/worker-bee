export const dynamic = 'force-dynamic'
import { supabaseAdmin } from '@/lib/supabase'
import { Mail, Calendar, Building2, FileText } from 'lucide-react'
import SubmissionActions from './SubmissionActions'

interface Submission {
  id: string
  name: string
  email: string
  business: string
  vision: string
  nodes: object[]
  edges: object[]
  submittedAt: string
  status: string
}

async function listSubmissions(): Promise<Submission[]> {
  const { data, error } = await supabaseAdmin.storage
    .from('blueprints')
    .list('submissions', { sortBy: { column: 'created_at', order: 'desc' } })

  if (error || !data) return []

  const submissions = await Promise.all(
    data.map(async (file) => {
      const { data: blob } = await supabaseAdmin.storage
        .from('blueprints')
        .download(`submissions/${file.name}`)
      if (!blob) return null
      try {
        return JSON.parse(await blob.text()) as Submission
      } catch { return null }
    })
  )

  return submissions.filter(Boolean) as Submission[]
}

export default async function SubmissionsPage() {
  const submissions = await listSubmissions()

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Submissions</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {submissions.length === 0 ? 'No blueprints submitted yet' : `${submissions.length} blueprint${submissions.length !== 1 ? 's' : ''} from the planning tool`}
          </p>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-2xl border flex flex-col items-center justify-center py-20 text-center"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <FileText size={32} style={{ color: 'var(--muted)', marginBottom: 12 }} />
          <p className="text-sm font-medium text-white mb-1">No submissions yet</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            When clients submit a blueprint from worker-bee.app/plan, it will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {submissions.map(sub => (
            <div key={sub.id} className="rounded-2xl border overflow-hidden"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              {/* Header */}
              <div className="flex items-start justify-between gap-4 px-6 py-4 border-b"
                style={{ borderColor: 'var(--border)' }}>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-bold text-white">{sub.name}</h3>
                    {sub.business && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                        <Building2 size={11} /> {sub.business}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full border"
                      style={{
                        borderColor: sub.status === 'pending' ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)',
                        color: sub.status === 'pending' ? '#f59e0b' : '#10b981',
                        background: sub.status === 'pending' ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
                      }}>
                      {sub.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
                    <span className="flex items-center gap-1"><Mail size={11} /> {sub.email}</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>{sub.nodes.length} card{sub.nodes.length !== 1 ? 's' : ''} planned</span>
                  </div>
                </div>
                <SubmissionActions submission={sub} />
              </div>

              {/* Vision */}
              {sub.vision && (
                <div className="px-6 py-3 border-b text-sm leading-relaxed"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
                  &ldquo;{sub.vision}&rdquo;
                </div>
              )}

              {/* Card summary */}
              {sub.nodes.length > 0 && (
                <div className="px-6 py-3 flex flex-wrap gap-2">
                  {(sub.nodes as Array<{ data?: { title?: string; type?: string } }>).slice(0, 8).map((n, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded border"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                      {n.data?.title || n.data?.type || 'Card'}
                    </span>
                  ))}
                  {sub.nodes.length > 8 && (
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>+{sub.nodes.length - 8} more</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

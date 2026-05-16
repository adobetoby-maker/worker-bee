export const dynamic = 'force-dynamic'
import { supabaseAdmin } from '@/lib/supabase'
import { Calendar, Building2, FileText, Palette, Layout, Code } from 'lucide-react'
import SubmissionActions from './SubmissionActions'

interface WizardData {
  businessName?: string
  description?: string
  audience?: string
  cta?: string
  pages?: string[]
  style?: string
  inspiration?: string
}

interface AnalysisOutput {
  claudeMd?: string
  settingsJson?: string
  htmlStarter?: string
  tailwindStarter?: string
}

interface Submission {
  id: string
  // Legacy fields
  name: string
  email: string
  business: string
  vision: string
  nodes: object[]
  edges: object[]
  submittedAt: string
  status: string
  // New wizard fields
  wizard?: WizardData
  cleaned?: Partial<WizardData>
  style?: string
  pages?: string[]
  analysis?: AnalysisOutput
}

async function listSubmissions(): Promise<{ submissions: Submission[]; error?: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from('blueprints')
    .list('submissions', { sortBy: { column: 'created_at', order: 'desc' } })

  if (error) {
    console.error('[submissions] list error:', error)
    return { submissions: [], error: error.message }
  }
  if (!data || data.length === 0) return { submissions: [] }

  const submissions = await Promise.all(
    data.map(async (file) => {
      const { data: blob, error: dlErr } = await supabaseAdmin.storage
        .from('blueprints')
        .download(`submissions/${file.name}`)
      if (dlErr) console.error('[submissions] download error:', file.name, dlErr)
      if (!blob) return null
      try {
        return JSON.parse(await blob.text()) as Submission
      } catch { return null }
    })
  )

  return { submissions: submissions.filter(Boolean) as Submission[] }
}

function AnalysisSection({ analysis }: { analysis: AnalysisOutput }) {
  const tabs = [
    { key: 'claudeMd', label: 'CLAUDE.md', icon: <FileText size={11} /> },
    { key: 'settingsJson', label: 'settings.json', icon: <Code size={11} /> },
    { key: 'htmlStarter', label: 'HTML Starter', icon: <Layout size={11} /> },
    { key: 'tailwindStarter', label: 'Tailwind Starter', icon: <Palette size={11} /> },
  ] as const

  return (
    <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
      <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
        Generated Outputs
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tabs.map(tab => {
          const content = analysis[tab.key]
          if (!content) return null
          return (
            <div key={tab.key} className="rounded-xl border overflow-hidden"
              style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
              <div className="flex items-center gap-1.5 px-3 py-2 border-b"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                {tab.icon}
                <span className="text-xs font-semibold">{tab.label}</span>
              </div>
              <pre className="text-xs p-3 overflow-auto max-h-36 leading-relaxed"
                style={{ color: 'var(--muted-light)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {content}
              </pre>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default async function SubmissionsPage() {
  const { submissions, error: fetchError } = await listSubmissions()

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

      {fetchError && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Storage error: {fetchError}
        </div>
      )}

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
          {submissions.map(sub => {
            const isWizard = !!sub.wizard
            const displayName = sub.wizard?.businessName || sub.business || sub.name
            const displayDesc = sub.wizard?.description || sub.cleaned?.description || sub.vision
            const displayStyle = sub.wizard?.style || sub.style
            const displayPages = sub.wizard?.pages || sub.pages
            const audience = sub.wizard?.audience
            const cta = sub.wizard?.cta
            const inspiration = sub.wizard?.inspiration

            return (
              <div key={sub.id} className="rounded-2xl border overflow-hidden"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b"
                  style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="text-base font-bold text-white">{displayName}</h3>
                      {isWizard && (
                        <span className="text-xs px-2 py-0.5 rounded-full border"
                          style={{ borderColor: 'rgba(99,102,241,0.3)', color: 'var(--accent)', background: 'rgba(99,102,241,0.08)' }}>
                          wizard
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
                    <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: 'var(--muted)' }}>
                      {sub.email && (
                        <span className="flex items-center gap-1">
                          <Building2 size={11} /> {sub.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>{sub.nodes.length} card{sub.nodes.length !== 1 ? 's' : ''} planned</span>
                      {displayStyle && (
                        <span className="capitalize">{displayStyle} style</span>
                      )}
                    </div>
                  </div>
                  <SubmissionActions submission={sub} />
                </div>

                {/* Wizard details */}
                {isWizard && (
                  <div className="px-6 py-4 border-b grid grid-cols-1 md:grid-cols-2 gap-3"
                    style={{ borderColor: 'var(--border)' }}>
                    {displayDesc && (
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>Description</p>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-light)' }}>&ldquo;{displayDesc}&rdquo;</p>
                      </div>
                    )}
                    {audience && (
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>Audience</p>
                        <p className="text-sm" style={{ color: 'var(--muted-light)' }}>{audience}</p>
                      </div>
                    )}
                    {cta && (
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>CTA Goal</p>
                        <p className="text-sm" style={{ color: 'var(--muted-light)' }}>{cta}</p>
                      </div>
                    )}
                    {inspiration && (
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>Inspiration</p>
                        <p className="text-sm" style={{ color: 'var(--muted-light)' }}>{inspiration}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Legacy vision */}
                {!isWizard && sub.vision && (
                  <div className="px-6 py-3 border-b text-sm leading-relaxed"
                    style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
                    &ldquo;{sub.vision}&rdquo;
                  </div>
                )}

                {/* Pages */}
                {displayPages && displayPages.length > 0 && (
                  <div className="px-6 py-3 border-b flex flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
                    {displayPages.map((page, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded border"
                        style={{ borderColor: 'rgba(99,102,241,0.25)', color: 'var(--accent)', background: 'rgba(99,102,241,0.06)' }}>
                        {page}
                      </span>
                    ))}
                  </div>
                )}

                {/* Blueprint card summary */}
                {sub.nodes.length > 0 && !isWizard && (
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

                {/* Blueprint card summary for wizard submissions */}
                {sub.nodes.length > 0 && isWizard && (
                  <div className="px-6 py-3 border-b flex flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-xs font-semibold mr-1" style={{ color: 'var(--muted)' }}>Blueprint:</span>
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

                {/* Analysis outputs */}
                {sub.analysis && <AnalysisSection analysis={sub.analysis} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

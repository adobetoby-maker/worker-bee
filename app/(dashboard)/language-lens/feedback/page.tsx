export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { ArrowLeft, MessageSquare } from 'lucide-react'

interface FeedbackRow {
  id: string
  session_id: string | null
  scenario_id: string | null
  language: string | null
  mission_area: string | null
  rating: number | null
  comment: string | null
  feedback_type: string
  created_at: string
}

const SCENARIO_LABELS: Record<string, string> = {
  'door-approach': '🚪 Door Approach',
  'curious-student': '🎓 Curious Student',
  'busy-parent': '👨‍👧 Busy Parent',
  'catholic-neighbor': '⛪ Catholic Neighbor',
  'hard-skeptic': '🤔 Hard Skeptic',
  'ex-member': '📖 Former Member',
  'receptive-investigator': '✨ Ready to Commit',
}

async function getAllFeedback(): Promise<FeedbackRow[]> {
  try {
    const { data } = await supabaseAdmin
      .from('lt_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    return (data ?? []) as FeedbackRow[]
  } catch {
    return []
  }
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span style={{ color: 'var(--muted)' }}>–</span>
  const color = rating >= 4 ? '#10b981' : rating === 3 ? '#fbbf24' : '#f87171'
  return (
    <span style={{ color, fontSize: 14, letterSpacing: '1px' }}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

function relTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function avgRating(rows: FeedbackRow[]) {
  const rated = rows.filter((r) => r.rating !== null)
  if (!rated.length) return null
  return (rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length).toFixed(1)
}

export default async function FeedbackPage() {
  const feedback = await getAllFeedback()
  const avg = avgRating(feedback)
  const withComments = feedback.filter((f) => f.comment?.trim())
  const distribution = [5, 4, 3, 2, 1].map((n) => ({
    stars: n,
    count: feedback.filter((f) => f.rating === n).length,
  }))
  const maxDist = Math.max(...distribution.map((d) => d.count), 1)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-24 space-y-6">

      <div className="flex items-center gap-3">
        <Link href="/language-lens"
          className="flex items-center gap-1.5 text-xs transition-colors hover:text-white"
          style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={12} />
          Language Lens
        </Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <div className="flex items-center gap-2">
          <MessageSquare size={14} style={{ color: '#10b981' }} />
          <h1 className="text-base font-bold">All Feedback</h1>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-2xl font-bold" style={{ color: '#fbbf24' }}>
            {avg ? `${avg} ★` : '—'}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted-light)' }}>Average rating</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold" style={{ color: '#10b981' }}>{feedback.length}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted-light)' }}>Total entries</div>
        </div>
        <div className="card p-4">
          <div className="text-2xl font-bold" style={{ color: '#818cf8' }}>{withComments.length}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted-light)' }}>With written comments</div>
        </div>
      </div>

      {/* Rating distribution */}
      {feedback.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-sm mb-3">Rating Distribution</h2>
          <div className="space-y-2">
            {distribution.map(({ stars, count }) => (
              <div key={stars} className="flex items-center gap-3">
                <span style={{ color: '#fbbf24', fontSize: 13, width: 60 }}>
                  {'★'.repeat(stars)} {stars}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(count / maxDist) * 100}%`,
                      background: stars >= 4 ? '#10b981' : stars === 3 ? '#fbbf24' : '#f87171',
                    }}
                  />
                </div>
                <span style={{ color: 'var(--muted)', fontSize: 12, width: 28, textAlign: 'right' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm">All Entries</h2>
        </div>
        {feedback.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>
            No feedback yet. Once missionaries submit feedback in Field Prep Mode, it will appear here.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {feedback.map((f) => (
              <div key={f.id} className="p-4 flex items-start gap-4">
                <div className="pt-0.5 shrink-0">
                  <Stars rating={f.rating} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  {f.comment ? (
                    <p style={{ fontSize: 13 }}>{f.comment}</p>
                  ) : (
                    <p className="italic" style={{ fontSize: 12, color: 'var(--muted)' }}>No comment</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5" style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {f.scenario_id && (
                      <span>{SCENARIO_LABELS[f.scenario_id] ?? f.scenario_id}</span>
                    )}
                    {f.language && <span>· {f.language}</span>}
                    {f.mission_area && <span>· {f.mission_area}</span>}
                    <span
                      className="px-1.5 py-0.5 rounded font-mono"
                      style={{ background: 'var(--surface2)', fontSize: 10 }}>
                      {f.feedback_type}
                    </span>
                    <span>{relTime(f.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

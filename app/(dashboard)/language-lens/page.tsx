export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { BarChart3, MessageSquare, AlertTriangle, Users, Shield, Globe, TrendingUp } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface ScenarioRow { scenario_id: string; count: number; avg_exchanges: number; feedback_rate: number }
interface LanguageRow { language: string; count: number }
interface MissionRow  { mission_area: string | null; count: number }
interface FeedbackRow {
  id: string
  scenario_id: string | null
  language: string | null
  rating: number | null
  comment: string | null
  feedback_type: string
  created_at: string
}

// ── Data helpers ───────────────────────────────────────────────────────────

async function getStats() {
  try {
    const [sessions, feedback, events, errors] = await Promise.all([
      supabaseAdmin.from('lt_field_prep_events').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('lt_feedback').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('lt_app_events').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('lt_error_logs').select('id', { count: 'exact', head: true }),
    ])
    return {
      sessions: sessions.count ?? 0,
      feedback: feedback.count ?? 0,
      events: events.count ?? 0,
      errors: errors.count ?? 0,
    }
  } catch {
    return { sessions: 0, feedback: 0, events: 0, errors: 0 }
  }
}

async function getScenarioBreakdown(): Promise<ScenarioRow[]> {
  try {
    const { data } = await supabaseAdmin
      .from('lt_field_prep_events')
      .select('scenario_id, exchanges_count, feedback_requested_count')
    if (!data) return []
    type R = { scenario_id: string | null; exchanges_count: number | null; feedback_requested_count: number | null }
    const map = new Map<string, { count: number; totalEx: number; totalFb: number }>()
    for (const row of (data as R[])) {
      const id = row.scenario_id ?? 'unknown'
      const cur = map.get(id) ?? { count: 0, totalEx: 0, totalFb: 0 }
      cur.count++
      cur.totalEx += row.exchanges_count ?? 0
      cur.totalFb += row.feedback_requested_count ?? 0
      map.set(id, cur)
    }
    return Array.from(map.entries())
      .map(([scenario_id, v]) => ({
        scenario_id,
        count: v.count,
        avg_exchanges: v.count ? Math.round(v.totalEx / v.count * 10) / 10 : 0,
        feedback_rate: v.count ? Math.round((v.totalFb / v.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
  } catch {
    return []
  }
}

async function getLanguageBreakdown(): Promise<LanguageRow[]> {
  try {
    const { data } = await supabaseAdmin.from('lt_field_prep_events').select('language')
    if (!data) return []
    const map = new Map<string, number>()
    for (const row of (data as { language: string | null }[])) {
      const lang = row.language ?? 'Unknown'
      map.set(lang, (map.get(lang) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count)
  } catch {
    return []
  }
}

async function getMissionAreaBreakdown(): Promise<MissionRow[]> {
  try {
    const { data } = await supabaseAdmin.from('lt_field_prep_events').select('mission_area')
    if (!data) return []
    const map = new Map<string, number>()
    for (const row of (data as { mission_area: string | null }[])) {
      const area = row.mission_area ?? 'Not set'
      map.set(area, (map.get(area) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([mission_area, count]) => ({ mission_area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  } catch {
    return []
  }
}

async function getRecentFeedback(): Promise<FeedbackRow[]> {
  try {
    const { data } = await supabaseAdmin
      .from('lt_feedback')
      .select('id, scenario_id, language, rating, comment, feedback_type, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    return (data ?? []) as FeedbackRow[]
  } catch {
    return []
  }
}

async function getRecentErrors() {
  try {
    const { data } = await supabaseAdmin
      .from('lt_error_logs')
      .select('id, error_type, message, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    return data ?? []
  } catch {
    return []
  }
}

// ── UI helpers ──────────────────────────────────────────────────────────────

const SCENARIO_LABELS: Record<string, string> = {
  'door-approach': '🚪 Door Approach',
  'curious-student': '🎓 Curious Student',
  'busy-parent': '👨‍👧 Busy Parent',
  'catholic-neighbor': '⛪ Catholic Neighbor',
  'hard-skeptic': '🤔 Hard Skeptic',
  'ex-member': '📖 Former Member',
  'receptive-investigator': '✨ Ready to Commit',
}

function StatCard({ icon: Icon, label, value, color = '#6366f1' }: {
  icon: React.ElementType; label: string; value: number; color?: string
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}22` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <div className="text-xl font-bold" style={{ color }}>{value.toLocaleString()}</div>
        <div className="text-xs" style={{ color: 'var(--muted-light)' }}>{label}</div>
      </div>
    </div>
  )
}

function Bar({ pct, color = '#6366f1' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)', minWidth: 80 }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  )
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span style={{ color: 'var(--muted)' }}>–</span>
  return (
    <span style={{ color: '#fbbf24', letterSpacing: '1px' }}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

function relTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function LanguageLensPage() {
  const [stats, scenarios, languages, missions, recentFeedback, recentErrors] =
    await Promise.all([
      getStats(),
      getScenarioBreakdown(),
      getLanguageBreakdown(),
      getMissionAreaBreakdown(),
      getRecentFeedback(),
      getRecentErrors(),
    ])

  const maxScenarioCount = scenarios[0]?.count ?? 1
  const maxLangCount = languages[0]?.count ?? 1

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-24 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.18)' }}>
              <Shield size={13} style={{ color: '#d4af37' }} />
            </div>
            <h1 className="text-lg font-bold">Language Lens</h1>
          </div>
          <p style={{ color: 'var(--muted-light)', fontSize: 13 }}>
            Field Prep analytics · Feedback · Errors
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/language-lens/feedback"
            className="text-xs px-3 py-2 rounded-lg border transition-colors hover:border-indigo-400/50"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
            All Feedback →
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Shield} label="Field Prep Sessions" value={stats.sessions} color="#d4af37" />
        <StatCard icon={MessageSquare} label="Feedback Entries" value={stats.feedback} color="#10b981" />
        <StatCard icon={Users} label="App Events" value={stats.events} color="#6366f1" />
        <StatCard icon={AlertTriangle} label="Error Log Entries" value={stats.errors} color="#f87171" />
      </div>

      {stats.sessions === 0 && (
        <div className="card p-6 text-center" style={{ borderColor: 'rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.04)' }}>
          <p className="font-bold mb-1" style={{ color: '#d4af37' }}>No data yet</p>
          <p style={{ color: 'var(--muted-light)', fontSize: 13 }}>
            Run the SQL migration in Supabase first:
            <code className="ml-2 px-2 py-0.5 rounded text-xs" style={{ background: 'var(--surface2)', color: '#d4af37' }}>
              manage-worker-bee/supabase/lt-analytics.sql
            </code>
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Scenario usage */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={15} style={{ color: '#d4af37' }} />
            <h2 className="font-semibold text-sm">Scenario Usage</h2>
          </div>
          {scenarios.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 12 }}>No sessions yet.</p>
          ) : (
            <div className="space-y-3">
              {scenarios.map((s) => (
                <div key={s.scenario_id}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: 12, color: 'var(--text)' }}>
                      {SCENARIO_LABELS[s.scenario_id] ?? s.scenario_id}
                    </span>
                    <span className="tabular-nums text-xs font-bold" style={{ color: '#d4af37' }}>
                      {s.count}
                    </span>
                  </div>
                  <Bar pct={(s.count / maxScenarioCount) * 100} color="#d4af37" />
                  <div className="flex gap-3 mt-1" style={{ fontSize: 10, color: 'var(--muted)' }}>
                    <span>avg {s.avg_exchanges} exchanges</span>
                    <span>feedback {s.feedback_rate}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Language + Mission distribution */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={14} style={{ color: '#6366f1' }} />
              <h2 className="font-semibold text-sm">Languages</h2>
            </div>
            {languages.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 12 }}>No data yet.</p>
            ) : (
              <div className="space-y-2">
                {languages.map((l) => (
                  <div key={l.language}>
                    <div className="flex justify-between mb-0.5">
                      <span style={{ fontSize: 12 }}>{l.language}</span>
                      <span className="text-xs font-bold" style={{ color: '#818cf8' }}>{l.count}</span>
                    </div>
                    <Bar pct={(l.count / maxLangCount) * 100} color="#6366f1" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} style={{ color: '#10b981' }} />
              <h2 className="font-semibold text-sm">Mission Areas</h2>
            </div>
            {missions.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 12 }}>No data yet.</p>
            ) : (
              <div className="space-y-1.5">
                {missions.map((m) => (
                  <div key={m.mission_area ?? 'null'} className="flex justify-between items-center">
                    <span style={{ fontSize: 12, color: 'var(--muted-light)' }}>{m.mission_area ?? '(not set)'}</span>
                    <span className="text-xs font-bold" style={{ color: '#10b981' }}>{m.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Recent feedback */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} style={{ color: '#10b981' }} />
            <h2 className="font-semibold text-sm">Recent Feedback</h2>
          </div>
          <Link href="/language-lens/feedback"
            style={{ fontSize: 11, color: 'var(--muted)' }}
            className="hover:text-white transition-colors">
            View all →
          </Link>
        </div>
        {recentFeedback.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 12 }}>No feedback yet.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {recentFeedback.map((f) => (
              <div key={f.id} className="py-3 flex items-start gap-3">
                <Stars rating={f.rating} />
                <div className="flex-1 min-w-0">
                  {f.comment ? (
                    <p style={{ fontSize: 13, color: 'var(--text)' }} className="truncate">{f.comment}</p>
                  ) : (
                    <p style={{ fontSize: 12, color: 'var(--muted)' }} className="italic">No comment</p>
                  )}
                  <div className="flex gap-2 mt-0.5 flex-wrap" style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {f.scenario_id && <span>{SCENARIO_LABELS[f.scenario_id] ?? f.scenario_id}</span>}
                    {f.language && <span>· {f.language}</span>}
                    <span>· {relTime(f.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error log */}
      {recentErrors.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} style={{ color: '#f87171' }} />
            <h2 className="font-semibold text-sm">Recent Errors</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {recentErrors.map((e: {id: string; error_type: string; message: string; created_at: string}) => (
              <div key={e.id} className="py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded font-mono"
                    style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
                    {e.error_type}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{relTime(e.created_at)}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted-light)', marginTop: 2 }}>{e.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

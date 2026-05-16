export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { Search, Calendar, AlertTriangle, ExternalLink } from 'lucide-react'
import type { AuditResult, BlueprintResult, AuditSavePayload } from '@/lib/types/audit'

// ── Types ──────────────────────────────────────────────────────────────────

interface SavedAudit extends AuditSavePayload {
  savedAt?: string
  id?: string
}

// ── Data fetching ──────────────────────────────────────────────────────────

async function listAudits(): Promise<{ audits: SavedAudit[]; error?: string }> {
  const { data: objects, error } = await supabaseAdmin.storage
    .from('build-logs')
    .list('audits', {
      limit: 50,
      sortBy: { column: 'created_at', order: 'desc' },
    })

  if (error) {
    console.error('[audits] list error:', error)
    return { audits: [], error: error.message }
  }

  if (!objects || objects.length === 0) return { audits: [] }

  const audits = await Promise.all(
    objects.map(async file => {
      const { data: blob, error: dlErr } = await supabaseAdmin.storage
        .from('build-logs')
        .download(`audits/${file.name}`)
      if (dlErr) {
        console.error('[audits] download error:', file.name, dlErr)
        return null
      }
      if (!blob) return null
      try {
        const parsed = JSON.parse(await blob.text()) as SavedAudit
        // Attach the filename as ID if not present
        if (!parsed.id) {
          parsed.id = file.name.replace('.json', '')
        }
        if (!parsed.savedAt && file.created_at) {
          parsed.savedAt = file.created_at
        }
        return parsed
      } catch {
        return null
      }
    })
  )

  return { audits: audits.filter(Boolean) as SavedAudit[] }
}

// ── Score badge ────────────────────────────────────────────────────────────

function ScoreBadge({ score, label }: { score: number; label: string }) {
  let bg: string, color: string
  if (score >= 80) { bg = 'rgba(16,185,129,0.12)'; color = '#10b981' }
  else if (score >= 50) { bg = 'rgba(245,158,11,0.12)'; color = '#fbbf24' }
  else { bg = 'rgba(239,68,68,0.12)'; color = '#f87171' }

  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded"
      style={{ background: bg, color }}
    >
      {label} {Math.round(score)}
    </span>
  )
}

// ── Overall score ──────────────────────────────────────────────────────────

function OverallBadge({ score }: { score: number }) {
  const pct = Math.round(score)
  let bg: string, color: string
  if (pct >= 80) { bg = 'rgba(16,185,129,0.12)'; color = '#10b981' }
  else if (pct >= 50) { bg = 'rgba(245,158,11,0.12)'; color = '#fbbf24' }
  else { bg = 'rgba(239,68,68,0.12)'; color = '#f87171' }

  return (
    <div
      className="text-3xl font-bold tabular-nums"
      style={{ color }}
    >
      {pct}
      <span className="text-sm font-normal ml-1" style={{ color: 'rgba(255,255,255,0.3)' }}>/ 100</span>
    </div>
  )
}

// ── Audit card ─────────────────────────────────────────────────────────────

function AuditCard({ saved }: { saved: SavedAudit }) {
  const audit: AuditResult = saved.audit
  const blueprint: BlueprintResult | undefined = saved.blueprint

  const criticalCount = audit.checks.filter(c => c.status === 'critical' || c.status === 'fail').length
  const warnCount = audit.checks.filter(c => c.status === 'warn').length

  const modeBadge = blueprint
    ? blueprint.mode === 'rebuild'
      ? { bg: 'rgba(99,102,241,0.12)', color: 'var(--accent)', label: 'Rebuild' }
      : { bg: 'rgba(16,185,129,0.08)', color: '#10b981', label: 'Patch' }
    : null

  const dateStr = saved.savedAt
    ? new Date(saved.savedAt).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—'

  const displayUrl = audit.url.replace(/^https?:\/\//, '').replace(/\/$/, '')

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h3 className="text-base font-bold text-white truncate">{displayUrl}</h3>
            {modeBadge && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0"
                style={{ background: modeBadge.bg, color: modeBadge.color }}
              >
                {modeBadge.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: 'var(--muted)' }}>
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {dateStr}
            </span>
            {saved.contactName && <span>{saved.contactName}</span>}
            {saved.contactEmail && <span>{saved.contactEmail}</span>}
          </div>
        </div>

        {/* Overall score */}
        <div className="text-right shrink-0">
          <OverallBadge score={audit.scores.overall} />
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>overall</div>
        </div>
      </div>

      {/* Scores row */}
      <div className="flex items-center gap-3 px-6 py-3 border-b flex-wrap" style={{ borderColor: 'var(--border)' }}>
        <ScoreBadge score={audit.scores.seo} label="SEO" />
        <ScoreBadge score={audit.scores.security} label="Sec" />
        <ScoreBadge score={audit.scores.perf} label="Perf" />

        <div className="ml-auto flex items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1" style={{ color: '#f87171' }}>
              <AlertTriangle size={11} />
              {criticalCount} critical
            </span>
          )}
          {warnCount > 0 && (
            <span className="flex items-center gap-1" style={{ color: '#fbbf24' }}>
              {warnCount} warn
            </span>
          )}
          <span>{audit.checks.length} checks</span>
        </div>
      </div>

      {/* Blueprint summary if present */}
      {blueprint && blueprint.summary && (
        <div className="px-6 py-3 border-b text-sm" style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
          <span className="text-xs font-semibold mr-2" style={{ color: 'var(--muted)' }}>Plan:</span>
          {blueprint.summary.slice(0, 180)}{blueprint.summary.length > 180 ? '…' : ''}
        </div>
      )}

      {/* Client notes */}
      {saved.clientNotes && (
        <div className="px-6 py-3 text-sm italic" style={{ color: 'var(--muted)' }}>
          &ldquo;{saved.clientNotes}&rdquo;
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          {blueprint && (
            <span>{blueprint.nodes.length} fix{blueprint.nodes.length !== 1 ? 'es' : ''} planned</span>
          )}
        </div>
        <a
          href={audit.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
          style={{ color: 'var(--accent)' }}
        >
          View details <ExternalLink size={11} />
        </a>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function AuditsPage() {
  const { audits, error: fetchError } = await listAudits()

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Evaluations</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {audits.length === 0
              ? 'No evaluations yet'
              : `${audits.length} site audit${audits.length !== 1 ? 's' : ''} submitted`}
          </p>
        </div>
        <Link
          href="/evaluate"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Search size={14} />
          New evaluation
        </Link>
      </div>

      {fetchError && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Storage error: {fetchError}
        </div>
      )}

      {audits.length === 0 ? (
        <div
          className="rounded-2xl border flex flex-col items-center justify-center py-20 text-center"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <Search size={32} style={{ color: 'var(--muted)', marginBottom: 12 }} />
          <p className="text-sm font-medium text-white mb-1">No evaluations yet</p>
          <p className="text-xs mb-6" style={{ color: 'var(--muted)' }}>
            Share the evaluate link with a client to get started.
          </p>
          <Link
            href="/evaluate"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.25)' }}
          >
            Evaluate a site →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {audits.map((saved, i) => (
            <AuditCard key={saved.id ?? i} saved={saved} />
          ))}
        </div>
      )}
    </div>
  )
}

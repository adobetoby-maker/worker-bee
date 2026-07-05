// Built by ATLAS — 2026-07-05
// Shared helpers for the ATLAS operator console (Today + Portfolio pages).

export function relTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function minutesSince(iso: string | null | undefined): number {
  if (!iso) return Infinity
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return Infinity
  return (Date.now() - then) / 60000
}

// NEED type → chip color (RELATIONSHIP is teal — violet is banned)
export const NEED_TYPE_COLORS: Record<string, string> = {
  REPAIR: '#f87171',
  RISK: '#fbbf24',
  ACQUISITION: '#34d399',
  GROWTH: '#60a5fa',
  HYGIENE: '#64748b',
  RELATIONSHIP: '#2dd4bf',
}

export function needTypeColor(type: string | null | undefined): string {
  return NEED_TYPE_COLORS[(type ?? '').toUpperCase()] ?? '#64748b'
}

// Beauty / mission score → threshold color: ≥7.5 pass green, 6.5–7.4 amber, <6.5 red.
export function beautyColor(score: number): string {
  if (score >= 7.5) return '#34d399'
  if (score >= 6.5) return '#fbbf24'
  return '#f87171'
}

// QA board state → { color, solid } (none = red outline, down = red solid)
export function qaStateStyle(state: string | null | undefined): { color: string; solid: boolean } {
  switch ((state ?? '').toLowerCase()) {
    case 'pass':    return { color: '#34d399', solid: true }
    case 'stale':   return { color: '#fbbf24', solid: true }
    case 'partial': return { color: '#fb923c', solid: true }
    case 'down':    return { color: '#ef4444', solid: true }
    case 'none':    return { color: '#ef4444', solid: false }
    default:        return { color: '#64748b', solid: false }
  }
}

export const KIND_COLORS: Record<string, string> = {
  'client-site': '#818cf8',
  'demo': '#f59e0b',
  'saas': '#34d399',
  'white-label-instance': '#60a5fa',
  'content': '#2dd4bf',
  'internal': '#64748b',
  'pro-bono': '#f472b6',
}

export const LIFECYCLE_COLORS: Record<string, string> = {
  'active': '#34d399',
  'prospect-demo': '#f59e0b',
  'maintenance': '#60a5fa',
  'retired': '#64748b',
  'local-only': '#475569',
}

export type Property = {
  slug: string
  name: string | null
  kind: string | null
  lifecycle: string | null
  client: string | null
  repo_path: string | null
  github_url: string | null
  host: string | null
  live_url: string | null
  custom_domain: string | null
  qa_slug: string | null
  mrr_cents: number | null
  stack: string | null
  built_by: string | null
  notes: string | null
  updated_at: string | null
}

// atlas_commands row — the command path DOWN (console → Bridge → ATLAS queues)
export type CommandRow = {
  id: string
  type: string | null
  payload: Record<string, unknown> | null
  status: string | null
  requested_by: string | null
  created_at: string | null
  dispatched_at: string | null
  completed_at: string | null
  result: Record<string, unknown> | null
}

// Command status → chip color. pending amber, dispatched blue,
// completed green, rejected red; tap-flow extras map to the same family.
export const COMMAND_STATUS_COLORS: Record<string, string> = {
  pending: '#fbbf24',
  pending_operator: '#fbbf24',
  dispatched: '#60a5fa',
  approved_by_operator: '#2dd4bf',
  completed: '#34d399',
  done: '#34d399',
  rejected: '#f87171',
  failed: '#f87171',
}

export function commandStatusColor(status: string | null | undefined): string {
  return COMMAND_STATUS_COLORS[(status ?? '').toLowerCase()] ?? '#64748b'
}

export function commandSummary(c: CommandRow): string {
  const p = c.payload ?? {}
  const s = p.summary ?? p.text ?? p.title ?? p.prospect ?? p.slug
  if (typeof s === 'string' && s.trim()) return s
  return JSON.stringify(p).slice(0, 80)
}

export type QaRow = {
  slug: string
  url: string | null
  state: string | null
  latest: Record<string, unknown> | null
  runs: unknown[] | null
  synced_at: string | null
}

// atlas_qa.latest is jsonb: { board:{emoji,state}, schema, qa_status:{ latest:{beauty,ts,result,...}, runs:[...] } | null }
// Sometimes latest itself may carry beauty/ts (per full-monte schema) — read both defensively.
export function qaLatestInfo(latest: Record<string, unknown> | null | undefined): { beauty: number | null; ts: string | null; result: string | null } {
  if (!latest || typeof latest !== 'object') return { beauty: null, ts: null, result: null }
  const l = latest as { beauty?: unknown; ts?: unknown; result?: unknown; qa_status?: { latest?: { beauty?: unknown; ts?: unknown; result?: unknown } } | null }
  const inner = l.qa_status?.latest ?? null
  const beauty = typeof l.beauty === 'number' ? l.beauty : (typeof inner?.beauty === 'number' ? inner.beauty : null)
  const ts = typeof l.ts === 'string' ? l.ts : (typeof inner?.ts === 'string' ? inner.ts : null)
  const result = typeof l.result === 'string' ? l.result : (typeof inner?.result === 'string' ? inner.result : null)
  return { beauty, ts, result }
}

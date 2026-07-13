// Built by ATLAS — 2026-07-12
import { supabaseAdmin } from '@/lib/supabase'

const BUCKET = 'blueprints'
const PREFIX = 'missions'
const MAX_HISTORY = 50
const MAX_LIST_DOWNLOADS = 25

export interface MissionBlockState {
  id: string
  status: string
}

export interface MissionState {
  slug: string
  gates: { map: string; prd: string; blueprint: string }
  blocks: MissionBlockState[]
  final_say: string
  ts: string
}

export interface MissionHistoryEntry {
  state: MissionState
  receivedAt: string
}

export interface MissionRecord {
  slug: string
  latest: MissionState
  receivedAt: string // server clock, ISO-8601 UTC
  history: MissionHistoryEntry[] // newest LAST, capped at 50
}

// Storage-path safety: slugs are validated against this BEFORE they ever
// touch a Supabase Storage path (`missions/${slug}.json`). No `..`, no
// leading dot, no uppercase, no path separators.
export const MISSION_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function coerceGateValue(v: unknown): string {
  return typeof v === 'string' ? v : 'pending'
}

export function parseMissionState(body: unknown): MissionState | null {
  if (!isPlainObject(body)) return null

  const slug = body.slug
  if (typeof slug !== 'string' || !MISSION_SLUG_RE.test(slug)) return null

  const gatesRaw = body.gates
  if (!isPlainObject(gatesRaw)) return null
  const gates = {
    map: coerceGateValue(gatesRaw.map),
    prd: coerceGateValue(gatesRaw.prd),
    blueprint: coerceGateValue(gatesRaw.blueprint),
  }

  const blocksRaw = body.blocks
  if (!Array.isArray(blocksRaw)) return null
  const blocks: MissionBlockState[] = []
  for (const entry of blocksRaw) {
    if (!isPlainObject(entry)) return null
    if (typeof entry.id !== 'string' || typeof entry.status !== 'string') return null
    // Unknown status strings are VALID — pass through untouched. The board
    // renders them as a grey pill; the producer greps free text.
    blocks.push({ id: entry.id, status: entry.status })
  }

  const final_say = typeof body.final_say === 'string' ? body.final_say : 'none'
  const ts = typeof body.ts === 'string' ? body.ts : ''

  return { slug, gates, blocks, final_say, ts }
}

export async function getMission(slug: string): Promise<MissionRecord | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(`${PREFIX}/${slug}.json`)

  if (error || !data) return null

  try {
    const text = await data.text()
    return JSON.parse(text) as MissionRecord
  } catch {
    return null
  }
}

export async function saveMissionState(state: MissionState): Promise<MissionRecord> {
  const existing = await getMission(state.slug)
  const receivedAt = new Date().toISOString()

  const history = [...(existing?.history ?? []), { state, receivedAt }].slice(-MAX_HISTORY)

  const record: MissionRecord = {
    slug: state.slug,
    latest: state,
    receivedAt,
    history,
  }

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(`${PREFIX}/${state.slug}.json`, JSON.stringify(record), {
      contentType: 'application/json',
      upsert: true,
    })

  if (error) throw new Error(`Mission save failed: ${error.message}`)

  return record
}

export async function listMissions(): Promise<
  Array<{ slug: string; latest: MissionState; receivedAt: string }>
> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .list(PREFIX, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })

  if (error || !data || data.length === 0) return []

  const files = data.slice(0, MAX_LIST_DOWNLOADS)
  const records = await Promise.all(
    files.map(async (file) => {
      const { data: fileData } = await supabaseAdmin.storage
        .from(BUCKET)
        .download(`${PREFIX}/${file.name}`)
      if (!fileData) return null
      try {
        const text = await fileData.text()
        const parsed = JSON.parse(text) as Partial<MissionRecord>
        if (!parsed.latest || typeof parsed.latest.slug !== 'string') return null
        return {
          slug: file.name.replace(/\.json$/, ''),
          latest: parsed.latest,
          receivedAt: parsed.receivedAt ?? '',
        }
      } catch {
        return null
      }
    })
  )

  return records
    .filter((r): r is { slug: string; latest: MissionState; receivedAt: string } => Boolean(r))
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
}

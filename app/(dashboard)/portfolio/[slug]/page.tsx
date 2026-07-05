// Built by ATLAS — 2026-07-05
// Portfolio detail — all registry fields + QA run history + blueprint link.
export const dynamic = 'force-dynamic'

/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { KIND_COLORS, LIFECYCLE_COLORS, qaStateStyle, qaLatestInfo, relTime, type Property, type QaRow } from '@/lib/atlas-console'
import { ArrowLeft, ExternalLink, GitBranch, Map, ShieldCheck } from 'lucide-react'
import RunQaButton from '../../RunQaButton'

const db = supabaseAdmin as any

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
      {label}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>{label}</div>
      <div className="text-xs text-white break-words">{children}</div>
    </div>
  )
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: prop } = await db.from('properties').select('*').eq('slug', slug).maybeSingle()
  if (!prop) notFound()
  const p = prop as Property

  const [qaRes, siteRes] = await Promise.all([
    p.qa_slug
      ? db.from('atlas_qa').select('*').eq('slug', p.qa_slug).maybeSingle()
      : Promise.resolve({ data: null }),
    // Loose blueprint match: sites row by name or url
    db.from('sites').select('id, name, url').or(
      [
        p.name ? `name.ilike.%${p.name.replace(/[%,]/g, '')}%` : null,
        p.live_url ? `url.ilike.%${p.live_url.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/[%,]/g, '')}%` : null,
      ].filter(Boolean).join(',') || 'name.eq.__none__'
    ).limit(1),
  ])

  const qa = (qaRes?.data ?? null) as QaRow | null
  const site = siteRes?.data?.[0] ?? null
  const qs = qa ? qaStateStyle(qa.state) : null
  const runs: any[] = Array.isArray(qa?.runs) ? (qa!.runs as any[]) : []
  // full-monte also nests runs under latest.qa_status.runs — merge defensively
  const nestedRuns: any[] = Array.isArray((qa?.latest as any)?.qa_status?.runs) ? (qa!.latest as any).qa_status.runs : []
  const allRuns = (runs.length > 0 ? runs : nestedRuns).slice().reverse()

  return (
    <div className="max-w-4xl animate-fade-in pb-16">
      <Link href="/portfolio"
        className="inline-flex items-center gap-1.5 text-xs mb-4 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
        style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={12} /> Portfolio
      </Link>

      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-white">{p.name ?? p.slug}</h1>
        <Badge label={p.kind ?? '—'} color={KIND_COLORS[p.kind ?? ''] ?? '#64748b'} />
        <Badge label={p.lifecycle ?? '—'} color={LIFECYCLE_COLORS[p.lifecycle ?? ''] ?? '#64748b'} />
      </div>
      <p className="text-sm mb-6 font-mono" style={{ color: 'var(--muted)' }}>{p.slug}</p>

      {/* Registry fields */}
      <div className="card rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 mb-6">
        <Field label="Client">{p.client ?? <span style={{ color: 'var(--muted)' }}>—</span>}</Field>
        <Field label="Host">{p.host ?? <span style={{ color: 'var(--muted)' }}>—</span>}</Field>
        <Field label="Stack">{p.stack ?? <span style={{ color: 'var(--muted)' }}>—</span>}</Field>
        <Field label="Live URL">
          {p.live_url ? (
            <a href={p.live_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-indigo-300 transition-colors" style={{ color: '#818cf8' }}>
              <ExternalLink size={11} /> {p.live_url.replace(/^https?:\/\//, '')}
            </a>
          ) : <span style={{ color: 'var(--muted)' }}>—</span>}
        </Field>
        <Field label="Custom domain">{p.custom_domain ?? <span style={{ color: 'var(--muted)' }}>—</span>}</Field>
        <Field label="MRR">
          {(p.mrr_cents ?? 0) > 0
            ? <span style={{ color: '#34d399' }}>${((p.mrr_cents ?? 0) / 100).toLocaleString()}/mo</span>
            : <span style={{ color: 'var(--muted)' }}>—</span>}
        </Field>
        <Field label="Repo path"><span className="font-mono text-[11px]">{p.repo_path ?? '—'}</span></Field>
        <Field label="GitHub">
          {p.github_url ? (
            <a href={p.github_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-indigo-300 transition-colors" style={{ color: '#818cf8' }}>
              <GitBranch size={11} /> {p.github_url.replace(/^https?:\/\/github\.com\//, '')}
            </a>
          ) : <span style={{ color: 'var(--muted)' }}>—</span>}
        </Field>
        <Field label="Built by">{p.built_by ?? <span style={{ color: 'var(--muted)' }}>—</span>}</Field>
        <Field label="Updated">{relTime(p.updated_at)}</Field>
        {p.notes && <div className="sm:col-span-2"><Field label="Notes">{p.notes}</Field></div>}
      </div>

      {/* Blueprint link */}
      <div className="flex items-center gap-2 mb-3">
        <Map size={13} style={{ color: 'var(--muted)' }} />
        <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Blueprint</h2>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>
      {site ? (
        <Link href={`/sites/${site.id}/blueprint`}
          className="no-underline card card-glow rounded-xl px-4 py-3 flex items-center gap-3 mb-6 transition-all hover:border-indigo-500/40">
          <Map size={15} style={{ color: '#818cf8' }} />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-white truncate">{site.name}</div>
            <div className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>Open blueprint canvas →</div>
          </div>
        </Link>
      ) : (
        <div className="card rounded-xl px-4 py-3 text-xs mb-6" style={{ color: 'var(--muted)' }}>
          No blueprint linked — no matching sites row found.
        </div>
      )}

      {/* QA history */}
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={13} style={{ color: 'var(--muted)' }} />
        <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>QA runs</h2>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <RunQaButton slug={p.qa_slug ?? p.slug} />
      </div>
      {qa && qs ? (
        <div className="card rounded-xl p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-2.5 h-2.5 rounded-full"
              style={qs.solid ? { background: qs.color } : { background: 'transparent', border: `1.5px solid ${qs.color}` }} />
            <span className="text-xs font-bold text-white uppercase">{qa.state}</span>
            {(() => {
              const info = qaLatestInfo(qa.latest as any)
              return (
                <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                  {typeof info.beauty === 'number' ? `beauty ${info.beauty.toFixed(1)} · ` : ''}
                  synced {relTime(qa.synced_at)}
                </span>
              )
            })()}
            {qa.url && (
              <a href={`${qa.url.replace(/\/$/, '')}/qa-status.json`} target="_blank" rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-[11px] hover:text-indigo-300 transition-colors"
                style={{ color: '#818cf8' }}>
                <ExternalLink size={10} /> qa-status.json
              </a>
            )}
          </div>
          {allRuns.length > 0 ? (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {allRuns.map((r: any, i: number) => (
                <div key={i} className="flex flex-wrap items-center gap-3 py-2 text-[11px]" style={{ borderColor: 'var(--border)' }}>
                  <span className="font-mono" style={{ color: 'var(--muted-light)' }}>{r?.date ?? r?.ts ?? '—'}</span>
                  <span style={{ color: (r?.result ?? '') === 'pass' ? '#34d399' : '#fbbf24' }}>{r?.result ?? '—'}</span>
                  {typeof r?.beauty === 'number' && <span style={{ color: 'var(--muted-light)' }}>beauty {r.beauty.toFixed(1)}</span>}
                  {typeof r?.iteration === 'number' && <span style={{ color: 'var(--muted)' }}>iter {r.iteration}</span>}
                  {r?.agent && <span style={{ color: 'var(--muted)' }}>{r.agent}</span>}
                  {typeof r?.pages_tested === 'number' && <span style={{ color: 'var(--muted)' }}>{r.pages_tested} pages</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px]" style={{ color: 'var(--muted)' }}>No individual runs recorded yet.</div>
          )}
        </div>
      ) : (
        <div className="card rounded-xl px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>
          {p.qa_slug ? `No QA data synced for slug "${p.qa_slug}" yet.` : 'Not on the QA board — no qa_slug assigned.'}
        </div>
      )}
    </div>
  )
}

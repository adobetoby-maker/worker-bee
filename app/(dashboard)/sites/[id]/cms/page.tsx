export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Newspaper, Calendar, Users, FileText, LogIn, PlusCircle } from 'lucide-react'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { supabaseAdmin as _db } from '@/lib/supabase'
const db = _db as any

type PressRelease = { _id: string; title: string; publishedAt: string | null; source: string | null; excerpt: string | null }
type SanityEvent  = { _id: string; title: string; eventDate: string | null; location: string | null; eventType: string | null }
type Executive    = { _id: string; name: string; title: string | null; linkedIn: string | null }
type Counts       = { pressReleases: number; events: number; executives: number; governanceDocs: number }

function ContentRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className={`text-xs text-right max-w-xs truncate ${muted ? '' : 'font-medium'}`} style={{ color: muted ? 'var(--muted)' : 'var(--fg)' }}>{value}</span>
    </div>
  )
}

function SectionCard({
  icon: Icon, title, count, color, children, studioPath, studioBase,
}: {
  icon: React.ElementType; title: string; count: number; color: string
  children: React.ReactNode; studioPath: string; studioBase: string | null
}) {
  return (
    <div className="rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</span>
          <span className="text-[0.65rem] px-1.5 py-0.5 rounded-full ml-1" style={{ backgroundColor: `${color}20`, color }}>
            {count}
          </span>
        </div>
        {studioBase && (
          <a href={`${studioBase}${studioPath}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[0.65rem] hover:opacity-80 transition-opacity"
            style={{ color }}>
            <PlusCircle size={11} /> New
          </a>
        )}
      </div>
      <div className="px-5 py-2">{children}</div>
    </div>
  )
}

export default async function CMSPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: siteRaw } = await db.from('sites').select('id, name, url').eq('id', id).single()
  if (!siteRaw) notFound()
  const site = siteRaw as { id: string; name: string; url: string }

  // ── Fetch CMS data via our API ──
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}/api/sites/${id}/cms-data`, { cache: 'no-store' })
  const payload = await res.json()

  const error         = payload.error as string | undefined
  const projectId     = payload.projectId as string | undefined
  const dataset       = (payload.dataset as string | undefined) ?? 'production'
  const pressReleases = (payload.pressReleases ?? []) as PressRelease[]
  const events        = (payload.events ?? []) as SanityEvent[]
  const executives    = (payload.executives ?? []) as Executive[]
  const counts        = payload.counts as Counts | undefined

  // Studio URL — the site's own /studio route
  const studioBase = site.url ? site.url.replace(/\/$/, '') : null
  const studioUrl  = studioBase ? `${studioBase}/studio` : null

  return (
    <div className="max-w-5xl">
      <Link href={`/sites/${id}`} className="flex items-center gap-1.5 text-sm mb-6 hover:text-indigo-400 transition-colors" style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={14} /> Back to {site.name}
      </Link>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>CONTENT MANAGEMENT</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>CMS Dashboard</h1>
          {projectId && (
            <p className="text-xs mt-1 font-mono" style={{ color: 'var(--muted)' }}>
              Project: {projectId} · Dataset: {dataset}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {studioUrl && (
            <a href={studioUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#f59e0b', color: '#000' }}>
              <LogIn size={13} /> Open Studio
            </a>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded-xl border p-6 mb-8" style={{ borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' }}>
          <p className="text-sm font-medium text-red-400 mb-1">Configuration required</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{error}</p>
          <Link href={`/sites/${id}/config`} className="inline-flex items-center gap-1 mt-3 text-xs text-indigo-400 hover:text-indigo-300">
            Open Config panel →
          </Link>
        </div>
      )}

      {/* ── Count stats ── */}
      {counts && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Press Releases', value: counts.pressReleases, color: '#60a5fa', icon: Newspaper },
            { label: 'Events',         value: counts.events,         color: '#34d399', icon: Calendar },
            { label: 'Executives',     value: counts.executives,     color: '#f59e0b', icon: Users    },
            { label: 'Gov. Docs',      value: counts.governanceDocs, color: '#a78bfa', icon: FileText },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={14} style={{ color }} />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: 'var(--fg)' }}>{value ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Studio login prompt (always shown) ── */}
      <div className="rounded-xl border p-5 mb-8 flex items-center justify-between gap-4"
        style={{ borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.05)' }}>
        <div>
          <p className="text-sm font-semibold mb-0.5" style={{ color: '#f59e0b' }}>Sanity Studio</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Edit press releases, events, executive profiles, and governance documents.
            {studioUrl && <> Studio is embedded at <span className="font-mono">{studioUrl}</span>.</>}
          </p>
        </div>
        {studioUrl ? (
          <a href={studioUrl} target="_blank" rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#f59e0b', color: '#000' }}>
            <LogIn size={12} /> Log In to Studio
          </a>
        ) : (
          <span className="text-xs shrink-0" style={{ color: 'var(--muted)' }}>Configure site URL to get studio link</span>
        )}
      </div>

      {/* ── Content sections ── */}
      <div className="space-y-6">

        {/* Press Releases */}
        <SectionCard icon={Newspaper} title="Press Releases" count={pressReleases.length} color="#60a5fa" studioPath="/studio" studioBase={studioBase}>
          {pressReleases.length === 0 ? (
            <p className="text-xs py-4 text-center" style={{ color: 'var(--muted)' }}>No press releases yet — create the first one in Studio</p>
          ) : pressReleases.map((pr) => (
            <div key={pr._id} className="py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--fg)' }}>{pr.title}</p>
              <div className="flex items-center gap-3">
                {pr.publishedAt && <span className="text-xs" style={{ color: 'var(--muted)' }}>{new Date(pr.publishedAt).toLocaleDateString()}</span>}
                {pr.source && <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(96,165,250,0.12)', color: '#60a5fa' }}>{pr.source}</span>}
              </div>
              {pr.excerpt && <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--muted)' }}>{pr.excerpt}</p>}
            </div>
          ))}
        </SectionCard>

        {/* Events */}
        <SectionCard icon={Calendar} title="Upcoming Events" count={events.length} color="#34d399" studioPath="/studio" studioBase={studioBase}>
          {events.length === 0 ? (
            <p className="text-xs py-4 text-center" style={{ color: 'var(--muted)' }}>No events scheduled — add roadshow dates and conferences in Studio</p>
          ) : events.map((ev) => (
            <div key={ev._id} className="py-3 border-b last:border-0 flex items-start justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{ev.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {ev.eventDate ? new Date(ev.eventDate).toLocaleDateString() : '—'}
                  {ev.location ? ` · ${ev.location}` : ''}
                </p>
              </div>
              {ev.eventType && (
                <span className="text-[0.65rem] px-2 py-0.5 rounded shrink-0" style={{ backgroundColor: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                  {ev.eventType.toUpperCase()}
                </span>
              )}
            </div>
          ))}
        </SectionCard>

        {/* Executives */}
        <SectionCard icon={Users} title="Executive Team" count={executives.length} color="#f59e0b" studioPath="/studio" studioBase={studioBase}>
          {executives.length === 0 ? (
            <p className="text-xs py-4 text-center" style={{ color: 'var(--muted)' }}>No executives in CMS — add leadership profiles in Studio</p>
          ) : executives.map((ex) => (
            <div key={ex._id} className="py-3 border-b last:border-0 flex items-center justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{ex.name}</p>
                {ex.title && <p className="text-xs" style={{ color: 'var(--muted)' }}>{ex.title}</p>}
              </div>
              {ex.linkedIn && (
                <a href={ex.linkedIn} target="_blank" rel="noopener noreferrer"
                  className="text-xs hover:opacity-80 transition-opacity"
                  style={{ color: '#60a5fa' }}>
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          ))}
        </SectionCard>

      </div>
    </div>
  )
}

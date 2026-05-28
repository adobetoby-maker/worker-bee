export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { getBlueprint } from '@/lib/blueprintStore'
import { ArrowLeft, ExternalLink, GitBranch, Pencil, Map, Video, Wand2, ExternalLink as ExtLink, BarChart2, ScanSearch, Settings2 } from 'lucide-react'
import DeleteSiteButton from './DeleteSiteButton'
import VisualQACard from './VisualQACard'
import DesignSchemePanel from '@/components/DesignSchemePanel'

const STACK_LABELS: Record<string, string> = {
  nextjs: 'Next.js', wordpress: 'WordPress', react: 'React', static: 'Static', other: 'Other',
}

const TYPE_COLOR: Record<string, string> = {
  page: '#3b82f6', section: '#8b5cf6', component: '#f59e0b', api: '#10b981', data: '#ef4444',
}

function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null
  const loom = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
  if (loom) return `https://www.loom.com/embed/${loom[1]}`
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

export default async function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: raw } = await supabaseAdmin.from('sites').select('*').eq('id', id).single()
  if (!raw) notFound()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = raw as any

  const blueprint = await getBlueprint(id)
  const currentBranch = blueprint?.currentBranch ?? 'main'
  const branchData = blueprint?.branches?.[currentBranch]
  const nodes = (branchData?.nodes ?? []) as Array<{ data?: { title?: string; type?: string; description?: string }; id?: string }>
  const wizardInput = blueprint?.wizardInput
  const videoUrl = blueprint?.videoUrl ?? ''
  const embedUrl = getVideoEmbedUrl(videoUrl)
  const designSchemes = blueprint?.designSchemes ?? (blueprint?.designScheme ? { main: blueprint.designScheme } : {})
  const activeDesignBranch = blueprint?.activeDesignBranch ?? (Object.keys(designSchemes)[0] ?? 'main')
  const designSchemeData = Object.keys(designSchemes).length > 0
    ? { schemes: designSchemes, active: activeDesignBranch }
    : null

  const metaRows = [
    { label: 'Stack', value: STACK_LABELS[data.stack] ?? data.stack },
    { label: 'Status', value: data.status },
    { label: 'GitHub', value: data.github_repo, href: data.github_repo ? `https://github.com/${data.github_repo}` : null },
    { label: 'Vercel', value: data.vercel_project_id, href: data.vercel_project_id ? `https://vercel.com/dashboard` : null },
    { label: 'Added', value: new Date(data.created_at).toLocaleDateString() },
  ].filter(r => r.value)

  const previewNodes = nodes.slice(0, 8)

  return (
    <div className="max-w-5xl">
      <Link href="/sites" className="flex items-center gap-1.5 text-sm mb-6 hover:text-indigo-400 transition-colors" style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={14} /> Back to Sites
      </Link>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{data.name}</h1>
          <a href={data.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            <ExternalLink size={13} />{data.url}
          </a>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/evaluate?url=${encodeURIComponent(data.url ?? '')}&siteId=${id}&siteName=${encodeURIComponent(data.name ?? '')}`}
            className="flex items-center gap-1.5 text-sm border px-3 py-2 rounded-lg hover:border-emerald-500/40 transition-colors"
            style={{ borderColor: 'var(--border)', color: '#34d399' }}>
            <ScanSearch size={13} /> Quality Check
          </Link>
          <Link href={`/sites/${id}/build/progress`}
            className="flex items-center gap-1.5 text-sm border px-3 py-2 rounded-lg hover:border-indigo-500/40 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
            <BarChart2 size={13} /> Build Progress
          </Link>
          <Link href={`/sites/${id}/blueprint`}
            className="flex items-center gap-1.5 text-sm border px-3 py-2 rounded-lg hover:border-indigo-500/40 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
            <Map size={13} /> Blueprint Canvas
          </Link>
          <Link href={`/sites/${id}/config`}
            className="flex items-center gap-1.5 text-sm border px-3 py-2 rounded-lg hover:border-emerald-500/30 transition-colors"
            style={{ borderColor: 'var(--border)', color: '#34d399' }}>
            <Settings2 size={13} /> Config
          </Link>
          <Link href={`/sites/${id}/edit`}
            className="flex items-center gap-1.5 text-sm border px-3 py-2 rounded-lg hover:border-white/20 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
            <Pencil size={13} /> Edit
          </Link>
          <DeleteSiteButton id={id} />
        </div>
      </div>

      {/* ── 3-col grid: Input | Output | Video ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">

        {/* INPUT CARD */}
        <div className="rounded-2xl border overflow-hidden flex flex-col" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg,#10b981,#059669)', flexShrink: 0 }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Input</span>
            {wizardInput && (
              <span className="ml-auto text-xs" style={{ color: 'var(--muted)' }}>
                {new Date(wizardInput.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-4 p-4 flex-1">
            {wizardInput ? (
              <>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Business</div>
                  <p className="text-xs leading-relaxed line-clamp-5" style={{ color: 'var(--muted-light)' }}>{wizardInput.business}</p>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Goal</div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-light)' }}>{wizardInput.goal}</p>
                </div>
                {wizardInput.extra && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Design Notes</div>
                    <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--muted-light)' }}>{wizardInput.extra}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 py-6">
                <Wand2 size={22} style={{ color: 'var(--muted)', opacity: 0.3 }} />
                <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>No AI input recorded yet.<br />Open Blueprint Canvas → AI Generate.</p>
              </div>
            )}
          </div>
          <div className="px-4 pb-4">
            <Link href={`/sites/${id}/blueprint`} className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-semibold transition-colors hover:text-indigo-300"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Wand2 size={11} /> Open & Refine
            </Link>
          </div>
        </div>

        {/* OUTPUT CARD — mini blueprint preview */}
        <div className="rounded-2xl border overflow-hidden flex flex-col" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', flexShrink: 0 }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Output</span>
            <span className="ml-auto text-xs" style={{ color: 'var(--muted)' }}>{nodes.length} cards</span>
          </div>
          <div className="flex-1 p-3">
            {previewNodes.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5">
                {previewNodes.map((n, i) => {
                  const t = n.data?.type ?? 'page'
                  const color = TYPE_COLOR[t] ?? '#64748b'
                  return (
                    <div key={n.id ?? i} style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${color}28`,
                      borderLeft: `2px solid ${color}`,
                      borderRadius: 6, padding: '5px 7px',
                    }}>
                      <div className="text-xs font-semibold leading-tight truncate" style={{ color: '#e2e8f0' }}>
                        {n.data?.title ?? '—'}
                      </div>
                      <div className="text-xs mt-0.5 uppercase tracking-wider" style={{ color, opacity: 0.7, fontSize: 9 }}>
                        {t}
                      </div>
                    </div>
                  )
                })}
                {nodes.length > 8 && (
                  <div className="col-span-2 text-center text-xs py-1" style={{ color: 'var(--muted)' }}>
                    +{nodes.length - 8} more
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 py-10">
                <div className="text-3xl opacity-10">◈</div>
                <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>No blueprint yet.</p>
              </div>
            )}
          </div>
          <div className="px-4 pb-4">
            <Link href={`/sites/${id}/blueprint`} className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Map size={11} /> Open Canvas
            </Link>
          </div>
        </div>

        {/* VIDEO CARD */}
        <div className="rounded-2xl border overflow-hidden flex flex-col" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: 'linear-gradient(135deg,#f59e0b,#d97706)', flexShrink: 0 }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Preview</span>
            {videoUrl && (
              <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="ml-auto" style={{ color: 'var(--muted)' }}>
                <ExtLink size={11} />
              </a>
            )}
          </div>
          <div className="flex-1 flex flex-col">
            {embedUrl ? (
              <div style={{ aspectRatio: '16/9', flexShrink: 0 }}>
                <iframe src={embedUrl} style={{ width: '100%', height: '100%', border: 'none' }} allow="autoplay; fullscreen" allowFullScreen />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 py-10">
                <Video size={22} style={{ color: 'var(--muted)', opacity: 0.3 }} />
                <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>No video yet.<br />Add a Loom, YouTube, or Vimeo URL in the Blueprint Canvas input panel.</p>
              </div>
            )}
          </div>
          <div className="px-4 pb-4 pt-3">
            <a href={data.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
              <ExtLink size={11} /> View Live Site
            </a>
          </div>
        </div>

      </div>

      {/* ── Iterative Loop ── */}
      <div className="rounded-2xl border overflow-hidden mb-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Improvement Loop</span>
          <span className="text-xs ml-2" style={{ color: 'var(--muted)', opacity: 0.5 }}>Audit → Refine Blueprint → Build or Patch → Repeat</span>
        </div>
        <div className="flex items-stretch divide-x" style={{ borderColor: 'var(--border)' }}>
          {/* Step 1 */}
          <Link href={`/evaluate?url=${encodeURIComponent(data.url ?? '')}&siteId=${id}&siteName=${encodeURIComponent(data.name ?? '')}`}
            className="flex-1 flex flex-col items-center gap-2 px-4 py-4 hover:bg-white/[0.02] transition-colors text-center">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>1</div>
            <ScanSearch size={15} style={{ color: '#34d399' }} />
            <span className="text-xs font-semibold" style={{ color: '#34d399' }}>Quality Check</span>
            <span className="text-xs leading-tight" style={{ color: 'var(--muted)' }}>Audit the live site, find SEO, security & perf issues</span>
          </Link>
          <div className="flex items-center px-2" style={{ color: 'var(--muted)', opacity: 0.3 }}>→</div>
          {/* Step 2 */}
          <Link href={`/sites/${id}/blueprint`}
            className="flex-1 flex flex-col items-center gap-2 px-4 py-4 hover:bg-white/[0.02] transition-colors text-center">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>2</div>
            <Map size={15} style={{ color: '#818cf8' }} />
            <span className="text-xs font-semibold" style={{ color: '#818cf8' }}>Blueprint Canvas</span>
            <span className="text-xs leading-tight" style={{ color: 'var(--muted)' }}>Review imported audit nodes, adjust priorities, add cards</span>
          </Link>
          <div className="flex items-center px-2" style={{ color: 'var(--muted)', opacity: 0.3 }}>→</div>
          {/* Step 3 */}
          <Link href={`/sites/${id}/build`}
            className="flex-1 flex flex-col items-center gap-2 px-4 py-4 hover:bg-white/[0.02] transition-colors text-center">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>3</div>
            <Wand2 size={15} style={{ color: '#f59e0b' }} />
            <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Build / Patch</span>
            <span className="text-xs leading-tight" style={{ color: 'var(--muted)' }}>Configure the pipeline, generate CLAUDE.md, run fixes</span>
          </Link>
          <div className="flex items-center px-2" style={{ color: 'var(--muted)', opacity: 0.3 }}>→</div>
          {/* Step 4 */}
          <Link href={`/sites/${id}/build/progress`}
            className="flex-1 flex flex-col items-center gap-2 px-4 py-4 hover:bg-white/[0.02] transition-colors text-center">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>4</div>
            <BarChart2 size={15} style={{ color: '#f87171' }} />
            <span className="text-xs font-semibold" style={{ color: '#f87171' }}>Track Progress</span>
            <span className="text-xs leading-tight" style={{ color: 'var(--muted)' }}>Monitor build phases, fix errors with AI, then repeat</span>
          </Link>
        </div>
      </div>

      {/* ── Meta row ── */}
      <div className="rounded-2xl border divide-y overflow-hidden mb-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {metaRows.map(r => (
          <div key={r.label} className="flex items-center gap-4 px-5 py-3" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs font-semibold w-24 shrink-0" style={{ color: 'var(--muted)' }}>{r.label}</span>
            {r.href ? (
              <a href={r.href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                <GitBranch size={12} />{r.value}
              </a>
            ) : (
              <span className="text-sm text-white capitalize">{r.value}</span>
            )}
          </div>
        ))}
      </div>

      {data.url && <VisualQACard siteUrl={data.url} />}

      <DesignSchemePanel siteId={id} initial={designSchemeData} siteName={data.name} />

      {data.notes && (
        <div className="rounded-xl border px-5 py-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>Notes</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--muted-light)' }}>{data.notes}</p>
        </div>
      )}
    </div>
  )
}

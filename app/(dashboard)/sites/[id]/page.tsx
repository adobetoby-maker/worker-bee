export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { ArrowLeft, ExternalLink, GitBranch, Pencil, Map } from 'lucide-react'
import DeleteSiteButton from './DeleteSiteButton'

const STACK_LABELS: Record<string, string> = {
  nextjs: 'Next.js', wordpress: 'WordPress', react: 'React', static: 'Static', other: 'Other',
}

export default async function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: raw } = await supabaseAdmin.from('sites').select('*').eq('id', id).single()
  if (!raw) notFound()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = raw as any

  const rows = [
    { label: 'Stack', value: STACK_LABELS[data.stack] ?? data.stack },
    { label: 'Status', value: data.status },
    { label: 'GitHub', value: data.github_repo, href: data.github_repo ? `https://github.com/${data.github_repo}` : null },
    { label: 'Vercel', value: data.vercel_project_id, href: data.vercel_project_id ? `https://vercel.com/dashboard` : null },
    { label: 'WP API', value: data.wp_api_url },
    { label: 'Added', value: new Date(data.created_at).toLocaleDateString() },
  ].filter(r => r.value)

  return (
    <div className="max-w-2xl">
      <Link href="/sites" className="flex items-center gap-1.5 text-sm mb-6 hover:text-indigo-400 transition-colors" style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={14} /> Back to Sites
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{data.name}</h1>
          <a href={data.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            <ExternalLink size={13} />{data.url}
          </a>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/sites/${id}/blueprint`}
            className="flex items-center gap-1.5 text-sm border px-3 py-2 rounded-lg hover:border-indigo-500/40 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
            <Map size={13} /> Blueprint
          </Link>
          <Link href={`/sites/${id}/edit`}
            className="flex items-center gap-1.5 text-sm border px-3 py-2 rounded-lg hover:border-white/20 transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
            <Pencil size={13} /> Edit
          </Link>
          <DeleteSiteButton id={id} />
        </div>
      </div>

      <div className="rounded-2xl border divide-y overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-4 px-5 py-3.5" style={{ borderColor: 'var(--border)' }}>
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

      {data.notes && (
        <div className="mt-4 rounded-xl border px-5 py-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--muted)' }}>Notes</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--muted-light)' }}>{data.notes}</p>
        </div>
      )}
    </div>
  )
}

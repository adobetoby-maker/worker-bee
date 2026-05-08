'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const STACKS = ['nextjs', 'wordpress', 'react', 'static', 'other']
const STACK_LABELS: Record<string, string> = {
  nextjs: 'Next.js', wordpress: 'WordPress', react: 'React', static: 'Static', other: 'Other',
}
const STATUSES = ['active', 'paused', 'issue']

type FormState = {
  name: string; url: string; stack: string; status: string;
  github_repo: string; vercel_project_id: string; wp_api_url: string; notes: string;
}

const BLANK: FormState = {
  name: '', url: '', stack: 'nextjs', status: 'active',
  github_repo: '', vercel_project_id: '', wp_api_url: '', notes: '',
}

export default function EditSitePage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [form, setForm] = useState<FormState>(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k: keyof FormState, v: string) { setForm(f => ({ ...f, [k]: v })) }

  useEffect(() => {
    fetch(`/api/sites/${id}`)
      .then(r => r.json())
      .then(d => {
        setForm({
          name: d.name ?? '',
          url: d.url ?? '',
          stack: d.stack ?? 'nextjs',
          status: d.status ?? 'active',
          github_repo: d.github_repo ?? '',
          vercel_project_id: d.vercel_project_id ?? '',
          wp_api_url: d.wp_api_url ?? '',
          notes: d.notes ?? '',
        })
        setLoading(false)
      })
      .catch(() => { setError('Failed to load site.'); setLoading(false) })
  }, [id])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch(`/api/sites/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        github_repo: form.github_repo || null,
        vercel_project_id: form.vercel_project_id || null,
        wp_api_url: form.wp_api_url || null,
        notes: form.notes || null,
      }),
    })
    if (res.ok) {
      router.push(`/sites/${id}`)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Save failed.')
      setSaving(false)
    }
  }

  const input = "w-full rounded-xl border px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
  const inputStyle = { background: 'var(--surface2)', borderColor: 'var(--border)' }

  if (loading) return (
    <div className="max-w-2xl flex items-center gap-3 text-slate-500 py-12">
      <span className="w-4 h-4 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
      Loading…
    </div>
  )

  return (
    <div className="max-w-2xl">
      <Link href={`/sites/${id}`} className="flex items-center gap-1.5 text-sm mb-6 hover:text-indigo-400 transition-colors" style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={14} /> Back to Site
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">Edit Site</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--muted-light)' }}>Update site details.</p>

      <form onSubmit={save} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-sm">Site Name</label>
            <input className={input} style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="label-sm">Stack</label>
            <select className={input} style={inputStyle} value={form.stack} onChange={e => set('stack', e.target.value)}>
              {STACKS.map(s => <option key={s} value={s}>{STACK_LABELS[s]}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-sm">URL</label>
            <input className={input} style={inputStyle} value={form.url} onChange={e => set('url', e.target.value)} required />
          </div>
          <div>
            <label className="label-sm">Status</label>
            <select className={input} style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-sm">GitHub Repo <span style={{ color: 'var(--muted)' }}>(optional)</span></label>
            <input className={input} style={inputStyle} placeholder="owner/repo" value={form.github_repo} onChange={e => set('github_repo', e.target.value)} />
          </div>
          <div>
            <label className="label-sm">Vercel Project ID <span style={{ color: 'var(--muted)' }}>(optional)</span></label>
            <input className={input} style={inputStyle} placeholder="prj_abc123" value={form.vercel_project_id} onChange={e => set('vercel_project_id', e.target.value)} />
          </div>
        </div>

        {form.stack === 'wordpress' && (
          <div>
            <label className="label-sm">WordPress REST API URL</label>
            <input className={input} style={inputStyle} placeholder="https://site.com/wp-json" value={form.wp_api_url} onChange={e => set('wp_api_url', e.target.value)} />
          </div>
        )}

        <div>
          <label className="label-sm">Notes <span style={{ color: 'var(--muted)' }}>(optional)</span></label>
          <textarea className={input} style={inputStyle} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <Link href={`/sites/${id}`} className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:border-white/14"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
            Cancel
          </Link>
        </div>
      </form>

      <style>{`.label-sm{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:6px}`}</style>
    </div>
  )
}

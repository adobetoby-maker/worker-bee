'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const STACKS = ['nextjs', 'wordpress', 'react', 'static', 'other']
const STACK_LABELS: Record<string, string> = {
  nextjs: 'Next.js', wordpress: 'WordPress', react: 'React', static: 'Static', other: 'Other',
}

export default function NewSitePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', url: '', stack: 'nextjs', status: 'active',
    github_repo: '', vercel_project_id: '', wp_api_url: '', notes: '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const { id } = await res.json()
      router.push(`/sites/${id}`)
    } else {
      setSaving(false)
    }
  }

  const input = "w-full rounded-xl border px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
  const inputStyle = { background: 'var(--surface2)', borderColor: 'var(--border)' }

  return (
    <div className="max-w-2xl">
      <Link href="/sites" className="flex items-center gap-1.5 text-sm mb-6 hover:text-indigo-400 transition-colors" style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={14} /> Back to Sites
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">Add Site</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--muted-light)' }}>Register a new client site to manage.</p>

      <form onSubmit={save} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-sm">Site Name</label>
            <input className={input} style={inputStyle} placeholder="Jr.'s Auto Repair" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <label className="label-sm">Stack</label>
            <select className={input} style={inputStyle} value={form.stack} onChange={e => set('stack', e.target.value)}>
              {STACKS.map(s => <option key={s} value={s}>{STACK_LABELS[s]}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label-sm">URL</label>
          <input className={input} style={inputStyle} placeholder="https://jrsautorepair.com" value={form.url} onChange={e => set('url', e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-sm">GitHub Repo <span style={{ color: 'var(--muted)' }}>(optional)</span></label>
            <input className={input} style={inputStyle} placeholder="adobetoby/jrs-auto-repair" value={form.github_repo} onChange={e => set('github_repo', e.target.value)} />
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

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
            {saving ? 'Saving…' : 'Add Site'}
          </button>
          <Link href="/sites" className="px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:border-white/14"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
            Cancel
          </Link>
        </div>
      </form>

      <style>{`.label-sm{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:6px}`}</style>
    </div>
  )
}

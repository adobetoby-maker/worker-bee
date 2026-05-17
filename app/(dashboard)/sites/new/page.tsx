'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'

const STACKS = ['nextjs', 'wordpress', 'react', 'static', 'other']
const STACK_LABELS: Record<string, string> = {
  nextjs: 'Next.js', wordpress: 'WordPress', react: 'React', static: 'Static', other: 'Other',
}

type Phase = 'form' | 'scanning' | 'done'

interface ScanStep {
  label: string
  status: 'pending' | 'running' | 'done' | 'skipped'
}

export default function NewSitePage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('form')
  const [siteId, setSiteId] = useState('')
  const [scanSteps, setScanSteps] = useState<ScanStep[]>([
    { label: 'Registering site', status: 'pending' },
    { label: 'Crawling site', status: 'pending' },
    { label: 'Running 26-point audit', status: 'pending' },
    { label: 'Building reverse blueprint', status: 'pending' },
    { label: 'Saving fix cards', status: 'pending' },
  ])
  const [form, setForm] = useState({
    name: '', url: '', stack: 'nextjs', status: 'active',
    github_repo: '', vercel_project_id: '', wp_api_url: '', notes: '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function markStep(i: number, status: ScanStep['status']) {
    setScanSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status } : s))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setPhase('scanning')

    // Step 0 — create site row
    markStep(0, 'running')
    const res = await fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) { setPhase('form'); return }
    const { id } = await res.json()
    setSiteId(id)
    markStep(0, 'done')

    // Steps 1-4 — run onboard (crawl + audit + blueprint + save)
    markStep(1, 'running')
    setTimeout(() => markStep(2, 'running'), 3000)
    setTimeout(() => markStep(3, 'running'), 8000)
    setTimeout(() => markStep(4, 'running'), 13000)

    const onboardRes = await fetch(`/api/sites/${id}/onboard`, { method: 'POST' })
    const hadGitHub = !!form.github_repo

    if (onboardRes.ok) {
      // Mark all remaining steps done
      setScanSteps(prev => prev.map(s => ({ ...s, status: s.status === 'pending' ? (hadGitHub ? 'done' : 'done') : 'done' })))
    } else {
      // Audit failed — still go to site, just without blueprint
      setScanSteps(prev => prev.map((s, i) => i === 0 ? s : { ...s, status: 'skipped' }))
    }

    setPhase('done')
    setTimeout(() => router.push(`/sites/${id}/blueprint`), 1200)
  }

  const input = "w-full rounded-xl border px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
  const inputStyle = { background: 'var(--surface2)', borderColor: 'var(--border)' }

  // ── Scanning phase ─────────────────────────────────────────────────────────
  if (phase === 'scanning' || phase === 'done') {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="rounded-2xl border p-8" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="mb-6 text-center">
            <div className="text-base font-bold text-white mb-1">{form.name}</div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>{form.url}</div>
          </div>

          <div className="space-y-3">
            {scanSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  {step.status === 'done' && <CheckCircle2 size={16} style={{ color: '#34d399' }} />}
                  {step.status === 'running' && <Loader2 size={16} className="animate-spin" style={{ color: '#818cf8' }} />}
                  {step.status === 'pending' && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--border)' }} />}
                  {step.status === 'skipped' && <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />}
                </div>
                <span
                  className="text-sm"
                  style={{
                    color: step.status === 'done' ? '#e2e8f0'
                      : step.status === 'running' ? '#818cf8'
                      : step.status === 'skipped' ? 'rgba(255,255,255,0.25)'
                      : 'var(--muted)',
                    fontWeight: step.status === 'running' ? 600 : 400,
                  }}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {phase === 'done' && (
            <div className="mt-6 pt-5 border-t text-center" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Opening blueprint canvas…</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Form phase ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl">
      <Link href="/sites" className="flex items-center gap-1.5 text-sm mb-6 hover:text-indigo-400 transition-colors" style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={14} /> Back to Sites
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">Add Site</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--muted-light)' }}>
        After saving, we&apos;ll crawl the site and run an initial 26-point audit automatically.
      </p>

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

        <div
          className="rounded-xl border px-4 py-3 text-xs leading-relaxed"
          style={{ borderColor: 'rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.05)', color: 'rgba(255,255,255,0.45)' }}
        >
          After saving, Worker Bee will crawl your site, run a full SEO / security / performance audit, and generate a reverse blueprint of fix cards — ready on the blueprint canvas.
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
            Add Site &amp; Run Audit
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

'use client'

import { useState } from 'react'
import { Wrench, Zap, GitPullRequest, AlertTriangle, CheckCircle2, Loader2, ChevronDown, ExternalLink } from 'lucide-react'

interface Site {
  id: string
  name: string
  url: string | null
  github_repo: string | null
  notes: string | null
}

interface Props {
  sites: Site[]
}

export function MaintenanceDispatch({ sites }: Props) {
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [changeRequest, setChangeRequest] = useState('')
  const [claudeMd, setClaudeMd] = useState('')
  const [sentryIssues, setSentryIssues] = useState('')
  const [spec, setSpec] = useState('')
  const [generating, setGenerating] = useState(false)
  const [firing, setFiring] = useState(false)
  const [fired, setFired] = useState(false)
  const [error, setError] = useState('')
  const [fetchingContext, setFetchingContext] = useState(false)
  const [buildMachineOnline, setBuildMachineOnline] = useState<boolean | null>(null)
  const [log, setLog] = useState('')

  async function loadSiteContext(site: Site) {
    setSelectedSite(site)
    setSpec('')
    setClaudeMd('')
    setSentryIssues('')
    setFired(false)
    setLog('')

    if (!site.github_repo) return
    setFetchingContext(true)

    try {
      // Pull CLAUDE.md from GitHub
      const [owner, repo] = site.github_repo.split('/')
      const ghRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/CLAUDE.md`,
        { headers: { Accept: 'application/vnd.github.v3.raw' } }
      )
      if (ghRes.ok) setClaudeMd(await ghRes.text())

      // Check build machine
      const health = await fetch('https://build-api.worker-bee.app/health', {
        signal: AbortSignal.timeout(4000),
      }).catch(() => null)
      setBuildMachineOnline(health?.ok ?? false)
    } catch {
      // non-fatal
    } finally {
      setFetchingContext(false)
    }
  }

  async function generateSpec() {
    if (!selectedSite || !changeRequest.trim()) return
    setGenerating(true)
    setError('')
    setSpec('')
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          siteName: selectedSite.name,
          changeRequest,
          claudeMd,
          sentryIssues,
        }),
      })
      const data = await res.json() as { spec?: string; error?: string }
      if (!res.ok || data.error) { setError(data.error ?? 'Generation failed'); return }
      setSpec(data.spec ?? '')
    } catch (e) {
      setError(String(e))
    } finally {
      setGenerating(false)
    }
  }

  async function fireDispatch() {
    if (!spec || !selectedSite) return
    setFiring(true)
    setError('')
    setLog('')

    const maintenanceSpec = `# Maintenance Dispatch: ${selectedSite.name}

This is a MAINTENANCE run on an existing codebase — NOT a fresh build.

**Repo:** ${selectedSite.github_repo}
**Local path:** /Users/drive/${selectedSite.github_repo?.split('/')[1] ?? selectedSite.name}

## Instructions
1. cd to the local path above. The repo already exists — do NOT scaffold a new project.
2. Read CLAUDE.md to understand the architecture before touching any file.
3. Make ONLY the changes listed in the spec below — do not refactor unrelated code.
4. Run \`npm run build\` after every change to catch TypeScript errors immediately.
5. Create a git branch: \`git checkout -b maintenance/$(date +%Y%m%d)\`
6. Commit each logical change separately with descriptive messages.
7. Push the branch: \`git push origin HEAD\`
8. Open a PR via: \`gh pr create --title "Maintenance: [summary]" --body "[changes made]"\`
9. Report back via:
\`\`\`bash
curl -s -X POST https://manage.worker-bee.app/api/blueprints/update \\
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \\
  -H "content-type: application/json" \\
  -d '{"siteId":"${selectedSite.id}","summary":"Maintenance dispatch complete. PR opened."}'
\`\`\`

---

${spec}`

    try {
      const res = await fetch('https://build-api.worker-bee.app/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': 'wb-build-local-9f4a2c' },
        body: JSON.stringify({
          spec: maintenanceSpec,
          siteName: selectedSite.github_repo?.split('/')[1] ?? selectedSite.name,
        }),
      })

      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({})) as { error?: string }
        setError(d.error ?? `Error ${res.status}`)
        return
      }

      setFired(true)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setLog(prev => prev + decoder.decode(value))
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setFiring(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-indigo-600/20">
            <Wrench size={20} className="text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Maintenance Dispatch</h1>
        </div>
        <p className="text-sm text-slate-400">
          Pull → Read → Adapt → Push. Surgical changes to live sites without a full rebuild.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="space-y-4">
          {/* Site selector */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              Site
            </label>
            <div className="relative">
              <select
                value={selectedSite?.id ?? ''}
                onChange={e => {
                  const site = sites.find(s => s.id === e.target.value)
                  if (site) loadSiteContext(site)
                }}
                className="w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm text-white font-medium"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <option value="">Select a site…</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {selectedSite && (
            <>
              {/* Site info strip */}
              <div className="flex items-center gap-3 text-xs text-slate-500 px-1">
                {fetchingContext
                  ? <><Loader2 size={12} className="animate-spin" /> Loading context…</>
                  : <>
                    {claudeMd
                      ? <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={12} /> CLAUDE.md loaded</span>
                      : <span className="text-yellow-500 flex items-center gap-1"><AlertTriangle size={12} /> No CLAUDE.md found</span>
                    }
                    {selectedSite.url && (
                      <a href={selectedSite.url.startsWith('http') ? selectedSite.url : `https://${selectedSite.url}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-slate-300 transition-colors ml-auto">
                        <ExternalLink size={11} /> Live site
                      </a>
                    )}
                  </>
                }
              </div>

              {/* Change request */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                  What needs to change?
                </label>
                <textarea
                  value={changeRequest}
                  onChange={e => setChangeRequest(e.target.value)}
                  placeholder="Plain English. e.g. 'Update the Starter package price to $350 and add a FAQ section to the homepage with 5 questions about our services.'"
                  rows={5}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 resize-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                />
              </div>

              {/* Sentry issues (manual paste for now) */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block flex items-center gap-2">
                  Sentry Issues
                  <span className="text-xs text-slate-600 font-normal normal-case">(paste from Sentry — optional)</span>
                </label>
                <textarea
                  value={sentryIssues}
                  onChange={e => setSentryIssues(e.target.value)}
                  placeholder="Paste Sentry error titles + stack traces here, or leave blank if no known issues."
                  rows={4}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 resize-none font-mono"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                />
              </div>

              {/* Generate button */}
              <button
                onClick={generateSpec}
                disabled={generating || !changeRequest.trim()}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: generating || !changeRequest.trim()
                    ? 'rgba(99,102,241,0.15)'
                    : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: generating || !changeRequest.trim() ? '#4c4f8a' : 'white',
                  border: generating || !changeRequest.trim() ? '1px solid rgba(99,102,241,0.2)' : 'none',
                  cursor: generating || !changeRequest.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {generating
                  ? <><Loader2 size={14} className="animate-spin" /> Generating maintenance spec…</>
                  : <><Zap size={14} /> Generate Spec</>
                }
              </button>
            </>
          )}
        </div>

        {/* Right: Spec + Dispatch */}
        <div className="space-y-4">
          {spec ? (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                  Maintenance Spec
                </label>
                <textarea
                  value={spec}
                  onChange={e => setSpec(e.target.value)}
                  rows={16}
                  className="w-full rounded-xl px-4 py-3 text-xs text-slate-200 resize-none font-mono leading-relaxed"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                />
                <p className="text-xs text-slate-600 mt-1 px-1">Edit the spec above before dispatching if needed.</p>
              </div>

              {/* Build machine status */}
              <div className="flex items-center gap-2">
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: buildMachineOnline === null ? '#475569' : buildMachineOnline ? '#10b981' : '#ef4444',
                  boxShadow: buildMachineOnline ? '0 0 6px #10b981' : 'none',
                }} />
                <span className="text-xs text-slate-500">
                  {buildMachineOnline === null ? 'Checking build machine…'
                    : buildMachineOnline ? 'Build machine online — ready to dispatch'
                    : 'Build machine offline — start worker-bee-dev/start.sh'}
                </span>
              </div>

              {/* Dispatch button */}
              <button
                onClick={fireDispatch}
                disabled={firing || buildMachineOnline === false}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: firing ? 'rgba(16,185,129,0.2)'
                    : buildMachineOnline === false ? 'rgba(100,116,139,0.2)'
                    : fired ? 'rgba(16,185,129,0.15)'
                    : 'linear-gradient(135deg, #10b981, #059669)',
                  color: firing ? '#34d399'
                    : buildMachineOnline === false ? '#475569'
                    : fired ? '#6ee7b7' : 'white',
                  cursor: firing || buildMachineOnline === false ? 'not-allowed' : 'pointer',
                  border: (firing || fired || buildMachineOnline === false) ? '1px solid rgba(16,185,129,0.3)' : 'none',
                }}
              >
                {firing
                  ? <><Loader2 size={14} className="animate-spin" /> Dispatching maintenance run…</>
                  : fired
                    ? <><CheckCircle2 size={14} /> Dispatched — PR incoming</>
                    : <><GitPullRequest size={14} /> Dispatch → Open PR</>
                }
              </button>

              {error && (
                <div className="text-xs text-red-400 rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}

              {log && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div className="px-3 py-2 text-xs font-semibold text-emerald-400" style={{ background: 'rgba(16,185,129,0.06)', borderBottom: '1px solid rgba(16,185,129,0.15)' }}>
                    Dispatch output
                  </div>
                  <pre className="text-xs p-3 overflow-auto max-h-48 leading-relaxed whitespace-pre-wrap text-emerald-300" style={{ background: '#0a0f0a' }}>{log}</pre>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 rounded-xl text-center px-8"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <GitPullRequest size={32} className="text-slate-700 mb-4" />
              <p className="text-sm font-semibold text-slate-500">Spec will appear here</p>
              <p className="text-xs text-slate-600 mt-1">Select a site, describe the change, then generate.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

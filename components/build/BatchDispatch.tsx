'use client'

import { useState, useRef, useCallback } from 'react'
import { Layers, CheckSquare, Square, Zap, XCircle, CheckCircle2, Loader2, AlertTriangle, ChevronDown, ChevronRight, GitPullRequest } from 'lucide-react'

interface Site {
  id: string
  name: string
  url: string | null
  github_repo: string | null
  notes: string | null
}

type Stage = 'idle' | 'queued' | 'fetching' | 'gen-spec' | 'firing' | 'done' | 'error'

interface SiteStatus {
  stage: Stage
  log: string
  error?: string
  spec?: string
}

const STAGE_LABEL: Record<Stage, string> = {
  idle: 'Idle',
  queued: 'Queued',
  fetching: 'Fetching context',
  'gen-spec': 'Generating spec',
  firing: 'Dispatching',
  done: 'Done — PR incoming',
  error: 'Error',
}

const STAGE_COLOR: Record<Stage, string> = {
  idle: '#475569',
  queued: '#94a3b8',
  fetching: '#f59e0b',
  'gen-spec': '#a78bfa',
  firing: '#34d399',
  done: '#10b981',
  error: '#f87171',
}

export function BatchDispatch({ sites }: { sites: Site[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [changeRequest, setChangeRequest] = useState('')
  const [statuses, setStatuses] = useState<Record<string, SiteStatus>>({})
  const [running, setRunning] = useState(false)
  const [buildOnline, setBuildOnline] = useState<boolean | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const abortRef = useRef(false)

  function toggleSite(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(prev => prev.size === sites.length ? new Set() : new Set(sites.map(s => s.id)))
  }

  function toggleLog(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function setStatus(id: string, patch: Partial<SiteStatus>) {
    setStatuses(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  async function fetchClaudeMd(site: Site): Promise<string> {
    if (!site.github_repo) return ''
    const res = await fetch(`/api/github/claude-md?repo=${encodeURIComponent(site.github_repo)}`).catch(() => null)
    if (!res?.ok) return ''
    const { content } = await res.json() as { content: string | null }
    return content ?? ''
  }

  async function genSpec(site: Site, claudeMd: string, request: string): Promise<string> {
    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ siteName: site.name, changeRequest: request, claudeMd, sentryIssues: '' }),
    })
    const data = await res.json() as { spec?: string; error?: string }
    if (!res.ok || data.error) throw new Error(data.error ?? 'Spec generation failed')
    return data.spec ?? ''
  }

  async function fireDispatch(site: Site, spec: string, onLog: (chunk: string) => void) {
    const maintenanceSpec = `# Maintenance Dispatch: ${site.name}

This is a MAINTENANCE run on an existing codebase — NOT a fresh build.

**Repo:** ${site.github_repo}
**Local path:** /Users/drive/${site.github_repo?.split('/')[1] ?? site.name}

## Instructions
1. cd to the local path above. The repo already exists — do NOT scaffold a new project.
2. Read CLAUDE.md to understand the architecture before touching any file.
3. Make ONLY the changes listed in the spec below — do not refactor unrelated code.
4. Run \`npm run build\` after every change to catch TypeScript errors immediately.
5. Create a git branch: \`git checkout -b maintenance/$(date +%Y%m%d)\`
6. Commit each logical change separately with descriptive messages.
7. Push the branch: \`git push origin HEAD\`
8. Open a PR: \`gh pr create --title "Maintenance: [summary]" --body "[changes made]"\`
9. Report back:
\`\`\`bash
curl -s -X POST https://manage.worker-bee.app/api/blueprints/update \\
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \\
  -H "content-type: application/json" \\
  -d '{"siteId":"${site.id}","summary":"Batch maintenance dispatch complete. PR opened."}'
\`\`\`

---

${spec}`

    const res = await fetch('https://build-api.worker-bee.app/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': 'wb-build-local-9f4a2c' },
      body: JSON.stringify({
        spec: maintenanceSpec,
        siteName: site.github_repo?.split('/')[1] ?? site.name,
      }),
    })

    if (!res.ok || !res.body) {
      const d = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(d.error ?? `HTTP ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      onLog(decoder.decode(value))
    }
  }

  const runBatch = useCallback(async () => {
    if (!changeRequest.trim() || selected.size === 0) return
    abortRef.current = false
    setRunning(true)

    // Init all as queued
    const initial: Record<string, SiteStatus> = {}
    for (const id of selected) initial[id] = { stage: 'queued', log: '' }
    setStatuses(initial)

    // Check build machine once
    const health = await fetch('https://build-api.worker-bee.app/health', {
      signal: AbortSignal.timeout(4000),
    }).catch(() => null)
    setBuildOnline(health?.ok ?? false)

    if (!health?.ok) {
      for (const id of selected) {
        setStatus(id, { stage: 'error', error: 'Build machine offline' })
      }
      setRunning(false)
      return
    }

    const queue = sites.filter(s => selected.has(s.id))

    for (const site of queue) {
      if (abortRef.current) {
        setStatus(site.id, { stage: 'error', error: 'Cancelled' })
        continue
      }

      try {
        // 1. Fetch CLAUDE.md
        setStatus(site.id, { stage: 'fetching' })
        const claudeMd = await fetchClaudeMd(site)

        if (abortRef.current) { setStatus(site.id, { stage: 'error', error: 'Cancelled' }); continue }

        // 2. Generate spec
        setStatus(site.id, { stage: 'gen-spec' })
        const spec = await genSpec(site, claudeMd, changeRequest)
        setStatus(site.id, { spec })

        if (abortRef.current) { setStatus(site.id, { stage: 'error', error: 'Cancelled' }); continue }

        // 3. Fire dispatch (streaming)
        setStatus(site.id, { stage: 'firing' })
        await fireDispatch(site, spec, chunk => {
          setStatuses(prev => ({
            ...prev,
            [site.id]: { ...prev[site.id], log: (prev[site.id]?.log ?? '') + chunk },
          }))
        })

        setStatus(site.id, { stage: 'done' })
        // Auto-expand done logs
        setExpanded(prev => new Set([...prev, site.id]))
      } catch (e) {
        setStatus(site.id, { stage: 'error', error: String(e) })
      }
    }

    setRunning(false)
  }, [changeRequest, selected, sites])

  const selectedSites = sites.filter(s => selected.has(s.id))
  const hasActiveRun = Object.values(statuses).some(s => ['queued', 'fetching', 'gen-spec', 'firing'].includes(s.stage))

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Layers size={20} className="text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Batch Dispatch</h1>
        </div>
        <p className="text-sm text-slate-400">
          Select multiple sites, describe the shared change, and fire them all in sequence.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: site picker */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sites</span>
            <button
              onClick={toggleAll}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              {selected.size === sites.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {sites.map(site => {
              const isSelected = selected.has(site.id)
              const status = statuses[site.id]
              return (
                <button
                  key={site.id}
                  onClick={() => !running && toggleSite(site.id)}
                  disabled={running}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: isSelected ? 'rgba(99,102,241,0.12)' : 'var(--surface)',
                    border: `1px solid ${isSelected ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                    cursor: running ? 'not-allowed' : 'pointer',
                    opacity: running && !isSelected ? 0.4 : 1,
                  }}
                >
                  {isSelected
                    ? <CheckSquare size={15} className="text-indigo-400 shrink-0" />
                    : <Square size={15} className="text-slate-600 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{site.name}</p>
                    {site.url && (
                      <p className="text-xs text-slate-600 truncate">{site.url}</p>
                    )}
                  </div>
                  {status && (
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: STAGE_COLOR[status.stage] }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: request + dispatch */}
        <div className="lg:col-span-3 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              Change Request <span className="font-normal text-slate-600 normal-case">(applies to all selected sites)</span>
            </label>
            <textarea
              value={changeRequest}
              onChange={e => setChangeRequest(e.target.value)}
              disabled={running}
              placeholder="Plain English. e.g. 'Add a privacy policy link in the footer, update the phone number to (208) 555-0123, and fix the contact form submit button color to match the brand.'"
              rows={6}
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 resize-none"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                opacity: running ? 0.6 : 1,
              }}
            />
          </div>

          {/* Build machine status */}
          {buildOnline !== null && (
            <div className="flex items-center gap-2">
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: buildOnline ? '#10b981' : '#ef4444',
                boxShadow: buildOnline ? '0 0 6px #10b981' : 'none',
              }} />
              <span className="text-xs text-slate-500">
                {buildOnline ? 'Build machine online' : 'Build machine offline — start worker-bee-dev/start.sh'}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={runBatch}
              disabled={running || selected.size === 0 || !changeRequest.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all"
              style={{
                background: running || selected.size === 0 || !changeRequest.trim()
                  ? 'rgba(99,102,241,0.12)'
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: running || selected.size === 0 || !changeRequest.trim()
                  ? '#4c4f8a'
                  : 'white',
                cursor: running || selected.size === 0 || !changeRequest.trim() ? 'not-allowed' : 'pointer',
                border: running || selected.size === 0 || !changeRequest.trim()
                  ? '1px solid rgba(99,102,241,0.2)'
                  : 'none',
              }}
            >
              {running
                ? <><Loader2 size={14} className="animate-spin" /> Running batch…</>
                : <><Zap size={14} /> Dispatch {selected.size > 0 ? `${selected.size} site${selected.size > 1 ? 's' : ''}` : 'selected sites'}</>
              }
            </button>

            {running && (
              <button
                onClick={() => { abortRef.current = true }}
                className="flex items-center gap-1.5 px-3 py-3 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <XCircle size={13} /> Cancel
              </button>
            )}
          </div>

          {/* Per-site status list */}
          {selectedSites.length > 0 && Object.keys(statuses).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</p>
              {selectedSites.map(site => {
                const s = statuses[site.id]
                if (!s) return null
                const isExpanded = expanded.has(site.id)
                return (
                  <div key={site.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      {s.stage === 'done' && <CheckCircle2 size={14} className="shrink-0" style={{ color: '#10b981' }} />}
                      {s.stage === 'error' && <AlertTriangle size={14} className="shrink-0" style={{ color: '#f87171' }} />}
                      {['queued', 'fetching', 'gen-spec', 'firing'].includes(s.stage) && (
                        <Loader2 size={14} className="animate-spin shrink-0" style={{ color: STAGE_COLOR[s.stage] }} />
                      )}
                      {s.stage === 'idle' && <GitPullRequest size={14} className="text-slate-600 shrink-0" />}

                      <span className="text-sm font-medium text-white flex-1 truncate">{site.name}</span>

                      <span className="text-xs font-semibold shrink-0" style={{ color: STAGE_COLOR[s.stage] }}>
                        {STAGE_LABEL[s.stage]}
                      </span>

                      {(s.log || s.error) && (
                        <button onClick={() => toggleLog(site.id)} className="shrink-0 text-slate-500 hover:text-slate-300">
                          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </button>
                      )}
                    </div>

                    {isExpanded && s.error && (
                      <div className="px-3 pb-3">
                        <p className="text-xs text-red-400 font-mono">{s.error}</p>
                      </div>
                    )}

                    {isExpanded && s.log && (
                      <pre className="text-xs p-3 overflow-auto max-h-40 leading-relaxed whitespace-pre-wrap text-emerald-300 border-t"
                        style={{ background: '#0a0f0a', borderColor: 'rgba(16,185,129,0.15)' }}>
                        {s.log}
                      </pre>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

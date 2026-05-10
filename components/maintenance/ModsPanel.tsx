'use client'

import { useState } from 'react'
import { Sparkles, Languages, Loader2, CheckCircle2, GitPullRequest, ChevronDown, AlertTriangle } from 'lucide-react'

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

const LANGUAGES = [
  { code: 'es', label: 'Spanish', flag: '🇲🇽' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷' },
  { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
]

const MOD_TYPES = [
  { key: 'translate', label: 'Translate', icon: Languages, description: 'Localize site copy via Pronto' },
  { key: 'seo', label: 'SEO Boost', icon: Sparkles, description: 'Schema markup, meta descriptions, OpenGraph' },
]

type ModType = 'translate' | 'seo'
type Stage = 'idle' | 'generating' | 'firing' | 'done' | 'error'

export function ModsPanel({ sites }: Props) {
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [modType, setModType] = useState<ModType>('translate')
  const [targetLangs, setTargetLangs] = useState<Set<string>>(new Set(['es']))
  const [tone, setTone] = useState<'auto' | 'formal' | 'informal'>('auto')
  const [stage, setStage] = useState<Stage>('idle')
  const [log, setLog] = useState('')
  const [error, setError] = useState('')
  const [buildOnline, setBuildOnline] = useState<boolean | null>(null)

  function toggleLang(code: string) {
    setTargetLangs(prev => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  function buildTranslateSpec(site: Site, langs: string[]): string {
    const langList = langs.join(', ')
    const prontoUrl = 'https://pronto-en.worker-bee.app/api/translate'

    return `# Pronto Mod: Translate — ${site.name}

This is a TRANSLATION MOD — not a fresh build and not a content change.

**Repo:** ${site.github_repo}
**Local path:** /Users/drive/${site.github_repo?.split('/')[1] ?? site.name}
**Target languages:** ${langList}

## Instructions

1. cd to the local path above. The repo already exists.
2. Read CLAUDE.md to understand the project architecture.
3. Locate all user-facing copy/content files. Common patterns:
   - \`src/lib/content.ts\` or \`lib/content.ts\` — TypeScript content dictionaries
   - \`src/locales/\` or \`public/locales/\` — JSON translation files
   - \`lib/copy.ts\`, \`lib/strings.ts\`, \`constants/copy.ts\`
   - Any file exporting string dictionaries labeled with language keys (en, es, etc.)
4. For each target language (${langList}), call Pronto's translate API:

\`\`\`bash
# Example: translate a flat strings object
curl -s -X POST ${prontoUrl} \\
  -H "Authorization: Bearer $PRONTO_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "strings": { "key": "English value", ... },
    "targetLanguage": "es",
    "config": {
      "tone": "${tone === 'auto' ? 'auto' : tone}",
      "source_language": "en"
    }
  }'
\`\`\`

   - If PRONTO_API_KEY is not in the environment, read it from the .env.local file.
   - Send strings in batches of 50 key-value pairs max to stay within token limits.
   - The API returns the same JSON structure with translated values.

5. Write translated strings back into the appropriate files:
   - If the site uses a \`content[lang]\` dictionary pattern, add/update the target language keys.
   - If it uses separate locale files (e.g. \`locales/es.json\`), write the translated JSON there.
   - Preserve all TypeScript types, \`as const\` assertions, and export statements.
   - Do NOT translate code identifiers, CSS class names, or URL slugs.

6. Run \`npm run build\` to verify TypeScript compiles cleanly.
7. Run \`npm run lint\` if available.
8. Commit: \`git checkout -b mods/translate-${langs.join('-')}-$(date +%Y%m%d)\`
9. Commit each language separately with message: \`i18n: add ${langs[0]} translation via Pronto\`
10. Push: \`git push origin HEAD\`
11. Open PR: \`gh pr create --title "i18n: ${langList} translation" --body "Added via Pronto Mods dispatch"\`
12. Report back:
\`\`\`bash
curl -s -X POST https://manage.worker-bee.app/api/blueprints/update \\
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \\
  -H "content-type: application/json" \\
  -d '{"siteId":"${site.id}","summary":"Pronto mod complete: ${langList} translation added. PR opened."}'
\`\`\`
`
  }

  function buildSeoSpec(site: Site): string {
    return `# Pronto Mod: SEO Boost — ${site.name}

**Repo:** ${site.github_repo}
**Local path:** /Users/drive/${site.github_repo?.split('/')[1] ?? site.name}

## Instructions

1. cd to the local path above. Read CLAUDE.md first.
2. Audit every page's metadata export (\`metadata\` object in Next.js App Router pages).
3. For each page:
   - Ensure \`title\` is 50–60 characters, includes primary keyword + location if applicable
   - Ensure \`description\` is 140–160 characters, includes a call to action
   - Add \`openGraph\` with \`title\`, \`description\`, \`type\`, \`siteName\`, \`url\`
   - Add \`twitter\` card metadata
4. Add JSON-LD schema markup to the homepage:
   - \`LocalBusiness\` or appropriate schema type
   - Include \`name\`, \`url\`, \`telephone\`, \`address\`, \`openingHours\` from shopInfo or equivalent
5. If a sitemap doesn't exist, add \`app/sitemap.ts\` generating all public routes.
6. If robots.txt doesn't exist, add \`app/robots.ts\`.
7. Run \`npm run build\` to verify no errors.
8. Commit, push, open PR titled "seo: metadata + schema + sitemap for ${site.name}".
9. Report back:
\`\`\`bash
curl -s -X POST https://manage.worker-bee.app/api/blueprints/update \\
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \\
  -H "content-type: application/json" \\
  -d '{"siteId":"${site.id}","summary":"SEO mod complete: metadata, schema, sitemap added. PR opened."}'
\`\`\`
`
  }

  async function dispatch() {
    if (!selectedSite) return
    setStage('generating')
    setError('')
    setLog('')

    // Check build machine
    const health = await fetch('https://build-api.worker-bee.app/health', {
      signal: AbortSignal.timeout(4000),
    }).catch(() => null)
    setBuildOnline(health?.ok ?? false)

    if (!health?.ok) {
      setError('Build machine offline — start worker-bee-dev/start.sh')
      setStage('error')
      return
    }

    const spec = modType === 'translate'
      ? buildTranslateSpec(selectedSite, Array.from(targetLangs))
      : buildSeoSpec(selectedSite)

    setStage('firing')

    try {
      const res = await fetch('https://build-api.worker-bee.app/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': 'wb-build-local-9f4a2c' },
        body: JSON.stringify({
          spec,
          siteName: selectedSite.github_repo?.split('/')[1] ?? selectedSite.name,
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
        setLog(prev => prev + decoder.decode(value))
      }

      setStage('done')
    } catch (e) {
      setError(String(e))
      setStage('error')
    }
  }

  const canDispatch = !!selectedSite && (modType !== 'translate' || targetLangs.size > 0)
  const isRunning = stage === 'generating' || stage === 'firing'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: Config */}
      <div className="lg:col-span-2 space-y-5">
        {/* Site selector */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Site</label>
          <div className="relative">
            <select
              value={selectedSite?.id ?? ''}
              onChange={e => {
                const site = sites.find(s => s.id === e.target.value)
                setSelectedSite(site ?? null)
                setStage('idle')
                setLog('')
                setError('')
              }}
              disabled={isRunning}
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

        {/* Mod type */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Mod Type</label>
          <div className="space-y-2">
            {MOD_TYPES.map(({ key, label, icon: Icon, description }) => {
              const active = modType === key
              return (
                <button
                  key={key}
                  onClick={() => !isRunning && setModType(key as ModType)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={{
                    background: active ? 'rgba(99,102,241,0.12)' : 'var(--surface)',
                    border: `1px solid ${active ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                  }}
                >
                  <Icon size={15} className={active ? 'text-indigo-400' : 'text-slate-500'} />
                  <div>
                    <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-400'}`}>{label}</p>
                    <p className="text-xs text-slate-600">{description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Translate options */}
        {modType === 'translate' && (
          <>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Target Languages</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(({ code, label, flag }) => {
                  const selected = targetLangs.has(code)
                  return (
                    <button
                      key={code}
                      onClick={() => !isRunning && toggleLang(code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: selected ? 'rgba(99,102,241,0.2)' : 'var(--surface)',
                        border: `1px solid ${selected ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
                        color: selected ? '#a5b4fc' : '#475569',
                      }}
                    >
                      <span>{flag}</span> {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Tone</label>
              <div className="flex gap-2">
                {(['auto', 'formal', 'informal'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => !isRunning && setTone(t)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                    style={{
                      background: tone === t ? 'rgba(99,102,241,0.2)' : 'var(--surface)',
                      border: `1px solid ${tone === t ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                      color: tone === t ? '#a5b4fc' : '#475569',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Dispatch button */}
        <button
          onClick={dispatch}
          disabled={isRunning || !canDispatch}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all"
          style={{
            background: isRunning || !canDispatch
              ? 'rgba(99,102,241,0.1)'
              : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: isRunning || !canDispatch ? '#4c4f8a' : 'white',
            border: isRunning || !canDispatch ? '1px solid rgba(99,102,241,0.2)' : 'none',
            cursor: isRunning || !canDispatch ? 'not-allowed' : 'pointer',
          }}
        >
          {stage === 'generating' && <><Loader2 size={14} className="animate-spin" /> Checking build machine…</>}
          {stage === 'firing' && <><Loader2 size={14} className="animate-spin" /> Dispatching mod…</>}
          {stage === 'done' && <><CheckCircle2 size={14} /> Mod dispatched — PR incoming</>}
          {(stage === 'idle' || stage === 'error') && (
            <>{modType === 'translate' ? <Languages size={14} /> : <Sparkles size={14} />} Dispatch Mod</>
          )}
        </button>

        {buildOnline !== null && (
          <div className="flex items-center gap-2">
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: buildOnline ? '#10b981' : '#ef4444',
              boxShadow: buildOnline ? '0 0 6px #10b981' : 'none',
            }} />
            <span className="text-xs text-slate-500">
              {buildOnline ? 'Build machine online' : 'Build machine offline'}
            </span>
          </div>
        )}
      </div>

      {/* Right: Output */}
      <div className="lg:col-span-3">
        {error && (
          <div className="flex items-start gap-2 rounded-xl px-4 py-3 mb-4 text-sm text-red-400"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {log ? (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="px-3 py-2 text-xs font-semibold text-emerald-400 flex items-center gap-2"
              style={{ background: 'rgba(16,185,129,0.06)', borderBottom: '1px solid rgba(16,185,129,0.15)' }}>
              <GitPullRequest size={12} />
              Dispatch output
            </div>
            <pre className="text-xs p-4 overflow-auto max-h-96 leading-relaxed whitespace-pre-wrap text-emerald-300"
              style={{ background: '#0a0f0a' }}>
              {log}
            </pre>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 rounded-xl text-center px-8"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {modType === 'translate'
              ? <Languages size={32} className="text-slate-700 mb-4" />
              : <Sparkles size={32} className="text-slate-700 mb-4" />
            }
            <p className="text-sm font-semibold text-slate-500">
              {modType === 'translate' ? 'Pick site + languages, then dispatch' : 'Pick site, then dispatch'}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              {modType === 'translate'
                ? 'Build machine will call Pronto API to translate content and open a PR.'
                : 'Build machine will audit and improve SEO metadata and schema.'}
            </p>
            {modType === 'translate' && (
              <p className="text-xs mt-3 px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)' }}>
                Requires <code className="text-indigo-300">PRONTO_API_KEY</code> in site .env.local
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

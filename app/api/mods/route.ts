import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const PRONTO_URL = 'https://pronto-en.worker-bee.app/api/translate'
const BUILD_API_URL = 'https://build-api.worker-bee.app/run'
const BUILD_API_KEY = 'wb-build-local-9f4a2c'
const BLUEPRINT_API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'

function buildTranslateSpec(site: { id: string; name: string; github_repo: string | null }, langs: string[], tone: string, prontoKey: string): string {
  const langList = langs.join(', ')
  const localPath = `/Users/drive/${site.github_repo?.split('/')[1] ?? site.name}`

  return `# Pronto Mod: Translate — ${site.name}

This is a TRANSLATION MOD on an existing codebase — NOT a fresh build.

**Repo:** ${site.github_repo}
**Local path:** ${localPath}
**Target languages:** ${langList}
**Pronto API key:** ${prontoKey}

## Instructions

1. cd to ${localPath}. The repo already exists — do NOT scaffold a new project.
2. Read CLAUDE.md to understand the architecture before touching any file.
3. Locate all user-facing copy/content files. Look for:
   - \`src/lib/content.ts\` or \`lib/content.ts\` — TypeScript content dictionaries (most common)
   - \`src/locales/\` or \`public/locales/\` — JSON locale files
   - \`lib/copy.ts\`, \`lib/strings.ts\`, \`constants/copy.ts\`
   - Any file exporting an object keyed by language (en, es, etc.) with string values
4. For each content file found, extract all English string values into a flat key-value object.
   - Only include actual user-visible strings — not IDs, slugs, class names, or URLs.
   - Preserve interpolation placeholders like {{name}}, {count}, %s exactly.
5. For each target language (${langList}), POST the strings to Pronto:

\`\`\`bash
curl -s -X POST ${PRONTO_URL} \\
  -H "Authorization: Bearer ${prontoKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "strings": { "hero.title": "Your English string here", ... },
    "targetLanguage": "es",
    "config": {
      "tone": "${tone}",
      "source_language": "en"
    }
  }'
\`\`\`

   Send in batches of 50 strings max. The response is the same JSON structure with translated values.

6. Write translated strings back into the source files:
   - TypeScript \`content[lang]\` dictionaries: add/update the target language key (e.g. \`es: { ... }\`)
   - JSON locale files: write to \`locales/${langs[0]}.json\` (one per language)
   - Preserve all TypeScript types, \`as const\` assertions, and export statements exactly.
   - Do NOT translate: variable names, CSS classes, route paths, component names.
7. Run \`npm run build\` after each language to catch TypeScript errors immediately.
8. Run \`npm run lint\` if available.
9. Create branch: \`git checkout -b mods/translate-${langs.join('-')}-$(date +%Y%m%d)\`
10. Commit each language separately: \`git commit -m "i18n: add ${langs[0]} translation via Pronto"\`
11. Push: \`git push origin HEAD\`
12. Open PR:
\`\`\`bash
gh pr create --title "i18n: ${langList} translation" --body "Pronto Mods dispatch — ${langList} added via manage.worker-bee.app/mods"
\`\`\`
13. Report back:
\`\`\`bash
curl -s -X POST https://manage.worker-bee.app/api/blueprints/update \\
  -H "x-api-key: ${BLUEPRINT_API_KEY}" \\
  -H "content-type: application/json" \\
  -d '{"siteId":"${site.id}","summary":"Pronto mod complete: ${langList} translation added. PR opened."}'
\`\`\`
`
}

function buildSeoSpec(site: { id: string; name: string; github_repo: string | null }): string {
  const localPath = `/Users/drive/${site.github_repo?.split('/')[1] ?? site.name}`

  return `# Pronto Mod: SEO Boost — ${site.name}

This is an SEO improvement pass on an existing codebase — NOT a fresh build.

**Repo:** ${site.github_repo}
**Local path:** ${localPath}

## Instructions

1. cd to ${localPath}. Read CLAUDE.md before touching anything.
2. Audit every page's metadata export (\`export const metadata\` in Next.js App Router):
   - \`title\`: 50–60 chars, includes primary keyword + city/location if local business
   - \`description\`: 140–160 chars, ends with a call to action
   - Add \`openGraph: { title, description, type, siteName, url, images }\`
   - Add \`twitter: { card: 'summary_large_image', title, description }\`
3. Add JSON-LD to the homepage (\`app/page.tsx\` or equivalent):
   - Use the appropriate schema type (LocalBusiness, MedicalBusiness, etc.)
   - Pull business info from \`lib/shopInfo.ts\` or equivalent — do NOT hardcode values
   - Include: name, url, telephone, address, openingHours, aggregateRating if present
4. If \`app/sitemap.ts\` does not exist, create it — list all public routes with lastModified.
5. If \`app/robots.ts\` does not exist, create it — allow all, point to sitemap.
6. Run \`npm run build\` to confirm no TypeScript errors.
7. Run \`npm run lint\` if available.
8. Create branch: \`git checkout -b mods/seo-boost-$(date +%Y%m%d)\`
9. Commit: \`git commit -m "seo: metadata, JSON-LD schema, sitemap, robots"\`
10. Push: \`git push origin HEAD\`
11. Open PR:
\`\`\`bash
gh pr create --title "seo: metadata + JSON-LD + sitemap for ${site.name}" --body "SEO Boost mod via manage.worker-bee.app/mods"
\`\`\`
12. Report back:
\`\`\`bash
curl -s -X POST https://manage.worker-bee.app/api/blueprints/update \\
  -H "x-api-key: ${BLUEPRINT_API_KEY}" \\
  -H "content-type: application/json" \\
  -d '{"siteId":"${site.id}","summary":"SEO Boost mod complete: metadata, JSON-LD, sitemap added. PR opened."}'
\`\`\`
`
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    siteId: string
    modType: 'translate' | 'seo'
    targetLangs?: string[]
    tone?: string
    prontoApiKey?: string
  } | null

  if (!body?.siteId || !body?.modType) {
    return NextResponse.json({ error: 'Missing siteId or modType' }, { status: 400 })
  }

  const { data: siteRow } = await supabaseAdmin
    .from('sites')
    .select('id, name, github_repo')
    .eq('id', body.siteId)
    .single()

  if (!siteRow) return NextResponse.json({ error: 'Site not found' }, { status: 404 })

  const site = siteRow as { id: string; name: string; github_repo: string | null }

  let spec: string

  if (body.modType === 'translate') {
    const prontoKey = body.prontoApiKey || process.env.PRONTO_API_KEY
    if (!prontoKey) {
      return NextResponse.json(
        { error: 'Pronto API key not set — enter it in the Mods panel (Pronto API Key field) or add PRONTO_API_KEY to Vercel env vars' },
        { status: 500 }
      )
    }
    const langs = body.targetLangs?.length ? body.targetLangs : ['es']
    const tone = body.tone ?? 'auto'
    spec = buildTranslateSpec(site, langs, tone, prontoKey)
  } else {
    spec = buildSeoSpec(site)
  }

  const buildRes = await fetch(BUILD_API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': BUILD_API_KEY },
    body: JSON.stringify({
      spec,
      siteName: site.github_repo?.split('/')[1] ?? site.name,
    }),
  })

  if (!buildRes.ok || !buildRes.body) {
    const d = await buildRes.json().catch(() => ({})) as { error?: string }
    return NextResponse.json({ error: d.error ?? `Build machine error ${buildRes.status}` }, { status: 502 })
  }

  return new NextResponse(buildRes.body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no',
    },
  })
}

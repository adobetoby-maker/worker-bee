import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { AuditResult, AuditCheck, BlueprintResult, BlueprintNode, BlueprintEdge, BlueprintMode } from '@/lib/types/audit'

export const maxDuration = 120

// ── Pattern Library ─────────────────────────────────────────────────────────
// Deterministic fix instructions for known anti-patterns.
// When a check ID matches, we inject the exact claudePrompt into the Sonnet prompt
// so the model generates actionable code-level guidance rather than vague advice.

interface PatternHint {
  id: string
  title: string
  claudePrompt: string
  status: 'critical' | 'important'
  effort: 'low' | 'medium' | 'high'
  type: 'seo' | 'security' | 'performance' | 'content' | 'rebuild'
}

function detectPatternHints(audit: AuditResult): PatternHint[] {
  const hints: PatternHint[] = []
  const failing = new Map<string, AuditCheck>()
  for (const c of audit.checks) {
    if (c.status !== 'pass') failing.set(c.id, c)
  }

  const audited = (() => {
    try { return new URL(audit.url).hostname } catch { return '' }
  })()

  // ── Canonical URL mismatch ───────────────────────────────────────────────
  const canonical = failing.get('canonical')
  if (canonical) {
    const val = canonical.value ?? ''
    const isWorkerBee = val.includes('worker-bee.app')
    const isMismatch = val && !val.includes(audited) && audited !== ''
    if (isWorkerBee || isMismatch) {
      hints.push({
        id: 'canonical',
        title: 'Fix Canonical URL Mismatch',
        type: 'seo',
        status: 'critical',
        effort: 'low',
        claudePrompt: `In src/app/layout.tsx (or app/layout.tsx), remove the hardcoded link rel canonical tag from the head element — it is pointing to ${val || 'the wrong domain'} instead of the production domain. Next.js metadataBase in src/lib/seo.ts already controls canonical URLs via the alternates.canonical field in generatePageMetadata(). The hardcoded tag overrides it and sends all Google ranking signals to the wrong domain. After removing the tag, confirm BASE_URL in lib/seo.ts is set to the correct production URL.`,
      })
    } else if (!val) {
      hints.push({
        id: 'canonical',
        title: 'Add Canonical URL Tags',
        type: 'seo',
        status: 'important',
        effort: 'low',
        claudePrompt: `In src/lib/seo.ts (or lib/seo.ts), ensure the generatePageMetadata() function sets alternates: { canonical: BASE_URL + path } on every page. In src/app/layout.tsx, confirm metadataBase is set to the production URL via new URL(BASE_URL). Every route file (page.tsx) should call generatePageMetadata() and export it as the page metadata — never add a manual link rel canonical tag in layout.tsx.`,
      })
    }
  }

  // ── Security headers bundle ──────────────────────────────────────────────
  const missingHeaders = [
    failing.get('x_frame_options'),
    failing.get('x_content_type'),
    failing.get('referrer_policy'),
  ].filter(Boolean)

  if (missingHeaders.length >= 2) {
    hints.push({
      id: 'security_headers',
      title: 'Add Security Headers',
      type: 'security',
      status: 'critical',
      effort: 'low',
      claudePrompt: `In next.config.ts, add an async headers() function to the nextConfig object. It should return [ { source: '/(.*)', headers: [ { key: 'X-Frame-Options', value: 'SAMEORIGIN' }, { key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' } ] } ]. This is a single low-effort change that fixes clickjacking, MIME sniffing, and referrer leakage in one commit.`,
    })
  } else if (missingHeaders.length === 1) {
    const hdr = missingHeaders[0]!
    hints.push({
      id: hdr.id,
      title: `Add ${hdr.label} Header`,
      type: 'security',
      status: 'important',
      effort: 'low',
      claudePrompt: `In next.config.ts, add or extend the async headers() function to include the missing ${hdr.label} header. While there, also add X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, and Permissions-Policy: camera=() microphone=() geolocation=() — all four headers together prevent the most common clickjacking and sniffing attacks.`,
    })
  }

  // ── HSTS (separate — higher effort) ─────────────────────────────────────
  if (failing.has('hsts')) {
    hints.push({
      id: 'hsts',
      title: 'Enable HSTS Header',
      type: 'security',
      status: 'important',
      effort: 'medium',
      claudePrompt: `Add Strict-Transport-Security to the security headers in next.config.ts: { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }. Only add this after confirming the production domain has a valid SSL certificate and you do not serve any HTTP-only resources — once preloaded, HTTP is blocked for 2 years.`,
    })
  }

  // ── Missing sitemap ──────────────────────────────────────────────────────
  if (failing.has('sitemap')) {
    hints.push({
      id: 'sitemap',
      title: 'Generate XML Sitemap',
      type: 'seo',
      status: 'important',
      effort: 'low',
      claudePrompt: `Create src/app/sitemap.ts (Next.js App Router convention). Export a default async function that returns an array of { url, lastModified, changeFrequency, priority } objects for every public route. Use the production BASE_URL from lib/seo.ts. Next.js automatically serves this at /sitemap.xml — no extra config needed. Also submit the sitemap URL to Google Search Console after deployment.`,
    })
  }

  // ── Missing robots.txt ───────────────────────────────────────────────────
  if (failing.has('robots_txt')) {
    hints.push({
      id: 'robots_txt',
      title: 'Add Robots.txt',
      type: 'seo',
      status: 'important',
      effort: 'low',
      claudePrompt: `Create src/app/robots.ts (Next.js App Router convention). Export a default function returning { rules: { userAgent: '*', allow: '/' }, sitemap: BASE_URL + '/sitemap.xml' }. Next.js serves this at /robots.txt automatically. Do not block any crawlers unless you have specific admin routes — use middleware or Supabase RLS to protect private routes instead.`,
    })
  }

  // ── Missing JSON-LD structured data ─────────────────────────────────────
  if (failing.has('schema_jsonld')) {
    hints.push({
      id: 'schema_jsonld',
      title: 'Add JSON-LD Structured Data',
      type: 'seo',
      status: 'important',
      effort: 'medium',
      claudePrompt: `Create a src/components/JsonLd.tsx component that renders a script tag with type application/ld+json containing a schema.org object. In src/app/layout.tsx, add this component inside the head element with a LocalBusiness or relevant schema type. At minimum include: @context, @type, name, description, url, telephone (if applicable), address, and openingHours. This significantly improves rich results eligibility in Google Search.`,
    })
  }

  // ── Missing OG image ─────────────────────────────────────────────────────
  const ogImage = failing.get('og_image')
  if (ogImage) {
    const val = ogImage.value ?? ''
    const isUnsplash = val.includes('unsplash.com')
    hints.push({
      id: 'og_image',
      title: isUnsplash ? 'Replace Placeholder OG Image' : 'Add OG Social Image',
      type: 'seo',
      status: 'important',
      effort: 'medium',
      claudePrompt: isUnsplash
        ? `The OG image in lib/seo.ts is pointing to an Unsplash placeholder. Create a real og-image.jpg (1200x630px) and add it to the public/ directory. Update BASE_URL + /og-image.jpg as the og:image URL in the defaultMetadata object. Use ComfyUI (POST /api/image-gen) or a design tool to generate a branded image — it should show the site name, a hero photograph, and a short tagline. Social shares without a real OG image have significantly lower click-through rates.`
        : `Add an og:image meta tag to the site. Create a branded 1200x630px image, save it to public/og-image.jpg, and set it in the openGraph.images array inside defaultMetadata in lib/seo.ts. Use BASE_URL + /og-image.jpg as the URL so it stays on your own domain and is cacheable. This image appears on every Facebook, Twitter, LinkedIn, and iMessage link preview.`,
    })
  }

  // ── CSP missing ──────────────────────────────────────────────────────────
  if (failing.has('csp')) {
    hints.push({
      id: 'csp',
      title: 'Add Content Security Policy',
      type: 'security',
      status: 'important',
      effort: 'high',
      claudePrompt: `Add a Content-Security-Policy header in next.config.ts. Start permissive: default-src 'self'; script-src 'self' 'unsafe-inline' (needed for Next.js inline scripts); style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com. Tighten gradually by checking browser console for CSP violations after each deploy. Do not block everything at once — an overly strict CSP breaks the site.`,
    })
  }

  // ── Missing meta description ─────────────────────────────────────────────
  if (failing.has('meta_description')) {
    hints.push({
      id: 'meta_description',
      title: 'Write Meta Descriptions',
      type: 'seo',
      status: 'important',
      effort: 'low',
      claudePrompt: `In lib/seo.ts, update the description field in defaultMetadata to be 120-160 characters, include the primary keyword, and end with a call to action. For interior pages, call generatePageMetadata(title, description, path) from each page.tsx and pass a unique 120-160 char description per route. Never duplicate the same description across multiple pages — Google may ignore duplicate meta descriptions.`,
    })
  }

  return hints
}

// ── Patch mode fence — prepended to every claudePrompt in patch mode ─────────
// This fence is the contract between the blueprint and Claude Code execution.
// It prevents any patch task from drifting into visual/design changes.

const PATCH_FENCE = `PATCH MODE — STRICT CONSTRAINTS: Do NOT touch globals.css, tailwind.config.*, any .css file, any className or style prop, any component layout or spacing, any font or color token, or any visual design decision. This is a surgical patch. Only modify the specific files and code paths named below. The site's visual design is intentional and must not change. If the fix requires touching CSS to work, stop and flag it as out of scope for a patch.

`

// ── Prompt builder ───────────────────────────────────────────────────────────

function buildSystem(mode: BlueprintMode): string {
  const patchRule = mode === 'patch'
    ? `\nPATCH MODE CONSTRAINTS (CRITICAL): Every claudePrompt you generate MUST begin with the PATCH_FENCE header (it will be injected automatically). Fixes are surgical — name exact files and line-level changes only. Never suggest visual, CSS, Tailwind, layout, spacing, font, or color changes. If an audit finding can only be fixed by touching CSS, mark it effort: "high" and note "visual change required — skip in patch mode" in the description.\n`
    : `\nREBUILD MODE: You may suggest visual improvements, design system changes, and layout restructuring alongside technical fixes.\n`

  return `You are a web development strategist. Given a site audit and client notes, generate a prioritized action plan as a set of blueprint cards. Each card represents one improvement area with a specific action.

CRITICAL JSON RULE: ALL string values must use plain prose only. No double quotes, backticks, angle brackets, or JSX syntax inside string values. Single apostrophes are fine.
${patchRule}
RULES FOR NODES:
- Generate 6-10 nodes covering the most impactful audit findings
- id: "node-1", "node-2", etc.
- type: always "default"
- position: spread across x: 80-1200, y: 80-700 in a logical left-to-right priority flow
- data.title: 3-6 words, action-oriented (e.g. "Fix Missing Meta Description")
- data.type: "seo" | "security" | "performance" | "content" | "rebuild"
- data.description: 1-2 sentences describing the specific problem and what to fix
- data.status: "critical" | "important" | "nice-to-have" — based on audit severity
- data.priority: integer 1-10 (1 = highest priority)
- data.effort: "low" | "medium" | "high"
- data.claudePrompt: Detailed implementation instruction for a developer or Claude Code. Include the exact fix, file locations if guessable, and expected outcome. 40-80 words. Plain prose only.

PATTERN OVERRIDE RULE: For any check IDs listed in PATTERN HINTS below, use the provided claudePrompt verbatim (or very close to it) — these are pre-validated fix instructions for known code patterns. You may adjust wording slightly but preserve all technical specifics (file paths, API names, configuration keys).

RULES FOR EDGES:
- Connect related nodes where fixing one enables or informs another
- id: "e1", "e2", etc.
- source: node id
- target: node id
- type: always "smoothstep"

Return ONLY valid JSON with "nodes", "edges", and "summary" keys. No markdown.`
}

interface RequestBody {
  audit: AuditResult
  clientNotes: string
  mode: BlueprintMode
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    const out: string[] = []
    let inString = false
    let escaped = false
    for (const ch of raw) {
      if (escaped) { out.push(ch); escaped = false; continue }
      if (ch === '\\') { escaped = true; out.push(ch); continue }
      if (ch === '"') { inString = !inString; out.push(ch); continue }
      if (inString) {
        if (ch === '\n') { out.push('\\n'); continue }
        if (ch === '\r') { out.push('\\r'); continue }
        if (ch === '\t') { out.push('\\t'); continue }
      }
      out.push(ch)
    }
    return JSON.parse(out.join(''))
  }
}

export async function POST(req: NextRequest) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { audit, clientNotes, mode } = body

  if (!audit || !audit.url) {
    return NextResponse.json({ error: 'audit object with url is required' }, { status: 400 })
  }

  // Detect known patterns upfront — inject as hints so the LLM uses exact fix text
  const patternHints = detectPatternHints(audit)

  const failingChecks = audit.checks
    .filter(c => c.status === 'critical' || c.status === 'fail' || c.status === 'warn')
    .map(c => `[${c.status.toUpperCase()}] ${c.id} — ${c.label}: ${c.detail}${c.value ? ` (value: ${c.value})` : ''}`)
    .join('\n')

  const scoresSummary = `SEO: ${audit.scores.seo}/100 | Security: ${audit.scores.security}/100 | Performance: ${audit.scores.perf}/100 | Overall: ${audit.scores.overall}/100`

  const patternBlock = patternHints.length > 0
    ? `\nPATTERN HINTS — use these claudePrompt texts for the matching check IDs:\n${patternHints
        .map(h => `CHECK ID "${h.id}" → title: "${h.title}" | status: ${h.status} | effort: ${h.effort} | claudePrompt: ${h.claudePrompt}`)
        .join('\n\n')}\n`
    : ''

  const userMessage = `Site URL: ${audit.url}
Audit scores: ${scoresSummary}
Mode: ${mode} (${mode === 'rebuild' ? 'plan a full site redesign with these fixes integrated' : 'patch the existing site with targeted improvements'})

Failing / warning checks:
${failingChecks || 'No major issues found.'}
${patternBlock}
Client notes: ${clientNotes || 'None provided.'}

Generate a prioritized blueprint of 6-10 action cards with edges connecting related steps. For any check IDs listed in PATTERN HINTS above, use the provided claudePrompt and title exactly — these are pre-validated code-level fix instructions.`

  const tryGenerate = async (extraInstruction = '') => {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: buildSystem(mode),
      messages: [
        { role: 'user', content: userMessage + extraInstruction },
        { role: 'assistant', content: '{' },
      ],
    })
    const raw = '{' + (msg.content[0].type === 'text' ? msg.content[0].text : '')
    const end = raw.lastIndexOf('}')
    if (end === -1) return null
    try {
      return safeParseJson(raw.slice(0, end + 1)) as {
        nodes?: unknown
        edges?: unknown
        summary?: unknown
      }
    } catch {
      return null
    }
  }

  try {
    let parsed = await tryGenerate()
    if (!parsed || !Array.isArray(parsed.nodes)) {
      parsed = await tryGenerate('\n\nCRITICAL: Return ONLY valid JSON. Plain prose in all string values. No double quotes inside strings.')
    }
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return NextResponse.json({ error: 'Could not generate blueprint — please try again.' }, { status: 500 })
    }

    // Inject PATCH_FENCE into every claudePrompt when in patch mode
    const nodes = parsed.nodes as BlueprintNode[]
    if (mode === 'patch') {
      for (const node of nodes) {
        if (node.data?.claudePrompt && !node.data.claudePrompt.startsWith('PATCH MODE')) {
          node.data.claudePrompt = PATCH_FENCE + node.data.claudePrompt
        }
      }
    }

    const result: BlueprintResult = {
      nodes,
      edges: parsed.edges as BlueprintEdge[],
      summary: typeof parsed.summary === 'string'
        ? parsed.summary
        : `${mode === 'rebuild' ? 'Rebuild' : 'Patch'} plan for ${audit.url} — ${audit.checks.filter(c => c.status === 'critical' || c.status === 'fail').length} critical/failing checks to address.`,
      mode,
    }

    return NextResponse.json(result)
  } catch (err) {
    const msg = String(err)
    console.error('audit-blueprint error:', msg)
    const userMsg = msg.includes('credit') || msg.includes('quota') || msg.includes('billing')
      ? 'API quota exceeded — contact support.'
      : msg.includes('overloaded') || msg.includes('529')
      ? 'AI is overloaded — please try again in a moment.'
      : `Blueprint generation failed: ${msg.slice(0, 200)}`
    return NextResponse.json({ error: userMsg }, { status: 500 })
  }
}

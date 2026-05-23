import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// CORS — code-muse-trio runs on a different origin (Lovable/Vercel)
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ── Audit a site via our own audit engine ────────────────────────────────────
async function auditSite(url: string): Promise<string> {
  try {
    const origin = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const res = await fetch(`${origin}/api/site-audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (!res.ok) return ''
    const audit = await res.json() as {
      scores: { seo: number; security: number; perf: number; overall: number }
      checks: Array<{ status: string; label: string; detail: string; value?: string }>
      error?: string
    }
    const failing = audit.checks
      .filter((c) => c.status !== 'pass')
      .map((c) => `[${c.status.toUpperCase()}] ${c.label}: ${c.detail}${c.value ? ` (${c.value})` : ''}`)
      .join('\n')
    return `[SITE_AUDIT: ${url}]
Scores — SEO: ${audit.scores.seo}/100 | Security: ${audit.scores.security}/100 | Performance: ${audit.scores.perf}/100 | Overall: ${audit.scores.overall}/100

Failing/Warning Checks:
${failing || 'None — all checks pass!'}
${audit.error ? `\nNote: ${audit.error}` : ''}
[/SITE_AUDIT]`
  } catch {
    return ''
  }
}

// ── Screenshot via Playwright ────────────────────────────────────────────────
async function screenshotSite(url: string): Promise<string> {
  try {
    const origin = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const res = await fetch(`${origin}/api/playwright-audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (!res.ok) return ''
    const data = await res.json() as {
      loadTime?: number; statusCode?: number; consoleErrors?: string[]; links?: string[]; error?: string
    }
    if (data.error) return ''
    return `[PLAYWRIGHT: ${url}]
Load time: ${data.loadTime}ms | HTTP status: ${data.statusCode}
Console errors: ${data.consoleErrors?.length ?? 0}
Desktop + mobile screenshots captured
Links found: ${data.links?.length ?? 0}
[/PLAYWRIGHT]`
  } catch {
    return ''
  }
}

// ── DuckDuckGo research ──────────────────────────────────────────────────────
async function researchWeb(query: string): Promise<string> {
  try {
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HermesBot/1.0)' } },
    )
    const html = await res.text()
    const titles = (html.match(/<a[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/gi) ?? [])
      .map((m) => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).slice(0, 6)
    const snippets = (html.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi) ?? [])
      .map((m) => m.replace(/<[^>]+>/g, '').trim()).filter(Boolean).slice(0, 6)
    if (!titles.length) return ''
    const results = titles.map((t, i) => `${i + 1}. ${t}\n   ${snippets[i] ?? ''}`).join('\n\n')
    return `[WEB_RESEARCH: "${query}"]\n${results}\n[/WEB_RESEARCH]`
  } catch {
    return ''
  }
}

// ── System prompts ────────────────────────────────────────────────────────────
const SYSTEM: Record<string, string> = {
  architect: `You are ATHENA — elite AI web design and prompt engineering specialist. Named after the Greek goddess of wisdom and craft.

Your expertise: React, Vue, Next.js, Tailwind CSS, design systems, animation, accessibility (WCAG 2.1 AA+), prompt engineering for AI coding tools (Lovable, Cursor, Claude Code).

Personality: Precise, creative, visionary. Think in components and design systems.

PROMPT DELIVERY FORMAT — always wrap prompts in labeled code blocks:
**📋 Prompt for [Platform from context] — [What it does]:**
\`\`\`
[exact prompt, ready to paste]
\`\`\`
Split complex work into MULTIPLE prompt blocks — one per concern.

CRITICAL: Refer to other bots by Greek name: Athena (design), Ares (security), Apollo (quality), Hermes (ops).`,

  sentinel: `You are ARES — battle-hardened cybersecurity specialist. Named after the Greek god of war and defense.

Your expertise: OWASP Top 10, XSS/CSRF/SQLi/SSRF/IDOR, JWT/OAuth/session management, RLS, input validation, CSP, API security, prompt injection defense, mixed content, technology fingerprinting, form security.

Personality: Vigilant, thorough, no-nonsense. You assume every input is hostile. You explain threats in terms of real-world impact — not just "this is bad" but "an attacker could...".

WHEN YOU RECEIVE [SITE_AUDIT] DATA:
You have live security scan results for a real site. Analyze them like a penetration tester:

1. THREAT ASSESSMENT — Lead with severity: CRITICAL → FAIL → WARN → PASS
2. OWASP MAPPING — Map each issue to its OWASP Top 10 category:
   A01:Broken Access Control | A02:Cryptographic Failures | A03:Injection | A05:Security Misconfiguration | A06:Vulnerable Components | A07:Auth Failures
3. BUSINESS IMPACT — For each issue state: "An attacker can..." with concrete exploit scenario
4. EXACT FIXES — Provide copy-paste server config or code for each issue
5. ATTACK SURFACE SUMMARY — Rate these areas separately:
   Headers / JavaScript / Forms / Infrastructure / Tech Exposure
6. QUICK WINS — End with top 3 fixes achievable in under 30 minutes

For "pass" checks, briefly confirm what's protected and why it matters.

PROMPT DELIVERY FORMAT — each fix as its own block:
**📋 Prompt for [Platform from context] — [Fix description]:**
\`\`\`
[exact prompt, ready to paste]
\`\`\`

CRITICAL: Refer to other bots by Greek name: Athena (design), Ares (security), Apollo (quality), Hermes (ops).`,

  polaris: `You are APOLLO — quality engine and live site auditor. Named after the Greek god of truth and light.

When given a URL: you receive structured [SITE_AUDIT] data (26 checks: SEO, security, performance) and [PLAYWRIGHT] timing data. Use this to give evidence-based, actionable reviews.

WHEN REVIEWING A LIVE SITE:
1. Lead with scores: SEO / Security / Performance / Overall
2. Group failing checks: CRITICAL → FAIL → WARN
3. For each issue: problem + business impact + exact fix
4. Rate areas: ✅ Good | ⚠️ Needs Work | ❌ Critical Issue
5. End with top 3 quick wins

WHEN REFINING OTHERS' PROMPTS: Deliver YOUR OWN improved v2 prompt in a code block labeled:
**📋 Apollo's v2 Prompt for [Platform] — [What it does]:**
\`\`\`
[your improved version]
\`\`\`

CRITICAL: Refer to other bots by Greek name.`,

  nexus: `You are HERMES — autonomous AI operations agent. Named after the Greek messenger god of speed and commerce.

You DO THE WORK. You search the web, fetch live data, manage credentials, create content, and deliver results.

You receive [WEB_RESEARCH] blocks with DuckDuckGo results when research is needed. Use them to give grounded answers.

WHAT YOU CANNOT DO (be honest): open a browser UI, log into sites that require browser interaction, access systems without credentials.

PROACTIVE BEHAVIOR: Always suggest 2-3 next steps. End every response with "💡 Next steps:" section.

CRITICAL: Refer to other bots by Greek name: Athena (design), Ares (security), Apollo (quality), Hermes (ops).`,
}

// ── Map Anthropic SSE → OpenAI-compatible SSE ────────────────────────────────
// Frontend (streamChat.ts) reads choices[0].delta.content — we translate here.
function translateChunk(line: string): string | null {
  if (!line.startsWith('data: ')) return null
  const raw = line.slice(6).trim()
  if (!raw || raw === '[DONE]') return null
  try {
    const event = JSON.parse(raw) as { type: string; delta?: { type: string; text: string } }
    if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
      return `data: ${JSON.stringify({ choices: [{ delta: { content: event.delta.text }, finish_reason: null }] })}\n\n`
    }
    if (event.type === 'message_stop') {
      return `data: [DONE]\n\n`
    }
  } catch { /* non-JSON line */ }
  return null
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500, headers: CORS })
  }

  const { messages, botId } = await req.json() as {
    messages: Array<{ role: string; content: string }>
    botId: string
  }

  if (!messages || !botId || !SYSTEM[botId]) {
    return NextResponse.json({ error: 'messages and valid botId required' }, { status: 400, headers: CORS })
  }

  // ── Pre-enrich with live data before calling Claude ───────────────────────
  const enriched = [...messages]
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')

  if ((botId === 'polaris' || botId === 'sentinel') && lastUser) {
    const urls = (lastUser.content.match(/https?:\/\/[^\s"'<>]+/gi) ?? []).slice(0, 2)
    const auditResults = await Promise.all(
      urls.map(async (url) => {
        if (botId === 'polaris') {
          const [auditBlock, playwrightBlock] = await Promise.all([auditSite(url), screenshotSite(url)])
          return [auditBlock, playwrightBlock].filter(Boolean)
        }
        // Ares: full audit data, no screenshot overhead
        const auditBlock = await auditSite(url)
        return auditBlock ? [auditBlock] : []
      }),
    )
    for (const blocks of auditResults) {
      for (const block of blocks) enriched.push({ role: 'user', content: block })
    }
  }

  if (botId === 'nexus' && lastUser) {
    const needsResearch = /\b(research|search|find|look up|what is|how does|compare|best|trend|news)\b/i.test(lastUser.content)
    if (needsResearch) {
      const query = lastUser.content.replace(/[^\w\s]/g, ' ').trim().slice(0, 120)
      const webData = await researchWeb(query)
      if (webData) enriched.push({ role: 'user', content: webData })
    }
  }

  // Strip platform context messages from conversation (re-inject into system prompt)
  const platformMsg = enriched.find((m) => m.content.startsWith('[PLATFORM CONTEXT]:'))
  const conversationMsgs = enriched
    .filter((m) => !m.content.startsWith('[PLATFORM CONTEXT]:') && !m.content.startsWith('[POLARIS DIRECTIVE]:'))
    .slice(-20)

  const system = platformMsg
    ? `${SYSTEM[botId]}\n\n${platformMsg.content}`
    : SYSTEM[botId]

  // ── Call Anthropic streaming ──────────────────────────────────────────────
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system,
      messages: conversationMsgs,
      stream: true,
    }),
  })

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text()
    const msg = anthropicRes.status === 429
      ? 'Rate limit — please try again in a moment.'
      : `AI error ${anthropicRes.status}: ${err.slice(0, 200)}`
    return NextResponse.json({ error: msg }, { status: anthropicRes.status, headers: CORS })
  }

  // ── Stream translated SSE back to client ──────────────────────────────────
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const reader = anthropicRes.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          let nl: number
          while ((nl = buf.indexOf('\n')) !== -1) {
            const line = buf.slice(0, nl).trimEnd()
            buf = buf.slice(nl + 1)
            const out = translateChunk(line)
            if (out) controller.enqueue(encoder.encode(out))
          }
        }
        if (buf.trim()) {
          const out = translateChunk(buf.trim())
          if (out) controller.enqueue(encoder.encode(out))
        }
      } catch { /* client disconnected */ }
      controller.close()
    },
  })

  return new NextResponse(stream, {
    headers: { ...CORS, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}

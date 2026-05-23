import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const SYSTEM = `You are a senior web architect helping plan a client's website as a visual blueprint.

Given information about a business, output a JSON object with "nodes" and "edges" arrays.

CRITICAL JSON RULE: ALL string values in the JSON must use ONLY plain prose — no double quotes, no backticks, no angle brackets, no JSX syntax, no HTML attributes inside any string value. Single apostrophes are fine. This ensures valid JSON.

RULES FOR NODES:
- Each node = one page, section, component, API endpoint, or data layer
- id: short kebab-case (e.g. home-hero, contact-form)
- type: always "card"
- position: spread across x: 80-1200, y: 80-700, left-to-right user journey flow
- data.type: "page" | "section" | "component" | "api" | "data"
- data.title: 3-5 words max
- data.description: 1 sentence describing what this does for the visitor
- data.purpose: 1 short phrase — the business goal this serves
- data.sections: array of 2-4 short strings naming key content blocks within this page/section
- data.status: "planned"
- data.rotation: random float -3 to 3
- data.claudePrompt: THIS IS THE MOST IMPORTANT FIELD. A detailed, implementation-ready instruction written as plain prose. Include:
  * Exact palette, typography, spacing — use the identity cues from the business description
  * Exact content: headlines, CTAs, copy tone matching the business personality
  * Functionality: forms, interactions, animations, validation
  * Technical: API calls, state, DB tables if relevant
  * Mobile behavior
  * SEO if it is a page
  * Tailwind v4: all CSS resets must go inside @layer base — describe this in words, not code
  * Framer Motion: all whileInView elements need viewport once-true amount-0.1 — describe in words
  * Images: describe the visual subject needed (e.g. surgeon in dark OR with overhead lights), NOT a URL
  40-70 words maximum per claudePrompt. Be specific but concise. Plain prose only.

RULES FOR EDGES:
- Connect nodes with navigation or data relationships
- id: "e1", "e2", etc.
- source: node id
- target: node id
- type: always "string"

Generate nodes for each page specified by the client (plus any key sections needed). Return ONLY valid JSON, no markdown, no explanation.`

const ANALYSIS_SYSTEM = `You are a senior web developer generating project scaffolding for a new client website.

Given wizard inputs (business name, description, audience, CTA, pages, style, inspiration), generate:

1. CLAUDE.md content: A project guide for Claude Code with project name, description, key routes, stack decisions (Next.js App Router, Tailwind v4, TypeScript), and business context. 2-3 paragraphs, practical and concise.

2. settings.json: A Claude Code settings object. Include model "claude-sonnet-4-6", and permissions array based on detected project needs (e.g. if e-commerce: add stripe permissions). Keep it minimal and practical.

3. html_starter: A clean semantic HTML5 homepage hero section (no framework, just HTML + inline style comments). Include: nav, hero headline, subheadline, CTA button, simple layout. Tailor copy to the business.

4. tailwind_starter: The same hero section rewritten using Tailwind CSS v4 classes. Use realistic class names. Include the nav, hero, and CTA button.

CRITICAL JSON RULE: All string values must use plain prose only. No double quotes inside strings. No code blocks inside strings — just describe or use escaped versions.

Return ONLY a valid JSON object with these exact keys:
{
  "claudeMd": "...",
  "settingsJson": "...",
  "htmlStarter": "...",
  "tailwindStarter": "..."
}

Do NOT wrap in markdown. Return raw JSON only.`

interface GenerateRequest {
  mode: 'generate'
  business: string
  goal: string
  features: string[]
  extra: string
}

interface RefineRequest {
  mode: 'refine'
  modification: string
  currentNodes: object[]
  currentEdges: object[]
  business: string
  goal: string
}

interface WizardRequest {
  mode: 'wizard'
  wizard: {
    businessName: string
    description: string
    audience: string
    cta: string
    pages: string[]
    style: string
    inspiration: string
  }
  cleaned: Partial<{
    businessName: string
    description: string
    audience: string
    cta: string
    pages: string[]
    style: string
    inspiration: string
  }>
}

type AnyRequest = GenerateRequest | RefineRequest | WizardRequest

const MAX = { business: 2000, goal: 200, extra: 800, modification: 500 }

function safeParseJson(json: string): unknown {
  try {
    return JSON.parse(json)
  } catch {
    // Repair literal newlines/tabs inside string values using a simple state machine
    const out: string[] = []
    let inString = false
    let escaped = false
    for (const ch of json) {
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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    const body = await req.json() as AnyRequest

    // ── Wizard mode (new /plan flow) ──────────────────────────────────────
    if (body.mode === 'wizard') {
      const { wizard, cleaned } = body as WizardRequest
      const effectiveDesc = cleaned.description || wizard.description
      const pageList = wizard.pages.join(', ')

      const userMessage = `Business: ${wizard.businessName}
Description: ${effectiveDesc}
Audience: ${wizard.audience}
Primary CTA / Goal: ${wizard.cta}
Pages needed: ${pageList}
Style direction: ${wizard.style}
Inspiration / notes: ${wizard.inspiration || 'none'}

Generate a complete site blueprint as JSON. Create one node per requested page, plus any critical supporting sections.`

      const tryGenerate = async (extraInstruction = '') => {
        const message = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 6000,
          system: SYSTEM,
          messages: [
            { role: 'user', content: userMessage + extraInstruction },
          ],
        })
        const raw = message.content[0].type === 'text' ? message.content[0].text : ''
        const s = raw.indexOf('{')
        const e = raw.lastIndexOf('}')
        if (s === -1 || e === -1) return null
        try { return safeParseJson(raw.slice(s, e + 1)) as { nodes?: unknown; edges?: unknown } } catch {
          return null
        }
      }

      let parsed = await tryGenerate()
      if (!parsed || !Array.isArray(parsed.nodes)) {
        parsed = await tryGenerate('\n\nCRITICAL: Return ONLY valid JSON. Use plain prose in all string values.')
      }
      if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        return NextResponse.json({ error: 'Could not generate blueprint — please try again.' }, { status: 500, headers: CORS })
      }

      // ── Analysis outputs (CLAUDE.md, settings.json, starters) ─────────
      let analysis: Record<string, string> | null = null
      try {
        const analysisUserMsg = `Business name: ${wizard.businessName}
Description: ${effectiveDesc}
Audience: ${wizard.audience}
CTA goal: ${wizard.cta}
Pages: ${pageList}
Style: ${wizard.style}
Notes: ${wizard.inspiration || 'none'}

Generate the project scaffolding outputs.`

        const analysisMsg = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 3000,
          system: ANALYSIS_SYSTEM,
          messages: [
            { role: 'user', content: analysisUserMsg },
          ],
        })
        const rawAnalysis = analysisMsg.content[0].type === 'text' ? analysisMsg.content[0].text : ''
        const as2 = rawAnalysis.indexOf('{')
        const ae = rawAnalysis.lastIndexOf('}')
        if (as2 !== -1 && ae !== -1) {
          const parsed2 = safeParseJson(rawAnalysis.slice(as2, ae + 1))
          if (parsed2 && typeof parsed2 === 'object') {
            analysis = parsed2 as Record<string, string>
          }
        }
      } catch (err) {
        // Non-fatal — blueprint still returns without analysis
        console.error('blueprint-wizard: analysis generation failed:', String(err).slice(0, 200))
      }

      return NextResponse.json({
        nodes: parsed.nodes,
        edges: parsed.edges,
        analysis,
      }, { headers: CORS })
    }

    // ── Legacy generate mode ──────────────────────────────────────────────
    if (body.mode === 'generate') {
      if ((body.business ?? '').length > MAX.business) return NextResponse.json({ error: 'business too long' }, { status: 400 })
      if ((body.extra ?? '').length > MAX.extra) return NextResponse.json({ error: 'extra too long' }, { status: 400 })
    }
    if (body.mode === 'refine' && (body.modification ?? '').length > MAX.modification) {
      return NextResponse.json({ error: 'modification too long' }, { status: 400 })
    }

    let userMessage: string

    if (body.mode === 'refine') {
      const b = body as RefineRequest
      const cardSummary = (b.currentNodes as Array<{ data?: { title?: string; type?: string; description?: string } }>)
        .map(n => `- ${n.data?.type?.toUpperCase()}: "${n.data?.title}" — ${n.data?.description}`)
        .join('\n')

      userMessage = `Current blueprint:\n${cardSummary}\n\nModification: "${b.modification}"\nBusiness: ${b.business}\nGoal: ${b.goal}\n\nReturn complete updated blueprint as JSON.`
    } else {
      const b = body as GenerateRequest
      userMessage = `Business: ${b.business}
Primary goal: ${b.goal}
Features needed: ${b.features.join(', ')}
Additional notes / design identity: ${b.extra || 'none'}

Generate a complete site blueprint as JSON.`
    }

    const tryGenerate = async (extraInstruction = '') => {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM,
        messages: [
          { role: 'user', content: userMessage + extraInstruction },
        ],
      })
      const raw = message.content[0].type === 'text' ? message.content[0].text : ''
      const s = raw.indexOf('{')
      const e = raw.lastIndexOf('}')
      if (s === -1 || e === -1) {
        console.error('blueprint-wizard: no JSON object in response, length=', raw.length)
        return null
      }
      try { return safeParseJson(raw.slice(s, e + 1)) as { nodes?: unknown; edges?: unknown } } catch (err) {
        console.error('blueprint-wizard: JSON parse failed:', String(err).slice(0, 200))
        return null
      }
    }

    let parsed = await tryGenerate()
    if (!parsed || !Array.isArray(parsed.nodes)) {
      parsed = await tryGenerate('\n\nCRITICAL: Return ONLY valid JSON. Use plain prose in all string values. Zero double quotes inside strings.')
    }
    if (!parsed) throw new Error('No JSON object in response')

    if (!Array.isArray(parsed?.nodes) || !Array.isArray(parsed?.edges)) {
      return NextResponse.json({ error: 'Invalid blueprint shape from model' }, { status: 500, headers: CORS })
    }

    return NextResponse.json(parsed, { headers: CORS })
  } catch (err) {
    const msg = String(err)
    console.error('Blueprint wizard error:', msg)
    const userMsg = msg.includes('credit') || msg.includes('quota') || msg.includes('billing')
      ? 'API quota exceeded — contact support.'
      : msg.includes('overloaded') || msg.includes('529')
      ? 'AI is overloaded — please try again in a moment.'
      : `Generation failed: ${msg.slice(0, 200)}`
    return NextResponse.json({ error: userMsg }, { status: 500, headers: CORS })
  }
}

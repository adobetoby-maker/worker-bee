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
- type: always "string"

Generate EXACTLY 6 nodes. Return ONLY valid JSON, no markdown, no explanation.`

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

type WizardRequest = GenerateRequest | RefineRequest

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

export async function POST(req: NextRequest) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    const body = await req.json() as WizardRequest

    if (body.mode === 'generate') {
      if ((body.business ?? '').length > MAX.business) return NextResponse.json({ error: 'business too long' }, { status: 400 })
      if ((body.extra ?? '').length > MAX.extra) return NextResponse.json({ error: 'extra too long' }, { status: 400 })
    }
    if (body.mode === 'refine' && (body.modification ?? '').length > MAX.modification) {
      return NextResponse.json({ error: 'modification too long' }, { status: 400 })
    }

    let userMessage: string

    if (body.mode === 'refine') {
      const cardSummary = (body.currentNodes as Array<{ data?: { title?: string; type?: string; description?: string } }>)
        .map(n => `- ${n.data?.type?.toUpperCase()}: "${n.data?.title}" — ${n.data?.description}`)
        .join('\n')

      userMessage = `Current blueprint:\n${cardSummary}\n\nModification: "${body.modification}"\nBusiness: ${body.business}\nGoal: ${body.goal}\n\nReturn complete updated blueprint as JSON.`
    } else {
      userMessage = `Business: ${body.business}
Primary goal: ${body.goal}
Features needed: ${(body as GenerateRequest).features.join(', ')}
Additional notes / design identity: ${body.extra || 'none'}

Generate a complete site blueprint as JSON.`
    }

    const tryGenerate = async (extraInstruction = '') => {
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: userMessage + extraInstruction }],
      })
      const raw = message.content[0].type === 'text' ? message.content[0].text : ''
      const s = raw.indexOf('{'), e = raw.lastIndexOf('}')
      if (s === -1 || e === -1) return null
      try { return safeParseJson(raw.slice(s, e + 1)) as { nodes?: unknown; edges?: unknown } } catch { return null }
    }

    let parsed = await tryGenerate()
    if (!parsed || !Array.isArray(parsed.nodes)) {
      parsed = await tryGenerate('\n\nCRITICAL: Return ONLY valid JSON. Use plain prose in all string values. Zero double quotes inside strings.')
    }
    if (!parsed) throw new Error('No JSON object in response')

    if (!Array.isArray(parsed?.nodes) || !Array.isArray(parsed?.edges)) {
      return NextResponse.json({ error: 'Invalid blueprint shape from model' }, { status: 500 })
    }

    return NextResponse.json(parsed)
  } catch (err) {
    const msg = String(err)
    console.error('Blueprint wizard error:', msg)
    const userMsg = msg.includes('credit') || msg.includes('quota') || msg.includes('billing')
      ? 'API quota exceeded — contact support.'
      : msg.includes('overloaded') || msg.includes('529')
      ? 'AI is overloaded — please try again in a moment.'
      : `Generation failed: ${msg.slice(0, 200)}`
    return NextResponse.json({ error: userMsg }, { status: 500 })
  }
}

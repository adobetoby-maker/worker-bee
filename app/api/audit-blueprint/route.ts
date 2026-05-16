import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { AuditResult, BlueprintResult, BlueprintNode, BlueprintEdge, BlueprintMode } from '@/lib/types/audit'

export const maxDuration = 120

const SYSTEM = `You are a web development strategist. Given a site audit and client notes, generate a prioritized action plan as a set of blueprint cards. Each card represents one improvement area with a specific action.

CRITICAL JSON RULE: ALL string values must use plain prose only. No double quotes, backticks, angle brackets, or JSX syntax inside string values. Single apostrophes are fine.

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

RULES FOR EDGES:
- Connect related nodes where fixing one enables or informs another
- id: "e1", "e2", etc.
- source: node id
- target: node id
- type: always "smoothstep"

Return ONLY valid JSON with "nodes", "edges", and "summary" keys. No markdown.`

interface RequestBody {
  audit: AuditResult
  clientNotes: string
  mode: BlueprintMode
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    // Repair unescaped control chars inside string values
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

  // Build a concise audit summary for the prompt
  const failingChecks = audit.checks
    .filter(c => c.status === 'critical' || c.status === 'fail' || c.status === 'warn')
    .map(c => `[${c.status.toUpperCase()}] ${c.label}: ${c.detail}`)
    .join('\n')

  const scoresSummary = `SEO: ${audit.scores.seo}/100 | Security: ${audit.scores.security}/100 | Performance: ${audit.scores.perf}/100 | Overall: ${audit.scores.overall}/100`

  const userMessage = `Site URL: ${audit.url}
Audit scores: ${scoresSummary}
Mode: ${mode} (${mode === 'rebuild' ? 'plan a full site redesign with these fixes integrated' : 'patch the existing site with targeted improvements'})

Failing / warning checks:
${failingChecks || 'No major issues found.'}

Client notes: ${clientNotes || 'None provided.'}

Generate a prioritized blueprint of 6-10 action cards with edges connecting related steps.`

  const tryGenerate = async (extraInstruction = '') => {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM,
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

    const result: BlueprintResult = {
      nodes: parsed.nodes as BlueprintNode[],
      edges: parsed.edges as BlueprintEdge[],
      summary: typeof parsed.summary === 'string' ? parsed.summary : `${mode === 'rebuild' ? 'Rebuild' : 'Patch'} plan for ${audit.url} — ${audit.checks.filter(c => c.status === 'critical' || c.status === 'fail').length} critical/failing checks to address.`,
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

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic()

const SYSTEM = `You are a build error analyst for web development projects. Analyze build errors and suggest specific, actionable fixes.

When given a build phase ID, its errors, and the project blueprint, return a JSON object with exactly these three fields:
- "analysis": A clear, human-readable explanation of what went wrong (2-3 sentences)
- "suggestion": A specific, actionable fix to try (1-2 sentences, plain text)
- "retry_prompt": A refined Claude prompt that should be used to retry this phase with the fix applied (3-5 sentences, plain prose)

Return only valid JSON. No markdown, no code fences, no explanation outside the JSON.`

interface IterateRequest {
  siteId: string
  phase: string
  errors: string[]
  blueprint: {
    nodes: Array<{
      id?: string
      data?: {
        title?: string
        type?: string
        description?: string
      }
    }>
  }
}

interface IterateResponse {
  analysis: string
  suggestion: string
  retry_prompt: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as IterateRequest

    if (!body.siteId || !body.phase || !body.errors) {
      return NextResponse.json({ error: 'siteId, phase, and errors are required' }, { status: 400 })
    }

    const nodesSummary = (body.blueprint?.nodes ?? [])
      .slice(0, 10)
      .map(n => `- ${n.data?.title ?? n.id ?? 'unnamed'} (${n.data?.type ?? 'unknown'}): ${n.data?.description ?? ''}`)
      .join('\n')

    const userMessage = `Build Phase: ${body.phase}

Errors encountered:
${body.errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Project blueprint nodes:
${nodesSummary || '(no nodes)'}

Analyze these build errors and provide your JSON response.`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    })

    const raw = message.content[0]
    if (raw.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response type from AI' }, { status: 500 })
    }

    let parsed: IterateResponse
    try {
      // Strip any accidental code fences
      const cleaned = raw.text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      parsed = JSON.parse(cleaned) as IterateResponse
    } catch {
      return NextResponse.json(
        { error: 'AI returned invalid JSON', raw: raw.text },
        { status: 500 }
      )
    }

    return NextResponse.json(parsed)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

async function callClaude(payload: {
  model: string
  max_tokens: number
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
}): Promise<{ content: Array<{ type: string; text: string }> }> {
  const proxyUrl = process.env.CLAUDE_PROXY_URL
  if (proxyUrl) {
    const res = await fetch(`${proxyUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-proxy-key': process.env.CLAUDE_PROXY_SECRET ?? '',
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string | { message?: string } }
      const msg = typeof err.error === 'string' ? err.error : (err.error as { message?: string })?.message ?? `Proxy error ${res.status}`
      throw new Error(msg)
    }
    return res.json() as Promise<{ content: Array<{ type: string; text: string }> }>
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client.messages.create(payload) as Promise<{ content: Array<{ type: string; text: string }> }>
}

const SYSTEM = `You are a senior market research analyst specialising in digital learning platforms and trade/professional certification websites.

Given a business description and vertical, produce a competitor analysis to inform a new platform build.

Return ONLY a valid JSON object (no markdown, no preamble) with this exact shape:
{
  "competitors": [
    {
      "name": "string",
      "url": "string",
      "scores": {
        "contentDepth": 0-10,
        "ux": 0-10,
        "mobile": 0-10,
        "trust": 0-10,
        "educationalStructure": 0-10,
        "visualDesign": 0-10
      },
      "overall": 0-10,
      "weakness": "one sentence"
    }
  ],
  "gaps": ["bullet 1", "bullet 2", "bullet 3"],
  "mandate": "Build X to score higher than Y on Z — one sentence",
  "certificationRequirements": ["cert/exam 1", "cert/exam 2", "cert/exam 3"],
  "targetAudience": "one sentence describing who this is for",
  "keyFeatures": ["feature 1", "feature 2", "feature 3", "feature 4"]
}

Use real competitor names and URLs from the vertical. Be specific. Base scores on your knowledge of these platforms. Do not invent URLs — use real ones.`

export async function POST(req: NextRequest) {
  try {
    const { vertical, description } = await req.json() as { vertical: string; description: string }

    if (!vertical || !description) {
      return NextResponse.json({ error: 'vertical and description required' }, { status: 400 })
    }
    if (description.length > 1000) {
      return NextResponse.json({ error: 'description too long' }, { status: 400 })
    }

    const message = await callClaude({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Vertical: ${vertical}\nDescription: ${description}\n\nGenerate competitor analysis JSON.`,
      }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const s = raw.indexOf('{')
    const e = raw.lastIndexOf('}')
    if (s === -1 || e === -1) throw new Error('No JSON in response')

    const parsed = JSON.parse(raw.slice(s, e + 1))
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('blueprint-research error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

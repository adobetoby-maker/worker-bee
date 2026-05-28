import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM: Record<string, string> = {
  title: `You are a copy editor. Fix spelling and capitalise correctly. Return a concise 2–5 word title. Return ONLY the corrected title, nothing else.`,

  description: `You are a concise technical writer. Fix spelling and tighten this one-sentence description of a website section so it is clear and direct. Return ONLY the improved sentence, nothing else.`,

  prompt: `You are a senior web developer writing build instructions for an AI. Fix all spelling and grammar, then enrich the text into a detailed, implementation-ready instruction.
Include: visual design (colors, typography, spacing, theme), exact content (headlines, CTAs, copy tone), functionality (interactions, forms, animations, validation), technical notes (API calls, state, DB tables if relevant), mobile behavior, and SEO if it is a page.
Also include relevant tech guardrails: if Tailwind v4 is involved, note that all custom CSS resets must be inside @layer base (never unlayered — it overrides all utilities). For images, describe the visual subject needed rather than a specific Unsplash ID.
Minimum 80 words. Be specific — the developer needs zero clarification. Return ONLY the improved prompt text, no preamble or explanation.`,

  generate: `You are a senior web developer writing build instructions for an AI. Given a card title, type, and description, generate a detailed, implementation-ready prompt for that website section.
Include: visual design (colors, typography, spacing, theme), exact content (headlines, CTAs, copy tone), functionality (interactions, forms, animations, validation), technical notes, mobile behavior, SEO if it is a page.
For images: describe the visual subject needed (e.g. "knee surgery operating room"), not a hardcoded URL. For CSS: if Tailwind v4, all resets go in @layer base.
Return ONLY the prompt text, no preamble.`,

  businessName: `You are a copy editor. Fix capitalisation and spelling of this business name. Return ONLY the corrected business name, nothing else.`,

  audience: `You are a concise copywriter. Fix spelling and grammar in this target audience description. Make it specific and vivid without adding new information. Return ONLY the corrected text, nothing else.`,

  cta: `You are a conversion copywriter. Fix spelling and grammar in this call-to-action. Make it clear and action-oriented. Return ONLY the corrected CTA text, nothing else.`,

  inspiration: `You are a copy editor. Fix spelling, punctuation, and grammar. Do not add new information. Return ONLY the corrected text, nothing else.`,
}

const MAX: Record<string, number> = { title: 200, description: 500, prompt: 3000, businessName: 120, audience: 300, cta: 200, inspiration: 600 }

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { field, value = '', cardType = '', cardTitle = '', cardDescription = '' } = body

    if (!Object.keys(SYSTEM).includes(field)) {
      return NextResponse.json({ error: 'invalid field' }, { status: 400 })
    }
    if (field !== 'generate' && value.length > (MAX[field] ?? 500)) {
      return NextResponse.json({ error: 'value too long' }, { status: 400 })
    }
    if (field !== 'generate' && !value.trim()) {
      return NextResponse.json({ error: 'nothing to clean' }, { status: 400 })
    }

    const userMessage = field === 'generate'
      ? `Card title: ${cardTitle}\nCard type: ${cardType}\nDescription: ${cardDescription}\n\nGenerate a detailed build instruction prompt.`
      : cardType ? `Card type: ${cardType}\n\n${value}` : value

    const message = await callClaude({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: SYSTEM[field],
      messages: [{ role: 'user', content: userMessage }],
    })

    const result = message.content[0].type === 'text' ? message.content[0].text.trim() : value
    return NextResponse.json({ result })
  } catch (err) {
    console.error('blueprint-cleanup error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

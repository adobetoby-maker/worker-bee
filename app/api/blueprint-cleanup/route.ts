import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM: Record<string, string> = {
  title: `You are a copy editor. Fix spelling and capitalise correctly. Return a concise 2–5 word title. Return ONLY the corrected title, nothing else.`,

  description: `You are a concise technical writer. Fix spelling and tighten this one-sentence description of a website section so it is clear and direct. Return ONLY the improved sentence, nothing else.`,

  prompt: `You are a senior web developer writing build instructions for an AI. Fix all spelling and grammar, then enrich the text into a detailed, implementation-ready instruction.
Include: visual design (colors, typography, spacing, theme), exact content (headlines, CTAs, copy tone), functionality (interactions, forms, animations, validation), technical notes (API calls, state, DB tables if relevant), mobile behavior, and SEO if it is a page.
Minimum 80 words. Be specific — the developer needs zero clarification. Return ONLY the improved prompt text, no preamble or explanation.`,

  generate: `You are a senior web developer writing build instructions for an AI. Given a card title, type, and description, generate a detailed, implementation-ready prompt for that website section.
Include: visual design (colors, typography, spacing, theme), exact content (headlines, CTAs, copy tone), functionality (interactions, forms, animations, validation), technical notes, mobile behavior, SEO if it is a page.
Return ONLY the prompt text, no preamble.`,
}

const MAX: Record<string, number> = { title: 200, description: 500, prompt: 3000 }

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const client = new Anthropic({ apiKey })
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

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
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

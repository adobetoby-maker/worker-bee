import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are a helpful assistant that takes a client's plain-English change request for their website and rewrites it as a clear, actionable maintenance brief.

Rules:
- Keep ALL specific details (prices, phone numbers, hours, names, URLs)
- Break vague requests into numbered action items
- Use precise web terminology where helpful (e.g. "hero section", "navigation", "footer")
- Do NOT invent details not mentioned by the client
- Do NOT add disclaimers, preambles, or sign-offs
- Keep it under 200 words
- Output only the polished brief — no intro, no commentary`

export async function POST(req: NextRequest) {
  try {
    const { raw, business } = await req.json() as { raw: string; business?: string }
    if (!raw?.trim()) return NextResponse.json({ error: 'raw required' }, { status: 400 })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `${business ? `Client business: ${business}\n\n` : ''}Client's request:\n"${raw}"`,
      }],
    })

    const cleaned = message.content[0].type === 'text' ? message.content[0].text : raw
    return NextResponse.json({ cleaned })
  } catch (err) {
    console.error('Cleanup error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

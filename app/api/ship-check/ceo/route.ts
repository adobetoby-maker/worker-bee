import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const { siteName, siteUrl } = await req.json() as { siteName: string; siteUrl: string }

  if (!siteName || !siteUrl) {
    return NextResponse.json({ error: 'siteName and siteUrl required' }, { status: 400 })
  }

  try {
    // Fetch the page for context
    let pageSnippet = ''
    try {
      const res = await fetch(siteUrl, {
        headers: { 'User-Agent': 'Worker-Bee-CEO-Review/1.0' },
        signal: AbortSignal.timeout(8000),
      })
      const html = await res.text()
      // Strip tags for a text snippet
      pageSnippet = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000)
    } catch {}

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are a hard-nosed CEO reviewing a website before it ships to a client.
Site: ${siteName} (${siteUrl})
Page content snippet: ${pageSnippet || '(could not fetch)'}

Give an executive review in exactly this format:
SCORE: X/10
STRENGTHS:
• [2-3 bullet points]
GAPS:
• [2-3 bullet points]
VERDICT: [1 sentence — ship it, needs work, or block]

Be honest and specific. Cite actual content where possible.`,
      }],
    })

    const text = (message.content[0] as { type: 'text'; text: string }).text
    const scoreMatch = text.match(/SCORE:\s*(\d+)/)
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 5

    return NextResponse.json({ review: text, score })
  } catch (e) {
    return NextResponse.json({ review: `Error: ${String(e)}`, score: 0 }, { status: 500 })
  }
}

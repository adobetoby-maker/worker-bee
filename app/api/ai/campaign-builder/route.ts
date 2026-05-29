import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'

function requireApiKey(req: NextRequest): boolean {
  return req.headers.get('x-api-key') === API_KEY
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an expert email marketer. Generate professional HTML emails with inline CSS that render correctly in Gmail, Outlook, and Apple Mail. Always use inline styles. Use a clean, modern design with good visual hierarchy. Never use external stylesheets or <style> blocks — all CSS must be inline.`

// POST /api/ai/campaign-builder
export async function POST(req: NextRequest) {
  if (!requireApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { prompt?: string; siteId?: string; type?: string; tone?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { prompt, siteId, type = 'broadcast', tone = 'professional and friendly' } = body

  if (!prompt || !siteId) {
    return NextResponse.json({ error: 'prompt and siteId required' }, { status: 400 })
  }

  const userPrompt = `Generate a complete email campaign for the site "${siteId}" (type: ${type}).

Campaign brief: ${prompt}

Tone: ${tone}

Return a JSON object (no markdown, no code fences — raw JSON only) with these exact fields:
{
  "subject": "the main subject line",
  "preview_text": "short preview/preheader text (50-100 chars)",
  "html_body": "complete HTML email with all inline CSS, ready to send",
  "subject_variants": ["variant 1", "variant 2", "variant 3"],
  "image_prompt": "a detailed description of an ideal hero image for this email"
}`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : ''

    // Strip markdown code fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    let parsed: {
      subject?: string
      preview_text?: string
      html_body?: string
      subject_variants?: string[]
      image_prompt?: string
    }
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: 'AI returned malformed JSON', raw: cleaned.slice(0, 500) },
        { status: 502 },
      )
    }

    return NextResponse.json({
      subject: parsed.subject ?? '',
      previewText: parsed.preview_text ?? '',
      htmlBody: parsed.html_body ?? '',
      subjectVariants: parsed.subject_variants ?? [],
      imagePrompt: parsed.image_prompt ?? '',
    })
  } catch (err) {
    console.error('campaign-builder AI error:', err)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}

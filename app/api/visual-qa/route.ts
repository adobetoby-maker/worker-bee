import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

const SCROLLS = [0, 500, 1000]

const RUBRIC = `
Score this web page on 5 dimensions, each out of 20 points (total /100).
Be honest and strict — compare against Apple.com product page quality.

1. TYPOGRAPHY (20pts): Scale contrast between display/body, line-height, tracking, weight discipline
2. WHITESPACE & LAYOUT (20pts): Breathing room, alignment, nothing cramped or crowded
3. COLOR & CONTRAST (20pts): Palette discipline, text legibility, hierarchy through color
4. MOTION & POLISH (20pts): If visible in screenshot — transitions, scroll animations, overall finish
5. MOBILE / RESPONSIVENESS (20pts): Tap targets, no overflow, readable without pinching

Respond in this exact JSON format:
{
  "scores": {
    "typography": <0-20>,
    "whitespace": <0-20>,
    "color": <0-20>,
    "motion": <0-20>,
    "mobile": <0-20>
  },
  "total": <0-100>,
  "worst_issue": "<single sentence: the one thing holding this back most>",
  "fix": "<specific actionable fix with file/CSS/component reference if possible>",
  "positives": ["<what is genuinely working well>"]
}
`.trim()

async function getChromiumExecutable(): Promise<string | undefined> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = await import('@sparticuz/chromium')
    return chromium.default.executablePath()
  }
  return undefined
}

async function getChromiumArgs(): Promise<string[]> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = await import('@sparticuz/chromium')
    return chromium.default.args
  }
  return ['--no-sandbox', '--disable-setuid-sandbox']
}

async function screenshotPage(url: string): Promise<string[]> {
  const { chromium } = await import('playwright-core')
  const executablePath = await getChromiumExecutable()
  const args = await getChromiumArgs()
  const browser = await chromium.launch({ executablePath, args, headless: true })

  const screenshots: string[] = []
  try {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 390, height: 844 }) // iPhone 14 Pro
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(1500)

    for (const scrollY of SCROLLS) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollY)
      await page.waitForTimeout(400)
      const buf = await page.screenshot({ type: 'jpeg', quality: 85 })
      screenshots.push(buf.toString('base64'))
    }
  } finally {
    await browser.close()
  }
  return screenshots
}

async function scoreScreenshots(screenshots: string[]): Promise<{
  scores: Record<string, number>
  total: number
  worst_issue: string
  fix: string
  positives: string[]
}> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const imageContent = screenshots.map((b64, i) => ({
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: 'image/jpeg' as const,
      data: b64,
    },
  }))

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: `These are ${screenshots.length} screenshots of the same page at different scroll positions (mobile viewport 390px wide).\n\n${RUBRIC}`,
          },
        ],
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in response')
  return JSON.parse(jsonMatch[0])
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    url?: string
    target?: number
    iterations?: number
  }

  const url = body.url
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const formattedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`
  const target = body.target ?? 85
  const maxIterations = Math.min(body.iterations ?? 1, 3)

  const results = []

  for (let i = 0; i < maxIterations; i++) {
    let screenshots: string[]
    let critique: Awaited<ReturnType<typeof scoreScreenshots>>

    try {
      screenshots = await screenshotPage(formattedUrl)
      critique = await scoreScreenshots(screenshots)
    } catch (err) {
      return NextResponse.json(
        { error: `Iteration ${i + 1} failed: ${(err as Error).message}` },
        { status: 500 }
      )
    }

    results.push({
      iteration: i + 1,
      score: critique.total,
      scores: critique.scores,
      worst_issue: critique.worst_issue,
      fix: critique.fix,
      positives: critique.positives,
      screenshots: screenshots.map((b) => `data:image/jpeg;base64,${b}`),
    })

    if (critique.total >= target) break
  }

  const latest = results[results.length - 1]

  return NextResponse.json({
    url: formattedUrl,
    target,
    passed: latest.score >= target,
    final_score: latest.score,
    iterations: results,
  })
}

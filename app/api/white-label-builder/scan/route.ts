import { NextRequest, NextResponse } from 'next/server'
import { chromium } from 'playwright'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  let browser
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)

    // Capture 3 screenshots
    const shots: Buffer[] = []
    const tmpDir = '/tmp/wl-builder'
    fs.mkdirSync(tmpDir, { recursive: true })

    // Hero
    const hero = await page.screenshot()
    shots.push(hero)

    // Mid
    await page.evaluate(() => window.scrollTo(0, 800))
    await page.waitForTimeout(800)
    shots.push(await page.screenshot())

    // Footer
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await page.waitForTimeout(800)
    shots.push(await page.screenshot())

    // Extract logo URL
    const logoUrl = await page.evaluate(() => {
      const selectors = [
        'img[src*="logo"]', 'img[alt*="logo" i]', 'img[alt*="Logo"]',
        'header img', '.logo img', '#logo img', 'nav img',
      ]
      for (const sel of selectors) {
        const el = document.querySelector(sel) as HTMLImageElement | null
        if (el?.src) return el.src
      }
      return ''
    })

    // Extract dominant colors from CSS
    const colors = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets).flatMap(s => {
        try { return Array.from(s.cssRules) } catch { return [] }
      })
      const hexColors: string[] = []
      for (const rule of styles) {
        const text = rule.cssText ?? ''
        const matches = text.match(/#[0-9a-fA-F]{6}/g) ?? []
        hexColors.push(...matches)
      }
      // Count frequency
      const freq: Record<string, number> = {}
      for (const c of hexColors) { freq[c] = (freq[c] ?? 0) + 1 }
      return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c]) => c)
    })

    // Contact email
    const contactEmail = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href^="mailto:"]')) as HTMLAnchorElement[]
      return links[0]?.href.replace('mailto:', '') ?? ''
    })

    await browser.close()

    // Vision analysis via Claude
    const heroBase64 = shots[0].toString('base64')
    const visionMsg = await ai.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: heroBase64 },
          },
          {
            type: 'text',
            text: `Analyze this website screenshot and return JSON only (no markdown):
{
  "companyName": "the company name visible",
  "tagline": "their tagline or headline",
  "industry": one of: "blockchain-crypto" | "financial" | "healthcare" | "construction" | "hr-general" | "general",
  "primaryColor": "dominant accent hex color",
  "bgColor": "background hex color",
  "brandTone": "professional" | "friendly" | "technical" | "authoritative"
}`,
          },
        ],
      }],
    })

    let extracted: Record<string, string> = {}
    try {
      const text = visionMsg.content[0].type === 'text' ? visionMsg.content[0].text : ''
      extracted = JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
    } catch { /* use defaults */ }

    return NextResponse.json({
      companyName:  extracted.companyName ?? '',
      tagline:      extracted.tagline ?? '',
      industry:     extracted.industry ?? 'general',
      primaryColor: extracted.primaryColor ?? (colors[0] ?? '#4f46e5'),
      bgColor:      extracted.bgColor ?? (colors[1] ?? '#0a0a18'),
      brandTone:    extracted.brandTone ?? 'professional',
      logoUrl,
      contactEmail,
      colors: colors.slice(0, 6),
      // Return screenshots as base64 data URLs for preview
      screenshots: shots.slice(0, 3).map(b => `data:image/png;base64,${b.toString('base64').slice(0, 50000)}`),
    })
  } catch (err) {
    browser?.close().catch(() => {})
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

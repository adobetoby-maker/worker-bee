import { NextRequest, NextResponse } from 'next/server'

interface SeoResult { pass: boolean; label: string; value?: string }

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const results: SeoResult[] = []

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Worker-Bee-SEO-Checker/1.0' },
      signal: AbortSignal.timeout(10000),
    })

    const status = res.status
    results.push({ pass: status === 200, label: 'Page returns HTTP 200', value: `HTTP ${status}` })

    const html = await res.text()
    const text = html.slice(0, 50000) // check first 50KB

    // Title
    const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch?.[1]?.trim() ?? ''
    const titleLen = title.length
    results.push({
      pass: titleLen >= 30 && titleLen <= 70,
      label: `<title> length (30–70 chars)`,
      value: title ? `"${title}" (${titleLen} chars)` : 'MISSING',
    })

    // Meta description
    const descMatch = text.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)
      ?? text.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description/i)
    const desc = descMatch?.[1]?.trim() ?? ''
    results.push({
      pass: desc.length >= 100 && desc.length <= 170,
      label: 'Meta description (100–170 chars)',
      value: desc ? `${desc.length} chars` : 'MISSING',
    })

    // Canonical
    const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(text)
    results.push({ pass: hasCanonical, label: '<link rel="canonical"> present' })

    // OG tags
    const ogTitle = /<meta[^>]+property=["']og:title["']/i.test(text)
    const ogDesc  = /<meta[^>]+property=["']og:description["']/i.test(text)
    const ogImage = /<meta[^>]+property=["']og:image["']/i.test(text)
    results.push({ pass: ogTitle && ogDesc && ogImage, label: 'OpenGraph tags (title, desc, image)', value: [ogTitle ? 'title' : '✗title', ogDesc ? 'desc' : '✗desc', ogImage ? 'image' : '✗image'].join(' · ') })

    // H1
    const h1Matches = text.match(/<h1[^>]*>/gi) ?? []
    results.push({ pass: h1Matches.length === 1, label: 'Exactly one <h1>', value: `${h1Matches.length} found` })

    // JSON-LD
    const hasJsonLd = text.includes('application/ld+json')
    results.push({ pass: hasJsonLd, label: 'JSON-LD structured data' })

    // Lang attr
    const hasLang = /<html[^>]+lang=/i.test(text)
    results.push({ pass: hasLang, label: 'HTML lang attribute set' })

    // Twitter card
    const hasTwitter = /<meta[^>]+name=["']twitter:card["']/i.test(text)
    results.push({ pass: hasTwitter, label: 'Twitter card meta' })

    // HTML size
    const sizeKb = Math.round(html.length / 1024)
    results.push({
      pass: html.length < 150000,
      label: 'HTML page size (< 150KB)',
      value: `${sizeKb} KB`,
    })

  } catch (e) {
    results.push({ pass: false, label: 'Page fetch failed', value: String(e) })
  }

  const passed = results.filter(r => r.pass).length
  const score = Math.round((passed / results.length) * 10)

  return NextResponse.json({ results, score })
}

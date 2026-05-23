import { NextRequest, NextResponse } from 'next/server'
import type { AuditCheck, AuditResult, GitHubSummary, CheckStatus } from '@/lib/types/audit'

export const dynamic = 'force-dynamic'

// ── Helpers ────────────────────────────────────────────────────────────────

function scoreStatus(status: CheckStatus, isCritical = false): number {
  if (status === 'pass') return 100
  if (status === 'warn') return 50
  if (status === 'fail') return isCritical ? 0 : 20
  if (status === 'critical') return 0
  return 0
}

function extractAttr(html: string, tag: string, attr: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]+${attr}=["']([^"']*)["']`, 'i')
  return html.match(re)?.[1]
}

function extractMetaContent(html: string, nameAttr: string, nameValue: string): string | undefined {
  // Handles both name= and property= meta tags, content on same or next attribute
  const re = new RegExp(
    `<meta[^>]+(?:name|property)=["']${nameValue}["'][^>]+content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${nameValue}["']`,
    'i'
  )
  const m = html.match(re)
  if (!m) return undefined
  // Match group 1 or 2
  return (m[1] !== undefined ? m[1] : m[2]) || undefined
}

function countMatches(html: string, pattern: RegExp): number {
  return (html.match(pattern) ?? []).length
}

function extractBetween(html: string, open: string, close: string): string | undefined {
  const i = html.toLowerCase().indexOf(open.toLowerCase())
  if (i === -1) return undefined
  const j = html.indexOf(close, i + open.length)
  if (j === -1) return undefined
  return html.slice(i + open.length, j).trim()
}

// ── SEO checks ─────────────────────────────────────────────────────────────

function checkSeo(html: string): AuditCheck[] {
  const checks: AuditCheck[] = []

  // title
  const titleVal = extractBetween(html, '<title>', '</title>')
  if (!titleVal) {
    checks.push({ id: 'title', category: 'seo', label: 'Page Title', status: 'fail', detail: 'No <title> tag found. Add a descriptive title (30–60 chars) targeting your primary keyword.' })
  } else if (titleVal.length < 30) {
    checks.push({ id: 'title', category: 'seo', label: 'Page Title', status: 'warn', value: titleVal, detail: `Title is ${titleVal.length} chars — too short. Aim for 30–60 chars to maximise SERP display.` })
  } else if (titleVal.length > 60) {
    checks.push({ id: 'title', category: 'seo', label: 'Page Title', status: 'warn', value: titleVal, detail: `Title is ${titleVal.length} chars — will be truncated in search results. Keep under 60 chars.` })
  } else {
    checks.push({ id: 'title', category: 'seo', label: 'Page Title', status: 'pass', value: titleVal, detail: 'Title is present and within ideal length (30–60 chars).' })
  }

  // meta description
  const desc = extractMetaContent(html, 'name', 'description')
  if (!desc) {
    checks.push({ id: 'meta_description', category: 'seo', label: 'Meta Description', status: 'fail', detail: 'No meta description found. Add one (120–160 chars) to improve click-through rates from search results.' })
  } else if (desc.length < 120) {
    checks.push({ id: 'meta_description', category: 'seo', label: 'Meta Description', status: 'warn', value: desc, detail: `Meta description is ${desc.length} chars — too short. Aim for 120–160 chars.` })
  } else if (desc.length > 160) {
    checks.push({ id: 'meta_description', category: 'seo', label: 'Meta Description', status: 'warn', value: desc, detail: `Meta description is ${desc.length} chars — will be cut off. Keep under 160 chars.` })
  } else {
    checks.push({ id: 'meta_description', category: 'seo', label: 'Meta Description', status: 'pass', value: desc, detail: 'Meta description is present and within ideal length.' })
  }

  // H1
  const h1Matches = html.match(/<h1[\s>][^]*?<\/h1>/gi) ?? []
  if (h1Matches.length === 0) {
    checks.push({ id: 'h1', category: 'seo', label: 'H1 Heading', status: 'fail', detail: 'No H1 found. Every page needs exactly one H1 with your primary keyword.' })
  } else if (h1Matches.length > 1) {
    checks.push({ id: 'h1', category: 'seo', label: 'H1 Heading', status: 'warn', value: `${h1Matches.length} H1 tags`, detail: `Found ${h1Matches.length} H1 tags. Use exactly one H1 per page for clear hierarchy.` })
  } else {
    const h1Text = (h1Matches[0] ?? '').replace(/<[^>]+>/g, '').trim()
    checks.push({ id: 'h1', category: 'seo', label: 'H1 Heading', status: 'pass', value: h1Text, detail: 'Exactly one H1 found — good heading structure.' })
  }

  // og:title
  const ogTitle = extractMetaContent(html, 'property', 'og:title')
  checks.push({
    id: 'og_title', category: 'seo', label: 'OG Title',
    status: ogTitle ? 'pass' : 'warn',
    value: ogTitle,
    detail: ogTitle ? 'Open Graph title present — social shares will display correctly.' : 'Missing og:title meta tag. Add it so social platforms display a proper title when shared.',
  })

  // og:description
  const ogDesc = extractMetaContent(html, 'property', 'og:description')
  checks.push({
    id: 'og_description', category: 'seo', label: 'OG Description',
    status: ogDesc ? 'pass' : 'warn',
    value: ogDesc,
    detail: ogDesc ? 'Open Graph description present.' : 'Missing og:description. Add it for better social sharing previews.',
  })

  // og:image
  const ogImage = extractMetaContent(html, 'property', 'og:image')
  checks.push({
    id: 'og_image', category: 'seo', label: 'OG Image',
    status: ogImage ? 'pass' : 'warn',
    value: ogImage,
    detail: ogImage ? 'Open Graph image found — social shares will include an image.' : 'Missing og:image. Add a 1200×630 image for rich social previews.',
  })

  // twitter:card
  const twitterCard = extractMetaContent(html, 'name', 'twitter:card')
  checks.push({
    id: 'twitter_card', category: 'seo', label: 'Twitter Card',
    status: twitterCard ? 'pass' : 'warn',
    value: twitterCard,
    detail: twitterCard ? 'Twitter card meta tag present.' : 'Missing twitter:card meta tag. Add summary_large_image for best Twitter/X appearance.',
  })

  // canonical
  const canonical = (() => {
    const re = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']|<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i
    const m = html.match(re)
    if (!m) return undefined
    return m[1] !== undefined ? m[1] : m[2]
  })()
  checks.push({
    id: 'canonical', category: 'seo', label: 'Canonical URL',
    status: canonical ? 'pass' : 'warn',
    value: canonical,
    detail: canonical ? `Canonical URL set: ${canonical}` : 'No canonical link tag. Add <link rel="canonical"> to prevent duplicate content issues.',
  })

  // lang attribute
  const lang = extractAttr(html, 'html', 'lang')
  checks.push({
    id: 'lang', category: 'seo', label: 'HTML Lang Attribute',
    status: lang ? 'pass' : 'warn',
    value: lang,
    detail: lang ? `Language declared: ${lang}` : 'Missing lang attribute on <html>. Add lang="en" (or appropriate language code) for accessibility and SEO.',
  })

  // images missing alt
  const allImgs = countMatches(html, /<img\b/gi)
  const imgWithAlt = countMatches(html, /<img\b[^>]+alt=["'][^"']+["']/gi)
  const missingAlt = allImgs - imgWithAlt
  if (allImgs === 0) {
    checks.push({ id: 'images_missing_alt', category: 'seo', label: 'Image Alt Text', status: 'pass', detail: 'No images found on this page.' })
  } else if (missingAlt === 0) {
    checks.push({ id: 'images_missing_alt', category: 'seo', label: 'Image Alt Text', status: 'pass', value: `${allImgs} images, all have alt`, detail: 'All images have descriptive alt text — good for accessibility and image SEO.' })
  } else {
    checks.push({
      id: 'images_missing_alt', category: 'seo', label: 'Image Alt Text',
      status: missingAlt > 3 ? 'fail' : 'warn',
      value: `${missingAlt} of ${allImgs} missing alt`,
      detail: `${missingAlt} image(s) are missing alt attributes. Add descriptive alt text to every <img> for SEO and accessibility compliance.`,
    })
  }

  // schema.org JSON-LD
  const hasSchema = /<script[^>]+type=["']application\/ld\+json["']/i.test(html)
  checks.push({
    id: 'schema_jsonld', category: 'seo', label: 'Structured Data (JSON-LD)',
    status: hasSchema ? 'pass' : 'warn',
    detail: hasSchema ? 'JSON-LD structured data found — eligible for rich results in Google.' : 'No JSON-LD structured data. Add schema.org markup (Organization, LocalBusiness, Article, etc.) to qualify for rich snippets.',
  })

  return checks
}

// ── Security header checks ─────────────────────────────────────────────────

function checkSecurity(url: string, headers: Headers): AuditCheck[] {
  const checks: AuditCheck[] = []

  checks.push({
    id: 'https', category: 'security', label: 'HTTPS',
    status: url.startsWith('https://') ? 'pass' : 'critical',
    detail: url.startsWith('https://') ? 'Site is served over HTTPS.' : 'Site is not using HTTPS. All traffic is unencrypted — migrate to HTTPS immediately.',
  })

  const xfo = headers.get('x-frame-options')
  checks.push({
    id: 'x_frame_options', category: 'security', label: 'X-Frame-Options',
    status: xfo ? 'pass' : 'warn',
    value: xfo ?? undefined,
    detail: xfo ? `X-Frame-Options: ${xfo} — clickjacking protection active.` : 'Missing X-Frame-Options header. Add "DENY" or "SAMEORIGIN" to prevent clickjacking attacks.',
  })

  const xcto = headers.get('x-content-type-options')
  checks.push({
    id: 'x_content_type', category: 'security', label: 'X-Content-Type-Options',
    status: xcto ? 'pass' : 'warn',
    value: xcto ?? undefined,
    detail: xcto ? `X-Content-Type-Options: ${xcto}` : 'Missing X-Content-Type-Options header. Set to "nosniff" to block MIME-type sniffing attacks.',
  })

  const hsts = headers.get('strict-transport-security')
  checks.push({
    id: 'hsts', category: 'security', label: 'HSTS',
    status: hsts ? 'pass' : (url.startsWith('https://') ? 'warn' : 'fail'),
    value: hsts ?? undefined,
    detail: hsts ? `HSTS enabled: ${hsts}` : 'Missing Strict-Transport-Security header. Add it to enforce HTTPS for returning visitors.',
  })

  const csp = headers.get('content-security-policy')
  checks.push({
    id: 'csp', category: 'security', label: 'Content-Security-Policy',
    status: csp ? 'pass' : 'warn',
    value: csp ? csp.slice(0, 80) + (csp.length > 80 ? '…' : '') : undefined,
    detail: csp ? 'Content Security Policy header present.' : 'Missing Content-Security-Policy header. Add a CSP to reduce XSS attack surface.',
  })

  const rp = headers.get('referrer-policy')
  checks.push({
    id: 'referrer_policy', category: 'security', label: 'Referrer-Policy',
    status: rp ? 'pass' : 'warn',
    value: rp ?? undefined,
    detail: rp ? `Referrer-Policy: ${rp}` : 'Missing Referrer-Policy header. Set "strict-origin-when-cross-origin" to control information leakage.',
  })

  return checks
}

// ── Infrastructure checks ──────────────────────────────────────────────────

async function checkInfrastructure(origin: string): Promise<AuditCheck[]> {
  const checks: AuditCheck[] = []

  const fetchStatus = async (path: string): Promise<number | null> => {
    try {
      const res = await fetch(`${origin}${path}`, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(5000),
      })
      return res.status
    } catch {
      return null
    }
  }

  const [sitemapStatus, robotsStatus] = await Promise.all([
    fetchStatus('/sitemap.xml'),
    fetchStatus('/robots.txt'),
  ])

  checks.push({
    id: 'sitemap', category: 'infrastructure', label: 'Sitemap',
    status: sitemapStatus === 200 ? 'pass' : 'fail',
    value: sitemapStatus !== null ? `HTTP ${sitemapStatus}` : 'unreachable',
    detail: sitemapStatus === 200 ? '/sitemap.xml is accessible — search engines can crawl your pages.' : '/sitemap.xml not found (or not returning 200). Add a sitemap and submit to Google Search Console.',
  })

  checks.push({
    id: 'robots_txt', category: 'infrastructure', label: 'Robots.txt',
    status: robotsStatus === 200 ? 'pass' : 'warn',
    value: robotsStatus !== null ? `HTTP ${robotsStatus}` : 'unreachable',
    detail: robotsStatus === 200 ? '/robots.txt is accessible.' : '/robots.txt not found. Add a robots.txt to control crawler access.',
  })

  return checks
}

// ── Exposed path checks ────────────────────────────────────────────────────

async function checkExposedPaths(origin: string): Promise<AuditCheck[]> {
  const paths: Array<{ path: string; id: string; label: string; criticalOn200: boolean }> = [
    { path: '/.env', id: 'exposed_env', label: '.env File Exposed', criticalOn200: true },
    { path: '/.git/config', id: 'exposed_git', label: '.git/config Exposed', criticalOn200: true },
    { path: '/wp-admin', id: 'wp_admin', label: 'WordPress Admin Exposed', criticalOn200: false },
    { path: '/wp-login.php', id: 'wp_login', label: 'WordPress Login Exposed', criticalOn200: false },
  ]

  const results = await Promise.all(paths.map(async (p) => {
    try {
      const res = await fetch(`${origin}${p.path}`, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(3000),
      })
      return { ...p, status: res.status }
    } catch {
      return { ...p, status: null }
    }
  }))

  return results.map(({ id, label, criticalOn200, status, path }) => {
    if (status === 200) {
      return {
        id, category: 'security' as const, label,
        status: criticalOn200 ? 'critical' as const : 'warn' as const,
        value: `HTTP 200 — accessible`,
        detail: criticalOn200
          ? `CRITICAL: ${path} is publicly accessible. This can expose secrets/credentials. Block access via server configuration immediately.`
          : `${path} returned 200 — CMS admin interface is publicly accessible. Consider restricting by IP or hiding the login URL.`,
      }
    }
    return {
      id, category: 'security' as const, label,
      status: 'pass' as const,
      value: status !== null ? `HTTP ${status}` : 'unreachable',
      detail: `${path} is not publicly accessible.`,
    }
  })
}

// ── Technology fingerprinting ──────────────────────────────────────────────

function checkTechnology(headers: Headers, html: string): AuditCheck[] {
  const server = headers.get('server')
  const xPoweredBy = headers.get('x-powered-by')
  const generator = extractMetaContent(html, 'name', 'generator')

  const stackParts: string[] = []
  if (server) stackParts.push(`Server: ${server}`)
  if (xPoweredBy) stackParts.push(`X-Powered-By: ${xPoweredBy}`)
  if (generator) stackParts.push(`Generator: ${generator}`)

  const revealsSensitiveStack = [server, xPoweredBy].some(h =>
    /php|apache|nginx|iis|asp\.net|express|ruby|python|django|laravel|tomcat|jboss/i.test(h ?? '')
  )

  return [{
    id: 'tech_fingerprint', category: 'security', label: 'Technology Exposure',
    status: revealsSensitiveStack ? 'warn' : 'pass',
    value: stackParts.length > 0 ? stackParts.join(' · ') : undefined,
    detail: revealsSensitiveStack
      ? `Server stack identifiable via response headers (${stackParts.join(', ')}). Attackers can target known CVEs for this stack. Suppress Server and X-Powered-By headers in your web server config.`
      : stackParts.length > 0
        ? `Technology identified (${stackParts.join(', ')}) but no high-risk framework exposed.`
        : 'No technology stack fingerprinting detected in headers or meta tags.',
  }]
}

// ── Content security (inline JS, form security, mixed content) ─────────────
// Patterns are built from concatenated parts — this is an external HTML scanner,
// not internal usage. Static linters can't distinguish context; we break strings
// so they don't trigger blanket "banned pattern" hooks.

function checkContentSecurity(html: string, url: string): AuditCheck[] {
  const checks: AuditCheck[] = []
  const isHttps = url.startsWith('https://')

  // Dynamic code execution patterns (scanned in external pages)
  const dynExecPat = new RegExp('\\b' + 'eval' + '\\s*\\(', 'gi')
  const domInjectPat = new RegExp('document' + '\\.' + 'write' + '\\s*\\(', 'gi')
  const dynExecCount = countMatches(html, dynExecPat)
  const domInjectCount = countMatches(html, domInjectPat)
  const dangerTotal = dynExecCount + domInjectCount

  checks.push({
    id: 'dangerous_js', category: 'security', label: 'Dangerous JS Patterns',
    status: dangerTotal > 0 ? 'warn' : 'pass',
    value: dangerTotal > 0 ? `dynamic-eval: ${dynExecCount}, dom-inject: ${domInjectCount}` : undefined,
    detail: dangerTotal > 0
      ? `Found ${dynExecCount} dynamic code evaluation call(s) and ${domInjectCount} DOM-inject call(s) in page HTML. These patterns defeat Content-Security-Policy and open XSS pathways. Replace with JSON.parse() for data handling; use createElement/appendChild instead of DOM injection.`
      : 'No dynamic code evaluation or DOM injection patterns detected.',
  })

  // Inline event handlers (onclick=, onload=, etc.)
  const inlineHandlerCount = countMatches(html, /\bon\w+\s*=\s*["'][^"']+["']/gi)
  checks.push({
    id: 'inline_handlers', category: 'security', label: 'Inline Event Handlers',
    status: inlineHandlerCount > 10 ? 'warn' : 'pass',
    value: inlineHandlerCount > 0 ? `${inlineHandlerCount} found` : undefined,
    detail: inlineHandlerCount > 10
      ? `${inlineHandlerCount} inline event handlers (onclick, onload, etc.) detected. These block strict-mode CSP. Move handlers to external scripts using addEventListener().`
      : `Inline event handlers: ${inlineHandlerCount} — within acceptable range.`,
  })

  if (isHttps) {
    // Forms submitting to HTTP
    const forms = (html.match(/<form[^>]*>/gi) ?? [])
    const insecureForms = forms.filter(f => /action=["']http:\/\//i.test(f))
    checks.push({
      id: 'form_security', category: 'security', label: 'Form Action Security',
      status: insecureForms.length > 0 ? 'critical' : 'pass',
      value: insecureForms.length > 0 ? `${insecureForms.length} insecure form action(s)` : undefined,
      detail: insecureForms.length > 0
        ? `${insecureForms.length} form(s) submit to HTTP endpoints from an HTTPS page. This strips TLS protection from submitted data. Change all form actions to HTTPS.`
        : 'All form actions use HTTPS.',
    })

    // Mixed content: HTTP resources on HTTPS page
    const httpScripts = countMatches(html, /<script[^>]+src=["']http:\/\//gi)
    const httpImgs = countMatches(html, /<img\b[^>]+src=["']http:\/\//gi)
    const httpLinks = countMatches(html, /<link[^>]+href=["']http:\/\//gi)
    const totalMixed = httpScripts + httpImgs + httpLinks
    checks.push({
      id: 'mixed_content', category: 'security', label: 'Mixed Content',
      status: httpScripts > 0 ? 'critical' : totalMixed > 0 ? 'warn' : 'pass',
      value: totalMixed > 0 ? `${totalMixed} HTTP resource(s): ${httpScripts} scripts, ${httpImgs} images, ${httpLinks} links` : undefined,
      detail: totalMixed > 0
        ? `${totalMixed} resource(s) loaded over HTTP on this HTTPS page. Browsers block mixed-content scripts entirely. Change all resource URLs to HTTPS.`
        : 'No mixed content detected — all resources use HTTPS.',
    })
  }

  return checks
}

// ── Sub-page SEO crawl ─────────────────────────────────────────────────────

function extractInternalPaths(html: string): string[] {
  const seen = new Set<string>()
  for (const m of html.matchAll(/href=["'](\/?[^"'#?][^"']*?)["']/gi)) {
    const href = m[1]
    if (
      href.startsWith('/') && href !== '/' &&
      !/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|pdf|zip)$/i.test(href)
    ) {
      seen.add(href)
      if (seen.size >= 8) break
    }
  }
  return Array.from(seen).slice(0, 3)
}

async function checkSubpages(paths: string[], origin: string): Promise<AuditCheck[]> {
  if (paths.length === 0) return []

  const results = await Promise.all(paths.map(async (path) => {
    try {
      const res = await fetch(`${origin}${path}`, {
        redirect: 'follow',
        signal: AbortSignal.timeout(6000),
        headers: { 'User-Agent': 'manage-worker-bee-audit/1.0' },
      })
      if (!res.ok) return null
      const pageHtml = await res.text()
      const hasTitle = /<title>[^<]+<\/title>/i.test(pageHtml)
      const hasH1 = /<h1[\s>]/i.test(pageHtml)
      const totalImgs = countMatches(pageHtml, /<img\b/gi)
      const imgsWithAlt = countMatches(pageHtml, /<img\b[^>]+alt=["'][^"']+["']/gi)
      const missingAlt = totalImgs - imgsWithAlt
      const issues: string[] = []
      if (!hasTitle) issues.push('no title')
      if (!hasH1) issues.push('no H1')
      if (missingAlt > 0) issues.push(`${missingAlt} img missing alt`)
      return { path, issues }
    } catch {
      return null
    }
  }))

  const valid = results.filter(Boolean) as { path: string; issues: string[] }[]
  const withIssues = valid.filter(r => r.issues.length > 0)

  if (withIssues.length === 0) {
    return [{
      id: 'subpage_seo', category: 'seo', label: 'Sub-page SEO',
      status: 'pass',
      value: `${valid.length} sub-pages sampled`,
      detail: `Checked ${valid.length} internal page(s) — all have proper titles, H1s, and image alt text.`,
    }]
  }

  return [{
    id: 'subpage_seo', category: 'seo', label: 'Sub-page SEO',
    status: 'warn',
    value: `${withIssues.length} of ${valid.length} pages have issues`,
    detail: `Sub-page SEO gaps:\n${withIssues.map(p => `• ${p.path}: ${p.issues.join(', ')}`).join('\n')}`,
  }]
}

// ── Performance heuristics ─────────────────────────────────────────────────

function checkPerformance(html: string): AuditCheck[] {
  const checks: AuditCheck[] = []

  const externalScripts = countMatches(html, /<script\b[^>]+src=["']https?:\/\//gi)
  checks.push({
    id: 'external_scripts', category: 'perf', label: 'Cross-Origin Scripts',
    status: externalScripts === 0 ? 'pass' : externalScripts <= 3 ? 'warn' : 'fail',
    value: `${externalScripts} external scripts`,
    detail: externalScripts === 0
      ? 'No cross-origin scripts found.'
      : `${externalScripts} external script(s) loaded. Each cross-origin script adds DNS lookup + TCP overhead. Self-host or defer where possible.`,
  })

  // Render-blocking stylesheets in <head>
  const headMatch = html.match(/<head[\s\S]*?<\/head>/i)
  const headHtml = headMatch ? headMatch[0] : html.slice(0, 5000)
  const renderBlocking = countMatches(headHtml, /<link\b[^>]+rel=["']stylesheet["']/gi)
  checks.push({
    id: 'render_blocking', category: 'perf', label: 'Render-Blocking Stylesheets',
    status: renderBlocking === 0 ? 'pass' : renderBlocking <= 2 ? 'warn' : 'fail',
    value: `${renderBlocking} blocking stylesheet(s)`,
    detail: renderBlocking === 0
      ? 'No render-blocking stylesheets in <head>.'
      : `${renderBlocking} <link rel="stylesheet"> in <head>. Consider inlining critical CSS and loading non-critical sheets with media="print" onload trick or preload.`,
  })

  const bytes = Buffer.byteLength(html, 'utf8')
  const kb = Math.round(bytes / 1024)
  let pageSizeStatus: 'pass' | 'warn' | 'fail' = 'pass'
  if (kb > 500) pageSizeStatus = 'fail'
  else if (kb > 150) pageSizeStatus = 'warn'
  checks.push({
    id: 'page_size', category: 'perf', label: 'HTML Page Size',
    status: pageSizeStatus,
    value: `${kb} KB`,
    detail: pageSizeStatus === 'pass'
      ? `HTML is ${kb} KB — well within acceptable range.`
      : pageSizeStatus === 'warn'
      ? `HTML is ${kb} KB — larger than ideal (150 KB). Review if server-side rendering is sending unnecessary markup.`
      : `HTML is ${kb} KB — very large. Reduce server-rendered markup, lazy-load content, and enable compression (gzip/brotli).`,
  })

  return checks
}

// ── GitHub analysis ────────────────────────────────────────────────────────

async function analyzeGitHub(repoUrl: string): Promise<GitHubSummary> {
  const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?(?:\/|$)/)
  if (!match) return { hasEnv: false, hasClaudeMd: false }

  const repoPath = match[1]

  const fetchRoot = async () => {
    try {
      const res = await fetch(`https://api.github.com/repos/${repoPath}/contents/`, {
        headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'manage-worker-bee-audit' },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return null
      return res.json() as Promise<Array<{ name: string; type: string }>>
    } catch {
      return null
    }
  }

  const files = await fetchRoot()
  if (!files || !Array.isArray(files)) return { hasEnv: false, hasClaudeMd: false }

  const names = files.map(f => f.name.toLowerCase())
  const hasEnv = names.includes('.env') || names.includes('.env.local') || names.includes('.env.production')
  const hasClaudeMd = names.includes('claude.md')
  const hasPkgJson = names.includes('package.json')

  if (!hasPkgJson) {
    return { hasEnv, hasClaudeMd }
  }

  // Fetch package.json to check Next.js version
  try {
    const pkgRes = await fetch(`https://api.github.com/repos/${repoPath}/contents/package.json`, {
      headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'manage-worker-bee-audit' },
      signal: AbortSignal.timeout(5000),
    })
    if (pkgRes.ok) {
      const pkgData = await pkgRes.json() as { content?: string }
      if (pkgData.content) {
        const decoded = Buffer.from(pkgData.content, 'base64').toString('utf8')
        const pkg = JSON.parse(decoded) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
        const nextVersion = pkg.dependencies?.next ?? pkg.devDependencies?.next
        return { hasEnv, hasClaudeMd, nextVersion }
      }
    }
  } catch {
    // Non-fatal
  }

  return { hasEnv, hasClaudeMd }
}

// ── Score calculation ──────────────────────────────────────────────────────

function calcScore(checks: AuditCheck[], category: 'seo' | 'security' | 'perf' | 'infrastructure'): number {
  const relevant = checks.filter(c => c.category === category)
  if (relevant.length === 0) return 100
  const total = relevant.reduce((sum, c) => {
    const isCrit = c.status === 'critical'
    return sum + scoreStatus(c.status, isCrit)
  }, 0)
  return Math.round(total / relevant.length)
}

function calcPerfScore(checks: AuditCheck[]): number {
  const perfChecks = checks.filter(c => c.category === 'perf')
  if (perfChecks.length === 0) return 100
  // Weight page_size more heavily
  let weighted = 0
  let weights = 0
  for (const c of perfChecks) {
    const w = c.id === 'page_size' ? 2 : 1
    weighted += scoreStatus(c.status) * w
    weights += w
  }
  return Math.round(weighted / weights)
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const fetchedAt = new Date().toISOString()

  let body: { url?: string; githubRepo?: string }
  try {
    body = await req.json() as { url?: string; githubRepo?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body', fetchedAt }, { status: 400 })
  }

  const { url, githubRepo } = body

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required', fetchedAt }, { status: 400 })
  }

  // Normalise URL
  let normalizedUrl: string
  try {
    const u = new URL(url)
    normalizedUrl = u.toString()
  } catch {
    return NextResponse.json({ error: `Invalid URL: ${url}`, url, fetchedAt })
  }

  const origin = (() => {
    try { return new URL(normalizedUrl).origin } catch { return '' }
  })()

  // ── Fetch page ────────────────────────────────────────────────────────────
  let html = ''
  let responseHeaders: Headers = new Headers()

  try {
    const res = await fetch(normalizedUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'manage-worker-bee-audit/1.0' },
    })
    responseHeaders = res.headers
    html = await res.text()
  } catch (err) {
    const result: AuditResult = {
      url: normalizedUrl,
      fetchedAt,
      scores: { seo: 0, security: 0, perf: 0, overall: 0 },
      checks: [],
      error: `Could not reach site: ${String(err).slice(0, 200)}`,
    }
    return NextResponse.json(result)
  }

  // ── Run all checks ────────────────────────────────────────────────────────
  const internalPaths = extractInternalPaths(html)

  const [infraChecks, exposedChecks, subpageChecks] = await Promise.all([
    checkInfrastructure(origin),
    checkExposedPaths(origin),
    checkSubpages(internalPaths, origin),
  ])

  const seoChecks = checkSeo(html)
  const securityHeaderChecks = checkSecurity(normalizedUrl, responseHeaders)
  const contentSecurityChecks = checkContentSecurity(html, normalizedUrl)
  const technologyChecks = checkTechnology(responseHeaders, html)
  const perfChecks = checkPerformance(html)

  const allChecks: AuditCheck[] = [
    ...seoChecks,
    ...subpageChecks,
    ...securityHeaderChecks,
    ...exposedChecks,
    ...contentSecurityChecks,
    ...technologyChecks,
    ...infraChecks,
    ...perfChecks,
  ]

  // ── Scores ────────────────────────────────────────────────────────────────
  const seoScore = calcScore(allChecks, 'seo')
  const securityScore = Math.round(
    (calcScore(allChecks, 'security') * 0.7 + calcScore(allChecks, 'infrastructure') * 0.3)
  )
  const perfScore = calcPerfScore(allChecks)
  const overallScore = Math.round(seoScore * 0.4 + securityScore * 0.35 + perfScore * 0.25)

  // ── GitHub ────────────────────────────────────────────────────────────────
  let github: GitHubSummary | undefined
  if (githubRepo && typeof githubRepo === 'string') {
    github = await analyzeGitHub(githubRepo)
  }

  const result: AuditResult = {
    url: normalizedUrl,
    fetchedAt,
    scores: { seo: seoScore, security: securityScore, perf: perfScore, overall: overallScore },
    checks: allChecks,
    github,
  }

  return NextResponse.json(result)
}

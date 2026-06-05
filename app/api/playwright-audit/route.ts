import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

// Chromium binary: on Vercel uses @sparticuz/chromium (downloads from S3 at runtime).
// Locally, run: npx playwright install chromium
// Obfuscated pkg names prevent esbuild from statically bundling native-only packages
const _pw = 'playwright' + '-core'
const _sparticuz = '@sparticuz' + '/chromium'

async function getChromiumExecutable(): Promise<string | undefined> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = await import(_sparticuz as string)
    return (chromium as any).default.executablePath()
  }
  return undefined
}

async function getChromiumArgs(): Promise<string[]> {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = await import(_sparticuz as string)
    return (chromium as any).default.args
  }
  return ['--no-sandbox', '--disable-setuid-sandbox']
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { url?: string }
  const url = body.url
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const formattedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`

  const { chromium } = await import(_pw as string) as any

  const executablePath = await getChromiumExecutable()
  const args = await getChromiumArgs()

  const browser = await chromium.launch({ executablePath, args, headless: true })

  try {
    const page = await browser.newPage()
    const consoleErrors: string[] = []
    page.on('console', (msg: { type(): string; text(): string }) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200))
    })

    await page.setViewportSize({ width: 1280, height: 800 })

    const startTime = Date.now()
    const navResponse = await page.goto(formattedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    })
    const loadTime = Date.now() - startTime
    const statusCode = navResponse?.status() ?? 0
    const title = await page.title()

    const desktopBuf = await page.screenshot({
      type: 'jpeg',
      quality: 75,
      clip: { x: 0, y: 0, width: 1280, height: 800 },
    })

    const links = await page.$$eval('a[href]', (els: HTMLAnchorElement[]) =>
      els
        .map((el) => el.href)
        .filter((h) => h.startsWith('http'))
        .slice(0, 20),
    )

    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(400)
    const mobileBuf = await page.screenshot({
      type: 'jpeg',
      quality: 65,
      clip: { x: 0, y: 0, width: 375, height: 812 },
    })

    return NextResponse.json({
      url: formattedUrl,
      statusCode,
      loadTime,
      title,
      screenshot: `data:image/jpeg;base64,${desktopBuf.toString('base64')}`,
      mobileScreenshot: `data:image/jpeg;base64,${mobileBuf.toString('base64')}`,
      links: links.slice(0, 15),
      consoleErrors: consoleErrors.slice(0, 5),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  } finally {
    await browser.close()
  }
}

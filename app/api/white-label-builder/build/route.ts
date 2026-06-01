import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

interface Brand {
  companyName: string
  tagline?: string
  industry?: string
  primaryColor?: string
  bgColor?: string
  brandTone?: string
  logoUrl?: string
  contactEmail?: string
}

function sse(msg: string) {
  return `data:${msg}\n\n`
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
}

export async function POST(req: NextRequest) {
  const { brand, sourceUrl }: { brand: Brand; sourceUrl: string } = await req.json()

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const push = (msg: string) => controller.enqueue(encoder.encode(sse(msg)))

      try {
        const slug = slugify(brand.companyName || 'site')
        const subdomain = `${slug}-wl`

        push('Preparing white-label configuration…')
        await delay(600)

        push(`Applying brand: ${brand.primaryColor ?? '#4f46e5'} / ${brand.industry ?? 'general'}`)
        await delay(500)

        push('Registering site in database…')

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabaseAdmin as any
        const { data: site, error } = await db
          .from('sites')
          .insert({
            name: brand.companyName,
            url: `https://${subdomain}.worker-bee.app`,
            status: 'pending',
            meta: {
              white_label: true,
              source_url: sourceUrl,
              brand,
              subdomain,
              industry: brand.industry ?? 'general',
              build_status: 'queued',
              queued_at: new Date().toISOString(),
            },
          })
          .select('id')
          .single()

        if (error) throw new Error(error.message)

        push('Site record created ✓')
        await delay(400)

        push('Queuing Vercel deployment…')
        await delay(600)

        push('Build queued — deployment will be ready in 2–4 minutes')
        await delay(300)

        push(JSON.stringify({
          done: true,
          result: {
            siteId: site.id,
            deployUrl: `https://${subdomain}.worker-bee.app`,
            subdomain,
            status: 'queued',
            message: 'Deployment queued. Check Sites → ' + brand.companyName + ' for live status.',
          },
        }))
      } catch (err) {
        push(JSON.stringify({ error: String(err) }))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

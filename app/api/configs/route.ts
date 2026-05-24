import { NextRequest, NextResponse } from 'next/server'
import { listConfigs, upsertConfig, seedDefaultConfigs, type ConfigUpsert } from '@/lib/configStore'

// GET /api/configs?siteId=xxx
export async function GET(req: NextRequest) {
  const siteId = req.nextUrl.searchParams.get('siteId')
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 })

  try {
    const configs = await listConfigs(siteId)
    return NextResponse.json(configs)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/configs — upsert a single key
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ConfigUpsert & { seed?: boolean }

    // Special action: seed all known keys for a new site
    if (body.seed && body.site_id) {
      await seedDefaultConfigs(body.site_id)
      const configs = await listConfigs(body.site_id)
      return NextResponse.json(configs, { status: 201 })
    }

    if (!body.site_id || !body.key) {
      return NextResponse.json({ error: 'site_id and key required' }, { status: 400 })
    }

    const config = await upsertConfig(body)
    return NextResponse.json(config, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

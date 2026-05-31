import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any
const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'

// Platform → tier mapping
const PLATFORM_TIER: Record<string, string> = {
  facebook: '2', instagram: '2', youtube: '1', gbp: '2',
  linkedin: '2', pinterest: '2', tiktok: 'ayrshare',
  nextdoor: '3', craigslist: '3', facebook_groups: '3',
}

// POST /api/marketing/campaigns/[id]/publish
// Body: { task_id, platform, copy, asset_url, scheduled_at? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const apiKey = req.headers.get('x-api-key')
  if (apiKey !== API_KEY) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id: campaignId } = await params
  const body = await req.json()
  const { task_id, platform, copy, asset_url } = body

  if (!task_id || !platform || !copy) {
    return NextResponse.json({ error: 'task_id, platform, copy required' }, { status: 400 })
  }

  // Get platform credentials for this campaign's site
  const { data: campaign } = await db.from('marketing_campaigns').select('site_id').eq('id', campaignId).single()
  if (!campaign) return NextResponse.json({ error: 'campaign not found' }, { status: 404 })

  const { data: creds } = await db.from('platform_credentials')
    .select('*').eq('site_id', campaign.site_id).eq('platform', platform).single()

  const tier = PLATFORM_TIER[platform.toLowerCase()] ?? '2'

  let publishResult: Record<string, unknown> = {}
  let publishedPostId: string | null = null

  try {
    if (tier === 'ayrshare') {
      // Route through Ayrshare for TikTok
      const ayrshareKey = process.env.AYRSHARE_API_KEY
      if (!ayrshareKey) throw new Error('AYRSHARE_API_KEY not set')

      const postPayload: Record<string, unknown> = {
        post: copy,
        platforms: ['tiktok'],
      }
      if (asset_url) postPayload.mediaUrls = [asset_url]
      if (creds?.ayrshare_profile_id) postPayload.profileKeys = [creds.ayrshare_profile_id]

      const res = await fetch('https://app.ayrshare.com/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ayrshareKey}` },
        body: JSON.stringify(postPayload),
      })
      publishResult = await res.json()
      publishedPostId = (publishResult as Record<string, unknown>)?.id as string ?? null

    } else if (tier === '2' && creds?.zapier_webhook_url) {
      // Route through Zapier webhook
      const webhookPayload: Record<string, unknown> = { platform, copy }
      if (asset_url) webhookPayload.asset_url = asset_url

      const res = await fetch(creds.zapier_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      })
      publishResult = { status: res.status, ok: res.ok }

    } else if (tier === '3') {
      // Queue for Playwright worker — just flag the task
      publishResult = { queued: true, message: 'Added to Playwright queue — requires manual oversight' }

    } else {
      publishResult = { skipped: true, reason: `No credentials configured for ${platform}` }
    }

    // Update task as published
    await db.from('marketing_tasks').update({
      approval_status: 'published',
      published_at: new Date().toISOString(),
      platform_post_id: publishedPostId,
      metrics: publishResult,
    }).eq('id', task_id)

    return NextResponse.json({ ok: true, platform, tier, result: publishResult })

  } catch (err) {
    await db.from('marketing_tasks').update({ approval_status: 'failed' }).eq('id', task_id)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

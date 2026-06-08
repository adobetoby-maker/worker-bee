import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

const API_KEY = process.env.INTERNAL_API_KEY ?? '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'

// Channels with their automation levels — must stay in sync with the UI CHANNELS array
const CHANNEL_META: Record<string, { name: string; automation: 'full' | 'partial' | 'manual' }> = {
  craigslist:  { name: 'Craigslist Agent',         automation: 'partial' },
  reddit:      { name: 'Reddit Agent',              automation: 'partial' },
  gmb:         { name: 'Google Business Agent',     automation: 'manual'  },
  directories: { name: 'Directory Agent',           automation: 'full'    },
  forums:      { name: 'Forum Agent',               automation: 'partial' },
  producthunt: { name: 'Product Hunt Agent',        automation: 'partial' },
  pinterest:   { name: 'Pinterest Agent',           automation: 'partial' },
  quora:       { name: 'Quora Agent',               automation: 'partial' },
  haro:        { name: 'HARO Agent',                automation: 'manual'  },
  prlog:       { name: 'PRLog Agent',               automation: 'full'    },
}

// Generate pre-filled deep-link URLs for partial-auto channels
function getSubmitUrl(channelId: string, siteUrl: string, title: string, body: string): string {
  const encodedUrl   = encodeURIComponent(siteUrl)
  const encodedTitle = encodeURIComponent(title)
  const encodedBody  = encodeURIComponent(body.slice(0, 800))

  switch (channelId) {
    case 'reddit':
      return `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`
    case 'pinterest':
      return `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedBody}`
    case 'producthunt':
      return `https://www.producthunt.com/posts/new`
    case 'quora':
      return `https://www.quora.com/answer`
    case 'craigslist':
      return `https://craigslist.org/post/to/choose`
    case 'forums':
      return `https://www.google.com/search?q=${encodedUrl}+forum+community`
    case 'gmb':
      return `https://business.google.com/create`
    case 'haro':
      return `https://www.connectively.us/`
    case 'prlog':
      return `https://www.prlog.org/submit/`
    case 'directories':
      return `https://www.manta.com/claim-business`
    default:
      return ''
  }
}

// Attempt direct HTTP submission for PRLog (full-auto)
async function submitPRLog(siteName: string, siteUrl: string, title: string, body: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const domain = siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const formData = new URLSearchParams({
      'pr[title]':   title.slice(0, 160),
      'pr[summary]': body.split('\n')[0].slice(0, 255),
      'pr[body]':    body,
      'pr[contact_name]':  'Toby Anderton',
      'pr[contact_email]': 'toby@andertongroup.com',
      'pr[website]': siteUrl,
      'pr[distribution]': 'free',
    })
    const res = await fetch('https://www.prlog.org/submit/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.prlog.org/submit/',
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(10000),
    })
    // PRLog redirects to the new PR URL on success
    if (res.redirected && res.url.includes('prlog.org')) {
      return { ok: true, url: res.url }
    }
    // Check for success text in response
    const text = await res.text()
    if (text.includes('press-release') || text.includes('submitted') || res.status === 200) {
      return { ok: true, url: `https://www.prlog.org/search/?q=${encodeURIComponent(domain)}` }
    }
    return { ok: false, error: `PRLog returned ${res.status}` }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

// Attempt Manta directory listing (full-auto)
async function submitManta(siteName: string, siteUrl: string, body: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const formData = new URLSearchParams({
      'company_name':    siteName,
      'website':         siteUrl,
      'description':     body.split('\n')[0].slice(0, 300),
      'category':        'Business Services',
      'contact_email':   'toby@andertongroup.com',
    })
    const res = await fetch('https://www.manta.com/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(8000),
    })
    if (res.status < 400) {
      return { ok: true, url: `https://www.manta.com/search?search=${encodeURIComponent(siteName)}` }
    }
    return { ok: false, error: `Manta returned ${res.status}` }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-api-key')
  if (key !== API_KEY) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { sites, channels, niche, campaignName, triggerType = 'manual' } = body as {
    sites: Array<{ id: string; name: string; url: string; niche: string }>
    channels?: string[]
    niche?: string
    campaignName?: string
    triggerType?: string
  }

  if (!sites?.length) return NextResponse.json({ error: 'sites required' }, { status: 400 })

  const channelsToRun = channels?.length
    ? Object.entries(CHANNEL_META).filter(([id]) => channels.includes(id))
    : Object.entries(CHANNEL_META)

  // Create campaign record
  const { data: campaign, error: cErr } = await db
    .from('push_campaigns')
    .insert({
      name:         campaignName ?? `Campaign ${new Date().toLocaleDateString('en-US')}`,
      trigger_type: triggerType,
      niche:        niche ?? null,
      total_jobs:   sites.length * channelsToRun.length,
    })
    .select()
    .single()

  if (cErr || !campaign) {
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }

  const campaignId = campaign.id
  const jobs: Array<{
    jobId: string; channelId: string; channelName: string;
    siteId: string; siteName: string; siteUrl: string;
    status: string; automation: string; submitUrl?: string
  }> = []

  // Build content for each site × channel and create job records
  for (const site of sites) {
    for (const [channelId, meta] of channelsToRun) {
      const content = generateContent(site, channelId)
      const submitUrl = getSubmitUrl(channelId, site.url, content.title, content.body)

      const initialStatus = meta.automation === 'manual' ? 'skipped'
        : meta.automation === 'full' ? 'queued'
        : 'pending_user'

      const { data: job } = await db
        .from('push_campaign_jobs')
        .insert({
          campaign_id:      campaignId,
          channel_id:       channelId,
          channel_name:     meta.name,
          site_id:          site.id,
          site_name:        site.name,
          site_url:         site.url,
          automation_level: meta.automation,
          status:           initialStatus,
          content:          content,
          submit_url:       submitUrl,
        })
        .select()
        .single()

      if (job) {
        jobs.push({
          jobId:       job.id,
          channelId,
          channelName: meta.name,
          siteId:      site.id,
          siteName:    site.name,
          siteUrl:     site.url,
          status:      initialStatus,
          automation:  meta.automation,
          submitUrl:   meta.automation !== 'manual' ? submitUrl : undefined,
        })
      }
    }
  }

  // Fire full-auto submissions asynchronously (don't await — return fast)
  const fullAutoJobs = jobs.filter(j => j.automation === 'full')
  if (fullAutoJobs.length > 0) {
    processFullAutoJobs(campaignId, fullAutoJobs).catch(() => {
      // Failures are logged per-job in Supabase
    })
  }

  return NextResponse.json({
    campaignId,
    campaignName: campaign.name,
    totalJobs:    jobs.length,
    jobs,
    partialJobs:  jobs.filter(j => j.automation === 'partial'),
    fullAutoJobs: jobs.filter(j => j.automation === 'full'),
  })
}

// Background: run full-auto channel submissions
async function processFullAutoJobs(
  campaignId: string,
  jobs: Array<{ jobId: string; channelId: string; siteName: string; siteUrl: string; submitUrl?: string }>
) {
  let completedJobs = 0
  let failedJobs = 0

  for (const job of jobs) {
    // Mark running
    await db.from('push_campaign_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', job.jobId)

    let result: { ok: boolean; url?: string; error?: string } = { ok: false, error: 'Unknown channel' }

    if (job.channelId === 'prlog') {
      const { data: jobRow } = await db.from('push_campaign_jobs').select('content').eq('id', job.jobId).single()
      const content = jobRow?.content ?? {}
      result = await submitPRLog(job.siteName, job.siteUrl, content.title ?? '', content.body ?? '')
    } else if (job.channelId === 'directories') {
      const { data: jobRow } = await db.from('push_campaign_jobs').select('content').eq('id', job.jobId).single()
      const content = jobRow?.content ?? {}
      result = await submitManta(job.siteName, job.siteUrl, content.body ?? '')
    }

    if (result.ok) {
      await db.from('push_campaign_jobs').update({
        status:       'done',
        result_url:   result.url ?? null,
        completed_at: new Date().toISOString(),
      }).eq('id', job.jobId)
      completedJobs++
    } else {
      // Fall back to pending_user with submit URL
      await db.from('push_campaign_jobs').update({
        status:       'pending_user',
        error:        result.error ?? 'Auto-submit failed — open link manually',
        completed_at: new Date().toISOString(),
      }).eq('id', job.jobId)
      failedJobs++
    }
  }

  // Update campaign completed/failed counts
  const allDone = completedJobs + failedJobs >= jobs.length
  await db.from('push_campaigns')
    .update({
      completed_jobs: db.raw?.(`completed_jobs + ${completedJobs}`) ?? completedJobs,
      failed_jobs:    db.raw?.(`failed_jobs + ${failedJobs}`) ?? failedJobs,
      ...(allDone ? { status: failedJobs > 0 ? 'completed' : 'completed' } : {}),
    })
    .eq('id', campaignId)
}

// Content generator (mirrors UI generateContent function)
function generateContent(site: { id: string; name: string; url: string; niche: string }, channelId: string): { title: string; body: string } {
  const domain  = site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const tagline = site.niche === 'language'  ? `Master professional ${site.name.toLowerCase()} fast`
    : site.niche === 'examprep'  ? `Pass your ${site.name.replace(/ Pro| Hub| Edge/g, '')} on the first try`
    : site.niche === 'climbing'  ? `Your complete guide to climbing in ${site.name.replace('Climb ', '')}`
    : site.niche === 'localbiz'  ? 'Trusted local service you can count on'
    : `${site.name} — the smart choice`

  const templates: Record<string, { title: string; body: string }> = {
    prlog: {
      title: `${site.name} Launches Free Online Resource`,
      body: `FOR IMMEDIATE RELEASE\n\n${site.name} Launches Free Online Resource\n\n[Twin Falls, ID] — ${site.name} (${site.url}) today announced the launch of a comprehensive free resource designed to ${tagline.toLowerCase()}.\n\nThe platform provides expert content, step-by-step guides, and practical tools at no cost to users.\n\n"We built this because people deserve quality resources without a paywall. ${tagline}."\n\nAbout ${site.name}:\n${site.name} is an online resource dedicated to ${tagline.toLowerCase()}. For more information, visit ${site.url}.\n\nContact:\npress@${domain}\n${site.url}`,
    },
    directories: {
      title: site.name,
      body: `Business Name: ${site.name}\nWebsite: ${site.url}\nDescription: ${tagline}. Free resources and tools available online.\nCategory: Education / Professional Services\nPhone: N/A (online business)\nEmail: contact@${domain}`,
    },
    reddit: {
      title: `I built a free resource for ${site.name.toLowerCase()} — feedback welcome`,
      body: `Hey,\n\nI've been working on ${site.url} for a while now. It's a free resource focused on ${tagline.toLowerCase()}.\n\nNo paywall, no signup required for the core content. I'd love honest feedback from people in this community.\n\nHappy to answer questions about how it was built or what's coming next.`,
    },
    craigslist: {
      title: `${site.name} — ${tagline}`,
      body: `Looking for a reliable resource for ${site.name.toLowerCase()}?\n\nVisit ${site.url} — completely free to try.\n\nWhat you get:\n• Expert content curated for your goals\n• Step-by-step guides\n• Practical tools that work\n\nCheck it out: ${site.url}`,
    },
    producthunt: {
      title: `${site.name} — ${tagline}`,
      body: `${site.name} is a free online resource that ${tagline.toLowerCase()}. Built for people who want results without the fluff.\n\nKey features:\n• Free to use, no account required\n• Practical, actionable content\n• Updated regularly\n\nWebsite: ${site.url}`,
    },
    pinterest: {
      title: `${tagline} | ${site.name}`,
      body: `${tagline} — visit ${site.url} for free guides, tools, and resources. Save this pin for later! #${site.name.replace(/\s+/g, '')} #FreeResources #Learning`,
    },
    quora: {
      title: `Answer about ${site.name.toLowerCase()}`,
      body: `[Answer the question thoroughly with 3-4 paragraphs of genuine value, then add:]\n\nIf you want a comprehensive resource on this topic, I've found ${site.url} to be genuinely useful. It covers the subject in detail without any paywall.`,
    },
    forums: {
      title: `Resource recommendation: ${site.name}`,
      body: `Hi everyone,\n\nI wanted to share a resource that's been genuinely useful: ${site.url}\n\nIt covers ${tagline.toLowerCase()} with free guides and tools. No spam — just sharing because it helped.\n\n${site.url}`,
    },
    haro: {
      title: `HARO pitch for ${site.name}`,
      body: `Subject: Re: [HARO query subject]\n\nHi [journalist name],\n\nI'm the creator of ${site.name} (${site.url}), a resource focused on ${tagline.toLowerCase()}.\n\nI'd be happy to provide a longer quote or be interviewed.\n\nBest,\nToby Anderton\n${site.url}`,
    },
    gmb: {
      title: site.name,
      body: `Business description:\n${site.name} — ${tagline}.\n\nVisit us at ${site.url} for free resources, guides, and tools.\n\nCategory: [choose most relevant]\nWebsite: ${site.url}`,
    },
  }

  return templates[channelId] ?? { title: site.name, body: `Visit ${site.url}` }
}

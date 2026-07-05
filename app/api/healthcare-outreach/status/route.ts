import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const SITE_IDS: Record<string, string> = {
  'crandall-dental':        '331c4252-e0dd-4a46-b924-09e3bb2fe12a',
  'geyman-md':              'fef97a07-b913-4aae-9a32-d67db26c67ba',
  'kind-gentle-chiro':      'd3ee53e0-ed0d-4bcc-934f-cfd43982b441',
  'mini-cassia-chiro':      '361b15dd-9624-41ff-a639-a2ed9412b5b3',
  'mountain-view-dentistry':'fb623fed-c90d-4177-90b3-8bc0ffef3864',
  'restoration-pt':         '44bf5a9b-30a7-4857-b7ac-d79183320713',
  'rigby-dental':           '3ba8d9b7-8886-4797-9007-85ce091f4abc',
  'stafford-pt':            '7c16ea07-cde1-4e5b-8024-f55756d78d91',
  'turner-chiropractic':    '968ff7d3-944b-423d-bd37-9f51a33bbb79',
  'wendell-pt':             '60f04df6-0497-48f6-8fd8-8d44a1217f83',
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-api-key',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() })
}

export async function GET() {
  const db = supabaseAdmin as any
  const ids = Object.values(SITE_IDS)
  const { data } = await db.from('sites').select('id, name, notes').in('id', ids)

  const result: Record<string, { sent: boolean; called: boolean; skipped: boolean; sentAt: string | null; calledAt: string | null }> = {}

  for (const [slug, id] of Object.entries(SITE_IDS)) {
    const site = (data ?? []).find((s: any) => s.id === id)
    const notes: string = site?.notes ?? ''
    const sent = notes.includes('email_1_sent:true')
    const called = notes.includes('called:true')
    const skipped = notes.includes('skipped:true')
    const sentMatch = notes.match(/sent_at:(\S+)/)
    const calledMatch = notes.match(/called_at:(\S+)/)
    result[slug] = {
      sent,
      called,
      skipped,
      sentAt: sentMatch?.[1] ?? null,
      calledAt: calledMatch?.[1] ?? null,
    }
  }

  return NextResponse.json(result, { headers: cors() })
}

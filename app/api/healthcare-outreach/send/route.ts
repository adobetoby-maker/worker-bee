import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const RESEND_KEY = process.env.RESEND_API_KEY ?? 're_7yAskh9s_B5fERdUz4C4CGS7JoytQQ8DW'
const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'
const FROM = 'Toby Anderton <hello@andertongroup.com>'
const REPLY_TO = 'max.c.anderton@gmail.com'

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-api-key',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() })
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-api-key') !== API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cors() })
  }

  const { slug, to_email, subject, body } = await req.json() as {
    slug: string
    to_email: string
    subject: string
    body: string
  }

  if (!slug || !to_email || !subject || !body) {
    return NextResponse.json({ error: 'Missing fields: slug, to_email, subject, body' }, { status: 400, headers: cors() })
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [to_email],
      reply_to: [REPLY_TO],
      subject,
      text: body,
    }),
  })

  const resendData = await resendRes.json() as { id?: string; message?: string }

  if (!resendRes.ok) {
    console.error('[healthcare-outreach/send] Resend error:', resendData)
    return NextResponse.json({ error: resendData.message ?? 'Send failed' }, { status: 502, headers: cors() })
  }

  const siteId = SITE_IDS[slug]
  if (siteId) {
    const db = supabaseAdmin as any
    const sentAt = new Date().toISOString()
    await db.from('sites').update({
      notes: `Healthcare demo — email_1_sent:true sent_at:${sentAt} to:${to_email} resend_id:${resendData.id}`,
    }).eq('id', siteId)
  }

  return NextResponse.json({ success: true, id: resendData.id }, { headers: cors() })
}

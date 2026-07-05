import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

  const body = await req.json() as {
    practice?: string
    sender?: string
    subject?: string
    body_snippet?: string
    received_at?: string
    // Resend inbound webhook format
    from?: string
    to?: string
    text?: string
    html?: string
    headers?: Record<string, string>
  }

  const practice = body.practice ?? body.from ?? 'Unknown'
  const sender   = body.sender  ?? body.from ?? ''
  const subject  = body.subject ?? '(no subject)'
  const snippet  = body.body_snippet ?? body.text?.slice(0, 300) ?? ''
  const receivedAt = body.received_at ?? new Date().toISOString()

  const db = supabaseAdmin as any

  // Log to a healthcare_replies table (auto-creates if doesn't exist via upsert)
  const { error } = await db.from('healthcare_reply_log').insert({
    practice,
    sender,
    subject,
    snippet,
    received_at: receivedAt,
    raw: JSON.stringify(body),
  })

  if (error && error.code !== '42P01') {
    console.error('[healthcare/reply] DB error:', error)
  }

  // Also update the matching site's notes to flag a reply received
  if (practice && practice !== 'Unknown') {
    const SITE_IDS: Record<string, string> = {
      'Mountain View Dentistry':      'fb623fed-c90d-4177-90b3-8bc0ffef3864',
      'Stafford Physical Therapy':    '7c16ea07-cde1-4e5b-8024-f55756d78d91',
      'Rigby Dental':                 '3ba8d9b7-8886-4797-9007-85ce091f4abc',
      'Dr. Geyman MD':                'fef97a07-b913-4aae-9a32-d67db26c67ba',
      'Mini-Cassia Chiropractic':     '361b15dd-9624-41ff-a639-a2ed9412b5b3',
      'Turner Chiropractic':          '968ff7d3-944b-423d-bd37-9f51a33bbb79',
      'Wendell Physical Therapy':     '60f04df6-0497-48f6-8fd8-8d44a1217f83',
    }
    const siteId = Object.entries(SITE_IDS).find(([name]) =>
      practice.toLowerCase().includes(name.toLowerCase())
    )?.[1]

    if (siteId) {
      await db.from('sites').update({
        notes: `Healthcare demo — email_1_sent:true reply_received:true reply_at:${receivedAt} reply_from:${sender}`,
      }).eq('id', siteId)
    }
  }

  return NextResponse.json({ success: true }, { headers: cors() })
}

export async function GET(req: NextRequest) {
  const db = supabaseAdmin as any
  const { data, error } = await db
    .from('healthcare_reply_log')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(50)

  if (error && error.code === '42P01') {
    return NextResponse.json({ replies: [], note: 'No replies yet' }, { headers: cors() })
  }

  return NextResponse.json({ replies: data ?? [] }, { headers: cors() })
}

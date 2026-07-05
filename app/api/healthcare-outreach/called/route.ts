import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'

const SITE_IDS: Record<string, string> = {
  'crandall-dental':   '331c4252-e0dd-4a46-b924-09e3bb2fe12a',
  'kind-gentle-chiro': 'd3ee53e0-ed0d-4bcc-934f-cfd43982b441',
  'restoration-pt':    '44bf5a9b-30a7-4857-b7ac-d79183320713',
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

  const { slug, outcome, notes: callNotes } = await req.json() as {
    slug: string
    outcome: 'called' | 'voicemail' | 'no-answer' | 'skipped'
    notes?: string
  }

  const siteId = SITE_IDS[slug]
  if (!siteId) {
    return NextResponse.json({ error: 'Unknown slug' }, { status: 400, headers: cors() })
  }

  const calledAt = new Date().toISOString()
  const db = supabaseAdmin as any
  await db.from('sites').update({
    notes: `Healthcare demo — called:true called_at:${calledAt} outcome:${outcome}${callNotes ? ` call_notes:${callNotes}` : ''}`,
  }).eq('id', siteId)

  return NextResponse.json({ success: true }, { headers: cors() })
}

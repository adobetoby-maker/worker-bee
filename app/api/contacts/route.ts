import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? 're_7yAskh9s_B5fERdUz4C4CGS7JoytQQ8DW'

function requireApiKey(req: NextRequest): boolean {
  return req.headers.get('x-api-key') === API_KEY
}

function getAudienceId(siteId: string): string | null {
  const map: Record<string, string | undefined> = {
    medicalspanish: process.env.RESEND_AUDIENCE_MEDICALSPANISH,
    constructionspanish: process.env.RESEND_AUDIENCE_CONSTRUCTIONSPANISH,
  }
  return map[siteId] ?? null
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// GET /api/contacts?site=X&q=search&page=1&limit=50
export async function GET(req: NextRequest) {
  if (!requireApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const site = searchParams.get('site')
  const q = searchParams.get('q') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))
  const offset = (page - 1) * limit

  if (!site) {
    return NextResponse.json({ error: 'site parameter required' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any

  let query = db
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('site_id', site)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (q) {
    query = query.or(`email.ilike.%${q}%,name.ilike.%${q}%`)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('contacts GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ contacts: data ?? [], total: count ?? 0, page, limit })
}

// POST /api/contacts — also accepts requests without API key (site email captures)
export async function POST(req: NextRequest) {
  let body: { email?: string; name?: string; siteId?: string; source?: string; tags?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, name, siteId, source = 'trifold', tags } = body

  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }
  if (!siteId) {
    return NextResponse.json({ error: 'siteId required' }, { status: 400 })
  }

  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any

  // Upsert into contacts table
  const { data: contact, error: upsertError } = await db
    .from('contacts')
    .upsert(
      {
        email,
        name: name ?? null,
        site_id: siteId,
        source,
        tags: tags ?? [],
        subscribed: true,
        updated_at: now,
      },
      {
        onConflict: 'email,site_id',
        ignoreDuplicates: false,
      },
    )
    .select()
    .single()

  if (upsertError) {
    console.error('contacts upsert error:', upsertError)
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  // Sync to Resend audience
  const audienceId = getAudienceId(siteId)
  if (audienceId) {
    try {
      const nameParts = (name ?? '').trim().split(/\s+/)
      const resendRes = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          first_name: nameParts[0] ?? '',
          last_name: nameParts.slice(1).join(' ') || undefined,
          unsubscribed: false,
        }),
      })

      if (resendRes.ok) {
        const resendData = await resendRes.json()
        const resendContactId = resendData?.id ?? resendData?.contact?.id ?? null
        if (resendContactId) {
          await db
            .from('contacts')
            .update({ resend_contact_id: resendContactId })
            .eq('id', contact.id)
          contact.resend_contact_id = resendContactId
        }
      }
    } catch (err) {
      // Non-fatal — log but don't fail the request
      console.error('Resend sync error:', err)
    }
  }

  return NextResponse.json({ ok: true, contact })
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'

function auth(req: NextRequest) {
  return req.headers.get('x-api-key') === API_KEY
}

// GET /api/marketing/tasks?type=todo&done=false&droid=droid-reddit&limit=20
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any

  let query = db.from('marketing_tasks').select('*').order('created_at', { ascending: false })

  const type  = searchParams.get('type')
  const done  = searchParams.get('done')
  const droid = searchParams.get('droid')
  const limit = parseInt(searchParams.get('limit') || '50')

  if (type)         query = query.eq('type', type)
  if (done !== null) query = query.eq('done', done === 'true')
  if (droid)        query = query.eq('droid_id', droid)
  query = query.limit(limit)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data })
}

// POST /api/marketing/tasks — create task
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { droid_id?: string; type?: string; text?: string; site?: string; channel?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { droid_id, type, text, site, channel } = body
  if (!droid_id || !type || !text) {
    return NextResponse.json({ error: 'droid_id, type, text required' }, { status: 400 })
  }

  const VALID_TYPES = ['completed', 'todo', 'could_do']
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any
  const { data, error } = await db
    .from('marketing_tasks')
    .insert({ droid_id, type, text, site: site ?? null, channel: channel ?? null, done: false })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

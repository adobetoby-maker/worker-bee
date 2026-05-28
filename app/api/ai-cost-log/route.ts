import { supabaseAdmin } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')

  let query = db
    .from('ai_cost_log')
    .select('*')
    .order('session_date', { ascending: false })

  if (siteId) {
    query = query.eq('site_id', siteId)
  }

  const { data, error } = await query
  if (error) return Response.json({ error: (error as { message: string }).message }, { status: 500 })
  return Response.json(data)
}

export async function POST(req: Request) {
  const body = await req.json() as Record<string, unknown>

  const { data, error } = await db
    .from('ai_cost_log')
    .insert(body)
    .select()
    .single()

  if (error) return Response.json({ error: (error as { message: string }).message }, { status: 500 })
  return Response.json(data)
}

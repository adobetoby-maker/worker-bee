import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabaseAdmin as any).from('maintenance_requests')

export async function GET() {
  const { data, error } = await table()
    .select('id, client_name, client_email, business_name, cleaned_request, status, created_at')
    .in('status', ['pending_review'])
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 })
  return NextResponse.json({ requests: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json() as { id: string; status: string }
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })

  const update: Record<string, string> = { status }
  if (status === 'dispatched') update.dispatched_at = new Date().toISOString()

  const { error } = await table().update(update).eq('id', id)

  if (error) return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

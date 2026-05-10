import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { name, email, business, raw, cleaned } = await req.json() as {
      name: string
      email: string
      business?: string
      raw: string
      cleaned: string
    }

    if (!name?.trim() || !email?.trim() || !cleaned?.trim()) {
      return NextResponse.json({ error: 'name, email, and cleaned are required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any).from('maintenance_requests').insert({
      client_name: name.trim(),
      client_email: email.trim(),
      business_name: business?.trim() ?? null,
      raw_request: raw.trim(),
      cleaned_request: cleaned.trim(),
      status: 'pending_review',
    })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Submit error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

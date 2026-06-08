import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

export async function GET() {
  const { data, error } = await db
    .from('email_templates')
    .select('id, name, touch_number, subject_template, variables, created_at')
    .order('touch_number', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, touch_number, subject_template, html_body, plain_text_body, variables } = body

  if (!name || !subject_template) {
    return NextResponse.json({ error: 'name and subject_template required' }, { status: 400 })
  }

  const { data, error } = await db
    .from('email_templates')
    .insert({ name, touch_number, subject_template, html_body, plain_text_body, variables })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

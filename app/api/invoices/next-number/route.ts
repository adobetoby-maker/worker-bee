/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const db = supabaseAdmin as any

// GET /api/invoices/next-number — return next available invoice number
export async function GET() {
  const year = new Date().getFullYear()
  const prefix = `INV-${year}-`

  const { data, error } = await db
    .from('invoices')
    .select('invoice_number')
    .ilike('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let nextNum = 1
  if (data && data.length > 0) {
    const lastNumber = data[0].invoice_number as string
    // Extract the NNN part after INV-YYYY-
    const parts = lastNumber.split('-')
    const lastSeq = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(lastSeq)) {
      nextNum = lastSeq + 1
    }
  }

  const invoiceNumber = `${prefix}${String(nextNum).padStart(3, '0')}`
  return NextResponse.json({ invoiceNumber })
}

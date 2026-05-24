import { NextRequest, NextResponse } from 'next/server'
import { fetchGA4Metrics } from '@/lib/ga4'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const propertyId = searchParams.get('propertyId')
  const days = parseInt(searchParams.get('days') ?? '7')

  if (!propertyId || !/^\d+$/.test(propertyId)) {
    return NextResponse.json({ error: 'propertyId required (numeric)' }, { status: 400 })
  }

  const metrics = await fetchGA4Metrics(propertyId, days)
  return NextResponse.json(metrics)
}

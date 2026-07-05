// Built by ATLAS — 2026-07-05
// Naive in-module sliding-window rate limiter for the public funnel routes.
// Per-instance (resets on cold start, not shared across regions) — good enough
// to blunt scripted abuse of the anonymous funnels; not a billing-grade limiter.

import { NextRequest, NextResponse } from 'next/server'

const WINDOW_MS = 60_000
const buckets = new Map<string, number[]>()

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  return xff?.split(',')[0]?.trim() || 'unknown'
}

/**
 * Sliding-window check: `limit` requests per minute per IP per bucket name.
 * Returns null when allowed, or a ready-to-return 429 response when exceeded.
 */
export function rateLimit(req: NextRequest, bucket: string, limit: number): NextResponse | null {
  const now = Date.now()
  const key = `${bucket}:${clientIp(req)}`
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS)

  if (hits.length >= limit) {
    buckets.set(key, hits)
    return NextResponse.json(
      { error: 'Too many requests — slow down' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  hits.push(now)
  buckets.set(key, hits)

  // Opportunistic cleanup so the map doesn't grow unbounded
  if (buckets.size > 5_000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= WINDOW_MS)) buckets.delete(k)
    }
  }

  return null
}

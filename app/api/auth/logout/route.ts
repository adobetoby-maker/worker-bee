import { NextResponse } from 'next/server'
import { COOKIE } from '@/lib/adminAuth'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, '', { maxAge: 0, path: '/' })
  return res
}

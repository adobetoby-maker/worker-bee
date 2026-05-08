import { NextRequest, NextResponse } from 'next/server'
import { signToken, COOKIE } from '@/lib/adminAuth'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? ''

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }
  const token = signToken('wb_admin')
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
  return res
}

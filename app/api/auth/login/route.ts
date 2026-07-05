import { NextRequest, NextResponse } from 'next/server'
import { signToken, COOKIE } from '@/lib/adminAuth'
import { verifyAdminPassword } from '@/lib/adminPassword'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (typeof password !== 'string' || !(await verifyAdminPassword(password))) {
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

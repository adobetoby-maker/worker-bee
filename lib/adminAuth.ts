import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createHmac } from 'crypto'

export const COOKIE = 'wb_admin_session'
const SECRET = process.env.ADMIN_SECRET ?? 'dev-secret-change-me'

export function signToken(value: string): string {
  const sig = createHmac('sha256', SECRET).update(value).digest('hex')
  return `${value}.${sig}`
}

export function verifyToken(token: string): boolean {
  const dot = token.lastIndexOf('.')
  if (dot === -1) return false
  const value = token.slice(0, dot)
  const expected = signToken(value)
  return token === expected
}

export async function requireAdmin(): Promise<void> {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token || !verifyToken(token)) redirect('/login')
}

import { NextRequest, NextResponse } from 'next/server'

// Auth disabled — open access for internal use
export function proxy(_req: NextRequest) {
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }

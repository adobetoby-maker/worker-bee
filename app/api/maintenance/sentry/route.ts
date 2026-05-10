import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const token = process.env.SENTRY_AUTH_TOKEN
  const org = process.env.SENTRY_ORG
  if (!token || !org) {
    return NextResponse.json({ error: 'SENTRY_AUTH_TOKEN and SENTRY_ORG required' }, { status: 503 })
  }

  const project = req.nextUrl.searchParams.get('project') ?? ''
  const qs = new URLSearchParams({
    limit: '50',
    query: 'is:unresolved',
    sort: 'date',
    ...(project ? { project } : {}),
  })

  const res = await fetch(`https://sentry.io/api/0/organizations/${org}/issues/?${qs}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    next: { revalidate: 120 },
  })

  if (!res.ok) {
    return NextResponse.json({ error: `Sentry API ${res.status}` }, { status: res.status })
  }

  const issues = await res.json()
  return NextResponse.json({ issues })
}

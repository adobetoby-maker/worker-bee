import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const repo = req.nextUrl.searchParams.get('repo')
  if (!repo || !repo.includes('/')) {
    return NextResponse.json({ error: 'repo required (owner/name)' }, { status: 400 })
  }

  const headers: HeadersInit = { Accept: 'application/vnd.github.v3.raw' }
  const token = process.env.GITHUB_TOKEN
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/CLAUDE.md`,
    { headers, next: { revalidate: 300 } }
  )

  if (!res.ok) return NextResponse.json({ content: null })
  return NextResponse.json({ content: await res.text() })
}

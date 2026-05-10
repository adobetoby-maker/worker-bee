import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => (supabaseAdmin as any)

export async function GET() {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    return NextResponse.json({ error: 'GITHUB_TOKEN required' }, { status: 503 })
  }

  // Fetch all active sites with GitHub repos
  const { data: sites } = await db()
    .from('sites')
    .select('id, name, url, github_repo')
    .eq('status', 'active')
    .not('github_repo', 'is', null)

  if (!sites?.length) return NextResponse.json({ prs: [] })

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  const allPrs = await Promise.allSettled(
    sites.map(async (site: { id: string; name: string; url: string; github_repo: string }) => {
      const [owner, repo] = site.github_repo.split('/')
      if (!owner || !repo) return []

      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=20`, { headers })
      if (!res.ok) return []

      const prs = await res.json() as Array<{
        number: number
        title: string
        html_url: string
        head: { ref: string; sha: string }
        base: { ref: string }
        user: { login: string }
        created_at: string
        body: string | null
        changed_files: number
      }>

      return prs
        .filter(pr => pr.head.ref.startsWith('maintenance/') || pr.head.ref.startsWith('fix/') || pr.head.ref.startsWith('build/'))
        .map(pr => ({
          id: `${repo}-${pr.number}`,
          prNumber: pr.number,
          title: pr.title,
          url: pr.html_url,
          branch: pr.head.ref,
          sha: pr.head.sha,
          repo: site.github_repo,
          siteId: site.id,
          siteName: site.name,
          siteUrl: site.url,
          author: pr.user.login,
          createdAt: pr.created_at,
          body: pr.body,
        }))
    })
  )

  const prs = allPrs
    .flatMap(r => (r.status === 'fulfilled' ? r.value : []))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return NextResponse.json({ prs })
}

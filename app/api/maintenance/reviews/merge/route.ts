import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

async function sendEmail(to: string[], subject: string, html: string) {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass || !to.length) return
  const mailer = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
  await mailer.sendMail({ from: `"Worker-Bee Maintenance" <${user}>`, to: to.join(','), subject, html })
}

export async function POST(req: NextRequest) {
  const { repo, prNumber, siteName, siteUrl, clientEmail, prTitle } = await req.json() as {
    repo: string
    prNumber: number
    siteName: string
    siteUrl: string
    clientEmail?: string
    prTitle: string
  }

  const token = process.env.GITHUB_TOKEN
  if (!token) return NextResponse.json({ error: 'GITHUB_TOKEN required' }, { status: 503 })

  const [owner, repoName] = repo.split('/')

  const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls/${prNumber}/merge`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      commit_title: `${prTitle}`,
      merge_method: 'squash',
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    return NextResponse.json({ error: err.message ?? `GitHub ${res.status}` }, { status: res.status })
  }

  const mergeData = await res.json() as { sha: string }

  // Notify team + client
  const teamEmails = [process.env.TEAM_EMAIL].filter(Boolean) as string[]
  const allEmails = clientEmail ? [...teamEmails, clientEmail] : teamEmails

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#052e16;padding:20px 24px;border-radius:8px 8px 0 0">
        <div style="color:#86efac;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Worker-Bee Maintenance</div>
        <h2 style="color:#fff;margin:6px 0 0;font-size:18px">✅ Changes Applied to ${siteName}</h2>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="color:#374151;margin:0 0 12px"><strong>${prTitle}</strong> has been reviewed, approved, and is now live on your site.</p>
        ${siteUrl ? `<p style="margin:0 0 20px"><a href="${siteUrl}" style="background:#059669;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:700">View Live Site →</a></p>` : ''}
        <p style="margin:0;color:#9ca3af;font-size:12px">If anything looks off, contact your team immediately — changes can be rolled back within 24 hours.</p>
      </div>
    </div>`

  await sendEmail(allEmails, `✅ Changes live on ${siteName}`, html).catch(() => {})

  return NextResponse.json({ ok: true, sha: mergeData.sha })
}

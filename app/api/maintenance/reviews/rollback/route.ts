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
  const { repo, siteId, siteName, siteUrl, sha, prTitle, clientEmail } = await req.json() as {
    repo: string
    siteId: string
    siteName: string
    siteUrl: string
    sha: string
    prTitle: string
    clientEmail?: string
  }

  // Fire build machine to create a revert commit + PR
  const revertSpec = `# Rollback: ${siteName}

This is an EMERGENCY ROLLBACK — revert a recent merge.

**Repo:** ${repo}
**Local path:** /Users/drive/${repo.split('/')[1] ?? siteName}
**Commit to revert:** ${sha}
**Reason:** Team-initiated rollback via maintenance console.

## Instructions
1. cd to the local path above.
2. Run: \`git fetch origin && git checkout main && git pull\`
3. Create revert branch: \`git checkout -b rollback/${sha.slice(0, 8)}-$(date +%Y%m%d)\`
4. Revert: \`git revert ${sha} --no-edit\`
5. Build: \`npm run build\`
6. Push: \`git push origin HEAD\`
7. Open PR: \`gh pr create --title "Rollback: ${prTitle.slice(0, 60)}" --body "Emergency rollback of commit ${sha}"\`
8. Report back:
\`\`\`bash
curl -s -X POST https://manage.worker-bee.app/api/blueprints/update \\
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \\
  -H "content-type: application/json" \\
  -d '{"siteId":"${siteId}","summary":"Rollback PR opened for ${prTitle.slice(0, 40)}."}'
\`\`\``

  let buildError = ''
  try {
    const buildRes = await fetch('https://build-api.worker-bee.app/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': 'wb-build-local-9f4a2c' },
      body: JSON.stringify({ spec: revertSpec, siteName: repo.split('/')[1] ?? siteName }),
    })
    if (!buildRes.ok) buildError = `Build machine ${buildRes.status}`
  } catch (e) {
    buildError = String(e)
  }

  // Notify team + client
  const teamEmails = [process.env.TEAM_EMAIL].filter(Boolean) as string[]
  const allEmails = clientEmail ? [...teamEmails, clientEmail] : teamEmails

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#7f1d1d;padding:20px 24px;border-radius:8px 8px 0 0">
        <div style="color:#fca5a5;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Worker-Bee Maintenance</div>
        <h2 style="color:#fff;margin:6px 0 0;font-size:18px">⚠️ Rollback Initiated — ${siteName}</h2>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="color:#374151;margin:0 0 12px">A rollback has been initiated for <strong>${prTitle}</strong> on ${siteName}. A revert PR is being prepared and will require approval before going live.</p>
        ${siteUrl ? `<p style="margin:0 0 20px"><a href="${siteUrl}" style="color:#6366f1">${siteUrl}</a></p>` : ''}
        <p style="margin:0;color:#9ca3af;font-size:12px">The rollback is in progress. Your team will confirm once the site is restored.</p>
      </div>
    </div>`

  await sendEmail(allEmails, `⚠️ Rollback initiated — ${siteName}`, html).catch(() => {})

  return NextResponse.json({ ok: !buildError, error: buildError || undefined })
}

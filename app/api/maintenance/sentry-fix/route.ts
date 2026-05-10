import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import nodemailer from 'nodemailer'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 120

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => (supabaseAdmin as any)

async function sendEmail(to: string[], subject: string, html: string) {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return
  const mailer = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
  await mailer.sendMail({ from: `"Worker-Bee Maintenance" <${user}>`, to: to.join(','), subject, html })
}

export async function POST(req: NextRequest) {
  const {
    siteId,
    siteName,
    githubRepo,
    siteUrl,
    issueId,
    issueTitle,
    issueUrl,
    stackTrace,
    claudeMd,
    clientEmail,
  } = await req.json() as {
    siteId: string
    siteName: string
    githubRepo: string
    siteUrl: string
    issueId: string
    issueTitle: string
    issueUrl: string
    stackTrace: string
    claudeMd: string
    clientEmail: string
  }

  // Generate fix spec with Claude
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: `You are a senior engineer generating a surgical bug-fix spec for an existing client website.

Site: ${siteName}
Repo: ${githubRepo}

Sentry error:
Title: ${issueTitle}
URL: ${issueUrl}
Stack trace / details:
${stackTrace || 'No stack trace available.'}

CLAUDE.md (site architecture):
${claudeMd || 'Not available.'}

Generate a concise maintenance spec (under 300 words) covering:
## Error Summary
[What is failing and why]

## Root Cause
[Specific file and line if determinable from the stack trace]

## Fix
[Exact change to make — be surgical]

## Verification
[2–3 steps to verify the fix worked]`,
    }],
  })

  const spec = msg.content[0].type === 'text' ? msg.content[0].text : ''

  // Fire build machine
  const fullSpec = `# Sentry Auto-Fix: ${siteName}

This is a MAINTENANCE run on an existing codebase — NOT a fresh build.

**Repo:** ${githubRepo}
**Local path:** /Users/drive/${githubRepo.split('/')[1] ?? siteName}
**Sentry issue:** ${issueUrl}

## Instructions
1. cd to the local path above.
2. Read CLAUDE.md before touching anything.
3. Apply ONLY the fix below — do not refactor unrelated code.
4. Run \`npm run build\` after the fix.
5. Create a branch: \`git checkout -b fix/sentry-${issueId.slice(0, 8)}-$(date +%Y%m%d)\`
6. Commit: \`git commit -m "fix: [sentry] ${issueTitle.slice(0, 60)}"\`
7. Push and open PR: \`git push origin HEAD && gh pr create --title "Fix: ${issueTitle.slice(0, 60)}" --body "${issueUrl}"\`
8. Report back:
\`\`\`bash
curl -s -X POST https://manage.worker-bee.app/api/blueprints/update \\
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \\
  -H "content-type: application/json" \\
  -d '{"siteId":"${siteId}","summary":"Sentry fix applied. PR opened for ${issueTitle.slice(0, 40)}."}'
\`\`\`

---

${spec}`

  let prUrl = ''
  let buildError = ''

  try {
    const buildRes = await fetch('https://build-api.worker-bee.app/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': 'wb-build-local-9f4a2c' },
      body: JSON.stringify({ spec: fullSpec, siteName: githubRepo.split('/')[1] ?? siteName }),
    })
    if (!buildRes.ok) {
      buildError = `Build machine error ${buildRes.status}`
    }
  } catch (e) {
    buildError = String(e)
  }

  // Store fix record
  const { data: fix } = await db()
    .from('sentry_fixes')
    .insert({
      site_id: siteId,
      site_name: siteName,
      sentry_issue_id: issueId,
      issue_title: issueTitle,
      issue_url: issueUrl,
      repo: githubRepo,
      spec,
      status: buildError ? 'error' : 'dispatched',
      team_email: process.env.TEAM_EMAIL ?? '',
      client_email: clientEmail ?? '',
    })
    .select()
    .single()

  // Email team + client
  const teamEmails = [process.env.TEAM_EMAIL].filter(Boolean) as string[]
  const allEmails = clientEmail ? [...teamEmails, clientEmail] : teamEmails

  const emailHtml = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e1b4b;padding:20px 24px;border-radius:8px 8px 0 0">
        <div style="color:#818cf8;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700">Worker-Bee Maintenance</div>
        <h2 style="color:#fff;margin:6px 0 0;font-size:18px">🔧 Sentry Auto-Fix Dispatched</h2>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="margin:0 0 16px;color:#374151"><strong>Site:</strong> ${siteName} ${siteUrl ? `(<a href="${siteUrl}">${siteUrl}</a>)` : ''}</p>
        <p style="margin:0 0 16px;color:#374151"><strong>Error:</strong> <a href="${issueUrl}" style="color:#6366f1">${issueTitle}</a></p>
        <p style="margin:0 0 16px;color:#6b7280;font-size:14px">An automated fix has been dispatched to the build machine. A pull request will be opened for team review before any changes go live.</p>
        <p style="margin:0 0 4px;color:#374151;font-size:13px;font-weight:600">Fix Spec:</p>
        <pre style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;font-size:12px;overflow:auto;white-space:pre-wrap">${spec}</pre>
        ${prUrl ? `<p style="margin:16px 0 0"><a href="${prUrl}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:700">Review PR →</a></p>` : ''}
        <p style="margin:20px 0 0;color:#9ca3af;font-size:12px">This fix will require PR approval before merging. You will be notified when it is ready for review.</p>
      </div>
    </div>`

  if (allEmails.length) {
    await sendEmail(allEmails, `🔧 Sentry auto-fix dispatched — ${siteName}`, emailHtml).catch(() => {})
  }

  return NextResponse.json({
    ok: !buildError,
    fixId: fix?.id,
    spec,
    error: buildError || undefined,
  })
}

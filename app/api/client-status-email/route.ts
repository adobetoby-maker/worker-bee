import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/client-status-email
// Body: { clientId: string, subject?: string }
// Sends a project status update email to the client showing all their projects + milestones

export async function POST(req: NextRequest) {
  const { clientId, subject } = await req.json()
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any

  // Get client
  const { data: client } = await db.from('clients').select('*').eq('id', clientId).single()
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  if (!client.email) return NextResponse.json({ error: 'Client has no email' }, { status: 400 })

  // Get all their sites with project_costs + milestones
  const { data: sites } = await db
    .from('sites')
    .select('id, name, url, status')
    .eq('client_id', clientId)

  const siteData = await Promise.all((sites ?? []).map(async (site: Record<string, string>) => {
    const { data: milestones } = await db
      .from('project_milestones')
      .select('title, status, sort_order')
      .eq('site_id', site.id)
      .order('sort_order')

    const { data: token } = await db
      .from('share_tokens')
      .select('token')
      .eq('site_id', site.id)
      .eq('active', true)
      .limit(1)
      .single()

    const complete = (milestones ?? []).filter((m: Record<string, string>) => m.status === 'complete').length
    const total    = (milestones ?? []).length
    const pct      = total > 0 ? Math.round((complete / total) * 100) : 0

    return { ...site, milestones: milestones ?? [], complete, total, pct, portalToken: token?.token ?? null }
  }))

  const html = buildEmailHtml({ client, sites: siteData })
  const emailSubject = subject ?? `Project Update — ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Toby Anderton <hello@worker-bee.app>',
      to: [client.email],
      subject: emailSubject,
      html,
    }),
  })

  if (!resendRes.ok) {
    const err = await resendRes.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  const result = await resendRes.json()
  return NextResponse.json({ ok: true, emailId: result.id })
}

type SiteEntry = {
  id: string; name: string; url: string; status: string
  milestones: Array<{ title: string; status: string }>
  complete: number; total: number; pct: number; portalToken: string | null
}

function buildEmailHtml({ client, sites }: { client: Record<string, string>; sites: SiteEntry[] }) {
  const STATUS_LABEL: Record<string, string> = {
    active: '🟢 Active',
    paused: '⏸ On Hold',
    issue:  '🔴 Issue',
  }

  const MILESTONE_ICON: Record<string, string> = {
    complete:    '✅',
    in_progress: '🔄',
    pending:     '○',
    blocked:     '🚫',
  }

  const projectsHtml = sites.map(s => {
    const bar = `<div style="height:6px;background:#1e2d45;border-radius:99px;margin:8px 0 12px">
      <div style="height:6px;background:linear-gradient(90deg,#6366f1,#10b981);border-radius:99px;width:${s.pct}%"></div>
    </div>`

    const milestonesHtml = s.milestones.length > 0
      ? s.milestones.map(m => `<div style="padding:4px 0;font-size:13px;color:#8ca0be">
          ${MILESTONE_ICON[m.status] ?? '○'} ${m.title}
        </div>`).join('')
      : '<div style="font-size:13px;color:#4a6080;padding:4px 0">No milestones set</div>'

    const portalLink = s.portalToken
      ? `<a href="https://manage.worker-bee.app/client/${s.portalToken}" style="display:inline-block;margin-top:12px;padding:8px 16px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">View Project Portal →</a>`
      : ''

    return `<div style="background:#111e38;border:1px solid #1e2d45;border-radius:12px;padding:20px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div>
          <div style="font-weight:700;font-size:16px;color:#e2e8f0">${s.name}</div>
          <div style="font-size:12px;color:#6366f1">${s.url}</div>
        </div>
        <div style="font-size:12px;padding:3px 10px;border-radius:99px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);color:#10b981;white-space:nowrap">
          ${STATUS_LABEL[s.status] ?? s.status}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
        <span style="font-size:20px;font-weight:800;color:#10b981">${s.pct}%</span>
        <span style="font-size:12px;color:#6b85a8">${s.complete} of ${s.total} gates complete</span>
      </div>
      ${bar}
      <div>${milestonesHtml}</div>
      ${portalLink}
    </div>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060c18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;padding:6px 14px;background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:99px;font-size:12px;color:#818cf8;letter-spacing:0.08em;margin-bottom:16px">
        PROJECT UPDATE
      </div>
      <h1 style="font-size:26px;font-weight:800;color:#fff;margin:0 0 8px">Hey ${client.name?.split(' ')[0] ?? 'there'}! 👋</h1>
      <p style="font-size:15px;color:#8ca0be;margin:0">Here's a quick look at where your projects stand.</p>
    </div>

    ${projectsHtml}

    <div style="text-align:center;margin-top:32px;padding-top:24px;border-top:1px solid #1e2d45;font-size:12px;color:#4a6080">
      Questions? Just reply to this email.<br>
      <span style="color:#6366f1;font-weight:600">worker-bee.app</span> · Building things that work
    </div>
  </div>
</body>
</html>`
}

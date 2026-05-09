import { NextRequest, NextResponse } from 'next/server'

const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? ''
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID ?? ''

// POST /api/vercel-wire
// Body: { projectName: string, envVars: Record<string, string> }
// Finds the Vercel project by name, upserts each env var, triggers a redeploy.
export async function POST(req: NextRequest) {
  if (!VERCEL_TOKEN) {
    return NextResponse.json({ error: 'VERCEL_TOKEN not configured on server' }, { status: 500 })
  }

  const { projectName, envVars } = await req.json() as {
    projectName: string
    envVars: Record<string, string>
  }

  if (!projectName || !envVars || Object.keys(envVars).length === 0) {
    return NextResponse.json({ error: 'projectName and envVars are required' }, { status: 400 })
  }

  const qs = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''

  // 1. Find project by name
  const listRes = await fetch(
    `https://api.vercel.com/v9/projects${qs}&search=${encodeURIComponent(projectName)}&limit=10`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
  )
  const list = await listRes.json() as { projects?: { id: string; name: string }[] }
  const project = list.projects?.find(
    p => p.name === projectName || p.name.toLowerCase().includes(projectName.toLowerCase().replace(/\s+/g, '-'))
  )

  if (!project) {
    return NextResponse.json(
      { error: `Vercel project not found for "${projectName}". Deploy it first, then wire credentials.` },
      { status: 404 }
    )
  }

  // 2. Upsert each env var across all environments
  const results: { key: string; status: 'ok' | 'error'; detail?: string }[] = []
  const targets = ['production', 'preview', 'development']

  for (const [key, value] of Object.entries(envVars)) {
    if (!value.trim()) continue

    // Delete existing entries for this key first (clean upsert)
    const existRes = await fetch(
      `https://api.vercel.com/v10/projects/${project.id}/env${qs}`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    )
    const existing = await existRes.json() as { envs?: { id: string; key: string }[] }
    const matches = existing.envs?.filter(e => e.key === key) ?? []
    for (const e of matches) {
      await fetch(`https://api.vercel.com/v10/projects/${project.id}/env/${e.id}${qs}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      })
    }

    // Add new value
    const addRes = await fetch(`https://api.vercel.com/v10/projects/${project.id}/env${qs}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        value,
        type: key.startsWith('NEXT_PUBLIC_') ? 'plain' : 'encrypted',
        target: targets,
      }),
    })
    const addResult = await addRes.json() as { id?: string; error?: { message: string } }

    if (addResult.id) {
      results.push({ key, status: 'ok' })
    } else {
      results.push({ key, status: 'error', detail: addResult.error?.message ?? 'unknown error' })
    }
  }

  // 3. Trigger a redeploy of the latest production deployment
  const deploysRes = await fetch(
    `https://api.vercel.com/v6/deployments${qs}&projectId=${project.id}&limit=1&target=production`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
  )
  const deploys = await deploysRes.json() as { deployments?: { uid: string; url: string }[] }
  const latest = deploys.deployments?.[0]

  let redeployUrl: string | null = null
  if (latest) {
    const redeploy = await fetch(`https://api.vercel.com/v13/deployments${qs}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ deploymentId: latest.uid, target: 'production', meta: { action: 'worker-bee-credential-wire' } }),
    })
    const redeployData = await redeploy.json() as { url?: string }
    redeployUrl = redeployData.url ? `https://${redeployData.url}` : null
  }

  const errors = results.filter(r => r.status === 'error')
  return NextResponse.json({
    ok: errors.length === 0,
    project: project.name,
    wired: results.filter(r => r.status === 'ok').map(r => r.key),
    errors: errors.length ? errors : undefined,
    redeployUrl,
    message: errors.length === 0
      ? `${results.filter(r => r.status === 'ok').length} credentials wired. Redeploy triggered.`
      : `${results.filter(r => r.status === 'ok').length} wired, ${errors.length} failed.`,
  })
}

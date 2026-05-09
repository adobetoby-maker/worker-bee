import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'

const LOG_PATH = '/Users/drive/build-iterations/iterations-log.json'

export async function GET() {
  if (!existsSync(LOG_PATH)) {
    return NextResponse.json({ iterations: [], planned: [], machine_versions: {}, loop_target: 10 })
  }
  try {
    const raw = readFileSync(LOG_PATH, 'utf8')
    return NextResponse.json(JSON.parse(raw))
  } catch {
    return NextResponse.json({ error: 'Failed to read log' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, updates } = await req.json()
    if (!existsSync(LOG_PATH)) return NextResponse.json({ error: 'Log not found' }, { status: 404 })

    const log = JSON.parse(readFileSync(LOG_PATH, 'utf8'))
    const idx = log.iterations.findIndex((it: { id: number }) => it.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Iteration not found' }, { status: 404 })

    log.iterations[idx] = { ...log.iterations[idx], ...updates }

    const { writeFileSync } = await import('fs')
    writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), 'utf8')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

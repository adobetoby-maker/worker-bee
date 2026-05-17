import { NextResponse } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const dynamic = 'force-dynamic'

// Serves the wb-apply.mjs script so GitHub Actions can always pull the latest version.
// The workflow does: curl -fsSL https://manage.worker-bee.app/api/scripts/wb-apply -o wb-apply.mjs
export async function GET() {
  try {
    // Read from the checked-in copy in the repo
    const scriptPath = join(process.cwd(), 'scripts', 'wb-apply.mjs')
    const content = readFileSync(scriptPath, 'utf8')
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch {
    // Fallback: inline the script if the file isn't present
    return new NextResponse('// wb-apply.mjs not found on server', {
      status: 404,
      headers: { 'Content-Type': 'text/javascript' },
    })
  }
}

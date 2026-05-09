import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 120

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are a senior engineer generating a surgical maintenance spec for an existing client website.

You receive:
- The client's change request (plain English)
- The site's CLAUDE.md (architecture context)
- Sentry production errors (real bugs to fix alongside the request)

Output a maintenance spec in this exact format — plain prose, no markdown headers except the ones shown:

## Change Request
[Restate what the client wants, clarified and scoped]

## Sentry Fixes
[List each Sentry error and the specific file/component it's in, if determinable from the error. If no errors, write "No production errors detected."]

## Files to Modify
[Bullet list of specific files to touch — inferred from CLAUDE.md architecture + the change request. Be precise: app/packages/page.tsx, not "the packages page"]

## Implementation Notes
[Key decisions: what NOT to change, what patterns to follow from CLAUDE.md, any tricky edge cases]

## Verification Steps
[3-5 specific things to verify after changes: build passes, form submits, page renders, etc.]

Keep the entire spec under 400 words. Be specific and surgical — this modifies an existing codebase, not a fresh build.`

export async function POST(req: NextRequest) {
  try {
    const { changeRequest, claudeMd, sentryIssues, siteName } = await req.json() as {
      changeRequest: string
      claudeMd: string
      sentryIssues: string
      siteName: string
    }

    if (!changeRequest?.trim()) return NextResponse.json({ error: 'changeRequest required' }, { status: 400 })

    const userMessage = `Site: ${siteName}

Client change request:
"${changeRequest}"

CLAUDE.md (site architecture):
${claudeMd || 'Not available — use the change request context only.'}

Sentry production errors (past 7 days):
${sentryIssues || 'No Sentry data available.'}

Generate a surgical maintenance spec.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
    })

    const spec = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ spec })
  } catch (err) {
    console.error('Maintenance spec error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

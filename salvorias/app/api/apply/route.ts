import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, website, business, wallet, sav, timeline, message } = body

    if (!name || !email || !business) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Forward to webhook (set APPLY_WEBHOOK_URL in Vercel env vars)
    const webhookUrl = process.env.APPLY_WEBHOOK_URL
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: `*New Salvorias Application*\n*Name:* ${name}\n*Email:* ${email}\n*Business:* ${business}\n*Website:* ${website || '—'}\n*Wallet:* ${wallet || '—'}\n*SAV held:* ${sav || '—'}\n*Timeline:* ${timeline || '—'}\n*Message:* ${message || '—'}`,
          fields: { name, email, website, business, wallet, sav, timeline, message },
          submitted_at: new Date().toISOString(),
        }),
      })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

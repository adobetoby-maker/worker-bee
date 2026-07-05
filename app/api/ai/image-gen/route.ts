import { NextRequest, NextResponse } from 'next/server'
import { blueprintAuth } from '@/lib/apiKeyAuth'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const FAL_KEY = process.env.FAL_KEY
const COMFY_URL = process.env.COMFY_URL ?? null

const requireApiKey = blueprintAuth

// POST /api/ai/image-gen
export async function POST(req: NextRequest) {
  if (!requireApiKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { prompt?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { prompt } = body
  if (!prompt) {
    return NextResponse.json({ error: 'prompt required' }, { status: 400 })
  }

  // Attempt 1: Forward to existing ComfyUI proxy if available
  if (COMFY_URL) {
    try {
      const comfyRes = await fetch(`${COMFY_URL.replace(/\/$/, '')}/api/image-gen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: AbortSignal.timeout(90_000),
      })
      if (comfyRes.ok) {
        const data = await comfyRes.json()
        if (data?.imageUrl) {
          return NextResponse.json({ imageUrl: data.imageUrl })
        }
      }
    } catch {
      // ComfyUI not available — fall through to fal.ai
    }
  }

  // Attempt 2: fal.ai flux/schnell
  if (!FAL_KEY) {
    return NextResponse.json(
      { error: 'No image generation service available (FAL_KEY not set)' },
      { status: 503 },
    )
  }

  try {
    const falRes = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        Authorization: `Key ${FAL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_size: 'landscape_16_9',
        num_images: 1,
      }),
    })

    if (!falRes.ok) {
      const errText = await falRes.text()
      console.error('fal.ai error:', falRes.status, errText)
      return NextResponse.json({ error: 'Image generation failed' }, { status: 502 })
    }

    const falData = await falRes.json()
    const imageUrl =
      falData?.images?.[0]?.url ?? falData?.image?.url ?? falData?.output?.[0] ?? null

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL in fal.ai response' }, { status: 502 })
    }

    return NextResponse.json({ imageUrl })
  } catch (err) {
    console.error('image-gen error:', err)
    return NextResponse.json({ error: 'Image generation failed' }, { status: 500 })
  }
}

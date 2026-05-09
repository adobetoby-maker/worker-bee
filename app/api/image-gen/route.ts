import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 120

const COMFY_URL = process.env.COMFY_URL ?? 'http://127.0.0.1:8000'
const DEFAULT_CHECKPOINT = process.env.COMFY_CHECKPOINT ?? 'sd_xl_base_1.0.safetensors'

function buildWorkflow(
  prompt: string,
  negativePrompt: string,
  width: number,
  height: number,
  steps: number,
  checkpoint: string,
) {
  return {
    '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: checkpoint } },
    '2': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['1', 1] } },
    '3': { class_type: 'CLIPTextEncode', inputs: { text: negativePrompt, clip: ['1', 1] } },
    '4': { class_type: 'EmptyLatentImage', inputs: { width, height, batch_size: 1 } },
    '5': {
      class_type: 'KSampler',
      inputs: {
        model: ['1', 0], positive: ['2', 0], negative: ['3', 0], latent_image: ['4', 0],
        seed: Math.floor(Math.random() * 2 ** 48),
        steps, cfg: 7, sampler_name: 'euler', scheduler: 'normal', denoise: 1,
      },
    },
    '6': { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } },
    '7': { class_type: 'SaveImage', inputs: { images: ['6', 0], filename_prefix: 'worker-bee' } },
  }
}

async function pollForImage(
  promptId: string,
  maxAttempts = 60,
): Promise<{ filename: string; subfolder: string } | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const res = await fetch(`${COMFY_URL}/history/${promptId}`)
    if (!res.ok) continue
    const data = await res.json() as Record<string, {
      outputs?: Record<string, { images?: Array<{ filename: string; subfolder: string }> }>
    }>
    const job = data[promptId]
    if (!job?.outputs) continue
    for (const output of Object.values(job.outputs)) {
      if (output.images?.[0]) return output.images[0]
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      prompt,
      negative_prompt = 'blurry, low quality, watermark, text, distorted',
      width = 1024,
      height = 1024,
      steps = 20,
      checkpoint = DEFAULT_CHECKPOINT,
    } = body as {
      prompt?: string
      negative_prompt?: string
      width?: number
      height?: number
      steps?: number
      checkpoint?: string
    }

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt required' }, { status: 400 })
    }

    const workflow = buildWorkflow(prompt, negative_prompt, width, height, steps, checkpoint)
    const submitRes = await fetch(`${COMFY_URL}/prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: workflow }),
    })

    if (!submitRes.ok) {
      const errText = await submitRes.text()
      return NextResponse.json({ error: `ComfyUI rejected workflow: ${errText}` }, { status: 502 })
    }

    const { prompt_id } = await submitRes.json() as { prompt_id: string }
    const image = await pollForImage(prompt_id)

    if (!image) {
      return NextResponse.json({ error: 'Generation timed out after 2 minutes' }, { status: 504 })
    }

    const imgRes = await fetch(
      `${COMFY_URL}/view?filename=${encodeURIComponent(image.filename)}&subfolder=${encodeURIComponent(image.subfolder)}&type=output`,
    )
    if (!imgRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch generated image from ComfyUI' }, { status: 502 })
    }

    const buffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    return NextResponse.json({
      image: `data:image/png;base64,${base64}`,
      filename: image.filename,
      prompt_id,
    })
  } catch (err) {
    console.error('image-gen error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

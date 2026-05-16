import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Support both legacy shape and new wizard shape
    const isWizardSubmission = 'wizard' in body

    let payload: Record<string, unknown>
    let id: string

    if (isWizardSubmission) {
      // New wizard-based submission
      const { wizard, cleaned, blueprint, style, pages, analysis, submittedAt } = body

      if (!wizard?.businessName) {
        return NextResponse.json({ error: 'businessName required' }, { status: 400, headers: CORS })
      }

      id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      // Derive flat fields for backwards compat with submissions dashboard
      const name = wizard.businessName ?? ''
      const description = cleaned?.description || wizard.description || ''
      const nodes = blueprint?.nodes ?? []
      const edges = blueprint?.edges ?? []

      payload = {
        id,
        // Legacy fields for dashboard compatibility
        name,
        email: '',
        business: wizard.businessName,
        vision: description,
        nodes,
        edges,
        // New enriched fields
        wizard,
        cleaned,
        blueprint,
        style,
        pages,
        analysis: analysis ?? null,
        submittedAt: submittedAt ?? new Date().toISOString(),
        status: 'pending',
      }
    } else {
      // Legacy shape from old /plan form
      const { name, email, business, vision, nodes, edges } = body

      if (!name || !email) {
        return NextResponse.json({ error: 'name and email required' }, { status: 400, headers: CORS })
      }

      id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      payload = {
        id,
        name,
        email,
        business: business ?? '',
        vision: vision ?? '',
        nodes: nodes ?? [],
        edges: edges ?? [],
        submittedAt: new Date().toISOString(),
        status: 'pending',
      }
    }

    const { error } = await supabaseAdmin.storage
      .from('blueprints')
      .upload(`submissions/${id}.json`, JSON.stringify(payload), {
        contentType: 'application/json',
        upsert: false,
      })

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, id }, { headers: CORS })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500, headers: CORS })
  }
}

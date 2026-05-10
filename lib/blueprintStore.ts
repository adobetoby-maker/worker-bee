import { supabaseAdmin } from '@/lib/supabase'

const BUCKET = 'blueprints'

export interface BranchData {
  nodes: object[]
  edges: object[]
  updatedAt: string
}

export interface WizardInput {
  business: string
  goal: string
  extra: string
  generatedAt: string
}

export interface BlueprintData {
  currentBranch: string
  branches: Record<string, BranchData>
  summary?: string
  wizardInput?: WizardInput
  videoUrl?: string
}

export async function getBlueprint(siteId: string): Promise<BlueprintData | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(`${siteId}.json`)

  if (error || !data) return null

  try {
    const text = await data.text()
    const parsed = JSON.parse(text)
    // Migrate legacy format (flat nodes/edges → branch structure)
    if (parsed.nodes && !parsed.branches) {
      return {
        currentBranch: 'main',
        branches: { main: { nodes: parsed.nodes, edges: parsed.edges, updatedAt: parsed.updatedAt ?? new Date().toISOString() } },
        summary: parsed.summary,
      }
    }
    return parsed as BlueprintData
  } catch {
    return null
  }
}

export async function saveBlueprint(siteId: string, blueprint: BlueprintData): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(`${siteId}.json`, JSON.stringify(blueprint), {
      contentType: 'application/json',
      upsert: true,
    })

  if (error) throw new Error(`Blueprint save failed: ${error.message}`)
}

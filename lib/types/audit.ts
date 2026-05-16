// ── Audit system types ─────────────────────────────────────────────────────

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'critical'
export type CheckCategory = 'seo' | 'security' | 'perf' | 'infrastructure'

export interface AuditCheck {
  id: string
  category: CheckCategory
  label: string
  status: CheckStatus
  value?: string
  detail: string
}

export interface AuditScores {
  seo: number
  security: number
  perf: number
  overall: number
}

export interface GitHubSummary {
  hasEnv: boolean
  hasClaudeMd: boolean
  nextVersion?: string
}

export interface AuditResult {
  url: string
  fetchedAt: string
  scores: AuditScores
  checks: AuditCheck[]
  github?: GitHubSummary
  error?: string
}

// ── Blueprint output types ─────────────────────────────────────────────────

export type BlueprintNodeType = 'seo' | 'security' | 'performance' | 'content' | 'rebuild'
export type BlueprintStatus = 'critical' | 'important' | 'nice-to-have'
export type BlueprintEffort = 'low' | 'medium' | 'high'
export type BlueprintMode = 'rebuild' | 'patch'

export interface BlueprintNodeData {
  title: string
  type: BlueprintNodeType
  description: string
  status: BlueprintStatus
  priority: number
  effort: BlueprintEffort
  claudePrompt: string
}

export interface BlueprintNode {
  id: string
  type: 'default'
  position: { x: number; y: number }
  data: BlueprintNodeData
}

export interface BlueprintEdge {
  id: string
  source: string
  target: string
  type?: string
}

export interface BlueprintResult {
  nodes: BlueprintNode[]
  edges: BlueprintEdge[]
  summary: string
  mode: BlueprintMode
}

// ── Save payload ───────────────────────────────────────────────────────────

export interface AuditSavePayload {
  url: string
  audit: AuditResult
  blueprint?: BlueprintResult
  clientNotes?: string
  mode?: BlueprintMode
  contactName?: string
  contactEmail?: string
}

export interface AuditSaveResponse {
  id: string
  saved: true
}

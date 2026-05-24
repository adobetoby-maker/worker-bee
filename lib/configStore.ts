import { supabaseAdmin as _supabase } from './supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = _supabase as any

// ── Types ─────────────────────────────────────────────────────────────────────

export type ConfigCategory =
  | 'sanity'
  | 'supabase'
  | 'resend'
  | 'stripe'
  | 'analytics'
  | 'auth'
  | 'general'

export type ProjectConfig = {
  id: string
  site_id: string
  key: string
  notes: string | null
  value: string | null
  description: string | null
  category: ConfigCategory
  is_secret: boolean
  is_verified: boolean
  applied_to_vercel: boolean
  created_at: string
  updated_at: string
}

export type ConfigUpsert = {
  site_id: string
  key: string
  value?: string | null
  description?: string | null
  notes?: string | null
  category?: ConfigCategory
  is_secret?: boolean
  is_verified?: boolean
  applied_to_vercel?: boolean
}

// Well-known config keys with defaults — pre-populates a new site's config panel
export const KNOWN_KEYS: Array<{
  key: string
  description: string
  category: ConfigCategory
  is_secret: boolean
}> = [
  // Analytics
  { key: 'NEXT_PUBLIC_GA_ID',            description: 'GA4 measurement ID for Next.js sites (G-XXXXXXXXXX)',          category: 'analytics', is_secret: false },
  { key: 'VITE_GA_ID',                   description: 'GA4 measurement ID for Vite sites (baked at build time)',      category: 'analytics', is_secret: false },
  { key: 'GA_PROPERTY_ID',              description: 'GA4 numeric property ID for Data API (e.g. 123456789)',        category: 'analytics', is_secret: false },
  { key: 'NEXT_PUBLIC_PLAUSIBLE_DOMAIN', description: 'Plausible analytics domain (e.g. example.com)',               category: 'analytics', is_secret: false },
  // Sanity CMS
  { key: 'NEXT_PUBLIC_SANITY_PROJECT_ID', description: 'Sanity project ID (from sanity.io/manage)',       category: 'sanity', is_secret: false },
  { key: 'NEXT_PUBLIC_SANITY_DATASET',    description: 'Sanity dataset name (usually "production")',      category: 'sanity', is_secret: false },
  { key: 'SANITY_API_TOKEN',              description: 'Sanity editor API token (server-only)',            category: 'sanity', is_secret: true },
  { key: 'SANITY_REVALIDATE_SECRET',      description: 'Secret for Sanity ISR webhook',                   category: 'sanity', is_secret: true },
  // Supabase
  { key: 'NEXT_PUBLIC_SUPABASE_URL',      description: 'Supabase project URL',                            category: 'supabase', is_secret: false },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Supabase anon key (safe for browser)',            category: 'supabase', is_secret: false },
  { key: 'SUPABASE_SERVICE_ROLE_KEY',     description: 'Supabase service role key (server-only)',         category: 'supabase', is_secret: true },
  // Email
  { key: 'RESEND_API_KEY',                description: 'Resend API key for transactional email',          category: 'resend', is_secret: true },
  { key: 'RESEND_FROM_EMAIL',             description: 'Verified sender address (e.g. noreply@domain.com)', category: 'resend', is_secret: false },
  // Stripe
  { key: 'STRIPE_SECRET_KEY',             description: 'Stripe secret key (server-only)',                 category: 'stripe', is_secret: true },
  { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', description: 'Stripe publishable key (browser-safe)',     category: 'stripe', is_secret: false },
  { key: 'STRIPE_WEBHOOK_SECRET',         description: 'Stripe webhook endpoint signing secret',          category: 'stripe', is_secret: true },
  // Auth
  { key: 'NEXTAUTH_SECRET',               description: 'NextAuth.js JWT signing secret',                  category: 'auth', is_secret: true },
  { key: 'NEXTAUTH_URL',                  description: 'Canonical URL for NextAuth callbacks',             category: 'auth', is_secret: false },
  // General
  { key: 'NEXT_PUBLIC_SITE_URL',          description: 'Canonical public URL — controls sitemap, OG, robots', category: 'general', is_secret: false },
]

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listConfigs(siteId: string): Promise<ProjectConfig[]> {
  const { data, error } = await db
    .from('project_configs')
    .select('*')
    .eq('site_id', siteId)
    .order('category')
    .order('key')

  if (error) throw new Error(`listConfigs: ${error.message}`)
  return (data ?? []) as ProjectConfig[]
}

export async function upsertConfig(row: ConfigUpsert): Promise<ProjectConfig> {
  const { data, error } = await db
    .from('project_configs')
    .upsert(
      {
        ...row,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'site_id,key', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (error) throw new Error(`upsertConfig: ${error.message}`)
  return data as ProjectConfig
}

export async function upsertManyConfigs(rows: ConfigUpsert[]): Promise<void> {
  const { error } = await db
    .from('project_configs')
    .upsert(
      rows.map(r => ({ ...r, updated_at: new Date().toISOString() })),
      { onConflict: 'site_id,key', ignoreDuplicates: false }
    )

  if (error) throw new Error(`upsertManyConfigs: ${error.message}`)
}

export async function deleteConfig(id: string): Promise<void> {
  const { error } = await db
    .from('project_configs')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`deleteConfig: ${error.message}`)
}

/** Seed a new site's config panel with all well-known keys (empty values). */
export async function seedDefaultConfigs(siteId: string): Promise<void> {
  await upsertManyConfigs(
    KNOWN_KEYS.map(k => ({
      site_id: siteId,
      key: k.key,
      value: null,
      description: k.description,
      category: k.category,
      is_secret: k.is_secret,
    }))
  )
}

/** Return configs as a plain .env file string (skip null values). */
export function configsToEnv(configs: ProjectConfig[]): string {
  return configs
    .filter(c => c.value !== null && c.value !== '')
    .map(c => `${c.key}=${c.value}`)
    .join('\n')
}

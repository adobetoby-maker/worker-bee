'use client'

import { useState } from 'react'
import Link from 'next/link'
import { type LucideIcon,
  Package, Globe, GitBranch, ExternalLink, Plus, Paintbrush,
  Key, Zap, ToggleLeft, ToggleRight, RefreshCw, CheckCircle2,
  Copy, ChevronDown, ChevronRight, Upload, BookOpen, ShieldCheck,
  Clock, RotateCcw, ScrollText,
} from 'lucide-react'

interface SiteMeta {
  category?: string
  product?: string
  description?: string
  features?: string[]
  price?: number
  demo_url?: string
  logo_url?: string
  brand_name?: string
  primary_color?: string
  client_name?: string
  domain?: string
  features_enabled?: Record<string, boolean>
  api_keys?: Record<string, string>
}

interface Site {
  id: string
  name: string
  url: string
  stack: string
  status: string
  github_repo: string | null
  vercel_project_id: string | null
  created_at: string
  updated_at?: string
  notes: string | null
  meta: SiteMeta
}

interface Props {
  whiteLabelSites: Site[]
  productSites: Site[]
}

const DEFAULT_FEATURES: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  ai_cleanup:          { label: 'AI Cleanup',        icon: Zap,          color: '#818cf8' },
  csv_invite:          { label: 'CSV Bulk Invite',    icon: Upload,       color: '#34d399' },
  compliance:          { label: 'Compliance Modules', icon: ShieldCheck,  color: '#f59e0b' },
  course_player:       { label: 'Course Player',      icon: BookOpen,     color: '#60a5fa' },
  i18n:                { label: 'Spanish / i18n',     icon: Globe,        color: '#a78bfa' },
  theme_picker:        { label: '4-Theme Picker',     icon: Paintbrush,   color: '#fb7185' },
}

function WhiteLabelCard({ site, isTemplate }: { site: Site; isTemplate: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const features = site.meta.features_enabled ?? Object.fromEntries(Object.keys(DEFAULT_FEATURES).map(k => [k, true]))

  function copyUrl() {
    navigator.clipboard.writeText(site.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {site.meta.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={site.meta.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: site.meta.primary_color ? `${site.meta.primary_color}22` : 'rgba(99,102,241,0.15)', border: `1px solid ${site.meta.primary_color ?? '#818cf8'}33` }}>
                <Package size={18} style={{ color: site.meta.primary_color ?? '#818cf8' }} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">{site.meta.brand_name ?? site.name}</span>
                {isTemplate && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}>
                    Template
                  </span>
                )}
              </div>
              {site.meta.client_name && (
                <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{site.meta.client_name}</div>
              )}
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1" style={{ color: '#64748b' }}>
                  <Globe size={11} />
                  <span className="text-xs">{site.meta.domain ?? site.url.replace('https://', '')}</span>
                </span>
                <span className="flex items-center gap-1" style={{ color: '#475569' }}>
                  <Clock size={10} />
                  <span className="text-xs">Created {new Date(site.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </span>
                {site.updated_at && site.updated_at !== site.created_at && (
                  <span className="flex items-center gap-1" style={{ color: '#475569' }}>
                    <RefreshCw size={10} />
                    <span className="text-xs">Edited {new Date(site.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a href={site.url} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
               style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
              <ExternalLink size={11} /> View
            </a>
            <button onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg cursor-pointer"
              style={{ color: '#64748b' }}>
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Feature flags */}
      <div className="px-5 pb-3">
        <div className="flex flex-wrap gap-2">
          {Object.entries(DEFAULT_FEATURES).map(([key, { label, icon: Icon, color }]) => {
            const on = features[key] !== false
            return (
              <div key={key}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
                style={{
                  background: on ? `${color}14` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${on ? color + '33' : 'rgba(255,255,255,0.07)'}`,
                  color: on ? color : '#475569',
                }}>
                <Icon size={10} />
                {label}
                {on ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Expanded config panel */}
      {expanded && (
        <div className="border-t px-5 py-4 space-y-5" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>

          {/* Branding */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#64748b' }}>
              <Paintbrush size={10} className="inline mr-1.5" />Branding
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: '#64748b' }}>Brand Name</label>
                <input defaultValue={site.meta.brand_name ?? site.name}
                  className="w-full text-sm px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: '#64748b' }}>Primary Color</label>
                <div className="flex gap-2">
                  <input type="color" defaultValue={site.meta.primary_color ?? '#4f46e5'}
                    className="w-10 h-9 rounded-lg cursor-pointer border-0 p-0.5"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }} />
                  <input defaultValue={site.meta.primary_color ?? '#4f46e5'}
                    className="flex-1 text-sm px-3 py-2 rounded-lg font-mono"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: '#64748b' }}>Logo URL</label>
                <input defaultValue={site.meta.logo_url ?? ''}
                  placeholder="https://..."
                  className="w-full text-sm px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }} />
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#64748b' }}>
              <Key size={10} className="inline mr-1.5" />API Keys & Secrets
            </div>
            <div className="space-y-2">
              {[
                { key: 'NEXT_PUBLIC_SUPABASE_URL',      label: 'Supabase URL',        type: 'text' },
                { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key',   type: 'password' },
                { key: 'SUPABASE_SERVICE_ROLE_KEY',     label: 'Service Role Key',    type: 'password' },
                { key: 'ANTHROPIC_API_KEY',             label: 'Anthropic (AI)',       type: 'password' },
                { key: 'RESEND_API_KEY',                label: 'Resend (Email)',       type: 'password' },
              ].map(({ key, label, type }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs w-40 shrink-0" style={{ color: '#94a3b8' }}>{label}</span>
                  <input
                    type={type}
                    defaultValue={site.meta.api_keys?.[key] ?? ''}
                    placeholder={key}
                    className="flex-1 text-xs px-3 py-1.5 rounded-lg font-mono"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)', color: '#e2e8f0' }}
                  />
                  <button className="text-xs px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
                    <Copy size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium cursor-pointer transition-colors"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
              <RefreshCw size={13} /> Redeploy
            </button>
            <button className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium cursor-pointer transition-colors"
              style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
              <CheckCircle2 size={13} /> Save Config
            </button>
            {site.github_repo && (
              <>
                <a href={`https://github.com/${site.github_repo}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium cursor-pointer transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <GitBranch size={13} /> GitHub
                </a>
                <a href={`https://github.com/${site.github_repo}/commits/main`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium cursor-pointer transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }}
                  title="View commit history to roll back">
                  <RotateCcw size={13} /> Rollback
                </a>
                <a href={`https://github.com/${site.github_repo}/actions`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium cursor-pointer transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <ScrollText size={13} /> Log
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function WhiteLabelsClient({ whiteLabelSites, productSites }: Props) {
  return (
    <div className="max-w-4xl space-y-10 pb-16">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">White Labels</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>
            {whiteLabelSites.length} template{whiteLabelSites.length !== 1 ? 's' : ''} · clone and configure per client
          </p>
        </div>
        <button className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold cursor-pointer transition-colors"
          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
          <Plus size={14} /> New White Label
        </button>
      </div>

      {/* Products (source of truth) */}
      {productSites.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Package size={14} style={{ color: '#f59e0b' }} />
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>
              Products
            </h2>
          </div>
          <div className="space-y-3">
            {productSites.map(site => (
              <div key={site.id} className="flex items-center justify-between rounded-xl px-5 py-4"
                style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <div>
                  <div className="font-semibold text-sm text-white">{site.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                    {site.meta?.description ?? site.url}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {site.meta?.demo_url && (
                    <a href={site.meta.demo_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}>
                      <ExternalLink size={10} /> Demo
                    </a>
                  )}
                  <Link href={`/sites/${site.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Manage →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* White Label Templates */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Paintbrush size={14} style={{ color: '#818cf8' }} />
          <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>
            White Label Templates
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(129,140,248,0.1)', color: '#818cf8' }}>
            {whiteLabelSites.length}
          </span>
        </div>

        {whiteLabelSites.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Paintbrush size={28} className="mx-auto mb-3" style={{ color: '#334155' }} />
            <div className="text-sm font-medium text-white mb-1">No white labels yet</div>
            <div className="text-xs" style={{ color: '#475569' }}>
              Sites tagged as white-label will appear here with logo, API, and feature controls.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {whiteLabelSites.map(site => (
              <WhiteLabelCard key={site.id} site={site} isTemplate={!site.meta.client_name} />
            ))}
          </div>
        )}
      </div>

      {/* How to deploy a new white label */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-sm font-semibold text-white mb-4">Deploy a new white label</div>
        <ol className="space-y-3 text-sm" style={{ color: '#64748b' }}>
          {[
            'Fork the LMS Pro GitHub repo → rename for client',
            'Set env vars: Supabase project, Resend API key, Anthropic key',
            'Deploy to Vercel → add custom domain',
            'Register here with client name, logo URL, primary color',
            'Send demo link — client logs in, picks theme, goes live',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8' }}>{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

    </div>
  )
}

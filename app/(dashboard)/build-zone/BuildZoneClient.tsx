'use client'

import { useState } from 'react'
import {
  Rocket, Clock, CheckCircle2, Link2, Copy, Check,
  ChevronDown, ChevronRight, Building2, Phone, Mail,
  MapPin, Palette, Star, ExternalLink, RefreshCw, Package,
} from 'lucide-react'

interface IntakeSite {
  id: string
  name: string
  url: string
  status: string
  github_repo: string | null
  meta: Record<string, unknown>
}

interface SimpleSite {
  id: string
  name: string
  url: string
}

interface Props {
  intakes: IntakeSite[]
  allSites: SimpleSite[]
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

function IntakeCard({ site }: { site: IntakeSite }) {
  const [open, setOpen] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deployed, setDeployed] = useState(false)
  const m = site.meta

  const statusColor = m.intake_status === 'deployed'
    ? '#34d399' : m.intake_status === 'reviewed'
    ? '#818cf8' : '#f59e0b'

  async function triggerDeploy() {
    setDeploying(true)
    // TODO: wire to actual deploy pipeline
    await new Promise(r => setTimeout(r, 2000))
    setDeploying(false)
    setDeployed(true)
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
               style={{ background: 'rgba(245,158,11,0.12)' }}>
            <Building2 size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white text-sm">{m.company_name as string ?? site.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(245,158,11,0.12)', color: statusColor, border: `1px solid ${statusColor}33` }}>
                {m.intake_status as string ?? 'pending'}
              </span>
            </div>
            <div className="text-xs mt-1 flex items-center gap-3 flex-wrap" style={{ color: '#64748b' }}>
              <span>Submitted {timeAgo(m.intake_submitted_at as string)}</span>
              {m.phone && <span className="flex items-center gap-1"><Phone size={10} />{m.phone as string}</span>}
              {m.email && <span className="flex items-center gap-1"><Mail size={10} />{m.email as string}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={triggerDeploy} disabled={deploying || deployed}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors disabled:opacity-50"
            style={{ background: deployed ? 'rgba(52,211,153,0.12)' : 'rgba(99,102,241,0.15)',
                     color: deployed ? '#34d399' : '#818cf8', border: `1px solid ${deployed ? 'rgba(52,211,153,0.25)' : 'rgba(99,102,241,0.3)'}` }}>
            {deploying ? <RefreshCw size={11} className="animate-spin" /> : deployed ? <CheckCircle2 size={11} /> : <Rocket size={11} />}
            {deploying ? 'Building…' : deployed ? 'Deployed ✓' : 'Deploy'}
          </button>
          <button onClick={() => setOpen(o => !o)}
            className="text-xs px-2 py-1.5 rounded-lg cursor-pointer" style={{ color: '#64748b' }}>
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* Quick data pills */}
      <div className="px-5 pb-3 flex flex-wrap gap-2">
        {m.city && (
          <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b' }}>
            <MapPin size={10} />{m.city as string}{m.state ? `, ${m.state as string}` : ''}
          </span>
        )}
        {m.primary_color && (
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b' }}>
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: m.primary_color as string }} />
            {m.primary_color as string}
          </span>
        )}
        {Array.isArray(m.services) && m.services.length > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b' }}>
            {m.services.length} services
          </span>
        )}
        {Array.isArray(m.photo_data) && m.photo_data.length > 0 && (
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b' }}>
            📸 {m.photo_data.length} photos
          </span>
        )}
        {m.logo_data && (
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399' }}>
            ✓ Logo
          </span>
        )}
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="border-t px-5 py-4 space-y-4" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>

          {/* Logo preview */}
          {m.logo_data && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Logo</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.logo_data as string} alt="logo"
                className="h-12 rounded-lg object-contain"
                style={{ background: m.primary_color as string ?? '#1e1e2e', padding: '6px 12px' }} />
            </div>
          )}

          {/* Brand color */}
          {m.primary_color && (
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>Brand Color</div>
              <span className="w-6 h-6 rounded-md" style={{ background: m.primary_color as string }} />
              <span className="text-xs font-mono" style={{ color: '#94a3b8' }}>{m.primary_color as string}</span>
            </div>
          )}

          {/* Services */}
          {Array.isArray(m.services) && m.services.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Services</div>
              <div className="flex flex-wrap gap-1.5">
                {(m.services as string[]).map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Service area */}
          {Array.isArray(m.service_area) && m.service_area.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Service Area</div>
              <div className="text-sm" style={{ color: '#94a3b8' }}>{(m.service_area as string[]).join(', ')}</div>
            </div>
          )}

          {/* Photos */}
          {Array.isArray(m.photo_data) && m.photo_data.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Photos ({m.photo_data.length})</div>
              <div className="flex flex-wrap gap-2">
                {(m.photo_data as string[]).slice(0, 6).map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" className="w-16 h-16 rounded-lg object-cover"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
                ))}
              </div>
            </div>
          )}

          {/* Client notes */}
          {m.client_notes && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Notes from client</div>
              <div className="text-sm italic" style={{ color: '#94a3b8' }}>&ldquo;{m.client_notes as string}&rdquo;</div>
            </div>
          )}

          {/* Hours */}
          {m.hours && typeof m.hours === 'object' && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#64748b' }}>Hours</div>
              <div className="grid grid-cols-2 gap-1 text-xs" style={{ color: '#94a3b8' }}>
                {Object.entries(m.hours as Record<string, { open: string; close: string }>).map(([day, h]) => (
                  <div key={day}><span className="capitalize">{day.slice(0,3)}:</span> {h.open}–{h.close}</div>
                ))}
              </div>
            </div>
          )}

          {/* GitHub + deploy actions */}
          {site.github_repo && (
            <div className="flex gap-2 pt-2">
              <a href={`https://github.com/${site.github_repo}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.07)' }}>
                <ExternalLink size={11} /> GitHub
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GenerateLinkPanel({ sites }: { sites: SimpleSite[] }) {
  const [siteId, setSiteId] = useState('')
  const [label, setLabel] = useState('')
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate() {
    if (!siteId) return
    setLoading(true)
    const res = await fetch('/api/share-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteId, label: label || 'Client Intake Form' }),
    })
    const d = await res.json()
    // Convert share URL to intake HTML URL
    const token = d.token
    setLink(`https://manage.worker-bee.app/api/client-intake/html?token=${token}`)
    setLoading(false)
  }

  function copy() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="text-sm font-semibold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: '#64748b' }}>
        <Link2 size={13} /> Generate Client Intake Link
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>Project / Site</label>
          <select value={siteId} onChange={e => setSiteId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm cursor-pointer appearance-none"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
            <option value="">Select a site…</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>Link Label (internal)</label>
          <input value={label} onChange={e => setLabel(e.target.value)}
            placeholder="Jay Anderton — Plumbing Intake"
            className="w-full px-3 py-2.5 rounded-xl text-sm"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }} />
        </div>

        <button onClick={generate} disabled={!siteId || loading}
          className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-40 transition-colors"
          style={{ background: 'rgba(99,102,241,0.18)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
          {loading ? 'Generating…' : 'Generate Intake Link'}
        </button>

        {link && (
          <div className="rounded-xl p-3 flex items-center gap-2"
            style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <span className="flex-1 text-xs font-mono truncate" style={{ color: '#34d399' }}>{link}</span>
            <button onClick={copy} className="shrink-0 cursor-pointer" style={{ color: '#64748b' }}>
              {copied ? <Check size={14} style={{ color: '#34d399' }} /> : <Copy size={14} />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BuildZoneClient({ intakes, allSites }: Props) {
  const pending  = intakes.filter(i => i.meta.intake_status !== 'deployed')
  const deployed = intakes.filter(i => i.meta.intake_status === 'deployed')

  return (
    <div className="max-w-4xl space-y-8 pb-16">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Build Zone</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Client intake submissions ready to build and deploy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
            {pending.length} pending
          </span>
          {deployed.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
              {deployed.length} deployed
            </span>
          )}
        </div>
      </div>

      {/* Generate link panel */}
      <GenerateLinkPanel sites={allSites} />

      {/* Pending intakes */}
      {pending.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} style={{ color: '#f59e0b' }} />
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>
              Pending Build
            </h2>
          </div>
          <div className="space-y-3">
            {pending.map(s => <IntakeCard key={s.id} site={s} />)}
          </div>
        </div>
      )}

      {/* Deployed */}
      {deployed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={14} style={{ color: '#34d399' }} />
            <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#64748b' }}>
              Deployed
            </h2>
          </div>
          <div className="space-y-3">
            {deployed.map(s => <IntakeCard key={s.id} site={s} />)}
          </div>
        </div>
      )}

      {intakes.length === 0 && (
        <div className="rounded-2xl p-12 text-center" style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
          <Package size={28} className="mx-auto mb-3" style={{ color: '#334155' }} />
          <div className="text-sm font-medium text-white mb-1">No intakes yet</div>
          <div className="text-xs" style={{ color: '#475569' }}>
            Generate a link above, send it to a client, and their submission will appear here.
          </div>
        </div>
      )}
    </div>
  )
}

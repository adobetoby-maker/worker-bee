'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, ArrowRight, Check, Megaphone, RefreshCw,
  Globe, CalendarDays, Layers, Palette, ChevronRight,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Site {
  id: string
  name: string
  url: string
  stack: string
  status: string
}

type Platform = {
  id: string
  label: string
  emoji: string
  tier: 'API' | 'Zapier' | 'Playwright'
  tierColor: string
}

type ContentType = {
  id: string
  label: string
}

type ToneOption = {
  id: string
  label: string
  description: string
}

// ── Constants ─────────────────────────────────────────────────────────────────
const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'

const PLATFORMS: Platform[] = [
  { id: 'facebook',  label: 'Facebook',  emoji: '📘', tier: 'Zapier',     tierColor: '#60a5fa' },
  { id: 'instagram', label: 'Instagram', emoji: '📸', tier: 'Zapier',     tierColor: '#60a5fa' },
  { id: 'tiktok',    label: 'TikTok',    emoji: '🎵', tier: 'API',        tierColor: '#34d399' },
  { id: 'youtube',   label: 'YouTube',   emoji: '▶️', tier: 'API',        tierColor: '#34d399' },
  { id: 'gbp',       label: 'GBP',       emoji: '📍', tier: 'Playwright', tierColor: '#fbbf24' },
  { id: 'linkedin',  label: 'LinkedIn',  emoji: '💼', tier: 'Zapier',     tierColor: '#60a5fa' },
  { id: 'pinterest', label: 'Pinterest', emoji: '📌', tier: 'Zapier',     tierColor: '#60a5fa' },
  { id: 'nextdoor',  label: 'Nextdoor',  emoji: '🏘️', tier: 'Playwright', tierColor: '#fbbf24' },
]

const CONTENT_TYPES: ContentType[] = [
  { id: 'video_reels',    label: 'Video Reels' },
  { id: 'carousel',       label: 'Carousel' },
  { id: 'static_image',   label: 'Static Image' },
  { id: 'text_only',      label: 'Text-only' },
  { id: 'story',          label: 'Story' },
  { id: 'long_form',      label: 'Long-form Video' },
]

const TONES: ToneOption[] = [
  { id: 'educational',        label: 'Educational',        description: 'Teach something valuable, position as expert' },
  { id: 'entertaining',       label: 'Entertaining',       description: 'Funny, relatable, shareable content' },
  { id: 'community',          label: 'Community',          description: 'Local connection, neighbor-to-neighbor' },
  { id: 'promotional',        label: 'Promotional',        description: 'Offers, CTAs, drive conversions' },
  { id: 'behind_the_scenes',  label: 'Behind-the-Scenes',  description: 'Show process, people, culture' },
]

const SITE_TYPES = [
  'local_business', 'e_commerce', 'saas', 'content_site', 'portfolio',
  'restaurant', 'healthcare', 'fitness', 'education', 'real_estate',
  'nonprofit', 'other',
]

// Platform recommendations by site type
const PLATFORM_RECS: Record<string, string[]> = {
  local_business: ['gbp', 'facebook', 'instagram', 'nextdoor'],
  e_commerce:     ['instagram', 'pinterest', 'facebook', 'tiktok'],
  saas:           ['linkedin', 'youtube', 'facebook'],
  content_site:   ['pinterest', 'facebook', 'youtube', 'instagram'],
  portfolio:      ['instagram', 'linkedin', 'pinterest'],
  restaurant:     ['instagram', 'facebook', 'gbp', 'tiktok'],
  healthcare:     ['facebook', 'instagram', 'youtube', 'gbp'],
  fitness:        ['instagram', 'youtube', 'tiktok', 'facebook'],
  education:      ['youtube', 'facebook', 'instagram', 'linkedin'],
  real_estate:    ['instagram', 'facebook', 'youtube', 'linkedin'],
  nonprofit:      ['facebook', 'instagram', 'linkedin', 'youtube'],
  other:          ['instagram', 'facebook', 'youtube'],
}

// ── Wizard step config ────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Site',      icon: <Globe size={14} /> },
  { id: 2, label: 'Platforms', icon: <Layers size={14} /> },
  { id: 3, label: 'Content',   icon: <Palette size={14} /> },
  { id: 4, label: 'Review',    icon: <Check size={14} /> },
]

// ── Form state ────────────────────────────────────────────────────────────────
interface FormState {
  siteId:       string
  campaignName: string
  weekStart:    string
  siteType:     string
  platforms:    string[]
  contentTypes: string[]
  tone:         string
  brandVoice:   string
}

function defaultWeekStart(): string {
  // Next Monday
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NewCampaignPage() {
  const router = useRouter()

  const [step, setStep]       = useState(1)
  const [sites, setSites]     = useState<Site[]>([])
  const [loadingSites, setLoadingSites] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    siteId:       '',
    campaignName: '',
    weekStart:    defaultWeekStart(),
    siteType:     '',
    platforms:    [],
    contentTypes: [],
    tone:         '',
    brandVoice:   '',
  })

  const selectedSite = sites.find(s => s.id === form.siteId)

  // Load sites
  useEffect(() => {
    setLoadingSites(true)
    fetch('/api/sites')
      .then(r => r.ok ? r.json() : [])
      .then((data: Site[]) => { setSites(Array.isArray(data) ? data : []) })
      .catch(() => setSites([]))
      .finally(() => setLoadingSites(false))
  }, [])

  // Auto-suggest platforms when site type changes
  const handleSiteTypeChange = useCallback((siteType: string) => {
    const recs = PLATFORM_RECS[siteType] ?? []
    setForm(f => ({ ...f, siteType, platforms: recs }))
  }, [])

  const togglePlatform = (id: string) => {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(id)
        ? f.platforms.filter(p => p !== id)
        : [...f.platforms, id],
    }))
  }

  const toggleContentType = (id: string) => {
    setForm(f => ({
      ...f,
      contentTypes: f.contentTypes.includes(id)
        ? f.contentTypes.filter(c => c !== id)
        : [...f.contentTypes, id],
    }))
  }

  // Validation per step
  const canAdvance = (s: number): boolean => {
    if (s === 1) return Boolean(form.siteId && form.campaignName.trim() && form.weekStart)
    if (s === 2) return form.platforms.length > 0
    if (s === 3) return Boolean(form.tone)
    return true
  }

  async function createCampaign() {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
        body: JSON.stringify({
          site_id:       form.siteId,
          name:          form.campaignName.trim(),
          site_type:     form.siteType || 'other',
          platforms:     form.platforms,
          content_types: form.contentTypes,
          week_start:    form.weekStart,
          timezone:      'America/Boise',
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to create campaign')
        setCreating(false)
        return
      }
      const campaign = await res.json()
      router.push(`/marketing/campaigns/${campaign.id}/review`)
    } catch {
      setError('Network error — please try again')
      setCreating(false)
    }
  }

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <Link
        href="/marketing"
        className="flex items-center gap-1.5 text-sm mb-6 transition-colors hover:text-indigo-400"
        style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={14} /> All Campaigns
      </Link>

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-8">
        <Megaphone size={22} style={{ color: '#6366f1' }} />
        <h1 className="text-2xl font-bold text-white">New Campaign</h1>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, idx) => {
          const done    = step > s.id
          const current = step === s.id
          return (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: done ? '#6366f1' : current ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                    border: done ? '2px solid #6366f1' : current ? '2px solid rgba(99,102,241,0.8)' : '2px solid rgba(255,255,255,0.1)',
                    color: done ? '#fff' : current ? '#a5b4fc' : 'var(--muted)',
                  }}>
                  {done ? <Check size={14} /> : s.icon}
                </div>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: current ? '#a5b4fc' : done ? '#6366f1' : 'var(--muted)' }}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className="flex-1 h-px mx-2 mb-4 transition-all"
                  style={{ background: done ? '#6366f1' : 'rgba(255,255,255,0.08)' }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step panel */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>

        {/* ── Step 1: Site Selection ─────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                Select Site
              </label>
              {loadingSites ? (
                <div className="flex items-center gap-2 text-sm py-3" style={{ color: 'var(--muted)' }}>
                  <RefreshCw size={14} className="animate-spin" /> Loading sites…
                </div>
              ) : (
                <select
                  value={form.siteId}
                  onChange={e => setForm(f => ({ ...f, siteId: e.target.value }))}
                  className="w-full text-sm rounded-lg px-3 py-2.5 outline-none appearance-none cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: form.siteId ? 'var(--text)' : 'var(--muted)' }}>
                  <option value="">— choose a site —</option>
                  {sites.filter(s => s.status === 'active' || !s.status).map(s => (
                    <option key={s.id} value={s.id} style={{ background: '#0f1117' }}>
                      {s.name} ({s.url.replace(/^https?:\/\//, '')})
                    </option>
                  ))}
                </select>
              )}
              {selectedSite && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
                  {selectedSite.url}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                Campaign Name
              </label>
              <input
                value={form.campaignName}
                onChange={e => setForm(f => ({ ...f, campaignName: e.target.value }))}
                placeholder="e.g. Week 23 — Summer Push"
                className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={12} />
                  Week Start Date
                </span>
              </label>
              <input
                type="date"
                value={form.weekStart}
                onChange={e => setForm(f => ({ ...f, weekStart: e.target.value }))}
                className="w-full text-sm rounded-lg px-3 py-2.5 outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                Site Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SITE_TYPES.map(st => (
                  <button
                    key={st}
                    onClick={() => handleSiteTypeChange(st)}
                    className="px-3 py-2 rounded-lg text-xs font-medium transition-all text-left capitalize"
                    style={{
                      background: form.siteType === st ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                      border:     form.siteType === st ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border)',
                      color:      form.siteType === st ? '#a5b4fc' : 'var(--muted-light)',
                    }}>
                    {st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Platform Selection ────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  Platforms
                </label>
                {form.siteType && (
                  <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                    Recommended for {form.siteType.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                Select which platforms to include in this campaign.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORMS.map(p => {
                  const selected = form.platforms.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left"
                      style={{
                        background: selected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
                        border:     selected ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border)',
                      }}>
                      {/* Checkbox */}
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background: selected ? '#6366f1' : 'transparent',
                          border: selected ? '1.5px solid #6366f1' : '1.5px solid rgba(255,255,255,0.2)',
                        }}>
                        {selected && <Check size={10} color="#fff" />}
                      </div>
                      {/* Icon + label */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span style={{ fontSize: 16, lineHeight: 1 }}>{p.emoji}</span>
                        <span className="font-medium truncate" style={{ color: selected ? '#e0e7ff' : 'var(--muted-light)', fontSize: 13 }}>
                          {p.label}
                        </span>
                      </div>
                      {/* Tier badge */}
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ color: p.tierColor, background: `${p.tierColor}18`, border: `1px solid ${p.tierColor}30` }}>
                        {p.tier}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content types */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                Content Types
              </label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map(ct => {
                  const selected = form.contentTypes.includes(ct.id)
                  return (
                    <button
                      key={ct.id}
                      onClick={() => toggleContentType(ct.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: selected ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)',
                        border:     selected ? '1px solid rgba(52,211,153,0.35)' : '1px solid var(--border)',
                        color:      selected ? '#34d399' : 'var(--muted-light)',
                      }}>
                      {selected && <Check size={10} />}
                      {ct.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Content Configuration ──────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            {/* Tone selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                Tone
              </label>
              <div className="space-y-2">
                {TONES.map(t => {
                  const selected = form.tone === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setForm(f => ({ ...f, tone: t.id }))}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all"
                      style={{
                        background: selected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                        border:     selected ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border)',
                      }}>
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background: selected ? '#6366f1' : 'transparent',
                          border: selected ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.2)',
                        }}>
                        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: selected ? '#e0e7ff' : 'var(--text)' }}>
                          {t.label}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                          {t.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Brand voice */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                Brand Voice
                <span className="ml-2 text-[10px] font-normal normal-case" style={{ color: 'var(--muted)', opacity: 0.7 }}>
                  optional
                </span>
              </label>
              <textarea
                value={form.brandVoice}
                onChange={e => setForm(f => ({ ...f, brandVoice: e.target.value }))}
                placeholder="Describe your brand voice, key phrases, things to avoid… (e.g. 'friendly but professional, local Twin Falls references OK')"
                rows={4}
                className="w-full text-sm rounded-lg px-3 py-2.5 outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>

            {/* Phase note */}
            <div
              className="rounded-lg px-4 py-3 text-xs"
              style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', color: '#fde68a' }}>
              <span className="font-bold">Phase 1 Note:</span> AI content generation is available in Phase 2–3.
              In Phase 1, content will be entered manually in the review panel after campaign creation.
            </div>
          </div>
        )}

        {/* ── Step 4: Review & Create ─────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white mb-4">Review Campaign</h2>

            <SummaryRow label="Site">
              <span className="text-white">{selectedSite?.name ?? '—'}</span>
              {selectedSite?.url && (
                <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>
                  ({selectedSite.url.replace(/^https?:\/\//, '')})
                </span>
              )}
            </SummaryRow>

            <SummaryRow label="Campaign Name">
              <span className="text-white">{form.campaignName}</span>
            </SummaryRow>

            <SummaryRow label="Week Start">
              <span className="text-white">{form.weekStart}</span>
            </SummaryRow>

            <SummaryRow label="Site Type">
              <span className="text-white capitalize">{form.siteType.replace(/_/g, ' ') || '—'}</span>
            </SummaryRow>

            <SummaryRow label="Platforms">
              <div className="flex flex-wrap gap-1.5">
                {form.platforms.map(p => {
                  const pm = PLATFORMS.find(pl => pl.id === p)
                  return (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                      {pm?.emoji} {pm?.label ?? p}
                    </span>
                  )
                })}
                {form.platforms.length === 0 && <span style={{ color: 'var(--muted)' }}>None selected</span>}
              </div>
            </SummaryRow>

            <SummaryRow label="Content Types">
              <div className="flex flex-wrap gap-1">
                {form.contentTypes.map(ct => {
                  const ctm = CONTENT_TYPES.find(c => c.id === ct)
                  return (
                    <span
                      key={ct}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                      {ctm?.label ?? ct}
                    </span>
                  )
                })}
                {form.contentTypes.length === 0 && <span style={{ color: 'var(--muted)' }}>None</span>}
              </div>
            </SummaryRow>

            <SummaryRow label="Tone">
              <span className="text-white capitalize">{form.tone.replace(/_/g, ' ') || '—'}</span>
            </SummaryRow>

            {form.brandVoice && (
              <SummaryRow label="Brand Voice">
                <span className="text-sm leading-relaxed" style={{ color: 'var(--muted-light)' }}>
                  {form.brandVoice}
                </span>
              </SummaryRow>
            )}

            {error && (
              <div
                className="rounded-lg px-4 py-3 text-sm"
                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#fca5a5' }}>
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--muted-light)' }}>
          <ArrowLeft size={14} /> Back
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canAdvance(step)}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc' }}>
            Continue <ArrowRight size={14} />
          </button>
        ) : (
          <button
            onClick={createCampaign}
            disabled={creating}
            className="flex items-center gap-1.5 px-6 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: '#6366f1', border: '1px solid rgba(99,102,241,0.6)', color: '#fff' }}>
            {creating
              ? <><RefreshCw size={14} className="animate-spin" /> Creating…</>
              : <><Check size={14} /> Create Campaign <ChevronRight size={14} /></>}
          </button>
        )}
      </div>
    </div>
  )
}

// ── SummaryRow ────────────────────────────────────────────────────────────────
function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <span
        className="text-xs font-bold uppercase tracking-widest w-28 shrink-0 pt-0.5"
        style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <div className="flex-1 text-sm" style={{ color: 'var(--muted-light)' }}>
        {children}
      </div>
    </div>
  )
}

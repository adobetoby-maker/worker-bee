'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles, Save, Send, RefreshCw, Monitor, Smartphone, ChevronDown, ChevronUp,
  Image as ImageIcon, Plus, Trash2, ArrowLeft, Check, Users, Zap, Mail,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
type CampaignType   = 'BROADCAST' | 'DRIP'
type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT'

interface DripStep {
  id:      string
  delay:   number      // days after previous step
  subject: string
  htmlBody:string
}

interface CampaignData {
  id?:              string
  name:             string
  site_id:          string
  type:             CampaignType
  status:           CampaignStatus
  from_name:        string
  from_email:       string
  subject:          string
  preview_text:     string
  html_body:        string
  hero_image_url?:  string
  subject_variants: string[]
  drip_steps:       DripStep[]
}

// ── Site + config ─────────────────────────────────────────────────────────────
const SITES = [
  { id: 'medicalspanish',     label: 'Medical Spanish',      color: '#00D4A4', from_name: 'Medical Spanish',      from_email: 'hello@medicalspanish.com' },
  { id: 'constructionspanish',label: 'Construction Spanish', color: '#FF6B2B', from_name: 'Construction Spanish', from_email: 'hello@constructionspanish.com' },
  { id: 'languagethreshold',  label: 'Language Threshold',   color: '#60a5fa', from_name: 'Language Threshold',   from_email: 'hello@languagethreshold.com' },
  { id: 'worker-bee',         label: 'Worker Bee',           color: '#a78bfa', from_name: 'Worker Bee',           from_email: 'hello@worker-bee.app' },
]

const EMPTY: CampaignData = {
  name:             '',
  site_id:          'languagethreshold',
  type:             'BROADCAST',
  status:           'DRAFT',
  from_name:        'Language Threshold',
  from_email:       'hello@languagethreshold.com',
  subject:          '',
  preview_text:     '',
  html_body:        '',
  hero_image_url:   '',
  subject_variants: [],
  drip_steps:       [],
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CampaignBuilder({ campaignId }: { campaignId?: string }) {
  const router = useRouter()
  const [campaign, setCampaign]     = useState<CampaignData>(EMPTY)
  const [loading, setLoading]       = useState(!!campaignId)
  const [saving, setSaving]         = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genImage, setGenImage]     = useState(false)
  const [sending, setSending]       = useState(false)
  const [subscriberCount, setSubCount] = useState<number | null>(null)

  const [aiBrief, setAiBrief]           = useState('')
  const [imagePrompt, setImagePrompt]   = useState('')
  const [htmlCollapsed, setHtmlCollapsed] = useState(true)

  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Load existing campaign
  useEffect(() => {
    if (!campaignId) return
    fetch(`/api/campaigns/${campaignId}`)
      .then(r => r.json())
      .then(data => {
        const c = data.campaign ?? data
        setCampaign({
          id:               c.id,
          name:             c.name ?? '',
          site_id:          c.site_id ?? 'languagethreshold',
          type:             c.type ?? 'BROADCAST',
          status:           c.status ?? 'DRAFT',
          from_name:        c.from_name ?? 'Language Threshold',
          from_email:       c.from_email ?? 'hello@languagethreshold.com',
          subject:          c.subject ?? '',
          preview_text:     c.preview_text ?? '',
          html_body:        c.html_body ?? '',
          hero_image_url:   c.hero_image_url ?? '',
          subject_variants: c.subject_variants ?? [],
          drip_steps:       c.drip_steps ?? [],
        })
        setImagePrompt(c.image_prompt ?? '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [campaignId])

  // Fetch subscriber count when site changes
  useEffect(() => {
    if (!campaign.site_id) return
    fetch(`/api/contacts?site=${campaign.site_id}&limit=1`)
      .then(r => r.json())
      .then(d => setSubCount(d.total ?? null))
      .catch(() => setSubCount(null))
  }, [campaign.site_id])

  // Auto-fill from/email when site changes
  function handleSiteChange(siteId: string) {
    const s = SITES.find(s => s.id === siteId)
    setCampaign(prev => ({
      ...prev,
      site_id:    siteId,
      from_name:  s?.from_name  ?? prev.from_name,
      from_email: s?.from_email ?? prev.from_email,
    }))
  }

  function patch(partial: Partial<CampaignData>) {
    setCampaign(prev => ({ ...prev, ...partial }))
  }

  // ── AI generation ──────────────────────────────────────────────────────────
  async function generateWithAI() {
    if (!aiBrief.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/campaign-builder', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief:   aiBrief,
          site_id: campaign.site_id,
          type:    campaign.type,
        }),
      })
      const data = await res.json()
      patch({
        subject:          data.subject         ?? campaign.subject,
        preview_text:     data.previewText     ?? campaign.preview_text,
        html_body:        data.htmlBody        ?? campaign.html_body,
        subject_variants: data.subjectVariants ?? [],
      })
      if (data.imagePrompt) setImagePrompt(data.imagePrompt)
    } catch {}
    setGenerating(false)
  }

  // ── Hero image gen ─────────────────────────────────────────────────────────
  async function generateHeroImage() {
    if (!imagePrompt.trim()) return
    setGenImage(true)
    try {
      const res  = await fetch('/api/ai/image-gen', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt }),
      })
      const data = await res.json()
      if (data.imageUrl) patch({ hero_image_url: data.imageUrl })
    } catch {}
    setGenImage(false)
  }

  function insertImageIntoEmail() {
    if (!campaign.hero_image_url) return
    const imgTag = `<img src="${campaign.hero_image_url}" alt="Campaign hero" style="width:100%;max-width:600px;display:block;margin:0 auto 24px;" />\n`
    patch({ html_body: imgTag + campaign.html_body })
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function saveDraft() {
    setSaving(true)
    try {
      if (campaign.id) {
        await fetch(`/api/campaigns/${campaign.id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...campaign, status: 'DRAFT' }),
        })
      } else {
        const res  = await fetch('/api/campaigns', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...campaign, status: 'DRAFT' }),
        })
        const data = await res.json()
        if (data.id) {
          patch({ id: data.id })
          router.replace(`/campaigns/${data.id}`)
        }
      }
    } catch {}
    setSaving(false)
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  async function sendCampaign() {
    if (!campaign.id) {
      alert('Save the campaign first.')
      return
    }
    const n = subscriberCount ?? 0
    if (!confirm(`Send "${campaign.name}" to ${n} subscriber${n !== 1 ? 's' : ''} on ${SITES.find(s => s.id === campaign.site_id)?.label ?? campaign.site_id}? This cannot be undone.`)) return
    setSending(true)
    try {
      const res  = await fetch(`/api/campaigns/${campaign.id}/send`, { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        alert(`Sent to ${data.sent ?? '?'} recipients!`)
        router.push('/campaigns')
      }
    } catch {}
    setSending(false)
  }

  // ── Drip steps ─────────────────────────────────────────────────────────────
  function addDripStep() {
    patch({
      drip_steps: [
        ...campaign.drip_steps,
        { id: Math.random().toString(36).slice(2), delay: 3, subject: '', htmlBody: '' },
      ],
    })
  }

  function updateDripStep(id: string, partial: Partial<DripStep>) {
    patch({
      drip_steps: campaign.drip_steps.map(s => s.id === id ? { ...s, ...partial } : s),
    })
  }

  function removeDripStep(id: string) {
    patch({ drip_steps: campaign.drip_steps.filter(s => s.id !== id) })
  }

  const selectedSite = SITES.find(s => s.id === campaign.site_id)
  const canSend      = campaign.status === 'DRAFT' && !!campaign.html_body && !!campaign.subject

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm" style={{ color: 'var(--muted)' }}>
        <RefreshCw size={16} className="animate-spin mr-2" /> Loading campaign…
      </div>
    )
  }

  return (
    <div className="max-w-[1400px]">
      {/* Top nav */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/campaigns')}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: 'var(--muted)' }}>
            <ArrowLeft size={15} /> Campaigns
          </button>
          <span style={{ color: 'var(--muted)', opacity: 0.3 }}>/</span>
          <h1 className="text-lg font-bold text-white">
            {campaign.id ? (campaign.name || 'Edit Campaign') : 'New Campaign'}
          </h1>
          {campaign.status !== 'DRAFT' && (
            <StatusBadge status={campaign.status} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={saveDraft} disabled={saving || !campaign.name}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--muted-light)' }}>
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Save Draft
          </button>
          {canSend && (
            <button onClick={sendCampaign} disabled={sending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
              style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.35)', color: '#34d399' }}>
              {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              Send Now
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6" style={{ alignItems: 'flex-start' }}>
        {/* ── LEFT: Controls ── */}
        <div className="w-full max-w-[520px] shrink-0 space-y-4">

          {/* Section 1 — Setup */}
          <BuilderSection title="Setup" icon={<Mail size={14} style={{ color: '#60a5fa' }} />}>
            <div className="space-y-3">
              {/* Campaign name */}
              <Field label="Campaign name">
                <input
                  value={campaign.name}
                  onChange={e => patch({ name: e.target.value })}
                  placeholder="e.g. June Newsletter — Construction Safety"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </Field>

              {/* Site + Type row */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Site">
                  <select
                    value={campaign.site_id}
                    onChange={e => handleSiteChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none appearance-none cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                    {SITES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </Field>
                <Field label="Type">
                  <div className="flex gap-1.5">
                    {(['BROADCAST', 'DRIP'] as const).map(t => (
                      <button key={t} onClick={() => patch({ type: t })}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: campaign.type === t ? (t === 'BROADCAST' ? 'rgba(96,165,250,0.15)' : 'rgba(245,158,11,0.15)') : 'rgba(255,255,255,0.04)',
                          border:     campaign.type === t ? `1px solid ${t === 'BROADCAST' ? 'rgba(96,165,250,0.4)' : 'rgba(245,158,11,0.4)'}` : '1px solid var(--border)',
                          color:      campaign.type === t ? (t === 'BROADCAST' ? '#60a5fa' : '#f59e0b') : 'var(--muted)',
                        }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              {/* From fields */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="From name">
                  <input
                    value={campaign.from_name}
                    onChange={e => patch({ from_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </Field>
                <Field label="From email">
                  <input
                    type="email"
                    value={campaign.from_email}
                    onChange={e => patch({ from_email: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none font-mono"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12 }}
                  />
                </Field>
              </div>
            </div>
          </BuilderSection>

          {/* Section 2 — AI Brief */}
          <BuilderSection title="AI Brief" icon={<Sparkles size={14} style={{ color: '#a78bfa' }} />}>
            <div className="space-y-3">
              <textarea
                value={aiBrief}
                onChange={e => setAiBrief(e.target.value)}
                rows={4}
                placeholder="Announce our new construction safety module. Target foremen and site supervisors. Tone: professional but approachable. Include a CTA to start the free trial."
                className="w-full px-3 py-2.5 text-sm rounded-lg outline-none resize-none leading-relaxed"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              <button
                onClick={generateWithAI}
                disabled={generating || !aiBrief.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.35)', color: '#c4b5fd' }}>
                {generating ? (
                  <><RefreshCw size={14} className="animate-spin" /> Generating your email…</>
                ) : (
                  <><Sparkles size={14} /> Generate with AI</>
                )}
              </button>
            </div>
          </BuilderSection>

          {/* Section 3 — Content */}
          <BuilderSection title="Content" icon={<Zap size={14} style={{ color: '#fbbf24' }} />}>
            <div className="space-y-3">
              {/* Subject */}
              <Field label="Subject line">
                <input
                  value={campaign.subject}
                  onChange={e => patch({ subject: e.target.value })}
                  placeholder="Your subject line…"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </Field>

              {/* Subject variants */}
              {campaign.subject_variants.length > 0 && (
                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>Subject variants — click to use</p>
                  <div className="flex flex-wrap gap-1.5">
                    {campaign.subject_variants.map((v, i) => (
                      <button key={i} onClick={() => patch({ subject: v })}
                        title={v}
                        className="px-2.5 py-1 rounded-lg text-xs transition-all text-left line-clamp-1 max-w-full"
                        style={{
                          background: campaign.subject === v ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.05)',
                          border: campaign.subject === v ? '1px solid rgba(167,139,250,0.4)' : '1px solid var(--border)',
                          color: campaign.subject === v ? '#c4b5fd' : 'var(--muted-light)',
                        }}>
                        {campaign.subject === v && <Check size={10} className="inline mr-1" />}
                        {v.length > 50 ? v.slice(0, 50) + '…' : v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview text */}
              <Field label="Preview text">
                <input
                  value={campaign.preview_text}
                  onChange={e => patch({ preview_text: e.target.value })}
                  placeholder="Short preview shown after subject in inbox…"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </Field>

              {/* HTML Body — collapsible */}
              <div>
                <button onClick={() => setHtmlCollapsed(c => !c)}
                  className="flex items-center gap-1.5 text-xs mb-2 transition-colors"
                  style={{ color: 'var(--muted)' }}>
                  {htmlCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                  HTML body {campaign.html_body ? `(${campaign.html_body.length} chars)` : '(empty)'}
                </button>
                {!htmlCollapsed && (
                  <textarea
                    value={campaign.html_body}
                    onChange={e => patch({ html_body: e.target.value })}
                    rows={10}
                    placeholder="<html>…</html>"
                    className="w-full px-3 py-2 text-xs rounded-lg outline-none resize-y font-mono leading-relaxed"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: '#94a3b8' }}
                  />
                )}
              </div>
            </div>
          </BuilderSection>

          {/* Section 4 — Hero Image */}
          <BuilderSection title="Hero Image" icon={<ImageIcon size={14} style={{ color: '#00D4A4' }} />}>
            <div className="space-y-3">
              <Field label="Image prompt">
                <input
                  value={imagePrompt}
                  onChange={e => setImagePrompt(e.target.value)}
                  placeholder="Professional photo of construction worker reviewing blueprints…"
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </Field>
              <button
                onClick={generateHeroImage}
                disabled={genImage || !imagePrompt.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                style={{ background: 'rgba(0,212,164,0.1)', border: '1px solid rgba(0,212,164,0.3)', color: '#00D4A4' }}>
                {genImage ? <RefreshCw size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                Generate Image
              </button>

              {campaign.hero_image_url && (
                <div className="space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={campaign.hero_image_url} alt="Generated hero"
                    className="w-full rounded-lg object-cover"
                    style={{ maxHeight: 160, border: '1px solid var(--border)' }} />
                  <button onClick={insertImageIntoEmail}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--muted-light)' }}>
                    Insert into email
                  </button>
                </div>
              )}
            </div>
          </BuilderSection>

          {/* Section 5 — Drip Steps (when type=DRIP) */}
          {campaign.type === 'DRIP' && (
            <BuilderSection title="Drip Steps" icon={<Zap size={14} style={{ color: '#f59e0b' }} />}>
              <div className="space-y-3">
                {campaign.drip_steps.length === 0 && (
                  <p className="text-xs py-2 text-center" style={{ color: 'var(--muted)' }}>
                    No steps yet. Add steps below.
                  </p>
                )}
                {campaign.drip_steps.map((step, i) => (
                  <div key={step.id} className="rounded-lg p-3 space-y-2"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>Step {i + 1}</span>
                      <button onClick={() => removeDripStep(step.id)}
                        className="transition-all opacity-40 hover:opacity-100"
                        style={{ color: '#f87171' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <Field label={`Send after${i === 0 ? ' (first email)' : ` step ${i}`}`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min={0} value={step.delay}
                          onChange={e => updateDripStep(step.id, { delay: Number(e.target.value) })}
                          className="w-16 px-2 py-1.5 text-sm rounded-lg outline-none text-center"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}
                        />
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>days</span>
                      </div>
                    </Field>
                    <Field label="Subject">
                      <input
                        value={step.subject}
                        onChange={e => updateDripStep(step.id, { subject: e.target.value })}
                        placeholder="Step subject line…"
                        className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      />
                    </Field>
                  </div>
                ))}
                <button onClick={addDripStep}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                  <Plus size={12} /> Add Step
                </button>
              </div>
            </BuilderSection>
          )}

          {/* Section 6 — Send */}
          <BuilderSection title="Send" icon={<Send size={14} style={{ color: '#34d399' }} />}>
            <div className="space-y-3">
              {/* Subscriber count */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                <Users size={15} style={{ color: selectedSite?.color ?? '#94a3b8' }} />
                <span className="text-sm" style={{ color: 'var(--muted-light)' }}>
                  {subscriberCount === null ? 'Loading…' : (
                    <>
                      <span className="font-bold text-white">{subscriberCount}</span>
                      {' subscriber'}{subscriberCount !== 1 ? 's' : ''} on{' '}
                      <span style={{ color: selectedSite?.color }}>{selectedSite?.label ?? campaign.site_id}</span>
                    </>
                  )}
                </span>
              </div>

              {/* Validation warnings */}
              {!campaign.name && (
                <Warn>Campaign name is required before saving</Warn>
              )}
              {!campaign.subject && (
                <Warn>Add a subject line before sending</Warn>
              )}
              {!campaign.html_body && (
                <Warn>Email body is empty — generate with AI or paste HTML</Warn>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button onClick={saveDraft} disabled={saving || !campaign.name}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--muted-light)' }}>
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Draft
                </button>
                {campaign.type === 'BROADCAST' && (
                  <button onClick={sendCampaign} disabled={sending || !canSend}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                    style={{ background: canSend ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)', border: canSend ? '1px solid rgba(52,211,153,0.35)' : '1px solid var(--border)', color: canSend ? '#34d399' : 'var(--muted)' }}>
                    {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    Send Now
                  </button>
                )}
              </div>
            </div>
          </BuilderSection>
        </div>

        {/* ── RIGHT: Live Preview ── */}
        <div className="flex-1 sticky top-6" style={{ minWidth: 0 }}>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
            {/* Preview toolbar */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Preview
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setDeviceMode('desktop')}
                  className="p-1.5 rounded-lg transition-all"
                  style={{
                    background: deviceMode === 'desktop' ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: deviceMode === 'desktop' ? 'white' : 'var(--muted)',
                  }}>
                  <Monitor size={14} />
                </button>
                <button onClick={() => setDeviceMode('mobile')}
                  className="p-1.5 rounded-lg transition-all"
                  style={{
                    background: deviceMode === 'mobile' ? 'rgba(255,255,255,0.1)' : 'transparent',
                    color: deviceMode === 'mobile' ? 'white' : 'var(--muted)',
                  }}>
                  <Smartphone size={14} />
                </button>
              </div>
            </div>

            {/* Inbox simulation bar */}
            {(campaign.subject || campaign.preview_text) && (
              <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: selectedSite?.color ? `${selectedSite.color}22` : 'rgba(99,102,241,0.2)', color: selectedSite?.color ?? '#818cf8' }}>
                    {(campaign.from_name ?? 'U')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {campaign.from_name || 'From Name'}
                      {campaign.from_email && <span className="font-normal ml-1" style={{ color: 'var(--muted)', fontSize: 11 }}>&lt;{campaign.from_email}&gt;</span>}
                    </p>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--muted-light)' }}>
                      {campaign.subject || <span style={{ opacity: 0.5 }}>No subject</span>}
                    </p>
                    {campaign.preview_text && (
                      <p className="text-xs truncate" style={{ color: 'var(--muted)', opacity: 0.7 }}>{campaign.preview_text}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* iframe preview */}
            <div className="flex justify-center p-4" style={{ background: '#1a1f2e', minHeight: 500 }}>
              <div style={{
                width: deviceMode === 'mobile' ? 375 : '100%',
                maxWidth: deviceMode === 'desktop' ? 680 : 375,
                transition: 'all 0.3s ease',
              }}>
                {campaign.html_body ? (
                  <iframe
                    ref={iframeRef}
                    srcDoc={campaign.html_body}
                    className="w-full rounded-lg"
                    style={{ minHeight: 500, border: 'none', background: 'white' }}
                    sandbox="allow-same-origin"
                    title="Email preview"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl"
                    style={{ minHeight: 500, border: '1px dashed rgba(255,255,255,0.1)', color: 'var(--muted)' }}>
                    <Mail size={36} className="mb-3 opacity-20" />
                    <p className="text-sm font-medium opacity-40">Email preview will appear here</p>
                    <p className="text-xs mt-1 opacity-30">Describe your campaign and click Generate with AI</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function BuilderSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
        {icon}
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>{label}</label>
      {children}
    </div>
  )
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"
      style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
      ⚠ {children}
    </div>
  )
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const styles: Record<CampaignStatus, { color: string; bg: string; border: string }> = {
    DRAFT:     { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)' },
    SCHEDULED: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
    SENDING:   { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)' },
    SENT:      { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
  }
  const s = styles[status]
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {status}
    </span>
  )
}

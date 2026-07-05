'use client'

import { useState } from 'react'
import {
  Globe, Loader2, CheckCircle2, Paintbrush, Building2,
  Zap, Camera, Code, Rocket, ChevronRight, ExternalLink,
  RefreshCw, AlertCircle,
} from 'lucide-react'

type Step = 'input' | 'scanning' | 'review' | 'building' | 'done' | 'error'

interface BrandData {
  companyName: string
  tagline: string
  industry: string
  primaryColor: string
  bgColor: string
  logoUrl: string
  complianceTopics: string[]
  brandTone: string
  contactEmail: string
  website: string
}

interface BuildResult {
  repoUrl: string
  deployUrl: string
  siteId: string
}

const INDUSTRY_TOPICS: Record<string, string[]> = {
  'blockchain-crypto': ['KYC/KYB Fundamentals', 'AML & Sanctions Screening', 'SEC Regulatory Posture', 'Smart Contract Compliance', 'On-Chain Attestation', 'Social Media Compliance', 'Institutional Capital Raise', 'Behavioral Risk Scoring'],
  'financial': ['AML Compliance', 'BSA Requirements', 'FFIEC Guidelines', 'Fair Lending', 'OFAC Sanctions', 'Data Security', 'Consumer Protection', 'Fraud Prevention'],
  'healthcare': ['HIPAA Privacy Rule', 'HIPAA Security Rule', 'Patient Rights', 'Breach Notification', 'Minimum Necessary Standard', 'Business Associates', 'Electronic PHI Security', 'Telehealth Compliance'],
  'construction': ['OSHA Fall Protection', 'Hazard Communication', 'Scaffold Safety', 'Electrical Safety', 'PPE Requirements', 'Confined Space Entry', 'Excavation Safety', 'Fire Prevention'],
  'hr-general': ['Sexual Harassment Prevention', 'Workplace Discrimination', 'FMLA Compliance', 'ADA Accommodations', 'I-9 Verification', 'Wage & Hour Laws', 'Employee Privacy', 'Whistleblower Protection'],
  'general': ['Workplace Safety', 'Data Privacy', 'Code of Conduct', 'Anti-Harassment', 'Information Security', 'Conflict of Interest', 'Record Keeping', 'Emergency Procedures'],
}

const STEP_LABELS: Record<Step, string> = {
  input: 'Enter URL',
  scanning: 'Scanning site…',
  review: 'Review brand',
  building: 'Building…',
  done: 'Complete',
  error: 'Error',
}

export default function WhiteLabelBuilderClient() {
  const [step, setStep] = useState<Step>('input')
  const [url, setUrl]   = useState('')
  const [brand, setBrand] = useState<BrandData>({
    companyName: '', tagline: '', industry: 'general',
    primaryColor: '#4f46e5', bgColor: '#0a0a18',
    logoUrl: '', complianceTopics: INDUSTRY_TOPICS.general,
    brandTone: 'professional', contactEmail: '', website: '',
  })
  const [screenshots, setScreenshots] = useState<string[]>([])
  const [result, setResult] = useState<BuildResult | null>(null)
  const [error, setError] = useState('')
  const [log, setLog] = useState<string[]>([])

  function addLog(msg: string) {
    setLog(prev => [...prev, msg])
  }

  async function handleScan() {
    if (!url.trim()) return
    setStep('scanning')
    setError('')
    setLog([])
    addLog(`Scanning ${url}…`)

    try {
      const res = await fetch('/api/white-label-builder/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Scan failed')

      addLog('✓ Screenshots captured')
      addLog('✓ Brand colors extracted')
      addLog('✓ Logo URL found')
      addLog('✓ Industry detected')

      setBrand(prev => ({
        ...prev,
        companyName:      data.companyName ?? prev.companyName,
        tagline:          data.tagline ?? prev.tagline,
        industry:         data.industry ?? prev.industry,
        primaryColor:     data.primaryColor ?? prev.primaryColor,
        bgColor:          data.bgColor ?? prev.bgColor,
        logoUrl:          data.logoUrl ?? prev.logoUrl,
        complianceTopics: INDUSTRY_TOPICS[data.industry ?? 'general'] ?? INDUSTRY_TOPICS.general,
        contactEmail:     data.contactEmail ?? prev.contactEmail,
        website:          url.trim(),
      }))

      if (data.screenshots) setScreenshots(data.screenshots)

      setStep('review')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Scan failed')
      setStep('error')
    }
  }

  async function handleBuild() {
    setStep('building')
    setLog([])
    addLog('Creating GitHub repository…')

    try {
      const res = await fetch('/api/white-label-builder/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, sourceUrl: url }),
      })

      // Stream log lines
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (reader) {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          const lines = decoder.decode(value).split('\n').filter(Boolean)
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const msg = line.replace('data:', '').trim()
              if (msg.startsWith('{')) {
                const d = JSON.parse(msg)
                if (d.done) {
                  setResult(d.result)
                  setStep('done')
                } else if (d.error) {
                  setError(d.error)
                  setStep('error')
                }
              } else {
                addLog(msg)
              }
            }
          }
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Build failed')
      setStep('error')
    }
  }

  return (
    <div className="max-w-3xl space-y-8 pb-16">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">White Label Builder</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Paste a client's website URL → AI extracts their brand → deploys a fully configured LMS in minutes.
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(['input', 'scanning', 'review', 'building', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              s === step ? 'text-white' : step === 'done' || (['input','scanning','review','building'].indexOf(s) < ['input','scanning','review','building','done'].indexOf(step)) ? 'text-emerald-400' : ''
            }`}
            style={{
              background: s === step ? 'rgba(99,102,241,0.2)' : 'transparent',
              border: s === step ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
              color: s === step ? '#818cf8' : '#475569',
            }}>
              {STEP_LABELS[s]}
            </div>
            {i < 4 && <ChevronRight size={12} style={{ color: '#334155' }} />}
          </div>
        ))}
      </div>

      {/* ── STEP: Input ── */}
      {step === 'input' && (
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
              <Globe size={18} style={{ color: '#818cf8' }} />
            </div>
            <div>
              <div className="font-semibold text-white">Client Website URL</div>
              <div className="text-xs" style={{ color: '#64748b' }}>We'll screenshot it and extract brand colors, logo, and industry</div>
            </div>
          </div>

          <div className="flex gap-3">
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScan()}
              placeholder="https://www.clientwebsite.com"
              className="flex-1 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
            />
            <button onClick={handleScan} disabled={!url.trim()}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm cursor-pointer disabled:opacity-40 transition-colors"
              style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
              <Camera size={15} />
              Scan Site
            </button>
          </div>

          <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs mb-2" style={{ color: '#475569' }}>What the scan does:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Camera, label: 'Screenshots hero, mid, footer' },
                { icon: Paintbrush, label: 'Extracts primary colors' },
                { icon: Building2, label: 'Identifies industry & compliance needs' },
                { icon: Globe, label: 'Finds logo URL' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
                  <Icon size={12} style={{ color: '#475569' }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP: Scanning ── */}
      {step === 'scanning' && (
        <div className="rounded-2xl p-8 flex flex-col items-center text-center gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Loader2 size={28} className="animate-spin" style={{ color: '#818cf8' }} />
          </div>
          <div>
            <div className="font-semibold text-white mb-1">Scanning {url}</div>
            <div className="text-sm" style={{ color: '#64748b' }}>Taking screenshots and extracting brand data…</div>
          </div>
          <div className="w-full text-left space-y-1 mt-2">
            {log.map((l, i) => (
              <div key={i} className="text-xs font-mono" style={{ color: '#34d399' }}>{l}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP: Review ── */}
      {step === 'review' && (
        <div className="space-y-5">
          {/* Screenshots */}
          {screenshots.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="px-5 py-3 text-xs font-semibold uppercase tracking-widest" style={{ color: '#64748b', background: 'rgba(0,0,0,0.2)' }}>
                Vision captures
              </div>
              <div className="grid grid-cols-3 gap-1 p-1" style={{ background: 'rgba(0,0,0,0.3)' }}>
                {screenshots.map((s, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={s} alt={`Screenshot ${i + 1}`} className="rounded-lg w-full object-cover aspect-video" />
                ))}
              </div>
            </div>
          )}

          {/* Brand fields */}
          <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#64748b' }}>
              Extracted brand — review & edit
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>Company Name</label>
                <input value={brand.companyName} onChange={e => setBrand(b => ({ ...b, companyName: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>Contact Email</label>
                <input value={brand.contactEmail} onChange={e => setBrand(b => ({ ...b, contactEmail: e.target.value }))}
                  placeholder="hello@company.com"
                  className="w-full px-3 py-2.5 rounded-xl text-sm"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }} />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>Tagline</label>
              <input value={brand.tagline} onChange={e => setBrand(b => ({ ...b, tagline: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>Accent Color</label>
                <div className="flex gap-2">
                  <input type="color" value={brand.primaryColor} onChange={e => setBrand(b => ({ ...b, primaryColor: e.target.value }))}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0.5"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <input value={brand.primaryColor} onChange={e => setBrand(b => ({ ...b, primaryColor: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-mono"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>Background</label>
                <div className="flex gap-2">
                  <input type="color" value={brand.bgColor} onChange={e => setBrand(b => ({ ...b, bgColor: e.target.value }))}
                    className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0.5"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <input value={brand.bgColor} onChange={e => setBrand(b => ({ ...b, bgColor: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-mono"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>Industry</label>
                <select value={brand.industry}
                  onChange={e => setBrand(b => ({ ...b, industry: e.target.value, complianceTopics: INDUSTRY_TOPICS[e.target.value] ?? INDUSTRY_TOPICS.general }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm cursor-pointer"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
                  <option value="blockchain-crypto">Blockchain / Crypto</option>
                  <option value="financial">Financial Services</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="construction">Construction / Trades</option>
                  <option value="hr-general">HR / General</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>

            {/* Logo preview */}
            {brand.logoUrl && (
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#64748b' }}>Logo URL</label>
                <div className="flex gap-3 items-center">
                  <input value={brand.logoUrl} onChange={e => setBrand(b => ({ ...b, logoUrl: e.target.value }))}
                    className="flex-1 px-3 py-2.5 rounded-xl text-xs font-mono"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={brand.logoUrl} alt="logo" className="h-8 rounded-lg object-contain"
                    style={{ background: brand.bgColor, padding: '4px 8px' }} />
                </div>
              </div>
            )}

            {/* Compliance topics */}
            <div>
              <label className="block text-xs mb-2" style={{ color: '#64748b' }}>Compliance Modules (8 courses will be pre-built)</label>
              <div className="flex flex-wrap gap-2">
                {brand.complianceTopics.map((topic, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: `${brand.primaryColor}18`, color: brand.primaryColor, border: `1px solid ${brand.primaryColor}33` }}>
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            {/* Live preview chip */}
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: brand.bgColor }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                     style={{ background: brand.primaryColor, color: '#000' }}>
                  {brand.companyName[0] ?? 'C'}
                </div>
                <span className="text-sm font-semibold" style={{ color: '#fff' }}>{brand.companyName || 'Company Name'} LMS</span>
              </div>
              <span className="text-xs" style={{ color: brand.primaryColor }}>{brand.tagline || 'Tagline here'}</span>
            </div>
          </div>

          <button onClick={handleBuild}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm cursor-pointer transition-colors"
            style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
            <Rocket size={16} />
            Build & Deploy White Label
          </button>
        </div>
      )}

      {/* ── STEP: Building ── */}
      {step === 'building' && (
        <div className="rounded-2xl p-8 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="animate-spin shrink-0" style={{ color: '#818cf8' }} />
            <span className="font-semibold text-white">Building {brand.companyName} LMS…</span>
          </div>
          <div className="space-y-1 font-mono text-xs pl-2" style={{ color: '#34d399' }}>
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}

      {/* ── STEP: Done ── */}
      {step === 'done' && result && (
        <div className="rounded-2xl p-8 space-y-5" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="flex items-center gap-3">
            <CheckCircle2 size={28} style={{ color: '#34d399' }} />
            <div>
              <div className="font-bold text-white text-lg">{brand.companyName} LMS is live!</div>
              <div className="text-sm" style={{ color: '#64748b' }}>Branded + 8 compliance courses + demo accounts ready.</div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { icon: Globe, label: 'Live URL', value: result.deployUrl, href: result.deployUrl },
              { icon: Code, label: 'GitHub Repo', value: result.repoUrl, href: result.repoUrl },
            ].map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <Icon size={14} style={{ color: '#64748b' }} />
                <span className="text-xs" style={{ color: '#64748b' }}>{label}</span>
                <a href={href} target="_blank" rel="noopener noreferrer"
                  className="flex-1 text-sm font-mono truncate hover:underline flex items-center gap-1"
                  style={{ color: '#34d399' }}>
                  {value} <ExternalLink size={11} />
                </a>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setStep('input'); setUrl(''); setResult(null); setLog([]) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}>
              <RefreshCw size={13} /> Build another
            </button>
            <a href={result.deployUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
              <ExternalLink size={13} /> Open Live Site
            </a>
          </div>
        </div>
      )}

      {/* ── STEP: Error ── */}
      {step === 'error' && (
        <div className="rounded-2xl p-6 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle size={18} className="shrink-0 mt-0.5" style={{ color: '#f87171' }} />
          <div className="flex-1">
            <div className="font-semibold text-white mb-1">Something went wrong</div>
            <div className="text-sm" style={{ color: '#94a3b8' }}>{error}</div>
            <button onClick={() => { setStep('input'); setError('') }}
              className="mt-3 text-sm px-3 py-1.5 rounded-lg cursor-pointer"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Megaphone, Play, Download, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, Clock, XCircle, Circle, Sparkles, X, Copy,
  ExternalLink, BarChart3, Link2, FlaskConical,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
type SubmissionStatus = 'not_submitted' | 'pending' | 'live'
type TestStatus       = 'passed' | 'partial' | 'failed' | 'untested'
type AutomationLevel  = 'full' | 'partial' | 'manual'

interface Channel {
  id:         string
  name:       string
  url:        string
  testStatus: TestStatus
  automation: AutomationLevel
  notes:      string
}

interface Site {
  id:    string
  name:  string
  url:   string
  niche: string
}

interface PushData {
  // site id → channel id → status
  submissions: Record<string, Record<string, SubmissionStatus>>
}

// ── Static data ───────────────────────────────────────────────────────────────
const CHANNELS: Channel[] = [
  { id: 'craigslist',    name: 'Craigslist',                   url: 'https://craigslist.org',        testStatus: 'partial',  automation: 'partial', notes: 'Captcha handling required' },
  { id: 'reddit',        name: 'Reddit',                       url: 'https://reddit.com',             testStatus: 'partial',  automation: 'partial', notes: 'Value-first posts, no spam' },
  { id: 'gmb',           name: 'Google My Business',           url: 'https://business.google.com',   testStatus: 'untested', automation: 'manual',  notes: 'Requires Google login' },
  { id: 'directories',   name: 'Free Directories',             url: 'https://www.manta.com',          testStatus: 'passed',   automation: 'full',    notes: 'Manta / Hotfrog / EZlocal' },
  { id: 'forums',        name: 'Niche Forums',                 url: 'https://google.com',             testStatus: 'partial',  automation: 'partial', notes: 'Find active forums per niche' },
  { id: 'producthunt',   name: 'Product Hunt / IndieHackers',  url: 'https://producthunt.com',        testStatus: 'partial',  automation: 'partial', notes: 'Best for SaaS / tools' },
  { id: 'pinterest',     name: 'Pinterest',                    url: 'https://pinterest.com',          testStatus: 'partial',  automation: 'partial', notes: 'Visual content, infographics' },
  { id: 'quora',         name: 'Quora',                        url: 'https://quora.com',              testStatus: 'untested', automation: 'partial', notes: 'Answer questions + link' },
  { id: 'haro',          name: 'HARO / SourceBottle',          url: 'https://www.helpareporter.com', testStatus: 'untested', automation: 'manual',  notes: 'Email alerts, 3× daily' },
  { id: 'prlog',         name: 'Press Releases (PRLog)',        url: 'https://prlog.org',             testStatus: 'passed',   automation: 'full',    notes: 'Free press release syndication' },
]

const NICHES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  language:  { label: 'Language',       color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
  examprep:  { label: 'Exam Prep',      color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)'  },
  climbing:  { label: 'Climbing',       color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
  localbiz:  { label: 'Local Business', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)'  },
  other:     { label: 'Other',          color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)' },
}

// 54 sites across niches
const SITES: Site[] = [
  // Language (12)
  { id: 'medical-spanish',      name: 'Medical Spanish Pro',       url: 'https://medicalspanishpro.com',      niche: 'language' },
  { id: 'construction-spanish', name: 'Construction Spanish',      url: 'https://constructionspanish.com',    niche: 'language' },
  { id: 'language-threshold',   name: 'Language Threshold',        url: 'https://languagethreshold.com',      niche: 'language' },
  { id: 'spanish-for-nurses',   name: 'Spanish for Nurses',        url: 'https://spanishfornurses.com',       niche: 'language' },
  { id: 'kitchen-spanish',      name: 'Kitchen Spanish',           url: 'https://kitchenspanish.com',         niche: 'language' },
  { id: 'legal-spanish',        name: 'Legal Spanish',             url: 'https://legalspanishpro.com',        niche: 'language' },
  { id: 'spanish-for-teachers', name: 'Spanish for Teachers',      url: 'https://spanishforteachers.com',     niche: 'language' },
  { id: 'french-for-travel',    name: 'French for Travel',         url: 'https://frenchfortravel.com',        niche: 'language' },
  { id: 'japanese-basics',      name: 'Japanese Basics Fast',      url: 'https://japanesebasicsfast.com',     niche: 'language' },
  { id: 'mandarin-business',    name: 'Mandarin for Business',     url: 'https://mandarinforbusiness.com',    niche: 'language' },
  { id: 'portuguese-brazil',    name: 'Brazilian Portuguese Fast', url: 'https://brazilianportuguesefast.com',niche: 'language' },
  { id: 'german-for-engineers', name: 'German for Engineers',      url: 'https://germanforengineers.com',     niche: 'language' },
  // Exam Prep (12)
  { id: 'nclex-flash',          name: 'NCLEX Flash',               url: 'https://nclexflash.com',             niche: 'examprep' },
  { id: 'real-estate-exam',     name: 'Real Estate Exam Pro',      url: 'https://realestateexampro.com',      niche: 'examprep' },
  { id: 'cpa-cram',             name: 'CPA Cram',                  url: 'https://cpacram.com',                niche: 'examprep' },
  { id: 'series7-prep',         name: 'Series 7 Prep',             url: 'https://series7prep.com',            niche: 'examprep' },
  { id: 'gre-accelerator',      name: 'GRE Accelerator',           url: 'https://greaccelerator.com',         niche: 'examprep' },
  { id: 'lsat-edge',            name: 'LSAT Edge',                 url: 'https://lsatedge.com',               niche: 'examprep' },
  { id: 'pmp-study',            name: 'PMP Study Hub',             url: 'https://pmpstudyhub.com',            niche: 'examprep' },
  { id: 'ielts-boost',          name: 'IELTS Boost',               url: 'https://ieltsboost.com',             niche: 'examprep' },
  { id: 'sat-jumpstart',        name: 'SAT Jumpstart',             url: 'https://satjumpstart.com',           niche: 'examprep' },
  { id: 'mcat-mastery',         name: 'MCAT Mastery',              url: 'https://mcatmastery.com',            niche: 'examprep' },
  { id: 'bar-exam-edge',        name: 'Bar Exam Edge',             url: 'https://barexamedge.com',            niche: 'examprep' },
  { id: 'cisco-cert-quick',     name: 'Cisco Cert Quick',          url: 'https://ciscocertquick.com',         niche: 'examprep' },
  // Climbing (10)
  { id: 'climb-france',         name: 'Climb France',              url: 'https://climb-france.vercel.app',   niche: 'climbing' },
  { id: 'climb-brasil',         name: 'Climb Brasil',              url: 'https://climbbrasil.com',            niche: 'climbing' },
  { id: 'climb-utah',           name: 'Climb Utah',                url: 'https://climbutah.com',              niche: 'climbing' },
  { id: 'climb-spain',          name: 'Climb Spain',               url: 'https://climbspain.com',             niche: 'climbing' },
  { id: 'climb-italy',          name: 'Climb Italy',               url: 'https://climbitaly.com',             niche: 'climbing' },
  { id: 'climb-greece',         name: 'Climb Greece',              url: 'https://climbgreece.com',            niche: 'climbing' },
  { id: 'climb-morocco',        name: 'Climb Morocco',             url: 'https://climbmorocco.com',           niche: 'climbing' },
  { id: 'climb-thailand',       name: 'Climb Thailand',            url: 'https://climbthailand.com',          niche: 'climbing' },
  { id: 'climb-yosemite',       name: 'Climb Yosemite',            url: 'https://climbyosemite.com',          niche: 'climbing' },
  { id: 'climb-patagonia',      name: 'Climb Patagonia',           url: 'https://climbpatagonia.com',         niche: 'climbing' },
  // Local Business (12)
  { id: 'jrs-auto',             name: "Jr's Auto Repair",          url: 'https://jrsautorepair.worker-bee.app', niche: 'localbiz' },
  { id: 'silver-creek',         name: 'Silver Creek Logistics',    url: 'https://silvercreeklogistics.worker-bee.app', niche: 'localbiz' },
  { id: 'tobyandertonmd',       name: 'Toby Anderton MD',          url: 'https://tobyandertonmd.vercel.app', niche: 'localbiz' },
  { id: 'tfhra',                name: 'TF Horseback Riding',       url: 'https://tfhorseback.com',            niche: 'localbiz' },
  { id: 'magic-valley-hvac',    name: 'Magic Valley HVAC',         url: 'https://magicvalleyhvac.com',        niche: 'localbiz' },
  { id: 'snake-river-plumbing', name: 'Snake River Plumbing',      url: 'https://snakeriverplumbing.com',     niche: 'localbiz' },
  { id: 'canyon-pest-control',  name: 'Canyon Pest Control',       url: 'https://canyonpestcontrol.com',      niche: 'localbiz' },
  { id: 'river-city-roofing',   name: 'River City Roofing',        url: 'https://rivercityroofing.com',       niche: 'localbiz' },
  { id: 'falls-dental',         name: 'Falls Family Dental',       url: 'https://fallsfamilydental.com',      niche: 'localbiz' },
  { id: 'gem-state-landscaping', name: 'Gem State Landscaping',    url: 'https://gemstatelandscaping.com',    niche: 'localbiz' },
  { id: 'twin-falls-flooring',  name: 'Twin Falls Flooring',       url: 'https://twinfallsflooring.com',      niche: 'localbiz' },
  { id: 'high-desert-electric', name: 'High Desert Electric',      url: 'https://highdesertelectric.com',     niche: 'localbiz' },
  // Other (8)
  { id: 'orthobiologic',        name: 'Orthobiologic Pathways',    url: 'https://orthobiologicpathways.com',  niche: 'other' },
  { id: 'worker-bee',           name: 'Worker Bee',                url: 'https://worker-bee.app',             niche: 'other' },
  { id: 'lingua-lens',          name: 'LinguaLens',                url: 'https://language-lens-elite.worker-bee.app', niche: 'other' },
  { id: 'pet-nutrition-hub',    name: 'Pet Nutrition Hub',         url: 'https://petnutritionhub.com',        niche: 'other' },
  { id: 'home-budget-pro',      name: 'Home Budget Pro',           url: 'https://homebudgetpro.com',          niche: 'other' },
  { id: 'garden-planner-ai',    name: 'Garden Planner AI',         url: 'https://gardenplannerai.com',        niche: 'other' },
  { id: 'rv-trip-planner',      name: 'RV Trip Planner',           url: 'https://rvtripplanner.com',          niche: 'other' },
  { id: 'remote-job-scout',     name: 'Remote Job Scout',          url: 'https://remotejobscout.com',         niche: 'other' },
]

const STORAGE_KEY = 'marketing-push-data-v1'

const DEFAULT_DATA: PushData = {
  submissions: {},
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadData(): PushData {
  if (typeof window === 'undefined') return DEFAULT_DATA
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DATA
    return JSON.parse(raw) as PushData
  } catch {
    return DEFAULT_DATA
  }
}

function saveData(d: PushData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
}

function getStatus(data: PushData, siteId: string, channelId: string): SubmissionStatus {
  return data.submissions[siteId]?.[channelId] ?? 'not_submitted'
}

function setStatus(data: PushData, siteId: string, channelId: string, status: SubmissionStatus): PushData {
  return {
    ...data,
    submissions: {
      ...data.submissions,
      [siteId]: {
        ...(data.submissions[siteId] ?? {}),
        [channelId]: status,
      },
    },
  }
}

function computeStats(data: PushData) {
  let totalSubmissions = 0
  let liveBacklinks    = 0
  const siteIds = Object.keys(data.submissions)
  for (const sid of siteIds) {
    for (const cid of Object.keys(data.submissions[sid])) {
      const s = data.submissions[sid][cid]
      if (s === 'pending' || s === 'live') totalSubmissions++
      if (s === 'live') liveBacklinks++
    }
  }
  const channelsTested = CHANNELS.filter(c => c.testStatus !== 'untested').length
  return { totalSubmissions, liveBacklinks, channelsTested }
}

// ── Status styling ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string; bg: string; border: string; dot: string }> = {
  not_submitted: { label: 'Not Submitted', color: '#64748b', bg: 'rgba(100,116,139,0.1)',  border: 'rgba(100,116,139,0.2)', dot: '#64748b' },
  pending:       { label: 'Pending',       color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   border: 'rgba(251,191,36,0.25)', dot: '#fbbf24' },
  live:          { label: 'Live',          color: '#34d399', bg: 'rgba(52,211,153,0.1)',   border: 'rgba(52,211,153,0.25)', dot: '#34d399' },
}

const TEST_CONFIG: Record<TestStatus, { label: string; color: string; icon: React.ReactNode }> = {
  passed:   { label: 'Passed',   color: '#34d399', icon: <CheckCircle2 size={12} /> },
  partial:  { label: 'Partial',  color: '#fbbf24', icon: <Clock size={12} /> },
  failed:   { label: 'Failed',   color: '#f87171', icon: <XCircle size={12} /> },
  untested: { label: 'Untested', color: '#64748b', icon: <Circle size={12} /> },
}

const AUTO_CONFIG: Record<AutomationLevel, { label: string; color: string }> = {
  full:    { label: 'Full Auto', color: '#34d399' },
  partial: { label: 'Partial',   color: '#fbbf24' },
  manual:  { label: 'Manual',    color: '#94a3b8' },
}

// ── Campaign content generator ────────────────────────────────────────────────
function generateContent(site: Site, channel: Channel): Record<string, string> {
  const domain = site.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const tagline = (() => {
    if (site.niche === 'language')  return `Master professional ${site.name.toLowerCase().replace(/\s+/g, ' ')} fast`
    if (site.niche === 'examprep')  return `Pass your ${site.name.replace(' Pro', '').replace(' Hub', '').replace(' Edge', '')} on the first try`
    if (site.niche === 'climbing')  return `Your complete guide to climbing in ${site.name.replace('Climb ', '')}`
    if (site.niche === 'localbiz')  return `Trusted local service you can count on`
    return `${site.name} — the smart choice`
  })()

  const contentMap: Record<string, { title: string; body: string }> = {
    craigslist: {
      title: `${site.name} — ${tagline}`,
      body: `Looking for a reliable resource for ${site.name.toLowerCase()}?\n\nVisit ${site.url} — completely free to try.\n\nWhat you get:\n• Expert content curated for your goals\n• Step-by-step guides\n• Practical tools that work\n\nCheck it out: ${site.url}`,
    },
    reddit: {
      title: `I built a free resource for ${site.name.toLowerCase()} — feedback welcome`,
      body: `Hey r/[relevant_subreddit],\n\nI've been working on ${site.url} for a while now. It's a free resource focused on ${tagline.toLowerCase()}.\n\nNo paywall, no signup required for the core content. I'd love honest feedback from people in this community.\n\n[link]\n\nHappy to answer questions about how it was built or what's coming next.`,
    },
    gmb: {
      title: `${site.name}`,
      body: `Business description:\n${site.name} — ${tagline}.\n\nVisit us at ${site.url} for free resources, guides, and tools.\n\nCategory: [choose most relevant]\nWebsite: ${site.url}`,
    },
    directories: {
      title: `${site.name}`,
      body: `Business Name: ${site.name}\nWebsite: ${site.url}\nDescription: ${tagline}. Free resources and tools available online.\nCategory: [Education / Services]\nPhone: N/A (online business)\nEmail: contact@${domain}`,
    },
    forums: {
      title: `Resource recommendation: ${site.name}`,
      body: `Hi everyone,\n\nI wanted to share a resource that's been genuinely useful: ${site.url}\n\nIt covers ${tagline.toLowerCase()} with free guides and tools. No spam, no affiliate angle — just sharing because it helped me.\n\n${site.url}`,
    },
    producthunt: {
      title: `${site.name} — ${tagline}`,
      body: `Tagline: ${tagline}\n\nDescription: ${site.name} is a free online resource that ${tagline.toLowerCase()}. Built for people who want results without the fluff.\n\nKey features:\n• Free to use, no account required\n• Practical, actionable content\n• Updated regularly\n\nWebsite: ${site.url}`,
    },
    pinterest: {
      title: `${tagline} | ${site.name}`,
      body: `Pin description:\n${tagline} — visit ${site.url} for free guides, tools, and resources. Save this pin for later! #${site.name.replace(/\s+/g, '')} #FreeResources #Learning\n\nLink: ${site.url}`,
    },
    quora: {
      title: `Answer on question about ${site.name.toLowerCase()}`,
      body: `[Answer the question thoroughly with 3-4 paragraphs of genuine value, then add:]\n\nIf you want a comprehensive resource on this topic, I've found ${site.url} to be genuinely useful. It covers [specific aspect] in detail without any paywall.`,
    },
    haro: {
      title: `HARO pitch for ${site.name}`,
      body: `Subject: Re: [HARO query subject]\n\nHi [journalist name],\n\nI'm the creator of ${site.name} (${site.url}), a resource focused on ${tagline.toLowerCase()}.\n\nRegarding your query about [topic]: [2-3 sentences of genuine expertise]\n\nI'd be happy to provide a longer quote or be interviewed. My background: [relevant experience].\n\nBest,\n[Your name]\n${site.url}`,
    },
    prlog: {
      title: `${site.name} Launches Free Online Resource for [Target Audience]`,
      body: `FOR IMMEDIATE RELEASE\n\n${site.name} Launches Free Online Resource\n\n[City, Date] — ${site.name} (${site.url}) today announced the launch of a comprehensive free resource designed to ${tagline.toLowerCase()}.\n\nThe platform provides [specific feature], [specific feature], and [specific feature] at no cost to users.\n\n"[Quote from founder about why this was built and who it helps.]"\n\nAbout ${site.name}:\n${site.name} is an online resource dedicated to ${tagline.toLowerCase()}. For more information, visit ${site.url}.\n\nContact:\npress@${domain}\n${site.url}`,
    },
  }

  const content = contentMap[channel.id] ?? { title: site.name, body: `Visit ${site.url}` }
  return { title: content.title, body: content.body }
}

// ── Page component ─────────────────────────────────────────────────────────────
export default function MarketingPushPage() {
  const [data,           setDataState] = useState<PushData>(DEFAULT_DATA)
  const [activeNiche,    setActiveNiche] = useState<string>('all')
  const [expandedSites,  setExpandedSites] = useState<Set<string>>(new Set())
  const [pushModal,      setPushModal] = useState<{ site: Site; channel: Channel } | null>(null)
  const [generating,     setGenerating] = useState<string | null>(null)
  const [generatedContent, setGeneratedContent] = useState<Record<string, string>>({})
  const [copied,         setCopied] = useState<string | null>(null)
  const [testRunning,    setTestRunning] = useState<string | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    setDataState(loadData())
  }, [])

  const updateData = useCallback((d: PushData) => {
    setDataState(d)
    saveData(d)
  }, [])

  const toggleExpand = (id: string) => {
    setExpandedSites(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const cycleStatus = (siteId: string, channelId: string) => {
    const current = getStatus(data, siteId, channelId)
    const next: SubmissionStatus =
      current === 'not_submitted' ? 'pending'
      : current === 'pending' ? 'live'
      : 'not_submitted'
    updateData(setStatus(data, siteId, channelId, next))
  }

  const openPushModal = (site: Site, channel: Channel) => {
    const content = generateContent(site, channel)
    setGeneratedContent(content)
    setPushModal({ site, channel })
  }

  const generateAI = async (site: Site, channel: Channel) => {
    const key = `${site.id}-${channel.id}`
    setGenerating(key)
    try {
      const res = await fetch('/api/ai/campaign-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: site.id, siteName: site.name, siteUrl: site.url, niche: site.niche, channel: channel.name }),
      })
      if (res.ok) {
        const d = await res.json()
        setGeneratedContent({ title: d.title ?? generatedContent.title, body: d.body ?? generatedContent.body })
      }
    } catch {
      // keep pre-filled content on error
    }
    setGenerating(null)
  }

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const runPlaywrightTest = (channelId: string) => {
    setTestRunning(channelId)
    // Simulate test run — in production this would POST to /api/playwright/run-channel-test
    setTimeout(() => setTestRunning(null), 2000 + Math.random() * 1500)
  }

  const exportCSV = () => {
    const rows: string[] = ['Site,Niche,Channel,Status']
    for (const site of SITES) {
      for (const ch of CHANNELS) {
        const status = getStatus(data, site.id, ch.id)
        rows.push(`"${site.name}","${NICHES[site.niche]?.label ?? site.niche}","${ch.name}","${status}"`)
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `marketing-push-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredSites = activeNiche === 'all' ? SITES : SITES.filter(s => s.niche === activeNiche)
  const sitesByNiche  = Object.keys(NICHES)
    .map(niche => ({ niche, sites: filteredSites.filter(s => s.niche === niche) }))
    .filter(g => g.sites.length > 0)

  const stats = computeStats(data)

  return (
    <div className="max-w-7xl">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Megaphone size={22} style={{ color: '#f59e0b' }} />
            <h1 className="text-2xl font-bold text-white">Marketing Push</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            Free channel submissions for all 54 sites — track, test, and push campaigns
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* ── Global stats ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard icon={<BarChart3 size={18} />} label="Total Submissions" value={stats.totalSubmissions} color="#f59e0b" />
        <StatCard icon={<Link2 size={18} />}     label="Live Backlinks"    value={stats.liveBacklinks}    color="#34d399" />
        <StatCard icon={<FlaskConical size={18} />} label="Channels Tested" value={`${stats.channelsTested} / ${CHANNELS.length}`} color="#60a5fa" />
      </div>

      {/* ── Channel test status bar ─────────────────────────────────── */}
      <div className="mb-8 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold text-white">Channel Playwright Status</h2>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Click to run a test</span>
        </div>
        <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-5 gap-2">
          {CHANNELS.map(ch => {
            const tc   = TEST_CONFIG[ch.testStatus]
            const ac   = AUTO_CONFIG[ch.automation]
            const running = testRunning === ch.id
            return (
              <div key={ch.id}
                className="rounded-lg px-3 py-2.5 transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-xs font-medium text-white truncate" title={ch.name}>{ch.name}</span>
                  <span style={{ color: tc.color, flexShrink: 0 }}>{tc.icon}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-medium" style={{ color: ac.color }}>{ac.label}</span>
                  <button
                    onClick={() => runPlaywrightTest(ch.id)}
                    disabled={running}
                    title="Run Playwright test"
                    className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-all"
                    style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa' }}>
                    {running
                      ? <RefreshCw size={9} className="animate-spin" />
                      : <Play size={9} />}
                    {running ? 'Running' : 'Test'}
                  </button>
                </div>
                <p className="mt-1 text-[9px] leading-relaxed" style={{ color: 'var(--muted)', opacity: 0.7 }}>{ch.notes}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Niche filter tabs ───────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-1.5 flex-wrap">
        <NicheTab active={activeNiche === 'all'} onClick={() => setActiveNiche('all')} label={`All (${SITES.length})`} />
        {Object.entries(NICHES).map(([key, n]) => {
          const count = SITES.filter(s => s.niche === key).length
          return (
            <NicheTab
              key={key}
              active={activeNiche === key}
              onClick={() => setActiveNiche(key)}
              label={`${n.label} (${count})`}
              activeColor={n.color}
              activeBg={n.bg}
              activeBorder={n.border}
            />
          )
        })}
      </div>

      {/* ── Site groups ─────────────────────────────────────────────── */}
      <div className="space-y-8">
        {sitesByNiche.map(({ niche, sites }) => {
          const n = NICHES[niche]
          return (
            <div key={niche}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ color: n.color, background: n.bg, border: `1px solid ${n.border}` }}>
                  {n.label}
                </span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{sites.length} sites</span>
              </div>
              <div className="space-y-3">
                {sites.map(site => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    data={data}
                    expanded={expandedSites.has(site.id)}
                    onToggle={() => toggleExpand(site.id)}
                    onCycleStatus={cycleStatus}
                    onPush={openPushModal}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Push campaign modal ─────────────────────────────────────── */}
      {pushModal && (
        <PushModal
          site={pushModal.site}
          channel={pushModal.channel}
          content={generatedContent}
          generating={generating === `${pushModal.site.id}-${pushModal.channel.id}`}
          copied={copied}
          onClose={() => setPushModal(null)}
          onGenerateAI={() => generateAI(pushModal.site, pushModal.channel)}
          onCopy={copyText}
          onMarkStatus={(status) => {
            updateData(setStatus(data, pushModal.site.id, pushModal.channel.id, status))
            setPushModal(null)
          }}
        />
      )}
    </div>
  )
}

// ── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string | number; color: string
}) {
  return (
    <div className="rounded-xl px-5 py-4"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <span className="text-xs font-medium" style={{ color: 'var(--muted-light)' }}>{label}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  )
}

// ── NicheTab ─────────────────────────────────────────────────────────────────
function NicheTab({
  active, onClick, label,
  activeColor = '#6366f1', activeBg = 'rgba(99,102,241,0.15)', activeBorder = 'rgba(99,102,241,0.4)',
}: {
  active: boolean; onClick: () => void; label: string
  activeColor?: string; activeBg?: string; activeBorder?: string
}) {
  return (
    <button onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{
        color:      active ? activeColor : 'var(--muted-light)',
        background: active ? activeBg    : 'rgba(255,255,255,0.04)',
        border:     active ? `1px solid ${activeBorder}` : '1px solid var(--border)',
      }}>
      {label}
    </button>
  )
}

// ── SiteCard ─────────────────────────────────────────────────────────────────
function SiteCard({
  site, data, expanded, onToggle, onCycleStatus, onPush,
}: {
  site:          Site
  data:          PushData
  expanded:      boolean
  onToggle:      () => void
  onCycleStatus: (siteId: string, channelId: string) => void
  onPush:        (site: Site, channel: Channel) => void
}) {
  const n       = NICHES[site.niche]
  const statuses = CHANNELS.map(ch => getStatus(data, site.id, ch.id))
  const live     = statuses.filter(s => s === 'live').length
  const pending  = statuses.filter(s => s === 'pending').length
  const pct      = Math.round((live / CHANNELS.length) * 100)

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
      {/* Site header row */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={onToggle}>
        {/* Expand toggle */}
        <div style={{ color: 'var(--muted)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>

        {/* Site info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{site.name}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ color: n.color, background: n.bg, border: `1px solid ${n.border}` }}>
              {n.label}
            </span>
          </div>
          <a
            href={site.url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs flex items-center gap-1 mt-0.5 hover:text-indigo-300 transition-colors"
            style={{ color: 'var(--muted)' }}>
            <ExternalLink size={9} />
            {site.url.replace(/^https?:\/\//, '')}
          </a>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-1.5 mb-1 justify-end">
              {live > 0 && (
                <span className="text-[10px] font-medium" style={{ color: '#34d399' }}>{live} live</span>
              )}
              {pending > 0 && (
                <span className="text-[10px] font-medium" style={{ color: '#fbbf24' }}>{pending} pending</span>
              )}
              {live === 0 && pending === 0 && (
                <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Not started</span>
              )}
            </div>
            <div className="w-28 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: pct > 50 ? '#34d399' : pct > 20 ? '#fbbf24' : '#64748b' }} />
            </div>
          </div>
          <span className="text-xs font-bold w-9 text-right" style={{ color: 'var(--muted-light)' }}>{pct}%</span>
        </div>
      </div>

      {/* Expanded channel checklist */}
      {expanded && (
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_90px_90px_80px_100px] gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--muted)', opacity: 0.5, borderBottom: '1px solid var(--border)' }}>
            <span>Channel</span>
            <span>Automation</span>
            <span>Test Status</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {CHANNELS.map(ch => {
            const status = getStatus(data, site.id, ch.id)
            const sc     = STATUS_CONFIG[status]
            const tc     = TEST_CONFIG[ch.testStatus]
            const ac     = AUTO_CONFIG[ch.automation]

            return (
              <div key={ch.id}
                className="grid grid-cols-[1fr_90px_90px_80px_100px] gap-2 items-center px-4 py-2.5 transition-colors hover:bg-white/[0.02]"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {/* Channel name + URL */}
                <div>
                  <div className="text-xs font-medium text-white">{ch.name}</div>
                  <a href={ch.url} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] hover:text-indigo-300 transition-colors"
                    style={{ color: 'var(--muted)' }}>
                    {ch.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                </div>

                {/* Automation level */}
                <span className="text-[10px] font-semibold" style={{ color: ac.color }}>{ac.label}</span>

                {/* Playwright test status */}
                <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: tc.color }}>
                  {tc.icon} {tc.label}
                </span>

                {/* Submission status — click to cycle */}
                <button
                  onClick={() => onCycleStatus(site.id, ch.id)}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium transition-all cursor-pointer"
                  style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}
                  title="Click to cycle status">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc.dot }} />
                  {sc.label}
                </button>

                {/* Push action */}
                <div className="flex justify-end">
                  <button
                    onClick={() => onPush(site, ch)}
                    className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all"
                    style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
                    <Megaphone size={9} /> Push
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── PushModal ─────────────────────────────────────────────────────────────────
function PushModal({
  site, channel, content, generating, copied, onClose, onGenerateAI, onCopy, onMarkStatus,
}: {
  site:           Site
  channel:        Channel
  content:        Record<string, string>
  generating:     boolean
  copied:         string | null
  onClose:        () => void
  onGenerateAI:   () => void
  onCopy:         (text: string, key: string) => void
  onMarkStatus:   (s: SubmissionStatus) => void
}) {
  const n  = NICHES[site.niche]
  const ac = AUTO_CONFIG[channel.automation]
  const tc = TEST_CONFIG[channel.testStatus]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.12)', maxHeight: '90vh' }}>

        {/* Modal header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Megaphone size={16} style={{ color: '#f59e0b' }} />
              <h2 className="text-base font-bold text-white">{channel.name}</h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ color: ac.color, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {ac.label}
              </span>
              <span className="flex items-center gap-1 text-xs font-medium" style={{ color: tc.color }}>
                {tc.icon} {tc.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{site.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ color: n.color, background: n.bg, border: `1px solid ${n.border}` }}>
                {n.label}
              </span>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: 'var(--muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Modal content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Channel URL */}
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-light)' }}>
            <ExternalLink size={13} />
            <a href={channel.url} target="_blank" rel="noopener noreferrer"
              className="hover:text-white transition-colors">{channel.url}</a>
          </div>

          {/* Notes */}
          <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#fde68a' }}>
            {channel.notes}
          </div>

          {/* Title field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Title / Headline</label>
              <button
                onClick={() => onCopy(content.title ?? '', 'title')}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-all"
                style={{ color: copied === 'title' ? '#34d399' : 'var(--muted)', background: 'rgba(255,255,255,0.05)' }}>
                <Copy size={10} /> {copied === 'title' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="rounded-lg px-3 py-2.5 text-sm text-white"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', lineHeight: 1.6 }}>
              {content.title}
            </div>
          </div>

          {/* Body field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Post Body</label>
              <button
                onClick={() => onCopy(content.body ?? '', 'body')}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-all"
                style={{ color: copied === 'body' ? '#34d399' : 'var(--muted)', background: 'rgba(255,255,255,0.05)' }}>
                <Copy size={10} /> {copied === 'body' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="rounded-lg px-3 py-3 text-xs text-white whitespace-pre-wrap break-words leading-relaxed"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', fontFamily: 'inherit' }}>
              {content.body}
            </pre>
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3 shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {/* AI generate button */}
          <button
            onClick={onGenerateAI}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa' }}>
            {generating
              ? <RefreshCw size={14} className="animate-spin" />
              : <Sparkles size={14} />}
            {generating ? 'Generating…' : 'Regenerate with AI'}
          </button>

          {/* Status actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onMarkStatus('pending')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24' }}>
              <Clock size={12} /> Mark Pending
            </button>
            <button
              onClick={() => onMarkStatus('live')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
              <CheckCircle2 size={12} /> Mark Live
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

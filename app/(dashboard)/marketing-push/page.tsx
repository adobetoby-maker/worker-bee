'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Megaphone, Play, Download, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, Clock, XCircle, Circle, Sparkles, X, Copy,
  ExternalLink, BarChart3, Link2, FlaskConical,
  ClipboardList, ListTodo, Lightbulb, Plus, ArrowUp,
} from 'lucide-react'

// ── Marketing task types ───────────────────────────────────────────────────────
interface MarketingTask {
  id: string
  droid_id: string
  type: 'completed' | 'todo' | 'could_do'
  text: string
  site: string | null
  channel: string | null
  done: boolean
  promoted_from: string | null
  created_at: string
  updated_at: string
}

const API_KEY = '9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747'

const DROID_COLORS: Record<string, { color: string; bg: string; border: string; label: string }> = {
  'droid-prlog':      { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)',  label: 'PRLog Agent'    },
  'droid-reddit':     { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', label: 'Reddit Agent'   },
  'droid-gbp':        { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)',  label: 'GBP Agent'      },
  'droid-producthunt':{ color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  label: 'PH Agent'       },
  'droid-quora':      { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)', label: 'Quora Agent'    },
  'droid-haro':       { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',  label: 'HARO Agent'     },
  'droid-pinterest':  { color: '#f472b6', bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.3)', label: 'Pinterest Agent'},
  'droid-directories':{ color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', label: 'Dir Agent'      },
}

function getDroidStyle(droidId: string) {
  return DROID_COLORS[droidId] ?? { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', label: droidId.replace('droid-', '') }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

const SEED_TASKS = [
  { droid_id: 'droid-prlog',       type: 'todo',     text: 'Submit press release for medicalspanish.app launch', site: 'medicalspanish.app', channel: 'PRLog' },
  { droid_id: 'droid-reddit',      type: 'todo',     text: 'Post to r/nursing: "Free medical Spanish trifold for healthcare workers"', site: 'medicalspanish.app', channel: 'Reddit' },
  { droid_id: 'droid-gbp',         type: 'todo',     text: 'Claim Google Business Profile for JRS Auto Repair', site: 'jrsautorepair.worker-bee.app', channel: 'Google Business' },
  { droid_id: 'droid-producthunt', type: 'todo',     text: 'Launch Language Threshold on Product Hunt', site: 'languagethreshold.com', channel: 'Product Hunt' },
  { droid_id: 'droid-quora',       type: 'could_do', text: 'Answer "How do I prepare for journeyman electrician exam?" on Quora', site: 'journeymanelectricianprep.com', channel: 'Quora' },
  { droid_id: 'droid-reddit',      type: 'could_do', text: 'Start AMA in r/climbing about best sport climbing in France', site: 'climb-france.vercel.app', channel: 'Reddit' },
  { droid_id: 'droid-haro',        type: 'could_do', text: 'Set up HARO email alerts for healthcare + outdoor + SaaS categories', site: 'all', channel: 'HARO' },
  { droid_id: 'droid-pinterest',   type: 'could_do', text: 'Create "Rock Climbing France" Pinterest board with 10 route pins', site: 'climb-france.vercel.app', channel: 'Pinterest' },
] as const

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
  { id: 'craigslist',    name: 'Craigslist Agent',             url: 'https://craigslist.org',        testStatus: 'partial',  automation: 'partial', notes: 'Captcha handling required' },
  { id: 'reddit',        name: 'Reddit Agent',                 url: 'https://reddit.com',             testStatus: 'partial',  automation: 'partial', notes: 'Value-first posts, no spam' },
  { id: 'gmb',           name: 'Google Business Agent',        url: 'https://business.google.com',   testStatus: 'untested', automation: 'manual',  notes: 'Requires Google login' },
  { id: 'directories',   name: 'Directory Agent',              url: 'https://www.manta.com',          testStatus: 'passed',   automation: 'full',    notes: 'Manta / Hotfrog / EZlocal' },
  { id: 'forums',        name: 'Forum Agent',                  url: 'https://google.com',             testStatus: 'partial',  automation: 'partial', notes: 'Find active forums per niche' },
  { id: 'producthunt',   name: 'Product Hunt Agent',           url: 'https://producthunt.com',        testStatus: 'partial',  automation: 'partial', notes: 'Best for SaaS / tools' },
  { id: 'pinterest',     name: 'Pinterest Agent',              url: 'https://pinterest.com',          testStatus: 'partial',  automation: 'partial', notes: 'Visual content, infographics' },
  { id: 'quora',         name: 'Quora Agent',                  url: 'https://quora.com',              testStatus: 'untested', automation: 'partial', notes: 'Answer questions + link' },
  { id: 'haro',          name: 'HARO Agent',                   url: 'https://www.helpareporter.com', testStatus: 'untested', automation: 'manual',  notes: 'Email alerts, 3× daily' },
  { id: 'prlog',         name: 'PRLog Agent',                  url: 'https://prlog.org',             testStatus: 'passed',   automation: 'full',    notes: 'Free press release syndication' },
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

  // Marketing task state
  const [completedTasks, setCompletedTasks] = useState<MarketingTask[]>([])
  const [todoTasks,      setTodoTasks]      = useState<MarketingTask[]>([])
  const [couldDoTasks,   setCouldDoTasks]   = useState<MarketingTask[]>([])
  const [tasksLoading,   setTasksLoading]   = useState(true)
  const [todoInput,      setTodoInput]      = useState('')
  const [todoInputDroid, setTodoInputDroid] = useState('droid-reddit')
  const [ideaInput,      setIdeaInput]      = useState('')
  const [ideaInputDroid, setIdeaInputDroid] = useState('droid-reddit')
  const [collapsedDroids, setCollapsedDroids] = useState<Set<string>>(new Set())

  // Load from localStorage on mount
  useEffect(() => {
    setDataState(loadData())
  }, [])

  // Load marketing tasks on mount
  const loadTasks = useCallback(async () => {
    setTasksLoading(true)
    try {
      const headers = { 'x-api-key': API_KEY }
      const [completedRes, todoRes, couldDoRes] = await Promise.all([
        fetch('/api/marketing/tasks?type=completed&limit=20', { headers }),
        fetch('/api/marketing/tasks?type=todo&done=false', { headers }),
        fetch('/api/marketing/tasks?type=could_do', { headers }),
      ])
      const [completedData, todoData, couldDoData] = await Promise.all([
        completedRes.json(), todoRes.json(), couldDoRes.json()
      ])
      setCompletedTasks(completedData.tasks ?? [])
      setTodoTasks(todoData.tasks ?? [])
      setCouldDoTasks(couldDoData.tasks ?? [])

      // Seed initial data if all empty
      const total = (completedData.tasks?.length ?? 0) + (todoData.tasks?.length ?? 0) + (couldDoData.tasks?.length ?? 0)
      if (total === 0) {
        await seedTasks()
      }
    } catch {
      // silently fail — tables may not be ready
    }
    setTasksLoading(false)
  }, [])

  const seedTasks = async () => {
    const headers = { 'x-api-key': API_KEY, 'Content-Type': 'application/json' }
    await Promise.all(SEED_TASKS.map(t =>
      fetch('/api/marketing/tasks', { method: 'POST', headers, body: JSON.stringify(t) })
    ))
    // Reload after seeding
    const [todoRes, couldDoRes] = await Promise.all([
      fetch('/api/marketing/tasks?type=todo&done=false', { headers: { 'x-api-key': API_KEY } }),
      fetch('/api/marketing/tasks?type=could_do',        { headers: { 'x-api-key': API_KEY } }),
    ])
    const [todoData, couldDoData] = await Promise.all([todoRes.json(), couldDoRes.json()])
    setTodoTasks(todoData.tasks ?? [])
    setCouldDoTasks(couldDoData.tasks ?? [])
  }

  useEffect(() => { loadTasks() }, [loadTasks])

  const addTodo = async () => {
    const text = todoInput.trim()
    if (!text) return
    const res = await fetch('/api/marketing/tasks', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ droid_id: todoInputDroid, type: 'todo', text }),
    })
    if (res.ok) {
      const newTask = await res.json()
      setTodoTasks(prev => [newTask, ...prev])
      setTodoInput('')
    }
  }

  const addIdea = async () => {
    const text = ideaInput.trim()
    if (!text) return
    const res = await fetch('/api/marketing/tasks', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ droid_id: ideaInputDroid, type: 'could_do', text }),
    })
    if (res.ok) {
      const newTask = await res.json()
      setCouldDoTasks(prev => [newTask, ...prev])
      setIdeaInput('')
    }
  }

  const markTodoDone = async (task: MarketingTask) => {
    const res = await fetch(`/api/marketing/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: true }),
    })
    if (res.ok) {
      // Move from todo to completed
      setTodoTasks(prev => prev.filter(t => t.id !== task.id))
      // Also log as completed entry
      const completedRes = await fetch('/api/marketing/tasks', {
        method: 'POST',
        headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ droid_id: task.droid_id, type: 'completed', text: task.text, site: task.site ?? undefined, channel: task.channel ?? undefined }),
      })
      if (completedRes.ok) {
        const completedTask = await completedRes.json()
        setCompletedTasks(prev => [completedTask, ...prev].slice(0, 20))
      }
    }
  }

  const promoteToTodo = async (task: MarketingTask) => {
    const res = await fetch('/api/marketing/tasks', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ droid_id: task.droid_id, type: 'todo', text: task.text, site: task.site ?? undefined, channel: task.channel ?? undefined, promoted_from: 'could_do' }),
    })
    if (res.ok) {
      const newTodo = await res.json()
      setTodoTasks(prev => [newTodo, ...prev])
      // Delete the could_do
      await fetch(`/api/marketing/tasks/${task.id}`, {
        method: 'DELETE',
        headers: { 'x-api-key': API_KEY },
      })
      setCouldDoTasks(prev => prev.filter(t => t.id !== task.id))
    }
  }

  const dismissIdea = async (task: MarketingTask) => {
    await fetch(`/api/marketing/tasks/${task.id}`, {
      method: 'DELETE',
      headers: { 'x-api-key': API_KEY },
    })
    setCouldDoTasks(prev => prev.filter(t => t.id !== task.id))
  }

  const toggleDroidCollapse = (droid: string) => {
    setCollapsedDroids(prev => {
      const n = new Set(prev)
      n.has(droid) ? n.delete(droid) : n.add(droid)
      return n
    })
  }

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

      {/* ── Section B: Active TODOs ────────────────────────────────── */}
      <div className="mb-6 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <ListTodo size={16} style={{ color: '#60a5fa' }} />
            <h2 className="text-sm font-semibold text-white">Active TODOs</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}>
              {todoTasks.length}
            </span>
          </div>
          <button onClick={loadTasks} className="p-1 rounded transition-colors hover:bg-white/10" style={{ color: 'var(--muted)' }}>
            <RefreshCw size={13} className={tasksLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Add TODO form */}
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <DroidSelect value={todoInputDroid} onChange={setTodoInputDroid} />
          <input
            value={todoInput}
            onChange={e => setTodoInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTodo()}
            placeholder="Add a new task…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          />
          <button
            onClick={addTodo}
            disabled={!todoInput.trim()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)', color: '#60a5fa' }}>
            <Plus size={12} /> Add
          </button>
        </div>

        {/* TODO list */}
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {tasksLoading && todoTasks.length === 0 && (
            <div className="px-5 py-4 text-sm text-center" style={{ color: 'var(--muted)' }}>Loading…</div>
          )}
          {!tasksLoading && todoTasks.length === 0 && (
            <div className="px-5 py-4 text-sm text-center" style={{ color: 'var(--muted)' }}>No active tasks — add one above</div>
          )}
          {todoTasks.map(task => {
            const d = getDroidStyle(task.droid_id)
            return (
              <div key={task.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <button
                  onClick={() => markTodoDone(task)}
                  className="mt-0.5 shrink-0 w-4 h-4 rounded border transition-all hover:border-green-400 hover:bg-green-400/10"
                  style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                  title="Mark done" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white leading-relaxed">{task.text}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ color: d.color, background: d.bg, border: `1px solid ${d.border}` }}>
                      {d.label}
                    </span>
                    {task.site && (
                      <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{task.site}</span>
                    )}
                    {task.promoted_from === 'could_do' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>promoted</span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] shrink-0 mt-0.5" style={{ color: 'var(--muted)' }}>{timeAgo(task.created_at)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Section C: Could Do Backlog ─────────────────────────────── */}
      <div className="mb-6 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Lightbulb size={16} style={{ color: '#f59e0b' }} />
            <h2 className="text-sm font-semibold text-white">Could Do</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
              {couldDoTasks.length}
            </span>
          </div>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>tap ↑ to promote to TODO</span>
        </div>

        {/* Idea chips */}
        <div className="px-4 py-3 flex flex-wrap gap-2 min-h-[52px]">
          {couldDoTasks.map(task => {
            const d = getDroidStyle(task.droid_id)
            return (
              <div key={task.id}
                className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-xs font-medium transition-all"
                style={{ background: d.bg, border: `1px solid ${d.border}`, color: d.color }}>
                <span className="max-w-[280px] truncate" title={task.text}>{task.text}</span>
                <button
                  onClick={() => promoteToTodo(task)}
                  title="Promote to TODO"
                  className="ml-0.5 p-0.5 rounded-full hover:bg-white/20 transition-colors">
                  <ArrowUp size={10} />
                </button>
                <button
                  onClick={() => dismissIdea(task)}
                  title="Dismiss"
                  className="p-0.5 rounded-full hover:bg-white/20 transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <X size={10} />
                </button>
              </div>
            )
          })}
          {!tasksLoading && couldDoTasks.length === 0 && (
            <span className="text-xs py-1" style={{ color: 'var(--muted)' }}>No ideas yet — add one below</span>
          )}
        </div>

        {/* Add idea form */}
        <div className="px-4 py-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <DroidSelect value={ideaInputDroid} onChange={setIdeaInputDroid} />
          <input
            value={ideaInput}
            onChange={e => setIdeaInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addIdea()}
            placeholder="+ Add Idea…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
          />
          <button
            onClick={addIdea}
            disabled={!ideaInput.trim()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
            <Plus size={12} /> Add Idea
          </button>
        </div>
      </div>

      {/* ── Section A: Activity Log (completed) ────────────────────── */}
      <div className="mb-8 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <ClipboardList size={16} style={{ color: '#34d399' }} />
            <h2 className="text-sm font-semibold text-white">Activity Log</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
              {completedTasks.length}
            </span>
          </div>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>last 20 completed tasks</span>
        </div>

        {completedTasks.length === 0 && (
          <div className="px-5 py-4 text-sm text-center" style={{ color: 'var(--muted)' }}>
            {tasksLoading ? 'Loading…' : 'No completed tasks yet — check off TODOs above to log activity'}
          </div>
        )}

        {/* Group by droid */}
        {Object.entries(
          completedTasks.reduce<Record<string, MarketingTask[]>>((acc, t) => {
            if (!acc[t.droid_id]) acc[t.droid_id] = []
            acc[t.droid_id].push(t)
            return acc
          }, {})
        ).map(([droid, tasks]) => {
          const d = getDroidStyle(droid)
          const collapsed = collapsedDroids.has(droid)
          return (
            <div key={droid} className="border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {/* Droid group header */}
              <button
                onClick={() => toggleDroidCollapse(droid)}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-white/[0.02] transition-colors text-left">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ color: d.color, background: d.bg, border: `1px solid ${d.border}` }}>
                  {d.label}
                </span>
                <span className="text-xs font-medium" style={{ color: 'var(--muted-light)' }}>{tasks.length} tasks</span>
                <div className="ml-auto" style={{ color: 'var(--muted)' }}>
                  {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                </div>
              </button>
              {!collapsed && tasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 px-4 py-2.5 pl-8 hover:bg-white/[0.02] transition-colors">
                  <CheckCircle2 size={13} className="shrink-0 mt-0.5" style={{ color: '#34d399' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white leading-relaxed">{task.text}</p>
                    {task.site && <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{task.site}</p>}
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: 'var(--muted)' }}>{timeAgo(task.created_at)}</span>
                </div>
              ))}
            </div>
          )
        })}
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

// ── DroidSelect ──────────────────────────────────────────────────────────────
function DroidSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const d = getDroidStyle(value)
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-[11px] font-bold px-2 py-1 rounded-full outline-none cursor-pointer appearance-none"
      style={{ background: d.bg, border: `1px solid ${d.border}`, color: d.color }}>
      {Object.entries(DROID_COLORS).map(([id, cfg]) => (
        <option key={id} value={id} style={{ background: '#0f1117', color: cfg.color }}>{cfg.label}</option>
      ))}
    </select>
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

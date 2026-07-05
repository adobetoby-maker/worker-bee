export const dynamic = 'force-dynamic'
import Link from 'next/link'
import {
  CheckCircle2, Circle, Zap, Users, Mail, Phone, MessageSquare,
  ChevronRight, ArrowRight, AlertCircle, Play, Settings,
  Target, Clock, TrendingUp, RefreshCw, Bell, Globe
} from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

type AutoStatus = 'auto' | 'manual' | 'setup'

type Step = {
  id: string
  label: string
  title: string
  desc: string
  status: AutoStatus
  href?: string
  action?: string
  detail?: string
}

const STEPS: Step[] = [
  {
    id: 'add-prospect', label: 'A',
    title: 'Add the Prospect',
    desc: 'Create a record: business name, owner name, email, city, phone. Paste their demo URL.',
    status: 'manual', href: '/leads', action: 'New Prospect →',
    detail: '2–3 min per prospect. Missing email = sequence can\'t start. Demo URL is what drives opens.',
  },
  {
    id: 'assign-campaign', label: 'B',
    title: 'Assign to a Campaign',
    desc: 'Link to the current outreach batch ("June 2026 Contractor Batch") for group-level tracking.',
    status: 'manual', href: '/campaigns', action: 'View Campaigns →',
    detail: 'Optional but recommended — tracks open/reply rates across a full batch.',
  },
  {
    id: 'add-payment-link', label: 'C',
    title: 'Paste a Stripe Payment Link',
    desc: 'Create a $2,937 annual deal link in Stripe, paste into the prospect\'s payment_link field.',
    status: 'manual', href: 'https://dashboard.stripe.com/payment-links/create', action: 'Create in Stripe →',
    detail: 'One link can be reused across all prospects — {{payment_link}} injects it into every email automatically.',
  },
  {
    id: 'send-email-1', label: 'D',
    title: 'Send Email 1 — Demo Intro (Touch 1)',
    desc: 'Prospect detail → Email Composer → preview → Send. Fires from toby@andertongroup.com.',
    status: 'manual', href: '/leads', action: 'Open Leads →',
    detail: 'On send: sequence_start_date stamped, current_touch = 1, next_touch_date = +3 days (Text 1 due).',
  },
  {
    id: 'tracking', label: 'E',
    title: 'Email Tracking Runs Automatically',
    desc: 'Resend polls every 30 min: delivered → opened → clicked. Stage auto-advances.',
    status: 'auto',
    detail: 'new → active on deliver. active → engaged on open. engaged → hot on click. Watch the pipeline badge.',
  },
  {
    id: 'due-today', label: 'F',
    title: 'Work Marketing Command Daily',
    desc: '"Due Today" shows every prospect whose next touch is today. Work the list top to bottom.',
    status: 'auto', href: '/marketing-command', action: 'Open Command →',
    detail: 'The system tells you who needs contact today. You execute. One page, one list, no guesswork.',
  },
  {
    id: 'text-1', label: 'G',
    title: 'Text 1 — Day 3',
    desc: 'Short text from your phone referencing the email. Log Touch → Text 1 / Sent to advance sequence.',
    status: 'manual', href: '/leads/pipeline', action: 'Pipeline →',
    detail: 'Script: "Hey [name], sent you an email about a demo site for [business] — did you see it?"',
  },
  {
    id: 'call-1', label: 'H',
    title: 'Call 1 — Day 5',
    desc: 'Make the call. Log outcome: Connected / Voicemail / No Answer / Callback Requested.',
    status: 'manual',
    detail: 'Voicemail: "Hi [name], Toby from Anderton Group — built a free demo for [business]. Demo at [demo_url]. Call me back at 208-390-0369."',
  },
  {
    id: 'email-2', label: 'I',
    title: 'Email 2 — Day 8 (Touch 4)',
    desc: 'Email Composer → Email 2 → Send. Re-references demo, restates deal. Urgency tone.',
    status: 'manual', href: '/leads', action: 'Email Composer →',
    detail: 'If prospect replied before this touch, skip the email and respond to them directly. Log a "replied" event.',
  },
  {
    id: 'text-2', label: 'J',
    title: 'Text 2 — Day 12',
    desc: 'Short follow-up text referencing the deal deadline.',
    status: 'manual',
    detail: 'Script: "Hey [name] — following up on the Anderton Group email. Launch deal closes this batch: [demo_url]"',
  },
  {
    id: 'call-2', label: 'K',
    title: 'Call 2 — Day 14',
    desc: 'Second call. If you reach them, offer to answer questions or screen share.',
    status: 'manual',
    detail: 'Goal: a yes, a no, or a specific objection. Log outcome and notes. Objection notes feed future copy.',
  },
  {
    id: 'email-3', label: 'L',
    title: 'Email 3 — Day 18 (Touch 7, Last Chance)',
    desc: '"Last email from me" tone. Deal expires. Two-click payment link.',
    status: 'manual', href: '/leads', action: 'Email Composer →',
    detail: 'Shortest email in the sequence. The deal box does the work. Soft exit if no action after this.',
  },
  {
    id: 'text-3', label: 'M',
    title: 'Text 3 — Day 22',
    desc: 'Final text. One sentence, no pressure.',
    status: 'manual',
    detail: 'Script: "Hey [name] — last message from me on the Anderton Group site. If you ever want to revisit: 208-390-0369."',
  },
  {
    id: 'call-3', label: 'N',
    title: 'Call 3 — Day 25 (Final)',
    desc: 'Last call. Log outcome. Move to Won, Lost, or Archived.',
    status: 'manual', href: '/leads/pipeline', action: 'Pipeline →',
    detail: 'If they pass: "No problem — if things change I\'d love to help. Have a great day." Then archive. Clean data is future revenue.',
  },
  {
    id: 'close', label: 'O',
    title: 'Close — Won / Lost / Archived',
    desc: 'Update stage. Won = paid. Lost = declined. Archived = 9 touches, no response.',
    status: 'manual', href: '/leads/pipeline', action: 'Pipeline →',
    detail: 'Lost/Archived aren\'t failures — they feed the next batch. Markets change, timing changes.',
  },
  {
    id: 'gmail-scan', label: '★',
    title: 'Gmail Reply Scanning (Setup Required)',
    desc: 'Auto-detects replies from prospects every 30 min. Logs reply event, advances stage to engaged/hot.',
    status: 'setup', href: '/settings', action: 'Connect Google →',
    detail: 'Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN to Vercel env. One-time OAuth, runs forever.',
  },
]

const AUTOMATION = [
  { label: 'Send from toby@andertongroup.com',   active: true,  detail: 'Resend — andertongroup.com verified' },
  { label: 'Sequence timestamp on first send',   active: true,  detail: 'sequence_start_date auto-stamped' },
  { label: 'Touch counter auto-advance',         active: true,  detail: 'current_touch increments on each send' },
  { label: 'Next touch date auto-calculate',     active: true,  detail: 'next_touch_date set per channel schedule' },
  { label: 'Email tracking (delivered/opened)',  active: true,  detail: 'Resend polling cron every 30 min' },
  { label: 'Stage advance on open/click',        active: true,  detail: 'new→active→engaged→hot automatically' },
  { label: '"Due Today" dashboard',              active: true,  detail: 'Marketing Command shows who needs action' },
  { label: 'Gmail reply auto-detection',         active: false, detail: 'Needs Google OAuth env vars — see below' },
  { label: 'Auto-send Email 2 + Email 3',        active: false, detail: 'Possible — ask to enable full send automation' },
  { label: 'iMessage alert on reply',            active: false, detail: 'Possible via Hermes Jr notification layer' },
]

function StatusBadge({ status }: { status: AutoStatus }) {
  const cfg = {
    auto:  { label: '⚡ Automated', color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
    manual:{ label: '👆 Manual',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
    setup: { label: '⚙ Setup req', color: '#f97316', bg: 'rgba(249,115,22,0.12)'  },
  }[status]
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

export default async function HowToPage() {
  const [prospectsRes, tasksRes] = await Promise.all([
    db.from('prospects').select('id', { count: 'exact' }).not('stage', 'in', '("won","lost","archived")'),
    db.from('marketing_tasks').select('id', { count: 'exact' }).eq('done', false),
  ])
  const activeCount = prospectsRes.count ?? 0
  const taskCount   = tasksRes.count   ?? 0

  return (
    <div className="max-w-[900px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/marketing-command" className="text-xs hover:opacity-80 transition-opacity" style={{ color: 'var(--muted)' }}>
              Marketing Command
            </Link>
            <ChevronRight size={12} style={{ color: 'var(--muted)' }} />
            <span className="text-xs text-white">How To</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">A→Z Outreach Playbook</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Every step from finding a contractor to closing the deal, with automation status on each.
          </p>
        </div>
        <Link href="/marketing-command"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
          style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
          <Target size={14} /> Command Center
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Active Prospects', value: activeCount, color: '#60a5fa', Icon: Users },
          { label: 'Tasks Queued',     value: taskCount,   color: '#f59e0b', Icon: Clock },
          { label: 'Touch Points',     value: 9,           color: '#a78bfa', Icon: TrendingUp },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Icon size={18} style={{ color }} />
            <div>
              <p className="text-xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Automation status */}
      <div className="rounded-xl p-5 mb-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={14} style={{ color: '#f59e0b' }} />
          <h2 className="text-sm font-bold text-white">Automation Status</h2>
          <span className="text-xs ml-auto" style={{ color: 'var(--muted)' }}>
            {AUTOMATION.filter(a => a.active).length}/{AUTOMATION.length} active
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {AUTOMATION.map(item => (
            <div key={item.label} className="flex items-start gap-2.5 py-1.5">
              {item.active
                ? <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" style={{ color: '#34d399' }} />
                : <Circle      size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--muted)' }} />
              }
              <div className="min-w-0">
                <p className="text-xs text-white leading-snug">{item.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deal quick reference */}
      <div className="rounded-xl p-5 mb-8"
        style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} style={{ color: '#f59e0b' }} />
          <h2 className="text-sm font-bold" style={{ color: '#f59e0b' }}>Launch Deal — Quick Reference</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-3">
          {[
            { label: 'Build Fee', was: '$1,999', now: '$1,749', save: 'Save $250' },
            { label: 'Hosting / 24 mo', was: '$199/mo', now: '$99/mo', save: '50% off, paid annually' },
            { label: 'Total Savings', was: '', now: '$2,650', save: 'Over 2 years' },
          ].map(item => (
            <div key={item.label}>
              <p className="text-xs font-semibold text-white mb-0.5">{item.label}</p>
              {item.was && <p className="text-xs line-through opacity-40 text-white">{item.was}</p>}
              <p className="text-lg font-bold" style={{ color: '#34d399' }}>{item.now}</p>
              <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{item.save}</p>
            </div>
          ))}
        </div>
        <p className="text-xs pt-3" style={{ borderTop: '1px solid rgba(245,158,11,0.15)', color: 'var(--muted)' }}>
          Annual payment: <span className="text-white font-semibold">$1,749 build + $1,188/yr hosting = $2,937 first charge.</span> Stripe payment link goes in each prospect&apos;s <code className="text-[10px] px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)' }}>payment_link</code> field and auto-injects into emails.
        </p>
      </div>

      {/* 9-touch timeline */}
      <div className="rounded-xl p-5 mb-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={14} style={{ color: '#60a5fa' }} />
          <h2 className="text-sm font-bold text-white">9-Touch Timeline</h2>
          <span className="text-xs ml-auto" style={{ color: 'var(--muted)' }}>25 days total</span>
        </div>
        <div className="grid grid-cols-9 gap-1">
          {[
            { label: 'E1', day: 0,  color: '#818cf8' },
            { label: 'T1', day: 3,  color: '#34d399' },
            { label: 'C1', day: 5,  color: '#f59e0b' },
            { label: 'E2', day: 8,  color: '#818cf8' },
            { label: 'T2', day: 12, color: '#34d399' },
            { label: 'C2', day: 14, color: '#f59e0b' },
            { label: 'E3', day: 18, color: '#818cf8' },
            { label: 'T3', day: 22, color: '#34d399' },
            { label: 'C3', day: 25, color: '#f59e0b' },
          ].map(t => (
            <div key={t.label} className="flex flex-col items-center gap-1 p-2 rounded-lg text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
              <span className="text-xs font-bold" style={{ color: t.color }}>{t.label}</span>
              <span className="text-[9px]" style={{ color: 'var(--muted)' }}>d{t.day}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] mt-2" style={{ color: 'var(--muted)' }}>E = Email · T = Text · C = Call · Next touch auto-calculates after each logged action</p>
      </div>

      {/* A→Z Steps */}
      <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Play size={13} style={{ color: '#34d399' }} /> Step-by-Step Playbook
      </h2>

      <div className="space-y-2">
        {STEPS.map((step, i) => {
          const isAuto  = step.status === 'auto'
          const isSetup = step.status === 'setup'
          return (
            <div key={step.id} className="rounded-xl p-4 flex items-start gap-4"
              style={{
                background: isAuto ? 'rgba(52,211,153,0.03)' : isSetup ? 'rgba(249,115,22,0.03)' : 'var(--surface)',
                border: isAuto ? '1px solid rgba(52,211,153,0.15)' : isSetup ? '1px solid rgba(249,115,22,0.15)' : '1px solid var(--border)',
              }}>
              {/* Letter badge */}
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: isAuto ? 'rgba(52,211,153,0.15)' : isSetup ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.06)',
                  color: isAuto ? '#34d399' : isSetup ? '#f97316' : 'var(--muted)',
                }}>
                {step.label}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                  <StatusBadge status={step.status} />
                </div>
                <p className="text-xs leading-relaxed mb-1" style={{ color: 'var(--muted-light)' }}>{step.desc}</p>
                {step.detail && <p className="text-[10px] leading-relaxed" style={{ color: 'var(--muted)' }}>{step.detail}</p>}
              </div>

              {/* Action */}
              {step.href && step.action && (
                step.href.startsWith('http') ? (
                  <a href={step.href} target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap hover:opacity-80 transition-opacity"
                    style={{ background: isSetup ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.06)', color: isSetup ? '#f97316' : 'var(--muted)', border: '1px solid var(--border)' }}>
                    {step.action}
                  </a>
                ) : (
                  <Link href={step.href}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap hover:opacity-80 transition-opacity"
                    style={{ background: isAuto ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.06)', color: isAuto ? '#34d399' : 'white', border: '1px solid var(--border)' }}>
                    {step.action}
                  </Link>
                )
              )}
              {isAuto && !step.href && (
                <div className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
                  <Zap size={11} /> Running
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Gmail setup */}
      <div className="rounded-xl p-5 mt-8"
        style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={14} style={{ color: '#f97316' }} />
          <h2 className="text-sm font-bold" style={{ color: '#f97316' }}>One-Time Setup: Gmail Reply Scanning</h2>
        </div>
        <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--muted-light)' }}>
          Once set up, the system checks Gmail every 30 min for replies from prospect email addresses, logs them as reply events, advances their stage, and can fire an iMessage alert to your phone.
        </p>
        <ol className="space-y-2 mb-4">
          {[
            'Go to console.cloud.google.com → Create project → Enable Gmail API',
            'Create OAuth 2.0 credentials (Desktop app) → copy client_id + client_secret',
            'Run OAuth flow once to generate a refresh_token',
            'Add to Vercel: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN',
            'Cron at /api/cron/scan-gmail-replies fires every 30 min automatically',
          ].map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--muted-light)' }}>
              <span className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316' }}>{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid rgba(249,115,22,0.15)' }}>
          <Link href="/settings"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg"
            style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}>
            <Settings size={12} /> Open Settings
          </Link>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Ask me to build the OAuth connection flow and I&apos;ll wire it up in one session.</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
        <Link href="/marketing-command" className="text-sm hover:opacity-80 transition-opacity" style={{ color: 'var(--muted)' }}>
          ← Back to Command Center
        </Link>
        <Link href="/leads" className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: '#f59e0b' }}>
          Start adding prospects <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}

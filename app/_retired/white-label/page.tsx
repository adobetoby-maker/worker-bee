import Link from 'next/link'
import {
  Globe, FileText, CreditCard, Smartphone, ClipboardList,
  BookOpen, MessageSquare, Gift, Zap, Server, Link2, Clock,
  ArrowRight, CheckCircle2, ExternalLink,
} from 'lucide-react'

export const metadata = { title: 'White Label — Worker-Bee' }

// ── Data ───────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Globe,
    title: 'Customer-Facing Website',
    desc: '8 fully designed pages — home, services, about, gallery, contact, membership, blog, and booking. SEO-optimized and mobile-first.',
    color: '#60a5fa',
  },
  {
    icon: FileText,
    title: 'Service Request & Quote Forms',
    desc: 'Customers request service, describe their problem, and submit photos. You get a structured lead — no phone tag.',
    color: '#34d399',
  },
  {
    icon: CreditCard,
    title: 'Customer Membership Portal',
    desc: 'Three tiers ($19, $39, $69/mo) with Stripe billing built in. Annual plans auto-included. Cancellation, upgrades — all self-serve.',
    color: '#f59e0b',
  },
  {
    icon: Smartphone,
    title: 'Crew Time Tracker + Mobile PWA',
    desc: 'Technicians clock in and out from their phone with one tap. No app store install — installs directly from the browser.',
    color: '#a78bfa',
  },
  {
    icon: ClipboardList,
    title: 'Job & Invoice Management',
    desc: 'Track every job from quote to payment. Generate and send invoices, mark jobs complete, and build a full service history per customer.',
    color: '#fb7185',
  },
  {
    icon: BookOpen,
    title: 'Blog + Local SEO Tips Engine',
    desc: 'Pre-written plumbing tip articles, editable from your dashboard. Google rewards fresh, useful content — this keeps your site climbing.',
    color: '#2dd4bf',
  },
  {
    icon: MessageSquare,
    title: 'Customer Chat Widget',
    desc: 'Embedded chat widget on every page. Conversations route to your phone via SMS or a simple inbox — no third-party subscription needed.',
    color: '#818cf8',
  },
  {
    icon: Gift,
    title: 'Referral Program',
    desc: 'Customers who refer friends earn account credits. Credits apply to membership or services. Word-of-mouth automated and trackable.',
    color: '#f97316',
  },
]

const STATS = [
  { label: 'Stack', value: 'Supabase + Stripe', icon: Server, color: '#34d399' },
  { label: 'Infrastructure', value: 'Cloudflare — blazing fast, $0 hosting cost to you', icon: Zap, color: '#fbbf24' },
  { label: 'Domain', value: 'Custom domain included', icon: Link2, color: '#60a5fa' },
  { label: 'Delivery', value: '2-week turnaround', icon: Clock, color: '#a78bfa' },
]

const PROCESS = [
  {
    step: '01',
    title: 'You share your logo, colors, and service area',
    desc: 'Send us your brand assets and a list of the cities you serve. That\'s the entire brief — we handle the rest.',
    color: '#f59e0b',
  },
  {
    step: '02',
    title: 'We rebrand, configure, and deploy in 2 weeks',
    desc: 'Your colors replace ours, your logo goes up, your service area fills in. Stripe connects to your account. Your domain goes live.',
    color: '#f59e0b',
  },
  {
    step: '03',
    title: 'You own it — customers book, pay, and manage online',
    desc: 'The full source code is yours. Customers can schedule appointments, join your membership, and pay — 24/7, no staff required.',
    color: '#f59e0b',
  },
]

const PRICING = [
  {
    name: 'White-Label Setup',
    price: '$2,499',
    type: 'one-time',
    highlight: true,
    items: [
      'Full source code rebranded to your company',
      'Your domain wired and SSL active',
      'Supabase project provisioned and seeded',
      'Stripe connected to your payout account',
      'All 8 pages live with your content',
      '30 days of post-launch support',
    ],
  },
  {
    name: 'Monthly Maintenance',
    price: '$149',
    type: 'per month — optional',
    highlight: false,
    items: [
      'Cloudflare hosting covered',
      'Framework + dependency updates',
      'Bug fixes and edge-case patches',
      'Content changes (up to 2/mo)',
      'Priority email support',
    ],
  },
]

// ── Page ───────────────────────────────────────────────────────────────────────

export default function WhiteLabelPage() {
  return (
    <div className="max-w-5xl space-y-16 pb-16">

      {/* ── Hero ── */}
      <div className="rounded-2xl p-8 md:p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 60%, rgba(99,102,241,0.08) 100%)', border: '1px solid rgba(245,158,11,0.2)' }}>
        {/* background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 uppercase tracking-widest"
            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            White-Label Platform
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Your Plumbing Business,<br />
            <span style={{ color: '#fbbf24' }}>Fully Automated</span>
          </h1>

          <p className="text-lg mb-8 max-w-2xl" style={{ color: '#94a3b8' }}>
            Get the same platform Mountain Edge Plumbing uses — rebranded for your company in 2 weeks.
            Online booking, membership billing, crew tracking, and local SEO. All of it, yours.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <a
              href="mailto:hello@worker-bee.app?subject=White-Label Plumbing Platform"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: '#f59e0b', color: '#000' }}>
              Request White-Label Demo
              <ArrowRight size={15} />
            </a>
            <a
              href="https://mountainedgeplumbing.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0' }}>
              <ExternalLink size={13} />
              See it live — mountainedgeplumbing.com
            </a>
          </div>
        </div>
      </div>

      {/* ── Platform Stats ── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#64748b' }}>
          What's under the hood
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={13} style={{ color }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>{label}</span>
              </div>
              <div className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Feature Grid ── */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Everything included, out of the box</h2>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Eight production-ready features. No integrations to wire up. No third-party subscriptions to juggle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color }, i) => (
            <div key={title}
              className="group rounded-xl p-5 transition-all"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-start gap-4">
                <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg"
                  style={{ background: `${color}14`, border: `1px solid ${color}28` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white mb-1">{title}</div>
                  <div className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Process ── */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">How it works</h2>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Three steps from decision to live site.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROCESS.map(({ step, title, desc, color }) => (
            <div key={step} className="rounded-xl p-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-4xl font-black mb-4" style={{ color: 'rgba(245,158,11,0.18)', letterSpacing: '-2px' }}>
                {step}
              </div>
              <div className="text-sm font-semibold text-white mb-2">{title}</div>
              <div className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Social Proof Banner ── */}
      <div className="rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center gap-4"
        style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#818cf8' }}>Live example</span>
        </div>
        <div className="flex-1">
          <div className="text-sm text-white font-medium">Mountain Edge Plumbing is running this exact platform right now.</div>
          <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>
            See every feature in production — memberships, booking, blog, and crew tools.
          </div>
        </div>
        <a
          href="https://mountainedgeplumbing.com"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          style={{ color: '#818cf8', background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.2)' }}>
          <ExternalLink size={12} />
          mountainedgeplumbing.com
        </a>
      </div>

      {/* ── Pricing ── */}
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Pricing</h2>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Flat-rate setup. Optional monthly maintenance if you want us to handle hosting and updates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {PRICING.map(({ name, price, type, highlight, items }) => (
            <div key={name}
              className="rounded-2xl p-6"
              style={{
                background: highlight ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.03)',
                border: highlight ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.08)',
              }}>
              {highlight && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-4 uppercase tracking-widest"
                  style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>
                  Most popular
                </div>
              )}
              <div className="mb-1 text-sm font-semibold" style={{ color: '#94a3b8' }}>{name}</div>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-4xl font-black text-white">{price}</span>
              </div>
              <div className="text-xs mb-6" style={{ color: '#64748b' }}>{type}</div>
              <ul className="space-y-2.5">
                {items.map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: '#cbd5e1' }}>
                    <CheckCircle2 size={13} className="shrink-0 mt-0.5" style={{ color: highlight ? '#fbbf24' : '#34d399' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Discount callout */}
        <div className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="w-5 h-5 shrink-0 flex items-center justify-center rounded-full mt-0.5"
            style={{ background: 'rgba(245,158,11,0.2)' }}>
            <span className="text-xs font-black" style={{ color: '#fbbf24' }}>%</span>
          </div>
          <div>
            <div className="text-sm font-semibold mb-0.5" style={{ color: '#fbbf24' }}>
              Exam Prep Team Plan members — 20% off setup
            </div>
            <div className="text-xs" style={{ color: '#64748b' }}>
              Your setup price drops to <strong className="text-white">$1,999</strong>. Mention your membership when you reach out.
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div className="rounded-2xl p-8 md:p-12 text-center"
        style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(99,102,241,0.08) 100%)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <h2 className="text-3xl font-bold text-white mb-3">
          Ready to modernize your plumbing business?
        </h2>
        <p className="text-sm mb-8 max-w-lg mx-auto" style={{ color: '#94a3b8' }}>
          Every week without an online booking system is a week of missed calls, missed leads, and missed revenue.
          Let's fix that in two weeks.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="mailto:hello@worker-bee.app?subject=White-Label Plumbing Platform"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all"
            style={{ background: '#f59e0b', color: '#000' }}>
            Get Started — $2,499
            <ArrowRight size={15} />
          </a>
          <a
            href="https://mountainedgeplumbing.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium text-sm transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0' }}>
            <ExternalLink size={13} />
            See the live site first
          </a>
        </div>
      </div>

    </div>
  )
}

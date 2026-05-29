import Link from 'next/link'
import {
  Globe, CheckCircle, Zap, Users, Briefcase, ArrowRight,
  ExternalLink, Star, Clock, Shield, Smartphone, Search,
  Mail, Building2, Wrench,
} from 'lucide-react'

export const metadata = { title: 'Build Offer — Anderton & Associates' }

const INCLUDED = [
  '8 custom pages (Home, About, Services, Service Request, Blog, Tips, Customer Portal, Contact)',
  'Mobile-first design — Lighthouse 90+ performance',
  'Local SEO: Google Business integration, schema markup, sitemap',
  'Service request form with email notifications',
  'Customer membership portal (optional add-on)',
  'Deployed on Cloudflare — free hosting, fast globally',
  'Custom domain setup included',
  '30 days of post-launch support',
]

const PROCESS = [
  {
    step: '01',
    title: 'You share your details',
    desc: 'Business info, logo, service area, and any photos. A quick form — 15 minutes max.',
    accent: '#818cf8',
  },
  {
    step: '02',
    title: 'Preview in 7 days',
    desc: 'We build a full working site and show you a live preview link. You give feedback.',
    accent: '#34d399',
  },
  {
    step: '03',
    title: 'Live in week 2',
    desc: 'Approve the preview, we point your domain at it and you\'re live. Done.',
    accent: '#f59e0b',
  },
  {
    step: '04',
    title: 'Start getting leads',
    desc: 'Google can find you. Customers can call, submit requests, and reach you 24/7.',
    accent: '#f87171',
  },
]

const FOR_WHO = [
  {
    icon: Briefcase,
    title: 'Newly licensed contractors',
    desc: 'Electricians, plumbers, HVAC techs — launching with a professional web presence from day one.',
    accent: '#818cf8',
  },
  {
    icon: Users,
    title: 'Word-of-mouth businesses',
    desc: 'Established contractors doing great work but missing out on search traffic and online inquiries.',
    accent: '#34d399',
  },
  {
    icon: Building2,
    title: 'Business acquisitions',
    desc: 'Buying out a retiring owner and need a digital presence that matches the quality of the operation.',
    accent: '#f59e0b',
  },
]

const PRICING = [
  {
    name: 'Starter Site',
    price: '$1,999',
    teamPrice: '$1,599',
    desc: '8 custom pages, no portal',
    accent: '#818cf8',
    features: ['8 custom pages', 'Local SEO', 'Service request form', 'Custom domain', '30-day support'],
    highlight: false,
  },
  {
    name: 'Starter + Portal',
    price: '$2,498',
    teamPrice: '$1,999',
    desc: 'Stripe subscription plans, login, account management',
    accent: '#34d399',
    features: ['Everything in Starter', 'Customer login portal', 'Stripe subscription billing', 'Account management', 'Member dashboard'],
    highlight: true,
  },
  {
    name: 'White-Label OS',
    price: '$2,499',
    teamPrice: null,
    desc: 'Full platform — the OS behind all Anderton sites',
    accent: '#f59e0b',
    features: ['Everything in Starter + Portal', 'Worker-Bee dashboard access', 'Multi-site management', 'AI monitoring + alerts', 'Blueprint system'],
    highlight: false,
  },
]

export default function BuildOfferPage() {
  return (
    <div className="max-w-4xl pb-20">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="mb-12">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{ background: '#34d39918', color: '#34d399', border: '1px solid #34d39930' }}>
          <Globe size={11} />
          Contractor Websites by Anderton &amp; Associates
        </div>

        <h1 className="text-4xl font-bold text-white leading-tight mb-4 tracking-tight">
          A Contractor Website<br />
          <span style={{ color: '#34d399' }}>That Wins Jobs</span>
        </h1>

        <p className="text-lg mb-8" style={{ color: 'var(--muted-light)', maxWidth: 560 }}>
          8-page professional website, built and deployed in 2 weeks.{' '}
          <span className="text-white font-medium">Mountain Edge Plumbing</span> is proof.
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href="mailto:hello@andertonassociates.com?subject=Website Build Inquiry"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
              color: '#0b1a14',
              boxShadow: '0 4px 20px rgba(52,211,153,0.35)',
            }}>
            Get Started — $1,999
            <ArrowRight size={15} />
          </a>
          <a
            href="https://mountainedgeplumbing.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--muted-light)',
              border: '1px solid var(--border)',
            }}>
            See a live example
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* ── What's included ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border p-8 mb-8"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-6">
          <Shield size={16} style={{ color: '#818cf8' }} />
          <h2 className="text-base font-bold text-white uppercase tracking-widest text-[11px]"
            style={{ letterSpacing: '0.12em', fontSize: 11, color: 'var(--muted)' }}>
            What&apos;s Included
          </h2>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {INCLUDED.map((item) => (
            <div key={item} className="flex items-start gap-3">
              <CheckCircle size={15} className="shrink-0 mt-0.5" style={{ color: '#34d399' }} />
              <span className="text-sm" style={{ color: 'var(--muted-light)' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mountain Edge showcase ───────────────────────────────────────── */}
      <div className="rounded-2xl border p-6 mb-8 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #111425 100%)',
          borderColor: '#34d39930',
          boxShadow: '0 0 0 1px #34d39918',
        }}>
        {/* Glow dot */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#34d399', letterSpacing: '0.1em', fontSize: 10 }}>Live Site</span>
            </div>
            <h3 className="text-xl font-bold text-white">Mountain Edge Plumbing</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Serving Twin Falls, ID</p>
          </div>
          <a
            href="https://mountainedgeplumbing.com"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: '#34d39918',
              color: '#34d399',
              border: '1px solid #34d39933',
            }}>
            Visit Site
            <ExternalLink size={12} />
          </a>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Smartphone, label: 'Mobile-first', desc: 'Works perfectly on every device', accent: '#818cf8' },
            { icon: Search, label: 'Local SEO live', desc: 'Indexed and ranking in Twin Falls', accent: '#34d399' },
            { icon: Star, label: 'Customer portal', desc: 'Stripe subscription plans active', accent: '#f59e0b' },
          ].map(({ icon: Icon, label, desc, accent }) => (
            <div key={label} className="rounded-xl p-3.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
              <Icon size={14} className="mb-2" style={{ color: accent }} />
              <div className="text-sm font-semibold text-white mb-0.5">{label}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>{desc}</div>
            </div>
          ))}
        </div>

        <p className="text-xs mt-4" style={{ color: 'var(--muted)' }}>
          Built on this exact stack — same tools, same process, same 2-week timeline.
        </p>
      </div>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-1">Pricing</h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            One-time build fee. No monthly retainer unless you want ongoing support.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-5">
          {PRICING.map(({ name, price, teamPrice, desc, accent, features, highlight }) => (
            <div key={name}
              className="rounded-2xl border p-5 flex flex-col transition-all"
              style={{
                background: highlight ? `${accent}0d` : 'var(--surface)',
                borderColor: highlight ? `${accent}40` : 'var(--border)',
                boxShadow: highlight ? `0 0 0 1px ${accent}20` : 'none',
              }}>
              {highlight && (
                <div className="text-[10px] font-bold uppercase tracking-widest mb-3 px-2 py-1 rounded-full self-start"
                  style={{ background: `${accent}20`, color: accent, letterSpacing: '0.1em' }}>
                  Most Popular
                </div>
              )}
              <div className="mb-1">
                <div className="font-bold text-white text-base">{name}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{desc}</div>
              </div>
              <div className="flex items-baseline gap-1 my-4">
                <span className="text-3xl font-bold" style={{ color: accent }}>{price}</span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>one-time</span>
              </div>
              <ul className="space-y-2 flex-1 mb-5">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: 'var(--muted-light)' }}>
                    <CheckCircle size={11} className="shrink-0 mt-0.5" style={{ color: accent }} />
                    {f}
                  </li>
                ))}
              </ul>
              {teamPrice && (
                <div className="rounded-lg px-3 py-2 text-xs mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>Team plan: </span>
                  <span className="font-bold" style={{ color: '#34d399' }}>{teamPrice}</span>
                  <span style={{ color: 'var(--muted)' }}> (20% off)</span>
                </div>
              )}
              <a
                href="mailto:hello@andertonassociates.com?subject=Website Build Inquiry"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                style={{
                  background: highlight ? accent : `${accent}18`,
                  color: highlight ? '#0b1a14' : accent,
                  border: highlight ? 'none' : `1px solid ${accent}33`,
                }}>
                Get Started
                <ArrowRight size={13} />
              </a>
            </div>
          ))}
        </div>

        {/* Team discount callout */}
        <div className="rounded-xl px-5 py-4 flex items-start gap-3"
          style={{ background: '#34d39910', border: '1px solid #34d39928' }}>
          <Zap size={14} className="shrink-0 mt-0.5" style={{ color: '#34d399' }} />
          <div>
            <span className="text-sm font-semibold" style={{ color: '#34d399' }}>20% Team Plan Discount</span>
            <span className="text-sm ml-1.5" style={{ color: 'var(--muted-light)' }}>
              Applied automatically for exam prep team members — Starter drops to $1,599, With Portal to $1,999.
            </span>
          </div>
        </div>
      </div>

      {/* ── Who this is for ──────────────────────────────────────────────── */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-white mb-5">Who This Is For</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {FOR_WHO.map(({ icon: Icon, title, desc, accent }) => (
            <div key={title}
              className="rounded-2xl border p-5"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
                <Icon size={16} style={{ color: accent }} />
              </div>
              <div className="font-semibold text-white text-sm mb-2">{title}</div>
              <div className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Process ──────────────────────────────────────────────────────── */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-white mb-5">How It Works</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {PROCESS.map(({ step, title, desc, accent }) => (
            <div key={step}
              className="rounded-2xl border p-5 flex gap-4"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="text-2xl font-black shrink-0 leading-none mt-0.5 tabular-nums"
                style={{ color: accent, opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>
                {step}
              </div>
              <div>
                <div className="font-semibold text-white text-sm mb-1.5">{title}</div>
                <div className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA strip ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border p-8 text-center mb-8"
        style={{
          background: 'linear-gradient(135deg, #111b2e 0%, #0f1a18 100%)',
          borderColor: '#34d39930',
        }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <Clock size={15} style={{ color: '#34d399' }} />
          <span className="text-sm font-semibold" style={{ color: '#34d399' }}>2-week delivery. 1 revision included.</span>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Ready to get started?</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--muted-light)', maxWidth: 400, margin: '0 auto 1.5rem' }}>
          Email us and we&apos;ll send you the intake form. Most clients are live within 14 days of first contact.
        </p>
        <a
          href="mailto:hello@andertonassociates.com?subject=Website Build Inquiry"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold transition-all cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
            color: '#0b1a14',
            boxShadow: '0 4px 20px rgba(52,211,153,0.35)',
          }}>
          <Mail size={15} />
          hello@andertonassociates.com
        </a>
      </div>

      {/* ── Worker-Bee footer note ────────────────────────────────────────── */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
        <div className="w-5 h-5 shrink-0 flex items-center justify-center rounded"
          style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)', marginTop: 1 }}>
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L12.196 4V10L7 13L1.804 10V4L7 1Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            <circle cx="7" cy="7" r="1.5" fill="white"/>
          </svg>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
          <span className="font-medium" style={{ color: 'var(--muted-light)' }}>Powered by Worker-Bee.</span>{' '}
          Anderton &amp; Associates sites are managed through Worker-Bee — the same platform that monitors,
          updates, and reports on all our client sites.
        </p>
      </div>

    </div>
  )
}

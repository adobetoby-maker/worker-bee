import Link from 'next/link'

export default function HomePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: '#0b0d18' }}
    >
      {/* Logo / wordmark */}
      <div className="mb-12 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-black"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff' }}
          >
            W
          </div>
          <span className="text-lg font-bold tracking-tight text-white">Worker Bee</span>
        </div>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Build it right. Fix it fast.
        </p>
      </div>

      {/* Three pathways */}
      <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">

        {/* Plan only — forward blueprint */}
        <Link
          href="/plan"
          className="group no-underline block rounded-2xl border p-6 transition-all hover:-translate-y-0.5"
          style={{
            borderColor: 'rgba(99,102,241,0.25)',
            background: 'rgba(99,102,241,0.06)',
          }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 text-xl transition-transform group-hover:scale-105"
            style={{ background: 'rgba(99,102,241,0.15)' }}
          >
            🗂️
          </div>
          <div className="text-base font-bold text-white mb-1.5">Plan Only</div>
          <div className="text-xs leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Answer a few questions and get a full blueprint — pages, sections, content structure — ready to build.
          </div>
          <div
            className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors"
            style={{ color: '#818cf8' }}
          >
            Start planning →
          </div>
        </Link>

        {/* Plan + execute — full pipeline */}
        <Link
          href="/evaluate"
          className="group no-underline block rounded-2xl border p-6 transition-all hover:-translate-y-0.5"
          style={{
            borderColor: 'rgba(6,182,212,0.25)',
            background: 'rgba(6,182,212,0.05)',
          }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 text-xl transition-transform group-hover:scale-105"
            style={{ background: 'rgba(6,182,212,0.12)' }}
          >
            🔍
          </div>
          <div className="text-base font-bold text-white mb-1.5">Plan &amp; Execute</div>
          <div className="text-xs leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Crawl your existing site — get a reverse blueprint of what&apos;s broken, what to fix, and in what order.
          </div>
          <div
            className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors"
            style={{ color: '#22d3ee' }}
          >
            Run audit →
          </div>
        </Link>

        {/* 10x — quality gate */}
        <Link
          href="/ship-ready"
          className="group no-underline block rounded-2xl border p-6 transition-all hover:-translate-y-0.5"
          style={{
            borderColor: 'rgba(245,158,11,0.25)',
            background: 'rgba(245,158,11,0.05)',
          }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 text-xl transition-transform group-hover:scale-105"
            style={{ background: 'rgba(245,158,11,0.12)' }}
          >
            ⚡
          </div>
          <div className="text-base font-bold text-white mb-1.5">10x It</div>
          <div className="text-xs leading-relaxed mb-5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Score your site across 10 quality dimensions — code, security, SEO, performance, UX — and ship at 90+.
          </div>
          <div
            className="inline-flex items-center gap-1.5 text-xs font-bold transition-colors"
            style={{ color: '#f59e0b' }}
          >
            Run 10xit →
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 w-full max-w-2xl mb-8">
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>How it works</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Pathway explainer */}
      <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-8 mb-12">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#818cf8' }}>
            Forward blueprint
          </div>
          {[
            'Describe your business & goals',
            'Review AI-generated site structure',
            'Send blueprint to Worker Bee',
            'We build it',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 mb-2.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
              >
                {i + 1}
              </div>
              <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{step}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#22d3ee' }}>
            Reverse blueprint
          </div>
          {[
            'Enter your existing site URL',
            'AI crawls SEO, security & performance',
            'Get a prioritised fix blueprint',
            'We patch only what needs fixing',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 mb-2.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ background: 'rgba(6,182,212,0.12)', color: '#22d3ee' }}
              >
                {i + 1}
              </div>
              <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{step}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#f59e0b' }}>
            10x quality gate
          </div>
          {[
            'Enter your site URL',
            'Score 10 dimensions: code, security, SEO, perf, UX',
            'Get prioritised P1/P2/P3 fix list',
            'Auto-fix or approve each item',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 mb-2.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
              >
                {i + 1}
              </div>
              <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Agency Dashboard — visible card */}
      <Link
        href="/login"
        className="group flex items-center gap-3 rounded-2xl border px-6 py-4 transition-all hover:-translate-y-0.5"
        style={{
          borderColor: 'rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          maxWidth: '260px',
          width: '100%',
        }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
          style={{ background: 'rgba(79,70,229,0.15)', color: '#818cf8' }}
        >
          🔐
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Agency Dashboard</div>
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>For Toby</div>
        </div>
        <div className="ml-auto text-lg" style={{ color: 'rgba(255,255,255,0.2)' }}>→</div>
      </Link>
    </div>
  )
}

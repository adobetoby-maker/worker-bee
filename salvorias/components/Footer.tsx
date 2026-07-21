import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] py-20 overflow-hidden">
      {/* Watermark serial */}
      <div
        aria-hidden
        className="absolute -right-4 top-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.4em] text-bullion-300/15 -rotate-90 origin-right whitespace-nowrap"
      >
        № 0001 / Salvorias / Cohort 01 / 2026
      </div>

      <div className="container-vault">
        <div className="grid md:grid-cols-3 gap-12 md:gap-16">
          {/* Brand */}
          <div>
            <Link href="/" className="group flex items-center gap-3">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-bullion-100 via-bullion-400 to-bullion-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_0_24px_-4px_rgba(212,167,82,0.5)]" />
                <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-ink-700 to-ink-900 flex items-center justify-center">
                  <span className="font-display italic text-bullion-300 text-base leading-none">
                    S
                  </span>
                </div>
              </div>
              <span className="font-display text-cream text-xl italic">Salvorias</span>
            </Link>
            <p className="mt-6 text-cream-muted text-sm leading-relaxed max-w-xs">
              A custodial-grade web build, settled in SAV. Run by{" "}
              <span className="text-cream">CJA Web Services</span> — the team behind
              PreparednessMama, WildernessToday, and TwinsAndCounting.
            </p>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-cream-dim">
              CJA Web Services LLC &nbsp;·&nbsp; Lehi, Utah
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cream-dim">
              © 2026 — All rights reserved
            </p>
          </div>

          {/* Cohort */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-bullion-300 mb-5">
              Cohort 01
            </p>
            <ul className="space-y-3">
              {[
                ["Package", "/package"],
                ["Settlement", "/settlement"],
                ["Process", "/process"],
                ["Provenance", "/provenance"],
                ["Apply", "/apply"],
              ].map(([l, h]) => (
                <li key={l}>
                  <Link
                    href={h}
                    className="text-cream-muted text-sm hover:text-cream transition-colors"
                  >
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Other services */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-bullion-300 mb-5">
              Beyond Salvorias
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "WordPress Development",
                "Pinterest Growth",
                "SEO & Analytics",
                "Content Strategy",
                "Site Maintenance",
              ].map((s) => (
                <li key={s}>
                  <a
                    href="https://cjawebservices.com"
                    className="text-cream-muted text-sm hover:text-cream transition-colors"
                  >
                    {s}
                  </a>
                </li>
              ))}
            </ul>
            <a
              href="mailto:hello@cjawebservices.com"
              className="font-mono text-sm text-bullion-300 hover:text-bullion-100 transition-colors"
            >
              hello@cjawebservices.com
            </a>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/[0.05] flex flex-col md:flex-row md:justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream-dim">
            Salvorias &nbsp;·&nbsp; Community offer for verified SAV holders
          </p>
          <div className="flex gap-6">
            <a
              href="#"
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream-dim hover:text-cream transition-colors"
            >
              Privacy
            </a>
            <a
              href="#"
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream-dim hover:text-cream transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

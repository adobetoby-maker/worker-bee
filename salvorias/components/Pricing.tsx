"use client";

import { motion } from "framer-motion";

export default function Pricing() {
  return (
    <section id="pricing" className="relative py-28">
      {/* Atmospheric bullion glow behind the card */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
        <div className="w-[700px] h-[420px] rounded-full bg-bullion-400/[0.10] blur-[140px]" />
      </div>

      <div className="container-vault">
        <div className="text-center mb-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-bullion-300">
            §&nbsp;&nbsp;Settlement
          </p>
          <h2 className="mt-4 font-display text-cream text-[clamp(2.25rem,5vw,3.5rem)] leading-tight tracking-tight">
            One sum. <span className="italic text-cream-muted">Locked at signing.</span>
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1.0, ease: [0.2, 0.7, 0.2, 1] }}
          className="relative max-w-2xl mx-auto"
        >
          {/* Vault card */}
          <div className="relative rounded-3xl overflow-hidden glow-bullion">
            {/* Layered backgrounds */}
            <div className="absolute inset-0 bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900" />
            <div className="absolute inset-0 bg-gradient-to-tr from-bullion-900/40 via-transparent to-bullion-700/20" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22><rect width=%2260%22 height=%2260%22 fill=%22none%22/><path d=%22M0 30h60M30 0v60%22 stroke=%22%23D4A752%22 stroke-opacity=%220.04%22 stroke-width=%221%22/></svg>')] opacity-50" />

            {/* Gold border */}
            <div className="absolute inset-0 rounded-3xl border border-bullion-400/30" />

            {/* Top shimmer hairline */}
            <div className="absolute top-0 inset-x-0 h-px overflow-hidden">
              <div className="rule-bullion shimmer-pass" />
            </div>

            {/* Content */}
            <div className="relative px-8 md:px-14 py-14 text-center">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 border border-bullion-400/35 bg-bullion-900/40">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-bullion-300">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8" />
                  <path d="M12 6v2M12 16v2" />
                </svg>
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-bullion-200">
                  SAV Community Package &nbsp;·&nbsp; v.01
                </span>
              </div>

              <div className="mt-10 flex items-baseline justify-center gap-3">
                <span className="font-display text-bullion-leaf text-engraved text-[6rem] md:text-[8rem] leading-none italic">
                  1,995
                </span>
                <div className="flex flex-col items-start text-left mt-3">
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-cream">
                    USD
                  </span>
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-bullion-300">
                    in SAV
                  </span>
                </div>
              </div>

              <div className="mt-3 max-w-md mx-auto">
                <p className="text-cream-muted text-sm leading-relaxed">
                  Token amount calculated and locked at the spot rate at agreement signing.
                  No fiat accepted — settlement is in SAV only.
                </p>
              </div>

              <div className="my-9 rule-bullion" />

              <a
                href="#apply"
                className="group relative inline-flex w-full items-center justify-center gap-2 rounded-2xl px-7 py-4 text-base font-medium text-ink-900 bg-gradient-to-b from-bullion-100 via-bullion-300 to-bullion-500 border border-bullion-500/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_40px_-10px_rgba(212,167,82,0.55)] transition-all hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_12px_50px_-10px_rgba(212,167,82,0.75)] hover:scale-[1.01] active:scale-[0.99]"
              >
                Begin application
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-1">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>

              <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-cream-dim">
                Free to apply &nbsp;·&nbsp; no commitment until brief is signed
              </p>
            </div>
          </div>

          {/* Anchor numerals (ornamental, like a luxury tag) */}
          <div className="absolute -top-3 -left-3 px-3 py-1 rounded-full bg-ink-900 border border-bullion-400/30 font-mono text-[10px] uppercase tracking-[0.22em] text-bullion-300">
            № 01 / 25
          </div>
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";

const ParticleField = dynamic(() => import("./ParticleField"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-32 h-32 rounded-full bg-bullion-400/30 blur-3xl spin-soft" />
    </div>
  ),
});

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

export default function HomeHero() {
  return (
    <section className="relative pt-24 lg:pt-28 pb-16 lg:pb-24 overflow-hidden">
      {/* Particle field — full-bleed behind everything */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        aria-hidden
      >
        <div className="absolute inset-0">
          <ParticleField density="high" />
        </div>
        {/* Vignette to keep text legible */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/20 via-ink-900/10 to-ink-900" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-900/85 via-ink-900/35 to-transparent" />
      </div>

      <div className="container-vault relative">
        <div className="min-h-[88vh] flex flex-col justify-center max-w-3xl">
          {/* Block-height style status — like a chain header */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.2, 0.7, 0.2, 1] }}
            className="inline-flex items-center gap-3 self-start rounded-full border border-bullion-400/30 bg-bullion-900/30 backdrop-blur px-4 py-1.5 mb-9"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-bullion-300 opacity-75 pulse-bullion" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bullion-200" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-bullion-200">
              Cohort 01 &nbsp;·&nbsp; 25 / 25 seats open
            </span>
          </motion.div>

          {/* Editorial headline — the conceptual claim */}
          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.95, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
            className="font-display text-cream tracking-tight text-[clamp(2.75rem,6.4vw,6rem)] leading-[0.95]"
          >
            Value moves
            <br />
            <span className="italic text-bullion-gradient">in packets of light.</span>
          </motion.h1>

          {/* Conceptual lede */}
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.85, delay: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
            className="mt-8 max-w-xl text-cream-muted text-lg leading-relaxed"
          >
            At its lowest layer, every contract resolution in a distributed ledger is just
            energy — light through fiber, charge through silicon, quanta confirming a block.
            Salvorias is a private web build, settled in SAV. Twenty-five seats. When
            twenty-five packets resolve, the cohort closes.
          </motion.p>

          {/* CTAs */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.85, delay: 0.46, ease: [0.2, 0.7, 0.2, 1] }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/apply"
              className="group relative inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-medium text-ink-900 bg-gradient-to-b from-bullion-100 via-bullion-300 to-bullion-500 border border-bullion-500/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_40px_-10px_rgba(212,167,82,0.55)] transition-all hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_12px_50px_-10px_rgba(212,167,82,0.7)] hover:scale-[1.015] active:scale-[0.99]"
            >
              Reserve a seat
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/package"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-medium text-cream border border-white/[0.12] hover:border-bullion-400/40 hover:bg-white/[0.02] transition-colors"
            >
              Read the package
            </Link>
          </motion.div>

          {/* Block-header style stats — chain metaphor */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 1.0, delay: 0.62, ease: [0.2, 0.7, 0.2, 1] }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-md"
          >
            {[
              { figure: "25", label: "Seats", sub: "cohort cap" },
              { figure: "3–5", label: "Weeks", sub: "design + build" },
              { figure: "1,995", label: "USD in SAV", sub: "locked at signing" },
            ].map((s) => (
              <div key={s.label} className="border-l border-bullion-400/25 pl-4">
                <div className="font-display text-bullion-leaf text-[2.1rem] leading-none italic">
                  {s.figure}
                </div>
                <div className="mt-2 text-cream text-sm">{s.label}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream-dim mt-0.5">
                  {s.sub}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Section divider rule */}
      <div className="container-vault mt-12">
        <div className="rule-bullion" />
      </div>
    </section>
  );
}

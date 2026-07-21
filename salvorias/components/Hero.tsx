"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import Image from "next/image";

const SavCoin = dynamic(() => import("./SavCoin"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-bullion-300 to-bullion-700 opacity-40 blur-2xl spin-soft" />
    </div>
  ),
});

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

export default function Hero() {
  return (
    <section className="relative pt-24 lg:pt-28 pb-20 lg:pb-32 overflow-hidden">
      {/* Atmospheric backdrop — subtle, very low opacity */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1920&q=85"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-[0.07] mix-blend-screen"
        />
        {/* Bullion radial glow */}
        <div className="absolute top-[20%] left-[55%] -translate-x-1/2 w-[680px] h-[680px] rounded-full bg-bullion-400/[0.18] blur-[140px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[440px] h-[440px] rounded-full bg-bullion-700/30 blur-[120px]" />
        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/0 via-ink-900/40 to-ink-900" />
      </div>

      <div className="container-vault relative">
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-16 items-center min-h-[80vh]">
          {/* Left: editorial copy */}
          <div className="relative">
            {/* Badge */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.7, delay: 0.05, ease: [0.2, 0.7, 0.2, 1] }}
              className="inline-flex items-center gap-3 rounded-full border border-bullion-400/30 bg-bullion-900/30 backdrop-blur px-4 py-1.5 mb-8"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-bullion-300 opacity-75 pulse-bullion" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bullion-200" />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-bullion-200">
                Twenty-five seats &nbsp;·&nbsp; cohort 01
              </span>
            </motion.div>

            {/* Editorial headline */}
            <motion.h1
              {...fadeUp}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
              className="font-display text-cream tracking-tight text-[clamp(2.75rem,6vw,5.5rem)] leading-[0.95]"
            >
              A web presence,
              <br />
              <span className="italic text-bullion-gradient">settled in SAV.</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              {...fadeUp}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
              className="mt-7 max-w-xl text-cream-muted text-lg leading-relaxed"
            >
              CJA Web Services opens a private build cohort for verified token holders.
              <span className="text-cream"> Quoted in USD. Paid in SAV. </span>
              The token rate is locked at signing — no slippage, no surprises.
            </motion.p>

            {/* CTAs */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.8, delay: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <a
                href="#apply"
                className="group relative inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-medium text-ink-900 bg-gradient-to-b from-bullion-100 via-bullion-300 to-bullion-500 border border-bullion-500/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_40px_-10px_rgba(212,167,82,0.55)] transition-all hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_12px_50px_-10px_rgba(212,167,82,0.7)] hover:scale-[1.015] active:scale-[0.99]"
              >
                Reserve your seat
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-medium text-cream border border-white/[0.12] hover:border-bullion-400/40 hover:bg-white/[0.02] transition-colors"
              >
                Read the offering
              </a>
            </motion.div>

            {/* Stats row */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.9, delay: 0.65, ease: [0.2, 0.7, 0.2, 1] }}
              className="mt-14 grid grid-cols-3 gap-8 max-w-md"
            >
              {[
                { figure: "25", label: "Seats", sub: "cohort cap" },
                { figure: "3–5", label: "Weeks", sub: "design + build" },
                { figure: "08", label: "Pages", sub: "in scope" },
              ].map((s) => (
                <div key={s.label} className="border-l border-bullion-400/25 pl-4">
                  <div className="font-display text-bullion-leaf text-[2.4rem] leading-none italic">
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

          {/* Right: 3D bullion coin */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
            className="relative aspect-square lg:aspect-auto lg:h-[560px] w-full"
          >
            {/* Inner glow plate */}
            <div className="absolute inset-0 rounded-full bg-bullion-400/[0.06] blur-2xl" />
            <div className="absolute inset-[15%] rounded-full bg-gradient-radial from-bullion-400/30 to-transparent blur-3xl" />
            {/* The Canvas */}
            <SavCoin />
            {/* Frame numerals — ornamental */}
            <div className="absolute top-4 left-4 font-mono text-[10px] uppercase tracking-[0.22em] text-bullion-300/60">
              Specimen · 24k
            </div>
            <div className="absolute bottom-4 right-4 font-mono text-[10px] uppercase tracking-[0.22em] text-bullion-300/60 text-right">
              Salvorias /<br />Cohort 01 · 25 of 25
            </div>
          </motion.div>
        </div>
      </div>

      {/* Section divider rule */}
      <div className="container-vault mt-20">
        <div className="rule-bullion" />
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    n: "01",
    title: "Brief & assets",
    body: "You share branding, logos, copy direction, and three reference sites. We respond with timeline confirmation within 48 hours.",
    when: "Day 0–2",
  },
  {
    n: "02",
    title: "Structure draft",
    body: "We sketch the architecture: page list, navigation, key conversion paths. You approve before any pixels are drawn.",
    when: "Week 1",
  },
  {
    n: "03",
    title: "Design & build",
    body: "Custom design, content placement, performance tuning, mobile review. Two design rounds included — most projects only need one.",
    when: "Week 2–4",
  },
  {
    n: "04",
    title: "Approval & launch",
    body: "Final QA, DNS migration, redirects from old URLs. SAV transfers same-day, site goes live the next.",
    when: "Week 4–5",
  },
];

export default function HowItWorks() {
  return (
    <section id="process" className="relative py-28">
      <div className="container-vault">
        <div className="max-w-2xl mb-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-bullion-300">
            §&nbsp;&nbsp;Process
          </p>
          <h2 className="mt-4 font-display text-cream text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] tracking-tight">
            From brief
            <br />
            <span className="italic text-cream-muted">to live in five weeks.</span>
          </h2>
        </div>

        <div className="relative max-w-3xl mx-auto">
          {/* Vertical gold rail (behind the dots) */}
          <div className="absolute left-7 md:left-9 top-3 bottom-3 w-px bg-gradient-to-b from-bullion-400/0 via-bullion-400/50 to-bullion-400/0" />

          <div className="space-y-12">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.7,
                  delay: i * 0.1,
                  ease: [0.2, 0.7, 0.2, 1],
                }}
                className="relative grid grid-cols-[auto_1fr] gap-6 md:gap-9"
              >
                {/* Step badge */}
                <div className="relative z-10">
                  <div className="w-14 h-14 md:w-[72px] md:h-[72px] rounded-full bg-ink-700 border border-bullion-400/35 flex items-center justify-center shadow-[inset_0_1px_0_rgba(212,167,82,0.18),0_0_24px_-6px_rgba(212,167,82,0.4)]">
                    <span className="font-display italic text-bullion-leaf text-2xl md:text-3xl">
                      {s.n}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="pt-2 md:pt-3">
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <h3 className="font-display text-cream text-2xl md:text-3xl tracking-tight">
                      {s.title}
                    </h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-bullion-300">
                      {s.when}
                    </span>
                  </div>
                  <p className="mt-3 text-cream-muted leading-relaxed max-w-xl">
                    {s.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

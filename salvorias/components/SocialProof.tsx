"use client";

import { motion } from "framer-motion";

const SITES = [
  { name: "PreparednessMama", note: "homestead · 1.2M readers/yr" },
  { name: "WildernessToday", note: "outdoors · top-50 ranking" },
  { name: "TwinsAndCounting", note: "lifestyle · est. 2014" },
];

export default function SocialProof() {
  return (
    <section className="relative py-16">
      <div className="container-vault">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-cream-dim">
            By the team behind
          </p>
          <div className="mt-7 flex flex-col md:flex-row md:items-end md:justify-center gap-x-14 gap-y-8">
            {SITES.map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.7,
                  delay: 0.1 + i * 0.12,
                  ease: [0.2, 0.7, 0.2, 1],
                }}
                className="group flex flex-col items-center"
              >
                <span className="font-display text-cream text-[1.7rem] italic tracking-tight">
                  {s.name}
                </span>
                <span className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-cream-dim group-hover:text-bullion-300 transition-colors">
                  {s.note}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

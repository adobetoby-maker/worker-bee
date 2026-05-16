"use client";

import { motion } from "framer-motion";
import {
  PenTool,
  Gauge,
  ShieldCheck,
  Smartphone,
  FileText,
  Rocket,
  type LucideIcon,
} from "lucide-react";

type Feature = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  meta: string;
};

const FEATURES: Feature[] = [
  {
    icon: PenTool,
    eyebrow: "I",
    title: "Custom Design",
    body: "Hand-built on the Salient theme. Original typography, original color, original art direction — no template you've seen before.",
    meta: "Salient · Figma source",
  },
  {
    icon: Gauge,
    eyebrow: "II",
    title: "Performance",
    body: "WP Rocket caching, lazy media, CDN edge delivery. Lighthouse 90+ on mobile is the floor, not the ceiling.",
    meta: "WP Rocket · Cloudflare CDN",
  },
  {
    icon: ShieldCheck,
    eyebrow: "III",
    title: "SSL & Security",
    body: "Wildcard SSL, Wordfence firewall, malware scanning, daily off-site backups. Hardened from day one.",
    meta: "Wordfence · daily backup",
  },
  {
    icon: Smartphone,
    eyebrow: "IV",
    title: "Mobile First",
    body: "Designed at 375px, scaled up. Tested on Safari iOS, Chrome Android, and the long tail of in-app browsers.",
    meta: "iOS · Android · in-app",
  },
  {
    icon: FileText,
    eyebrow: "V",
    title: "Content Setup",
    body: "Eight pages drafted, formatted, image-set, and SEO-prepped. You bring direction; we bring the type.",
    meta: "8 pages · SEO basics",
  },
  {
    icon: Rocket,
    eyebrow: "VI",
    title: "Launch Ready",
    body: "DNS migration, redirects from your old URL structure, post-launch monitoring for the first 14 days.",
    meta: "DNS · 14-day watch",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-28">
      <div className="container-vault">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-bullion-300">
            §&nbsp;&nbsp;The Offering
          </p>
          <h2 className="mt-4 font-display text-cream text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] tracking-tight">
            Six deliverables.
            <br />
            <span className="italic text-cream-muted">One signed brief.</span>
          </h2>
          <p className="mt-6 max-w-lg text-cream-muted leading-relaxed">
            Each line of the package is itemized and contractual. What's listed is what
            ships — no upsells, no decoupled "phases," no scope creep priced after the fact.
          </p>
        </div>

        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.article
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.06,
                  ease: [0.2, 0.7, 0.2, 1],
                }}
                className="card-vault p-7 group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-bullion-400/20 blur-xl group-hover:bg-bullion-400/30 transition-colors" />
                    <div className="relative w-12 h-12 rounded-xl border border-bullion-400/30 bg-gradient-to-br from-bullion-900/60 to-ink-700 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-bullion-300" strokeWidth={1.4} />
                    </div>
                  </div>
                  <span className="font-display italic text-bullion-300/60 text-2xl leading-none mt-1">
                    {f.eyebrow}
                  </span>
                </div>

                <h3 className="font-display text-cream text-2xl leading-tight tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-3 text-cream-muted text-[15px] leading-relaxed">
                  {f.body}
                </p>
                <div className="mt-6 pt-4 border-t border-white/[0.06]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream-dim">
                    {f.meta}
                  </span>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

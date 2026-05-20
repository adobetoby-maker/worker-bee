import PageHero from "@/components/PageHero";
import Section from "@/components/Section";
import CtaBanner from "@/components/CtaBanner";
import {
  PenTool,
  Gauge,
  ShieldCheck,
  Smartphone,
  FileText,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Package — Salvorias",
  description:
    "Six itemized deliverables. One signed brief. No upsells. The full Salvorias build, line by line.",
};

type Deliverable = {
  num: string;
  icon: LucideIcon;
  title: string;
  lede: string;
  body: string;
  spec: { label: string; value: string }[];
};

const DELIVERABLES: Deliverable[] = [
  {
    num: "I",
    icon: PenTool,
    title: "Custom Design",
    lede:
      "Hand-built on the Salient theme, not assembled from a stock template kit.",
    body:
      "Every section is drawn, not dragged in. We commit to original typography, original color, original art direction. You get a Figma source you own — edit it, hand it off, walk away with it. No proprietary builders that hold your design hostage.",
    spec: [
      { label: "Theme", value: "Salient (custom-modified)" },
      { label: "Source", value: "Figma file (transferred at launch)" },
      { label: "Rounds", value: "Two design rounds included" },
    ],
  },
  {
    num: "II",
    icon: Gauge,
    title: "Performance",
    lede: "Lighthouse 90+ on mobile is the floor — not the ceiling.",
    body:
      "WP Rocket page caching, lazy media loading, deferred JS, edge delivery via Cloudflare CDN. We measure on real devices over throttled 4G, not on a desktop with fiber. Performance regressions get fixed before launch, not flagged in a report.",
    spec: [
      { label: "Caching", value: "WP Rocket + edge" },
      { label: "CDN", value: "Cloudflare global" },
      { label: "Target", value: "Lighthouse mobile ≥ 90" },
    ],
  },
  {
    num: "III",
    icon: ShieldCheck,
    title: "SSL & Security",
    lede: "Hardened from day one, monitored for the first fortnight.",
    body:
      "Wildcard SSL, Wordfence firewall, malware scanning, daily off-site backups to a second region. We harden file permissions, disable XML-RPC, and rotate admin credentials before handoff. Two-factor auth on the admin account is non-negotiable.",
    spec: [
      { label: "Firewall", value: "Wordfence (premium)" },
      { label: "Backups", value: "Daily, off-site, 30-day retention" },
      { label: "Auth", value: "2FA mandatory on admin" },
    ],
  },
  {
    num: "IV",
    icon: Smartphone,
    title: "Mobile First",
    lede: "Designed at 375px first, scaled up.",
    body:
      "Tested on Safari iOS, Chrome Android, the Facebook in-app browser, the Twitter in-app browser, and one device older than your nephew. Tap targets are 44px minimum. Forms are autofill-aware. Touch feedback is debounced.",
    spec: [
      { label: "Reference", value: "iPhone 13 + Pixel 7" },
      { label: "Min target", value: "44 × 44 px" },
      { label: "QA", value: "Real-device + BrowserStack" },
    ],
  },
  {
    num: "V",
    icon: FileText,
    title: "Content Setup",
    lede: "Eight pages drafted, formatted, image-set, SEO-prepped.",
    body:
      "You bring direction. We bring the type. Eight pages of content placement — body copy, images, internal linking, meta titles, meta descriptions, OpenGraph cards. If you don't have copy yet, we'll produce a first draft that holds water for review.",
    spec: [
      { label: "Pages", value: "Up to 8" },
      { label: "Imagery", value: "Sourced + sized + alt-tagged" },
      { label: "SEO", value: "Meta + OG + structured data" },
    ],
  },
  {
    num: "VI",
    icon: Rocket,
    title: "Launch Ready",
    lede: "DNS, redirects, and a fourteen-day post-launch watch.",
    body:
      "We migrate DNS the day SAV settles. Old URL structures get 301-redirected to new ones — no link rot, no SEO collapse. For the first fourteen days post-launch, we watch error logs and crash reports daily and fix anything we surface.",
    spec: [
      { label: "DNS", value: "Migrated by us" },
      { label: "Redirects", value: "301 from old URL map" },
      { label: "Watch", value: "14 days post-launch" },
    ],
  },
];

export default function PackagePage() {
  return (
    <>
      <PageHero
        num="I"
        eyebrow="The Package"
        title="Six deliverables."
        italicTail="One signed brief."
        intro="Every line of the package is itemized and contractual. What's listed below is what ships — no upsells, no decoupled phases priced after the fact. Read it once and you'll know exactly what you're paying SAV for."
      />

      {DELIVERABLES.map((d, i) => {
        const Icon = d.icon;
        return (
          <Section key={d.num} narrow>
            <div className="grid md:grid-cols-[auto_1fr] gap-8 md:gap-14 items-start">
              {/* Icon column */}
              <div className="relative">
                <div className="absolute inset-0 bg-bullion-400/15 blur-2xl" />
                <div className="relative w-16 h-16 rounded-2xl border border-bullion-400/30 bg-gradient-to-br from-bullion-900/60 to-ink-700 flex items-center justify-center">
                  <Icon className="w-7 h-7 text-bullion-300" strokeWidth={1.3} />
                </div>
                <div className="mt-5 font-display italic text-bullion-300/60 text-3xl leading-none text-center">
                  {d.num}
                </div>
              </div>

              {/* Body */}
              <div>
                <h2 className="font-display text-cream text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-tight">
                  {d.title}
                </h2>
                <p className="mt-4 text-bullion-200 text-lg italic font-display leading-snug max-w-xl">
                  {d.lede}
                </p>
                <p className="mt-5 max-w-xl text-cream-muted leading-relaxed">
                  {d.body}
                </p>

                <dl className="mt-8 grid sm:grid-cols-3 gap-x-6 gap-y-4 max-w-xl border-t border-white/[0.06] pt-6">
                  {d.spec.map((s) => (
                    <div key={s.label}>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream-dim">
                        {s.label}
                      </dt>
                      <dd className="mt-1.5 text-cream text-sm">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {i < DELIVERABLES.length - 1 && (
              <div className="mt-20 rule-bullion opacity-60" />
            )}
          </Section>
        );
      })}

      <CtaBanner
        num="II"
        eyebrow="Settlement"
        title="The package is six lines."
        italicTail="The price is one."
        note="One sum, locked at signing, settled in SAV. Read the settlement mechanics, then apply."
        cta="See settlement"
        href="/settlement"
      />
    </>
  );
}

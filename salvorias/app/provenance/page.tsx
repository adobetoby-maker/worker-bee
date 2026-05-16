import PageHero from "@/components/PageHero";
import Section from "@/components/Section";
import CtaBanner from "@/components/CtaBanner";
import Eyebrow from "@/components/Eyebrow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Provenance — Salvorias",
  description:
    "PreparednessMama, WildernessToday, TwinsAndCounting — the three live properties built and operated by the team behind Salvorias.",
};

const CASES = [
  {
    n: "01",
    name: "PreparednessMama",
    domain: "preparednessmama.com",
    sector: "Homestead · self-reliance · 2014–present",
    metrics: [
      { v: "1.2M", l: "annual readers" },
      { v: "2,400+", l: "indexed posts" },
      { v: "Top 10", l: "category traffic, US" },
    ],
    body:
      "A homestead and self-reliance publication built into a category-defining site over a decade. We rebuilt the architecture in 2022, rewrote the navigation around reader intent, and held organic traffic through three Google core updates without losing a placement.",
    note:
      "Same team, same playbook, same hand on the build. Salvorias is that craft, opened to a cohort.",
  },
  {
    n: "02",
    name: "WildernessToday",
    domain: "wildernesstoday.com",
    sector: "Outdoors · gear · destination guides",
    metrics: [
      { v: "Top 50", l: "outdoors ranking, US" },
      { v: "180+", l: "destination guides" },
      { v: "92", l: "Lighthouse mobile" },
    ],
    body:
      "An outdoors and destination publication with a heavy reliance on long-form geographic content. Performance was the gating constraint — image-heavy pages on rural mobile connections. We rebuilt the media pipeline and shipped a Lighthouse mobile score that hasn't dipped below 90 since.",
    note:
      "What we did there is the same performance discipline we apply to every Salvorias build.",
  },
  {
    n: "03",
    name: "TwinsAndCounting",
    domain: "twinsandcounting.com",
    sector: "Lifestyle · parenting · 2014–present",
    metrics: [
      { v: "12 yr", l: "live and operating" },
      { v: "3", l: "major rebuilds" },
      { v: "0", l: "lost-traffic events" },
    ],
    body:
      "Twelve years live, three full rebuilds, zero major traffic-loss events. The site survived every Google update from 2014 onward because we never let it drift from its editorial center. The lesson informs every architectural decision we make.",
    note:
      "Salvorias is built by people who've held a property online for a decade — not consultants who've never had to.",
  },
];

export default function ProvenancePage() {
  return (
    <>
      <PageHero
        num="IV"
        eyebrow="Provenance"
        title="Three properties."
        italicTail="Twelve years on the chain."
        intro="The case for hiring CJA Web Services isn't a deck. It's three sites we still operate today — built by the same hands that will build yours. Below is what they look like, what they've earned, and what the work taught us."
      />

      {CASES.map((c, i) => (
        <Section key={c.n} narrow>
          <div className="relative">
            {/* Header row */}
            <div className="flex items-baseline justify-between gap-6 mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-bullion-300">
                Case &nbsp;§&nbsp;{c.n}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream-dim">
                {c.sector}
              </p>
            </div>

            <h2 className="font-display text-cream text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-tight italic">
              {c.name}
            </h2>
            <p className="mt-3 font-mono text-sm text-bullion-300">{c.domain}</p>

            {/* Metrics row */}
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-2xl">
              {c.metrics.map((m) => (
                <div
                  key={m.l}
                  className="border-l border-bullion-400/25 pl-4"
                >
                  <div className="font-display text-bullion-leaf text-[2.2rem] leading-none italic">
                    {m.v}
                  </div>
                  <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cream-dim">
                    {m.l}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-10 max-w-2xl text-cream-muted text-lg leading-relaxed">
              {c.body}
            </p>

            <div className="mt-8 max-w-2xl pl-5 border-l-2 border-bullion-400/35">
              <p className="font-display italic text-bullion-200 text-xl leading-relaxed">
                {c.note}
              </p>
            </div>
          </div>

          {i < CASES.length - 1 && (
            <div className="mt-20 rule-bullion opacity-60" />
          )}
        </Section>
      ))}

      {/* Team note */}
      <Section narrow>
        <Eyebrow num="A">The Team</Eyebrow>
        <h2 className="mt-4 font-display text-cream text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-tight">
          A small bench,
          <br />
          <span className="italic text-cream-muted">deep in the same craft.</span>
        </h2>
        <p className="mt-7 max-w-2xl text-cream-muted text-lg leading-relaxed">
          CJA Web Services is operated out of Lehi, Utah. Salvorias is staffed by the same
          designer, developer, and operator who run the three sites above. Twenty-five seats is
          the cap because that's what one team can ship without compromising the work.
        </p>
      </Section>

      <CtaBanner
        num="V"
        eyebrow="The Application"
        title="Twenty-five packets."
        italicTail="One application stands between."
        note="Free to apply. We respond within forty-eight hours, signed by a member of the build team."
      />
    </>
  );
}

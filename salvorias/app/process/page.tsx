import PageHero from "@/components/PageHero";
import Section from "@/components/Section";
import CtaBanner from "@/components/CtaBanner";
import Eyebrow from "@/components/Eyebrow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Process — Salvorias",
  description:
    "Five weeks. Four milestones. Approval gates between each. The full Salvorias build process, end to end.",
};

const STEPS = [
  {
    n: "01",
    when: "Day 0–2",
    title: "Brief & assets",
    body: "You share branding, logos, copy direction, and three reference sites you'd like the design to feel adjacent to. We respond with timeline confirmation, the first design questions, and the build calendar.",
    yours: ["Brand assets", "3 reference URLs", "Page count + intent"],
    ours: ["Timeline confirmation", "Build calendar locked", "Initial questions"],
  },
  {
    n: "02",
    when: "Week 1",
    title: "Structure draft",
    body: "We sketch the architecture: page list, navigation, key conversion paths. No pixels yet — just structure. You approve the IA before any design work begins. This catches misalignment cheaply, before a single mockup lands.",
    yours: ["Approval on IA", "Sign-off on page count"],
    ours: ["Sitemap draft", "Navigation model", "Conversion path map"],
  },
  {
    n: "03",
    when: "Week 2–4",
    title: "Design & build",
    body: "Custom design, content placement, performance tuning, mobile review. Two design rounds included — most projects only need one. You see weekly progress in a staging environment with a real URL, real images, and real interaction.",
    yours: ["Round 1 feedback", "Round 2 feedback (if needed)", "Final asset deliveries"],
    ours: ["Visual design", "Build + content", "Performance tuning", "Staging URL access"],
  },
  {
    n: "04",
    when: "Week 4–5",
    title: "Approval & launch",
    body: "Final QA, DNS migration, redirects from your old URL structure. SAV transfers same-day on approval, and the site goes live the next morning. Then a fourteen-day post-launch watch starts.",
    yours: ["Final approval", "SAV transfer (on approval)"],
    ours: ["Final QA pass", "DNS migration", "301 redirects", "Live monitoring (14 days)"],
  },
];

export default function ProcessPage() {
  return (
    <>
      <PageHero
        num="III"
        eyebrow="Process"
        title="Five weeks."
        italicTail="Four approval gates."
        intro="The Salvorias build is structured around four milestones. Each one ends with your written approval before the next begins — so nothing surprises you, and nothing gets built on top of a misunderstanding."
      />

      {/* Visual timeline */}
      <Section narrow>
        <div className="relative max-w-3xl mx-auto">
          {/* Vertical gold rail */}
          <div className="absolute left-7 md:left-9 top-3 bottom-3 w-px bg-gradient-to-b from-bullion-400/0 via-bullion-400/50 to-bullion-400/0" />

          <div className="space-y-16">
            {STEPS.map((s) => (
              <div key={s.n} className="relative grid grid-cols-[auto_1fr] gap-6 md:gap-9">
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

                  {/* Yours / Ours columns */}
                  <div className="mt-7 grid sm:grid-cols-2 gap-5 max-w-xl">
                    <div className="card-vault p-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream-dim mb-3">
                        Yours
                      </p>
                      <ul className="space-y-2">
                        {s.yours.map((y) => (
                          <li key={y} className="flex items-start gap-2 text-cream text-sm">
                            <span className="text-bullion-300 mt-0.5">·</span>
                            <span>{y}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="card-vault p-5">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream-dim mb-3">
                        Ours
                      </p>
                      <ul className="space-y-2">
                        {s.ours.map((o) => (
                          <li key={o} className="flex items-start gap-2 text-cream text-sm">
                            <span className="text-bullion-300 mt-0.5">·</span>
                            <span>{o}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Communication cadence */}
      <Section narrow>
        <Eyebrow num="A">Cadence</Eyebrow>
        <h2 className="mt-4 font-display text-cream text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-tight">
          One channel.
          <br />
          <span className="italic text-cream-muted">Weekly written update.</span>
        </h2>
        <div className="mt-10 grid md:grid-cols-2 gap-5 max-w-3xl">
          <div className="card-vault p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bullion-300 mb-3">
              Async
            </p>
            <p className="text-cream-muted leading-relaxed">
              All communication runs through one shared inbox or your preferred messenger — your
              choice. Decisions get written down and confirmed back. No status meetings. No
              standups you didn't ask for.
            </p>
          </div>
          <div className="card-vault p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-bullion-300 mb-3">
              Weekly
            </p>
            <p className="text-cream-muted leading-relaxed">
              Every Friday during the build, you receive one written update: what shipped this
              week, what's next, what's blocked, what we need from you. Three minutes to read,
              calibrated to inform — not perform.
            </p>
          </div>
        </div>
      </Section>

      <CtaBanner
        num="IV"
        eyebrow="Provenance"
        title="The process is documented."
        italicTail="The track record is too."
        cta="Read provenance"
        href="/provenance"
      />
    </>
  );
}

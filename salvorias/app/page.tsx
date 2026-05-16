import HomeHero from "@/components/HomeHero";
import SocialProof from "@/components/SocialProof";
import CtaBanner from "@/components/CtaBanner";
import Section from "@/components/Section";
import Eyebrow from "@/components/Eyebrow";
import Link from "next/link";

const PREVIEWS = [
  {
    num: "I",
    eyebrow: "Package",
    href: "/package",
    title: "Six deliverables.",
    italicTail: "One signed brief.",
    body: "Custom design on Salient, performance tuned with WP Rocket and CDN, hardened security, mobile-first, eight-page content setup, DNS migration and a fourteen-day post-launch watch.",
    meta: "Six itemized lines · zero scope creep",
  },
  {
    num: "II",
    eyebrow: "Settlement",
    href: "/settlement",
    title: "1,995 USD,",
    italicTail: "settled in SAV.",
    body: "Token amount calculated at the spot rate at signing — and locked there. No fiat accepted, no slippage downstream. The transaction confirms when the on-chain transfer does.",
    meta: "Locked-rate settlement · SAV only",
  },
  {
    num: "III",
    eyebrow: "Process",
    href: "/process",
    title: "Five weeks,",
    italicTail: "four milestones.",
    body: "Brief and assets within forty-eight hours. Structure draft in week one. Design and build through weeks two through four. Approval, DNS migration, and on-chain settlement in week five.",
    meta: "Four gates · client approves each",
  },
  {
    num: "IV",
    eyebrow: "Provenance",
    href: "/provenance",
    title: "PreparednessMama,",
    italicTail: "and the rest.",
    body: "The team behind PreparednessMama (1.2M readers/yr), WildernessToday (top-50 outdoors), and TwinsAndCounting (a decade live). The proof is the catalog, not the claim.",
    meta: "Three live properties · combined twelve years",
  },
];

export default function Home() {
  return (
    <>
      <HomeHero />
      <SocialProof />

      {/* Overview grid — section previews linking to deeper pages */}
      <Section>
        <div className="max-w-2xl">
          <Eyebrow num="00">The Cohort, in four passes</Eyebrow>
          <h2 className="mt-4 font-display text-cream text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] tracking-tight">
            Four chapters.
            <br />
            <span className="italic text-cream-muted">Read in order, or jump.</span>
          </h2>
          <p className="mt-6 max-w-lg text-cream-muted leading-relaxed">
            The full offering lives across four pages — the package, the settlement, the
            process, and the provenance. Each is short. None hide their numbers.
          </p>
        </div>

        <div className="mt-16 grid md:grid-cols-2 gap-5">
          {PREVIEWS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="card-vault p-8 md:p-10 group block"
            >
              <div className="flex items-baseline justify-between mb-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-bullion-300">
                  § {p.num}&nbsp;&nbsp;·&nbsp;&nbsp;{p.eyebrow}
                </p>
                <svg
                  className="w-4 h-4 text-bullion-300/60 group-hover:text-bullion-200 group-hover:translate-x-0.5 transition-all"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </div>

              <h3 className="font-display text-cream text-3xl md:text-4xl leading-[1.05] tracking-tight">
                {p.title}
                <br />
                <span className="italic text-cream-muted">{p.italicTail}</span>
              </h3>
              <p className="mt-5 text-cream-muted leading-relaxed text-[15px]">
                {p.body}
              </p>
              <div className="mt-7 pt-5 border-t border-white/[0.06]">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cream-dim">
                  {p.meta}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <CtaBanner
        num="V"
        eyebrow="The Application"
        title="Twenty-five seats."
        italicTail="Then the ledger closes."
        note="Free to apply. We review every submission by hand and respond, signed, within forty-eight hours."
      />
    </>
  );
}

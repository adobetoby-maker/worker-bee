import PageHero from "@/components/PageHero";
import Section from "@/components/Section";
import CtaBanner from "@/components/CtaBanner";
import Eyebrow from "@/components/Eyebrow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settlement — Salvorias",
  description:
    "1,995 USD, settled in SAV at the rate locked at signing. The full mechanics of how a Salvorias seat is paid for.",
};

const FAQ = [
  {
    q: "What if SAV moves between application and signing?",
    a: "The token amount is calculated and locked at the spot rate at the moment the brief is signed — not at application, not at completion. Movement before signing affects the calculation; movement after does not.",
  },
  {
    q: "Can I pay in fiat or another stablecoin?",
    a: "No. Salvorias is a SAV-only settlement program. If you need to acquire SAV, do it before signing — once the brief is signed the token amount is fixed and the wallet address you submitted is the address we expect to see.",
  },
  {
    q: "What's the spot rate source?",
    a: "Aggregated mid-market from the three deepest SAV liquidity pools at the moment of signing, snapped on-chain in the signed agreement. The rate and the timestamp are written into the contract.",
  },
  {
    q: "When does the SAV transfer happen?",
    a: "On approval — week five, after final QA and just before DNS migration. The transfer must confirm before the new DNS records propagate. The site goes live the next morning.",
  },
  {
    q: "What if I back out before signing?",
    a: "No cost. Application is free; the cost only attaches at signing. If we don't fit, you walk and we wish you well.",
  },
  {
    q: "What if you back out after signing?",
    a: "Full refund of the SAV transferred, returned to the originating wallet within twenty-four hours. We can count on one hand the number of times this has happened — but it's in the brief.",
  },
];

const STEPS = [
  {
    n: "01",
    label: "Lock",
    body: "Spot rate snapped at signing. Token amount fixed in the contract. Timestamp recorded.",
  },
  {
    n: "02",
    label: "Hold",
    body: "You hold the SAV. We hold our side of the build. No transfer happens during design or development.",
  },
  {
    n: "03",
    label: "Settle",
    body: "Week five, on approval: SAV moves from your wallet to ours. The chain confirms. We migrate DNS the next morning.",
  },
];

export default function SettlementPage() {
  return (
    <>
      <PageHero
        num="II"
        eyebrow="Settlement"
        title="One sum,"
        italicTail="locked at signing."
        intro="Salvorias is settled in SAV. The amount is calculated in USD and converted at the spot rate at the moment the brief is signed — and held there. No drift, no slippage, no surprise invoice if SAV doubles or halves while we're building."
      />

      {/* The price card */}
      <Section narrow>
        <div className="relative max-w-2xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden glow-bullion">
            <div className="absolute inset-0 bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900" />
            <div className="absolute inset-0 bg-gradient-to-tr from-bullion-900/40 via-transparent to-bullion-700/20" />
            <div className="absolute inset-0 rounded-3xl border border-bullion-400/30" />
            <div className="absolute top-0 inset-x-0 h-px overflow-hidden">
              <div className="rule-bullion shimmer-pass" />
            </div>

            <div className="relative px-8 md:px-14 py-14 text-center">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 border border-bullion-400/35 bg-bullion-900/40">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-bullion-200">
                  SAV Community Package &nbsp;·&nbsp; v.01
                </span>
              </div>

              <div className="mt-10 flex items-baseline justify-center gap-3">
                <span className="font-display text-bullion-leaf text-engraved text-[6rem] md:text-[8rem] leading-none italic">
                  1,995
                </span>
                <div className="flex flex-col items-start text-left mt-3">
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-cream">USD</span>
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-bullion-300">in SAV</span>
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
                href="/apply"
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

          <div className="absolute -top-3 -left-3 px-3 py-1 rounded-full bg-ink-900 border border-bullion-400/30 font-mono text-[10px] uppercase tracking-[0.22em] text-bullion-300">
            № 01 / 25
          </div>
        </div>
      </Section>

      {/* The three-step settlement mechanic */}
      <Section narrow>
        <Eyebrow num="A">The mechanic</Eyebrow>
        <h2 className="mt-4 font-display text-cream text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-tight">
          Three states. <span className="italic text-cream-muted">In order.</span>
        </h2>

        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {STEPS.map((s) => (
            <div key={s.n} className="card-vault p-7">
              <div className="flex items-baseline justify-between mb-5">
                <span className="font-display italic text-bullion-leaf text-3xl leading-none">
                  {s.n}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-bullion-300">
                  {s.label}
                </span>
              </div>
              <p className="text-cream leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section narrow>
        <Eyebrow num="B">Questions</Eyebrow>
        <h2 className="mt-4 font-display text-cream text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] tracking-tight">
          Six common ones,
          <br />
          <span className="italic text-cream-muted">with the short answers.</span>
        </h2>

        <div className="mt-12 divide-y divide-white/[0.06] border-y border-white/[0.06]">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-6 cursor-pointer">
              <summary className="list-none flex items-start justify-between gap-6 marker:hidden">
                <span className="font-display text-cream text-xl md:text-2xl leading-snug tracking-tight">
                  {item.q}
                </span>
                <span className="shrink-0 mt-1 w-7 h-7 rounded-full border border-bullion-400/30 flex items-center justify-center text-bullion-300 transition-transform group-open:rotate-45">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="mt-4 max-w-2xl text-cream-muted leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </Section>

      <CtaBanner
        num="III"
        eyebrow="Process"
        title="Settlement is one moment."
        italicTail="The build is five weeks."
        cta="See process"
        href="/process"
      />
    </>
  );
}

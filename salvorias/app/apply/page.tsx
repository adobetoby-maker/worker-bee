import PageHero from "@/components/PageHero";
import Section from "@/components/Section";
import Eyebrow from "@/components/Eyebrow";
import ApplicationForm from "@/components/ApplicationForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply — Salvorias",
  description:
    "Free to apply. We review every submission by hand and respond, signed, within forty-eight hours.",
};

const LOOKING_FOR = [
  {
    n: "I",
    title: "A clear intent",
    body: "You don't need a brand book or a deck. You do need to know what success looks like — in one sentence. The application asks for it.",
  },
  {
    n: "II",
    title: "A live SAV wallet",
    body: "We need the wallet address you intend to settle from. We'll verify on-chain that it can hold and transmit SAV before signing.",
  },
  {
    n: "III",
    title: "Reasonable scope",
    body: "Eight pages, one site. If your project needs ten, we'll either trim or recommend you look elsewhere — better to say so up front.",
  },
];

const NEXT = [
  {
    n: "01",
    when: "Within 48 hours",
    title: "Hand review + response",
    body: "A member of the build team reads your application, considers fit, and writes back personally. The response is signed and cites your application by name.",
  },
  {
    n: "02",
    when: "Days 3–7",
    title: "Brief call (if it's a fit)",
    body: "Twenty minutes by video. We confirm scope, timeline, and the SAV wallet address. No pitch deck, no upsell — just enough to write a brief.",
  },
  {
    n: "03",
    when: "Day 7–10",
    title: "Brief signed, rate locked",
    body: "We send the brief. You sign it. The SAV spot rate snaps at signing and the token amount is fixed. Build starts the next Monday.",
  },
];

export default function ApplyPage() {
  return (
    <>
      <PageHero
        num="V"
        eyebrow="The Application"
        title="Reserve a seat."
        italicTail="Free to apply."
        intro="The application is short, hand-reviewed, and answered personally. We respond to every submission within forty-eight hours — signed by a member of the build team, with a written verdict on fit."
      />

      {/* What we look for */}
      <Section narrow>
        <Eyebrow num="A">What we look for</Eyebrow>
        <h2 className="mt-4 font-display text-cream text-[clamp(2rem,4.5vw,3rem)] leading-[1.05] tracking-tight">
          Three signals.
          <br />
          <span className="italic text-cream-muted">In any order.</span>
        </h2>
        <div className="mt-10 grid md:grid-cols-3 gap-5">
          {LOOKING_FOR.map((l) => (
            <div key={l.n} className="card-vault p-7">
              <span className="font-display italic text-bullion-leaf text-3xl leading-none">
                {l.n}
              </span>
              <h3 className="mt-4 font-display text-cream text-2xl tracking-tight">
                {l.title}
              </h3>
              <p className="mt-3 text-cream-muted leading-relaxed text-[15px]">
                {l.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* The form itself */}
      <ApplicationForm />

      {/* What happens next */}
      <Section narrow>
        <Eyebrow num="B">What happens next</Eyebrow>
        <h2 className="mt-4 font-display text-cream text-[clamp(2rem,4.5vw,3rem)] leading-[1.05] tracking-tight">
          Three states,
          <br />
          <span className="italic text-cream-muted">over ten days.</span>
        </h2>
        <div className="mt-12 space-y-10 max-w-3xl">
          {NEXT.map((n) => (
            <div key={n.n} className="grid grid-cols-[auto_1fr] gap-6 md:gap-8">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-ink-700 border border-bullion-400/35 flex items-center justify-center shadow-[inset_0_1px_0_rgba(212,167,82,0.18),0_0_24px_-6px_rgba(212,167,82,0.4)]">
                <span className="font-display italic text-bullion-leaf text-2xl">{n.n}</span>
              </div>
              <div className="pt-2">
                <div className="flex items-baseline gap-4 flex-wrap">
                  <h3 className="font-display text-cream text-2xl tracking-tight">
                    {n.title}
                  </h3>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-bullion-300">
                    {n.when}
                  </span>
                </div>
                <p className="mt-3 text-cream-muted leading-relaxed max-w-xl">
                  {n.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

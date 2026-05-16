import Link from "next/link";

export default function CtaBanner({
  eyebrow = "Reserve a seat",
  num = "∞",
  title = "Twenty-five packets.",
  italicTail = "Then the ledger closes.",
  note,
  cta = "Begin application",
  href = "/apply",
}: {
  eyebrow?: string;
  num?: string;
  title?: string;
  italicTail?: string;
  note?: string;
  cta?: string;
  href?: string;
}) {
  return (
    <section className="relative py-28 border-t border-white/[0.05]">
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] rounded-full bg-bullion-400/[0.08] blur-[140px]" />
      </div>
      <div className="container-vault max-w-3xl text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-bullion-300">
          §&nbsp;{num}&nbsp;&nbsp;·&nbsp;&nbsp;{eyebrow}
        </p>
        <h2 className="mt-4 font-display text-cream text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-tight">
          {title}
          {italicTail && (
            <>
              <br />
              <span className="italic text-bullion-gradient">{italicTail}</span>
            </>
          )}
        </h2>
        {note && (
          <p className="mt-6 text-cream-muted leading-relaxed max-w-xl mx-auto">{note}</p>
        )}
        <Link
          href={href}
          className="group mt-10 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-medium text-ink-900 bg-gradient-to-b from-bullion-100 via-bullion-300 to-bullion-500 border border-bullion-500/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_40px_-10px_rgba(212,167,82,0.55)] transition-all hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_12px_50px_-10px_rgba(212,167,82,0.7)] hover:scale-[1.015] active:scale-[0.99]"
        >
          {cta}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-hover:translate-x-0.5"
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </section>
  );
}

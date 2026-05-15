const steps = [
  {
    number: "01",
    title: "Share your branding assets",
    description:
      "Logo, color palette, any brand guide you have — or we can help build one from scratch.",
  },
  {
    number: "02",
    title: "We draft the structure",
    description:
      "Full wireframe and page layout for your review before any design work begins. Zero surprises.",
  },
  {
    number: "03",
    title: "Design & build",
    description:
      "3–5 weeks to a fully built, staged, ready-to-review site. You see everything before it goes live.",
  },
  {
    number: "04",
    title: "You approve, we launch",
    description:
      "SAV transfer happens at launch. Your site goes live the same day you give the green light.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-4 sm:px-6 border-t border-white/5">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">HOW IT WORKS</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            From Application to Live Site
          </h2>
          <p className="text-gray-500 text-lg">
            Simple process, no surprises. You approve every step before we proceed.
          </p>
        </div>

        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={step.number} className="relative flex gap-8 pb-12 last:pb-0">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute left-6 top-14 bottom-0 w-px bg-gradient-to-b from-amber-500/30 via-amber-500/10 to-transparent" />
              )}

              {/* Step circle */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <span className="text-amber-400 font-mono font-bold text-sm">{step.number}</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pt-2.5">
                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

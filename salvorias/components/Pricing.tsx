export default function Pricing() {
  return (
    <section className="py-16 px-4 sm:px-6">
      <div className="max-w-xl mx-auto">
        <div className="relative bg-gradient-to-b from-[#111827] to-[#0d1220] border border-amber-500/25 rounded-3xl p-8 sm:p-12 text-center glow-gold">
          {/* Top shimmer line */}
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

          <div className="inline-flex items-center bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            SAV Community Website Package
          </div>

          <h2 className="text-xl font-semibold text-white mb-1">
            A polished, secure, fully custom WordPress site
          </h2>
          <p className="text-gray-600 text-sm mb-8">delivered in 3–5 weeks</p>

          <div className="flex items-end justify-center gap-3 mb-3">
            <span className="text-7xl sm:text-8xl font-black text-white leading-none">1,995</span>
            <div className="text-left pb-2">
              <div className="text-amber-400 font-bold text-xl">USD</div>
              <div className="text-gray-500 text-sm">in SAV</div>
            </div>
          </div>

          <p className="text-gray-600 text-xs mb-8 max-w-xs mx-auto leading-relaxed">
            SAV token amount locked at current rate when your spot is confirmed. No USD payment
            accepted for this offer.
          </p>

          <a
            href="#apply"
            className="block w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl text-lg transition-all hover:scale-[1.02] mb-4"
          >
            Apply for a Spot →
          </a>

          <p className="text-gray-600 text-xs">
            Free to apply · No commitment until you love the draft
          </p>
        </div>
      </div>
    </section>
  );
}

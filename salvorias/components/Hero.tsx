export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-amber-500/[0.06] rounded-full blur-[120px]" />
        <div className="absolute top-2/3 left-1/4 w-80 h-80 bg-violet-600/[0.06] rounded-full blur-[80px]" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-amber-400/[0.04] rounded-full blur-[60px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-sm font-medium px-4 py-2 rounded-full mb-10">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          ⚡ Only 25 Spots Available
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-[1.05] tracking-tight">
          Your Web Presence,
          <br className="hidden sm:block" />
          <span className="text-gradient-gold"> Paid in SAV.</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          CJA Web Services is opening{" "}
          <span className="text-white font-semibold">25 spots</span> for SAV token holders. Get a
          fully built, custom WordPress site —{" "}
          <span className="text-white font-semibold">no USD required.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <a
            href="#apply"
            className="group bg-amber-500 hover:bg-amber-400 text-black font-bold px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 glow-gold inline-flex items-center justify-center gap-2"
          >
            Apply for a Spot
            <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
          </a>
          <a
            href="#features"
            className="border border-white/10 hover:border-white/20 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:bg-white/5 inline-flex items-center justify-center"
          >
            See What&apos;s Included
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 sm:gap-10 max-w-sm mx-auto">
          {[
            { value: "25", label: "Spots Total" },
            { value: "3–5 wk", label: "Delivery" },
            { value: "8", label: "Pages Built" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl sm:text-3xl font-black text-amber-400 mb-1">{stat.value}</div>
              <div className="text-gray-600 text-xs sm:text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

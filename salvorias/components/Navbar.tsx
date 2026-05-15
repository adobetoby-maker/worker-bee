export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080d1a]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <span className="text-black font-black text-xs">CJA</span>
          </div>
          <span className="text-white font-semibold text-sm">CJA Web Services</span>
          <div className="hidden sm:flex items-center gap-1.5 ml-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
            25 spots left
          </div>
        </div>
        <a
          href="#apply"
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-all hover:scale-105 glow-gold-sm"
        >
          Apply Now →
        </a>
      </div>
    </nav>
  );
}

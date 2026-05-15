const sites = ["PreparednessMama", "WildernessToday", "TwinsAndCounting"];

export default function SocialProof() {
  return (
    <section className="py-10 border-y border-white/5 bg-white/[0.02]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
          <span className="text-gray-600 text-sm whitespace-nowrap">By the team behind</span>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {sites.map((site) => (
              <span
                key={site}
                className="text-gray-400 font-semibold text-sm hover:text-gray-200 transition-colors cursor-default tracking-wide"
              >
                {site}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

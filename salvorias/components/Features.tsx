const features = [
  {
    icon: "🎨",
    title: "Custom Design",
    description:
      "Salient theme built to match your brand and vision — your colors, your style, your story.",
  },
  {
    icon: "⚡",
    title: "Performance Optimized",
    description:
      "WP Rocket caching + CDN configured from day one so your site loads fast everywhere.",
  },
  {
    icon: "🔒",
    title: "SSL + Security",
    description:
      "Full SSL, firewall rules, and malware scanning included — set up and monitored for you.",
  },
  {
    icon: "📱",
    title: "Mobile First",
    description:
      "Responsive on every device, tested across browsers. Your visitors always get the best view.",
  },
  {
    icon: "✍️",
    title: "Content Setup",
    description:
      "Up to 8 pages built and populated from your content. We handle the copy placement.",
  },
  {
    icon: "🚀",
    title: "Launch Ready",
    description:
      "DNS, hosting migration, and go-live support included. From approval to live in one day.",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">THE OFFER</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Everything You Need to Launch
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            A complete, professional web presence built by a team that&apos;s done it hundreds of times.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="card-hover bg-white/[0.03] border border-white/10 rounded-2xl p-6 group"
            >
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-2xl mb-5">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-amber-400 transition-colors">
                {f.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

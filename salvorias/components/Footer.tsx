const services = [
  "WordPress Development",
  "Pinterest Growth",
  "SEO & Analytics",
  "Content Strategy",
  "Site Maintenance",
  "Salvorias (SAV)",
];

const company = ["How It Works", "Why CJA", "Payment Options", "Start a Project", "Contact"];

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <span className="text-black font-black text-xs">CJA</span>
              </div>
              <span className="text-white font-semibold">CJA Web Services</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              Custom WordPress builds, Pinterest growth, and SEO — for creators who publish at scale.
            </p>
            <p className="text-gray-700 text-xs">© 2026 CJA Web Services LLC · Lehi, Utah</p>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">Services</h4>
            <ul className="space-y-3">
              {services.map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-5">Company</h4>
            <ul className="space-y-3 mb-6">
              {company.map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
            <a
              href="mailto:info@cjawebservices.com"
              className="text-amber-400/60 hover:text-amber-400 text-sm transition-colors"
            >
              info@cjawebservices.com
            </a>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-700 text-sm">Salvorias is a CJA Web Services community offer.</p>
          <div className="flex gap-6">
            <a href="#" className="text-gray-700 hover:text-gray-500 text-sm transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-700 hover:text-gray-500 text-sm transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

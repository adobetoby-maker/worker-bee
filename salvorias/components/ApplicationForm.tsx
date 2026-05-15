"use client";

import { useState } from "react";

const SITE_TYPES = [
  "Blog / Content Site",
  "Business / Services",
  "E-commerce",
  "Portfolio / Personal Brand",
  "Community / Forum",
  "Other",
];

export default function ApplicationForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // Wire up real submission (Formspree, Supabase, email API) here
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <section id="apply" className="py-24 px-4 sm:px-6 border-t border-white/5 bg-white/[0.015]">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">APPLY NOW</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Let&apos;s Build Something Great
          </h2>
          <p className="text-gray-500 text-lg">
            Free to apply. No commitment until you love the draft.
          </p>
        </div>

        {submitted ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-12 text-center glow-gold">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-white mb-3">Application Received!</h3>
            <p className="text-gray-400 mb-2">
              We&apos;ll review your application and reach out within 48 hours.
            </p>
            <p className="text-gray-500 text-sm">
              Questions?{" "}
              <a
                href="mailto:jay@cjawebservices.com"
                className="text-amber-400 hover:text-amber-300 transition-colors"
              >
                jay@cjawebservices.com
              </a>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Your Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Jane Smith"
                className="w-full bg-white/[0.04] border border-white/10 focus:border-amber-500/60 text-white rounded-xl px-4 py-3.5 outline-none transition-all placeholder-gray-600 hover:border-white/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Business / Project
              </label>
              <input
                type="text"
                placeholder="My Awesome Project"
                className="w-full bg-white/[0.04] border border-white/10 focus:border-amber-500/60 text-white rounded-xl px-4 py-3.5 outline-none transition-all placeholder-gray-600 hover:border-white/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                SAV Wallet Address <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="0x..."
                className="w-full bg-white/[0.04] border border-white/10 focus:border-amber-500/60 text-white rounded-xl px-4 py-3.5 outline-none transition-all placeholder-gray-600 hover:border-white/20 font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Telegram Handle
                </label>
                <input
                  type="text"
                  placeholder="@username"
                  className="w-full bg-white/[0.04] border border-white/10 focus:border-amber-500/60 text-white rounded-xl px-4 py-3.5 outline-none transition-all placeholder-gray-600 hover:border-white/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Discord Handle
                </label>
                <input
                  type="text"
                  placeholder="username#1234"
                  className="w-full bg-white/[0.04] border border-white/10 focus:border-amber-500/60 text-white rounded-xl px-4 py-3.5 outline-none transition-all placeholder-gray-600 hover:border-white/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Type of Site <span className="text-amber-400">*</span>
              </label>
              <select
                required
                defaultValue=""
                className="w-full bg-[#0d1525] border border-white/10 focus:border-amber-500/60 text-white rounded-xl px-4 py-3.5 outline-none transition-all hover:border-white/20 cursor-pointer"
              >
                <option value="" disabled>
                  Select site type...
                </option>
                {SITE_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-[#0d1525]">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                3 Sites You Love (Design Inspiration)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. stripe.com, linear.app, vercel.com"
                className="w-full bg-white/[0.04] border border-white/10 focus:border-amber-500/60 text-white rounded-xl px-4 py-3.5 outline-none transition-all placeholder-gray-600 hover:border-white/20 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                What&apos;s the #1 Goal for Your Site?
              </label>
              <textarea
                rows={4}
                placeholder="Tell us what success looks like — more leads, sales, community, subscribers..."
                className="w-full bg-white/[0.04] border border-white/10 focus:border-amber-500/60 text-white rounded-xl px-4 py-3.5 outline-none transition-all placeholder-gray-600 hover:border-white/20 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold px-8 py-4 rounded-xl text-lg transition-all hover:scale-[1.02] glow-gold disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                "Submit My Application →"
              )}
            </button>

            <p className="text-center text-gray-600 text-sm">
              Salvorias is a CJA Web Services community offer.{" "}
              <a
                href="mailto:jay@cjawebservices.com"
                className="text-amber-400/70 hover:text-amber-400 transition-colors"
              >
                jay@cjawebservices.com
              </a>
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

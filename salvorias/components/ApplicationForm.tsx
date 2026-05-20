"use client";

import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";

const SITE_TYPES = [
  "Editorial / Magazine",
  "E-commerce / Shop",
  "Brand / Portfolio",
  "Service business",
  "Community / Membership",
  "Other (describe in goal)",
];

export default function ApplicationForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('submission failed');
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please email us directly.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      id="apply"
      className="relative py-28 border-t border-white/[0.05] bg-gradient-to-b from-ink-900 via-[#08090F] to-ink-900"
    >
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 inset-x-0 mx-auto w-[600px] h-px bg-gradient-to-r from-transparent via-bullion-400/40 to-transparent" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-bullion-400/[0.06] blur-[140px]" />
      </div>

      <div className="container-vault">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-bullion-300">
            §&nbsp;&nbsp;Application
          </p>
          <h2 className="mt-4 font-display text-cream text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] tracking-tight">
            Reserve your <span className="italic text-bullion-gradient">seat.</span>
          </h2>
          <p className="mt-5 text-cream-muted leading-relaxed">
            We review every application by hand. Expect a response within 48 hours, written
            and signed by a member of the build team.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8 }}
          className="relative max-w-3xl mx-auto"
        >
          <div className="relative rounded-3xl bg-gradient-to-b from-ink-700/80 to-ink-800/80 border border-white/[0.07] p-8 md:p-12 backdrop-blur">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-7">
                <div className="grid md:grid-cols-2 gap-7">
                  <Field label="Name" required>
                    <input
                      name="name"
                      type="text"
                      required
                      className="form-input"
                      placeholder="Jane Holder"
                    />
                  </Field>
                  <Field label="Business or project">
                    <input
                      name="business"
                      type="text"
                      className="form-input"
                      placeholder="Optional"
                    />
                  </Field>
                </div>

                <Field label="Email" required>
                  <input
                    name="email"
                    type="email"
                    required
                    className="form-input"
                    placeholder="jane@example.com"
                  />
                </Field>

                <Field label="SAV wallet address" required mono>
                  <input
                    name="wallet"
                    type="text"
                    required
                    className="form-input font-mono text-sm"
                    placeholder="0x…"
                  />
                </Field>

                <div className="grid md:grid-cols-2 gap-7">
                  <Field label="Telegram handle">
                    <input
                      name="telegram"
                      type="text"
                      className="form-input"
                      placeholder="@username"
                    />
                  </Field>
                  <Field label="Discord handle">
                    <input
                      name="discord"
                      type="text"
                      className="form-input"
                      placeholder="username#1234"
                    />
                  </Field>
                </div>

                <Field label="Type of site">
                  <select name="siteType" className="form-input" defaultValue="">
                    <option value="" disabled>
                      Select one
                    </option>
                    {SITE_TYPES.map((t) => (
                      <option key={t} value={t} className="bg-ink-700">
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Three sites you love">
                  <textarea
                    name="references"
                    rows={2}
                    className="form-input resize-none"
                    placeholder="Paste three URLs you'd like the design to feel adjacent to."
                  />
                </Field>

                <Field label="Your number-one goal for this site">
                  <textarea
                    name="message"
                    rows={4}
                    className="form-input resize-none"
                    placeholder="One sentence is enough. We want to know what success looks like for you."
                  />
                </Field>

                {error && (
                  <p className="text-sm text-red-400 text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative inline-flex w-full items-center justify-center gap-2 rounded-2xl px-7 py-4 text-base font-medium text-ink-900 bg-gradient-to-b from-bullion-100 via-bullion-300 to-bullion-500 border border-bullion-500/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_40px_-10px_rgba(212,167,82,0.5)] transition-all hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_12px_50px_-10px_rgba(212,167,82,0.7)] hover:scale-[1.005] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-ink-900/30 border-t-ink-900 rounded-full spin-soft" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      Submit application
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>

                <p className="text-center font-mono text-[10px] uppercase tracking-[0.22em] text-cream-dim">
                  By submitting, you consent to a 48-hour review window
                </p>
              </form>
            ) : (
              <div className="text-center py-10">
                <div className="w-16 h-16 mx-auto rounded-full bg-bullion-900/40 border border-bullion-400/40 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-bullion-300">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="mt-7 font-display text-cream text-4xl italic tracking-tight">
                  Received.
                </h3>
                <p className="mt-4 text-cream-muted max-w-md mx-auto leading-relaxed">
                  Your application is logged. A member of the build team will respond
                  personally within 48 hours.
                </p>
                <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-bullion-300">
                  hello@cjawebservices.com
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <style jsx>{`
        :global(.form-input) {
          width: 100%;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0.75rem;
          padding: 0.85rem 1rem;
          color: var(--cream);
          font-size: 0.95rem;
          transition: border-color 200ms ease, box-shadow 200ms ease, background 200ms ease;
          appearance: none;
          font-family: inherit;
        }
        :global(.form-input::placeholder) {
          color: var(--cream-dim);
        }
        :global(.form-input:focus) {
          outline: none;
          border-color: rgba(212, 167, 82, 0.55);
          box-shadow: 0 0 0 3px rgba(212, 167, 82, 0.12);
          background: rgba(255, 255, 255, 0.04);
        }
        :global(select.form-input) {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23D4A752' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.5rem;
        }
      `}</style>
    </section>
  );
}

function Field({
  label,
  required,
  mono,
  children,
}: {
  label: string;
  required?: boolean;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className={`block mb-2 text-[11px] uppercase tracking-[0.22em] ${
          mono ? "font-mono" : ""
        } text-cream-muted`}
      >
        {label}
        {required && <span className="text-bullion-300 ml-1.5">·</span>}
      </span>
      {children}
    </label>
  );
}

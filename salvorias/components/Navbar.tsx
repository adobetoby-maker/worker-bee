"use client";

import { useEffect, useState } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "backdrop-blur-xl bg-ink-900/70 border-b border-white/[0.06]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container-vault flex h-16 items-center justify-between">
        <a href="#" className="group flex items-center gap-3">
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-bullion-100 via-bullion-400 to-bullion-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_0_24px_-4px_rgba(212,167,82,0.6)]" />
            <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-ink-700 to-ink-900 flex items-center justify-center">
              <span className="font-display italic text-bullion-300 text-base leading-none">
                S
              </span>
            </div>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-cream text-lg italic">
              Salvorias
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-cream-dim">
              by CJA · est. 2026
            </span>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-9 text-sm text-cream-muted">
          <a href="#features" className="hover:text-cream transition-colors">
            The Package
          </a>
          <a href="#pricing" className="hover:text-cream transition-colors">
            Settlement
          </a>
          <a href="#process" className="hover:text-cream transition-colors">
            Process
          </a>
        </nav>

        <a
          href="#apply"
          className="group relative inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-ink-900 bg-gradient-to-b from-bullion-100 via-bullion-300 to-bullion-500 border border-bullion-500/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_4px_24px_-8px_rgba(212,167,82,0.55)] transition-transform hover:scale-[1.02] active:scale-[0.99]"
        >
          Apply for a seat
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </header>
  );
}

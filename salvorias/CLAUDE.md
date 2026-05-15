# CLAUDE.md — Salvorias

Next.js 15 landing page for the CJA Web Services SAV token web-build offer.

## Commands

```bash
npm install
npm run dev      # localhost:3000
npm run build
npm run start
```

## Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v3
- **Icons:** Emoji (no icon library needed)
- **Deploy target:** `salvorias.worker-bee.app`

## Design System

| Token | Value |
|---|---|
| Background | `#080d1a` |
| Card surface | `#111827` / `#1f2937` |
| Primary accent | `#f59e0b` (amber-500) — SAV gold |
| Border default | `rgba(255,255,255,0.1)` |
| Text primary | `#f9fafb` |
| Text muted | `#6b7280` (gray-500) |

`text-gradient-gold` utility in `globals.css`: `background: linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b)` with `-webkit-background-clip: text`.

`glow-gold` utility: `box-shadow: 0 0 40px rgba(245,158,11,0.25), 0 0 80px rgba(245,158,11,0.08)`.

## Site Structure

```
/ (app/page.tsx)
  Navbar          — fixed top, CJA logo mark + amber Apply button
  Hero            — full-height, urgency badge, gradient headline, CTAs, stats
  SocialProof     — slim trust bar naming PreparednessMama / WildernessToday / TwinsAndCounting
  Features        — 6-card grid of package deliverables
  Pricing         — 1,995 USD in SAV glowing card
  HowItWorks      — 4-step numbered timeline
  ApplicationForm — 8-field form (use client) with loading + success states
  Footer          — 3-col with services, company, email
```

## Components

All in `components/`:
`Navbar.tsx`, `Hero.tsx`, `SocialProof.tsx`, `Features.tsx`, `Pricing.tsx`, `HowItWorks.tsx`, `ApplicationForm.tsx` (use client), `Footer.tsx`

## Key Rules

- Navbar is `position: fixed` — add `pt-16` to main or Hero to offset
- `#apply` anchor on ApplicationForm section, `#features` on Features section
- Form submit: client-side 1.2s delay → `setSubmitted(true)` — wire real endpoint (Formspree / Supabase) when ready
- All background glows use `pointer-events-none` absolute divs with large `blur-[]`
- No external images — no img tags, no next/image needed
- `overflow-x-hidden` on `<main>` to prevent ambient glow bleed

## Blueprint

Blueprint JSON: `blueprints/salvorias.json` (8 nodes with claudePrompts)
Submission: `blueprints/submissions/salvorias.json`
Build spec: dispatch via `POST build-api.worker-bee.app/run` with `x-api-key: wb-build-local-9f4a2c`

## Deploy

```bash
~/deploy-client.sh /path/to/salvorias salvorias
```

First deploy only: turn OFF Vercel Authentication in project Settings → Deployment Protection.

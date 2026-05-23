# Phase 02 — Scaffold

## Purpose

Create the full Next.js project skeleton, wired for immediate visual development.
By the end of this phase, `npm run dev` should show a real homepage — not a blank screen.

## Steps

### 1. Bootstrap Next.js project

```bash
cd /Users/drive
npx create-next-app@latest {slug} \
  --typescript --tailwind --eslint --app --src-dir=false \
  --import-alias "@/*" --no-git
cd {slug}
```

### 2. Install core dependencies

```bash
npm install framer-motion lucide-react
# Add only what the blueprint requires:
# - If contact form: npm install @formspree/react  OR wire to /api/contact with Resend
# - If auth: npm install @supabase/supabase-js @supabase/ssr
# - If e-commerce: npm install @stripe/stripe-js stripe
```

### 3. Configure globals.css

Replace the Tailwind default with a project-specific token system:

```css
@import "tailwindcss";

@layer base {
  :root {
    --primary: {hex from palette.primary};
    --primary-dark: {darkened by 15%};
    --accent: {hex from palette.accent};
    --bg: {hex from palette.background};
    --bg-alt: {hex from palette.backgroundAlt};
    --text: {hex from palette.text};
    --text-muted: {hex from palette.textMuted};
    --border: {hex from palette.border};
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body, sans-serif);
    -webkit-font-smoothing: antialiased;
  }
}
```

### 4. Configure app/layout.tsx

- Import fonts from `next/font/google` matching the style:
  - minimal/editorial → Inter + Playfair Display
  - bold/playful → Inter + DM Serif Display
  - luxury → Cormorant Garamond + Libre Baskerville
  - corporate → Inter only (vary weights)
- Export metadata with real SEO title/description (use business name + city + category)
- Wire in Nav and Footer components as children wrappers

### 5. Scaffold pages from blueprint nodes

For each `type === 'page'` node, create `app/{route}/page.tsx`:

```tsx
// Use the node's claudePrompt as the implementation spec.
// Build the FULL page — not a placeholder, not "coming soon".
// Every page must have:
//   - A hero/header section
//   - At least 2 content sections
//   - A CTA section at bottom
//   - Correct metadata export
//   - AnimateIn components on all non-hero sections
```

### 6. Build shared components

- `components/Nav.tsx` — responsive nav with mobile hamburger. Logo left, links right. Active state.
- `components/Footer.tsx` — address, phone, links, copyright. Match palette.
- `components/AnimateIn.tsx` — same pattern as all other worker-bee sites:
  ```tsx
  'use client'
  // mounted state (useEffect) → SSR renders visible, Framer Motion animates after hydration
  // whileInView={{ opacity: 1, x: 0, y: 0 }} viewport={{ once: true, amount: 0.1 }}
  ```
- Any other shared components referenced in ≥ 2 blueprint nodes

### 7. Wire up API routes

For each `type === 'api'` node, create `app/api/{name}/route.ts` with the correct handler.
Minimum viable: 200 response. If contact form: validate → return success (wire email later).

### 8. Verify dev server starts

```bash
npm run dev -- --port 3099 -H 0.0.0.0
# Must show no build errors. Lint warnings are acceptable.
```

If build errors occur → run Phase 03 iteration 0 to fix before scoring.

### 9. Update build log

```json
{ "phases": { "scaffold": "done" }, "log": ["Scaffold complete — dev server at :3099"] }
```

## Quality Bar for Scaffold Exit

- `npm run dev` starts without errors
- Homepage loads at localhost:3099 with real content (not a blank page)
- Nav renders and links exist
- Footer renders
- All blueprint pages have a route file (even if minimal)

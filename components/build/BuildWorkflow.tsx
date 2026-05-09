'use client'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Copy, Download, Hammer, GitBranch, Globe, Database,
  ChevronRight, ChevronDown, AlertCircle, CheckCircle2, Wand2, Search,
  Terminal, Zap, Loader2, KeyRound, Eye, EyeOff, ShieldCheck,
} from 'lucide-react'

interface Site {
  id: string; name: string; url: string; stack: string
  github_repo: string | null; notes: string | null
}
interface CardData {
  title: string; type: 'page' | 'section' | 'component' | 'api' | 'data'
  description: string; claudePrompt: string; status: string
}
interface BlueprintNode { id: string; data: CardData }
interface BlueprintEdge { source: string; target: string }

interface Enhancements {
  framerMotion: boolean; lenis: boolean; gsap: boolean
  spline: boolean; r3f: boolean; videoHero: boolean
  customCursor: boolean; parallax: boolean; comfyImages: boolean
}

interface Config {
  githubRepo: string; domain: string; localPath: string
  supabaseProject: string; siteType: string
  referenceUrls: string; subjectName: string
  enhancements: Enhancements
  buildMode: 'new' | 'iteration'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STACK_SCAFFOLD: Record<string, string> = {
  nextjs: 'npx create-next-app@latest . --typescript --tailwind --app --src-dir no --import-alias "@/*" --use-npm',
  vite: 'npm create vite@latest . -- --template react-ts && npm install && npm install -D tailwindcss @tailwindcss/vite',
  wordpress: '# Use WP CLI\nwp core download\nwp config create --dbname=mydb --dbuser=root --dbpass=password',
  general: 'npm init -y',
}
const STACK_LABEL: Record<string, string> = {
  nextjs: 'Next.js 16 App Router', vite: 'Vite + React + TypeScript',
  wordpress: 'WordPress', general: 'General',
}
const SITE_TYPES = [
  { value: 'medical', label: 'Medical / Physician' },
  { value: 'legal', label: 'Legal / Attorney' },
  { value: 'local-service', label: 'Local Service Business' },
  { value: 'restaurant', label: 'Restaurant / Hospitality' },
  { value: 'saas', label: 'SaaS / App' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'agency', label: 'Agency / Creative' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'general', label: 'General / Other' },
]

// Smart defaults per site type — prevents wrong choices being left on/off
const DEFAULT_ENHANCEMENTS: Record<string, Enhancements> = {
  medical:       { framerMotion: true,  lenis: true,  gsap: false, spline: false, r3f: false, videoHero: false, customCursor: false, parallax: true,  comfyImages: false },
  legal:         { framerMotion: true,  lenis: true,  gsap: false, spline: false, r3f: false, videoHero: false, customCursor: false, parallax: false, comfyImages: false },
  'local-service': { framerMotion: true, lenis: true, gsap: false, spline: false, r3f: false, videoHero: false, customCursor: false, parallax: false, comfyImages: false },
  restaurant:    { framerMotion: true,  lenis: true,  gsap: false, spline: false, r3f: false, videoHero: true,  customCursor: false, parallax: true,  comfyImages: true  },
  saas:          { framerMotion: true,  lenis: true,  gsap: true,  spline: true,  r3f: false, videoHero: false, customCursor: true,  parallax: false, comfyImages: true  },
  ecommerce:     { framerMotion: true,  lenis: true,  gsap: false, spline: false, r3f: false, videoHero: false, customCursor: false, parallax: false, comfyImages: true  },
  agency:        { framerMotion: true,  lenis: true,  gsap: true,  spline: true,  r3f: false, videoHero: true,  customCursor: true,  parallax: true,  comfyImages: true  },
  'real-estate': { framerMotion: true,  lenis: true,  gsap: false, spline: false, r3f: false, videoHero: true,  customCursor: false, parallax: true,  comfyImages: false },
  general:       { framerMotion: true,  lenis: true,  gsap: false, spline: false, r3f: false, videoHero: false, customCursor: false, parallax: false, comfyImages: false },
}

const ENHANCEMENT_META: { key: keyof Enhancements; icon: string; label: string; detail: string; group: string; packages: string[] }[] = [
  { key: 'framerMotion', icon: '✨', label: 'Scroll Animations',    detail: 'Framer Motion — section reveals, staggered cards, hover lifts',     group: 'Motion',         packages: ['framer-motion'] },
  { key: 'lenis',        icon: '🌊', label: 'Smooth Scroll',        detail: 'Lenis inertia — transforms website into an experience',              group: 'Motion',         packages: ['lenis'] },
  { key: 'gsap',         icon: '🎬', label: 'GSAP Timelines',       detail: 'Orchestrated hero entrances, text splits, number counters',          group: 'Motion',         packages: ['gsap'] },
  { key: 'parallax',     icon: '🏔️', label: 'Parallax Sections',    detail: 'Background images breathe and shift as you scroll',                  group: 'Motion',         packages: [] },
  { key: 'spline',       icon: '🌐', label: 'Spline 3D',            detail: 'Embeddable 3D hero scenes — no WebGL setup required',               group: '3D',             packages: ['@splinetool/react-spline', '@splinetool/runtime'] },
  { key: 'r3f',          icon: '🔮', label: 'React Three Fiber',    detail: 'Full WebGL — particles, shaders, audio-reactive visuals',           group: '3D',             packages: ['three', '@react-three/fiber', '@react-three/drei'] },
  { key: 'videoHero',    icon: '🎥', label: 'Video Background',     detail: 'Full-bleed video hero with static mobile fallback',                 group: 'Media & Polish', packages: [] },
  { key: 'customCursor', icon: '🖱️', label: 'Custom Cursor',        detail: 'Branded trailing cursor — signals premium craft instantly',         group: 'Media & Polish', packages: [] },
  { key: 'comfyImages',  icon: '🎨', label: 'ComfyUI Images',       detail: 'AI-generated hero & section backgrounds via local ComfyUI — no stock photos', group: 'AI Images', packages: [] },
]

const RESEARCH_SOURCES: Record<string, string> = {
  medical:         'healthgrades.com, usnews.com/doctors, vitals.com, their hospital/practice website',
  legal:           'avvo.com, martindale.com, justia.com, their firm website, state bar profile',
  'local-service': 'Google Business Profile, Yelp, their existing website, Facebook page',
  restaurant:      'Google Business Profile, Yelp, OpenTable, TripAdvisor, their existing site',
  saas:            'ProductHunt, their own site, Crunchbase, G2, LinkedIn company page',
  ecommerce:       'Their existing site, Google Shopping, social profiles',
  agency:          'Their portfolio site, Clutch.co, LinkedIn, Behance/Dribbble',
  'real-estate':   'Zillow agent profile, Realtor.com, their brokerage site',
  general:         'Google search, their existing website, LinkedIn, social profiles',
}

const DESIGN_STANDARDS: Record<string, string> = {
  medical: `### Medical / Physician — Production Floor

**Typography:** Display serif (Playfair Display, Fraunces, DM Serif). Hero h1 ≥ text-7xl. Section headings ≥ text-5xl. Never Inter/system-ui as display.
**Color:** Deep navy (#0b1f3a) + teal/sky accent. White and navy alternating sections. Gold for credential accents.
**Photography:** Hero = full-bleed real surgical/clinical photo (next/image fill + directional overlay). Doctor portrait = researchBrief.photoUrl only — never stock person. Specialty cards = photo-first (image top 45%).
**Layout:** Credential stat strip pinned to hero bottom. Section padding py-24 to py-32. Cards rounded-3xl, hover:shadow-xl, image hover:scale-105 duration-700.`,

  legal: `### Legal / Attorney — Production Floor

**Typography:** Cormorant Garamond or Playfair Display. Hero h1 ≥ text-7xl in serif. Body in clean sans at 16px.
**Color:** Deep charcoal (#1a1a1a) or navy + gold (#b5922a) accent. Maximum 2 colors. Authoritative, never bright.
**Photography:** Full-bleed courtroom, city skyline, or office hero. Attorney portrait = researchBrief.photoUrl, authoritative crop.
**Layout:** Big credential numbers prominent. Practice area cards: icon + title + accent border-bottom. Testimonials with large quote marks.`,

  'local-service': `### Local Service — Production Floor

**Typography:** Warm trustworthy sans (Sora, Outfit, DM Sans Bold) or slab serif. Hero h1 ≥ text-6xl, direct and action-oriented.
**Color:** Strong primary brand color — not default blue. High-contrast CTAs. Warm off-white (#fafaf8) alternating sections.
**Photography:** Hero = real photo of shop/vehicle/team. Service cards = real work photos, not icons alone. Google Maps embed.
**Layout:** Phone number in hero AND nav — primary CTA. Service grid with real photos. Reviews with star ratings and source badges.`,

  restaurant: `### Restaurant / Hospitality — Production Floor

**Typography:** Editorial serif — Cormorant Garamond or Playfair with script pairing. Hero h1 ≥ text-8xl. Menu in serif.
**Color:** Rich appetite palette — burgundy, forest green, deep amber, or charcoal. Pull accents from the hero food photo.
**Photography:** Real food and interior photography only — absolutely no stock food. Gallery: masonry or horizontal scroll. No photo = no section.
**Layout:** Menu as editorial typographic list with price (not cards). Reservation CTA sticky on mobile. Hours + location in footer.`,

  saas: `### SaaS / App — Production Floor

**Typography:** Modern geometric (DM Sans, Cabinet Grotesk, Satoshi) at heavy weight. Hero h1 ≥ text-7xl, letter-spacing -0.02em.
**Color:** Dark mode: near-black (#0d0d0d or #09090b) + electric accent (indigo, violet, or lime). Gradient accents on CTAs sparingly.
**Photography:** Hero = real product screenshot or animated demo. Feature sections: alternating screenshot + description. Client logos in greyscale marquee.
**Layout:** Pricing: 3-column, most popular accent-bordered. Feature grid: icon + heading + 1 sentence. FAQ accordion below pricing.`,

  ecommerce: `### E-commerce — Production Floor

**Typography:** Clean modern sans. Product names font-semibold 18–20px. Hero: large editorial heading if brand-focused.
**Color:** Brand-anchored system. Product images dominate — neutral backgrounds, nothing competing.
**Photography:** Lifestyle campaign photography at full width. Products: clean white-background + lifestyle shots. Real only.
**Layout:** Featured products 3–4 column grid, hover quick-add. Hero CTA above fold mobile. Trust signals near checkout.`,

  agency: `### Agency / Creative — Production Floor

**Typography:** Clash Display, Space Grotesk, or bold pairing. Hero h1 ≥ 80px, broken across lines for rhythm. Mix weights dramatically.
**Color:** Black + one electric accent OR pure white + bold color. Deliberate brand choice, never a default.
**Photography / Motion:** Video background or high-contrast campaign imagery in hero. Case study cards: full-bleed, hover overlay reveals. Micro-animations everywhere.
**Layout:** Asymmetric grid — break columns intentionally. Full-page editorial case studies. Logo marquee strip.`,

  'real-estate': `### Real Estate — Production Floor

**Typography:** Luxury serif (Cormorant, Yeseva One, Marcellus). Prices bold and large. Body clean sans 15px.
**Color:** Luxury palette: near-white + gold/champagne OR dark + warm gold. Never bright primary colors.
**Photography:** Stunning property or aerial photography full-bleed hero. Listing cards: photo dominant. Agent portrait = researchBrief.photoUrl.
**Layout:** Search/filter bar in or just below hero. Property cards: photo dominant, overlay or below for details. Map integration.`,

  general: `### General — Production Floor

**Typography:** Distinctive display font — never default Inter/system-ui. Hero h1 ≥ text-6xl. Section headings ≥ text-4xl.
**Photography:** Hero = real photo (next/image fill + overlay) — never CSS gradient alone. Unsplash fallback if no real asset found.
**Color:** Commit to a dominant color + one accent. No equal-weight multi-color palettes.
**Layout:** Section padding py-24 minimum. Stat strip after hero. Cards: rounded-2xl, hover:shadow-lg, image hover:scale-105.`,
}

// Tech guardrails — injected into every spec to prevent known build bugs
const TECH_GUARDRAILS = `## TECH GUARDRAILS — READ BEFORE WRITING ANY CODE

These are the most common build bugs. Each one has caused a broken production deploy. Do not skip.

### 1. Tailwind v4 CSS Cascade Layer Rule (CRITICAL — kills all layout if violated)

Tailwind v4 registers utilities inside \`@layer utilities\`. In CSS, **unlayered rules always beat layered rules** regardless of specificity. A \`* { margin: 0 }\` outside any layer overrides every \`.mx-auto\`, \`.px-4\`, \`.py-24\` on the page — your containers will be flush-left with no spacing.

❌ WRONG — this breaks mx-auto and all padding utilities:
\`\`\`css
@import "tailwindcss";
* { box-sizing: border-box; margin: 0; padding: 0; }  /* unlayered — beats @layer utilities */
\`\`\`

✅ CORRECT — Tailwind v4's preflight already resets margin/padding:
\`\`\`css
@import "tailwindcss";
/* Do not add a * reset. Tailwind preflight handles it.       */
/* If you need custom base styles, use @layer base { ... }    */
\`\`\`

**Rule: Never write CSS outside \`@layer base\` or \`@layer utilities\` in a Tailwind v4 project.**

---

### 2. Image Verification Rule

Never use an Unsplash photo ID you have not confirmed visually. The ID \`photo-1559757148-5c350d0d3c56\` could be anything.

For every Unsplash image:
1. Navigate to the URL in Playwright and take a screenshot
2. Confirm the photo matches the use case (e.g. "knee surgery" ≠ brain model)
3. If wrong, search \`https://unsplash.com/s/photos/<topic>\` and pick a confirmed URL

Verified medical fallbacks (confirmed correct subjects):
- Operating room: \`photo-1551076805-e1869033e561\`
- Doctor at desk: \`photo-1612349317150-e413f6a5b16d\`
- Physical therapy / knee: \`photo-1571019613454-1cb2f99b2d8b\`
- Hospital corridor: \`photo-1519494026892-80bbd2d6fd0d\`
- X-ray / imaging: \`photo-1530026186672-2cd00ffc50fe\` ← this is a HEART model, do NOT use for orthopedics
- Shoulder/joint surgery: \`photo-1559757175-5700dde675bc\`

**Rule: Navigate to every image URL in Playwright and screenshot it before committing.**

---

### 3. Export Consistency

Decide once: named export or default export. Be consistent across all files.
- \`export default function X\` → import as \`import X from './X'\`
- \`export function X\` → import as \`import { X } from './X'\`
Mixing these causes TypeScript build errors.

---

### 4. next/image with \`fill\`

A \`<Image fill />\` requires its parent to have \`position: relative\` and an explicit height. Without it, the image renders at 0px height or overflows.

\`\`\`tsx
// ✅ correct
<div className="relative h-64 w-full">
  <Image src={url} alt="" fill className="object-cover" />
</div>
\`\`\`

---

### 5. Framer Motion whileInView — Content Visibility Rule (CRITICAL)

\`initial={{ opacity: 0 }}\` makes content **permanently invisible** until the scroll animation fires. On a static screenshot, slow connection, or JS failure, ALL sections below the fold appear as black/empty.

❌ WRONG — sections below fold are invisible on screenshot and JS-slow load:
\`\`\`tsx
<motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}>
\`\`\`

✅ CORRECT — always include \`viewport={{ once: true, amount: 0.1 }}\` and the CSS fallback:
\`\`\`tsx
<motion.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.1 }}
  transition={{ duration: 0.5, ease: 'easeOut' as const }}
>
\`\`\`

And in globals.css inside \`@layer base\`:
\`\`\`css
@layer base {
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
}
\`\`\`

**Rule: Never use \`whileInView\` without \`viewport={{ once: true, amount: 0.1 }}\`. Add CSS fallback to every globals.css.**

---

### 6. Visual QA — Scroll Through the Full Page

A static full-page screenshot does NOT trigger scroll animations. Phase 2.5 verification MUST scroll:

\`\`\`js
// In Playwright visual verification:
await page.goto('http://localhost:3000')
await page.screenshot({ path: 'above-fold.png' })
// Scroll and screenshot each section:
await page.evaluate(() => window.scrollTo(0, 600))
await page.waitForTimeout(800)
await page.screenshot({ path: 'section-2.png' })
await page.evaluate(() => window.scrollTo(0, 1400))
await page.waitForTimeout(800)
await page.screenshot({ path: 'section-3.png' })
// Continue for every section
\`\`\`

Every section must be visible (not dark/empty) in its scrolled screenshot.

---`

// Per-enhancement code patterns injected into the spec
const ENHANCEMENT_SPEC: Record<keyof Enhancements, string> = {
  framerMotion: `**Framer Motion (installed: npm install framer-motion)**
Apply to EVERY section and card. ALWAYS include \`viewport={{ once: true, amount: 0.1 }}\` — omitting it leaves content invisible below the fold.
\`\`\`tsx
import { motion } from 'framer-motion'
// Section entrance:
<motion.section initial={{ opacity:0, y:32 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true, amount:0.1 }} transition={{ duration:0.6, ease:'easeOut' as const }}>
// Staggered cards (add index as delay):
<motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true, amount:0.1 }} transition={{ duration:0.5, delay: index * 0.1 }}>
// Hover lift on cards:
<motion.div whileHover={{ y:-4, boxShadow:'0 20px 40px rgba(0,0,0,0.15)' }} transition={{ duration:0.2 }}>
\`\`\``,

  lenis: `**Lenis Smooth Scroll (installed: npm install lenis)**
Create \`components/SmoothScroll.tsx\` and wrap root layout:
\`\`\`tsx
'use client'
import { useEffect } from 'react'
import Lenis from 'lenis'
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis()
    function raf(time: number) { lenis.raf(time); requestAnimationFrame(raf) }
    requestAnimationFrame(raf)
    return () => lenis.destroy()
  }, [])
  return <>{children}</>
}
\`\`\`
Wrap \`<body>\` children in layout.tsx with \`<SmoothScroll>\`.`,

  gsap: `**GSAP (installed: npm install gsap)**
Use for hero entrance sequences and any stat/number counters:
\`\`\`tsx
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)
// Hero entrance (in useEffect):
gsap.from('.hero-headline', { opacity:0, y:60, duration:1, ease:'power3.out', stagger:0.1 })
gsap.from('.hero-body', { opacity:0, y:30, duration:0.8, delay:0.4, ease:'power2.out' })
// Number counters on scroll:
gsap.to(statEl, { innerHTML: targetValue, duration:2, snap:{ innerHTML:1 }, scrollTrigger:{ trigger: statEl, start:'top 80%' } })
\`\`\``,

  spline: `**Spline 3D (installed: npm install @splinetool/react-spline @splinetool/runtime)**
Create a scene at spline.design, publish it, embed in hero:
\`\`\`tsx
'use client'
import dynamic from 'next/dynamic'
const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false })
// In hero (absolute behind text):
<div className="absolute right-0 top-0 w-1/2 h-full opacity-80 pointer-events-none">
  <Spline scene="https://prod.spline.design/YOUR-SCENE-ID/scene.splinecode" />
</div>
\`\`\`
Use a relevant scene: medical joint model, abstract orb, floating molecule, tech device.`,

  r3f: `**React Three Fiber (installed: npm install three @react-three/fiber @react-three/drei)**
Create \`components/HeroCanvas.tsx\` (client-only):
\`\`\`tsx
'use client'
import { Canvas } from '@react-three/fiber'
import { Float, Environment, MeshDistortMaterial } from '@react-three/drei'
export function HeroCanvas() {
  return (
    <Canvas camera={{ position: [0, 0, 5] }} className="absolute inset-0">
      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.8}>
        <mesh>
          <sphereGeometry args={[1.5, 64, 64]} />
          <MeshDistortMaterial color="#0891b2" roughness={0.1} metalness={0.8} distort={0.3} speed={2} />
        </mesh>
      </Float>
    </Canvas>
  )
}
\`\`\`
Position behind hero text with absolute inset-0. Dynamic import with ssr:false in the parent.`,

  videoHero: `**Video Hero Background**
No additional packages needed. Pattern:
\`\`\`tsx
<div className="absolute inset-0">
  {/* Video on desktop */}
  <video autoPlay muted loop playsInline className="w-full h-full object-cover hidden md:block">
    <source src="/hero.mp4" type="video/mp4" />
  </video>
  {/* Static fallback on mobile */}
  <Image src="/hero-poster.jpg" alt="" fill className="object-cover md:hidden" priority />
  {/* Directional overlay */}
  <div className="absolute inset-0 bg-gradient-to-r from-[#071629]/92 via-[#0b1f3a]/70 to-transparent" />
</div>
\`\`\`
Source video from client's existing content, or Pexels/Mixkit for free stock. Always ≤15s loop, muted, no audio track.`,

  customCursor: `**Custom Cursor**
Create \`components/Cursor.tsx\` and add to root layout:
\`\`\`tsx
'use client'
import { useEffect, useRef } from 'react'
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const move = (e: MouseEvent) => {
      dot.current?.style.setProperty('transform', \`translate(\${e.clientX - 4}px, \${e.clientY - 4}px)\`)
      setTimeout(() => ring.current?.style.setProperty('transform', \`translate(\${e.clientX - 14}px, \${e.clientY - 14}px)\`), 80)
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])
  return (
    <>
      <div ref={dot} className="fixed top-0 left-0 w-2 h-2 rounded-full bg-sky-400 pointer-events-none z-[9999]" />
      <div ref={ring} className="fixed top-0 left-0 w-7 h-7 rounded-full border border-sky-400/50 pointer-events-none z-[9999] transition-transform duration-[80ms]" />
    </>
  )
}
\`\`\`
Add \`cursor-none\` to the \`<html>\` element in layout.tsx. Add \`<Cursor />\` to root layout (desktop only — hide on touch devices with a media query wrapper).`,

  comfyImages: `**ComfyUI Image Generation (requires ComfyUI running on localhost:8188 + comfy plugin)**

Generate all images BEFORE writing any component code. Save every output to \`public/images/\` so components can import them immediately.

---

### Universal Quality Boosters — append to EVERY prompt

\`\`\`
masterpiece, best quality, ultra-detailed, sharp focus, 8k uhd, high resolution,
award-winning photography, shot on Phase One IQ4 150MP, Zeiss Otus 55mm f/1.4,
RAW format, perfect exposure, tack sharp, professional color grading, HDR,
volumetric lighting, rich shadows, no noise, no artifacts, no chromatic aberration
\`\`\`

### Universal Negative Prompt — use on every generation

\`\`\`
ugly, blurry, low quality, low resolution, out of focus, overexposed, underexposed,
watermark, text, logo, signature, frame, border, stock photo feel, amateur photography,
distorted, deformed, bad composition, cluttered, busy background, flat lighting,
washed out, desaturated, jpeg artifacts, grain, noise, duplicate, cropped, cut off
\`\`\`

### Recommended Settings (apply to all slots)
- **Steps:** 45–60 (higher = sharper details)
- **CFG Scale:** 7.5–9 (photorealistic) / 5–7 (artistic)
- **Sampler:** DPM++ 2M Karras or DDIM
- **Model:** Realistic Vision v6 (photorealism) or DreamShaper XL (artistic)
- **Upscale:** 2× with ESRGAN after generation for final output

---

### Site-Type Hero Prompts — tailor to actual client name and location

**Medical / Physician**
\`\`\`
(positive) breathtaking modern hospital atrium, soaring glass architecture, cascading natural light,
healing garden visible through floor-to-ceiling windows, immaculate white marble floors,
warm afternoon sun casting long shadows, sense of calm and competence, architectural photography,
tilt-shift lens, perfect symmetry, [masterpiece boosters]

(hero variation) surgeon's hands performing precise procedure under operating theater lights,
extreme close-up bokeh, cool clinical blue tones with warm skin, National Geographic quality
\`\`\`

**Legal / Attorney**
\`\`\`
(positive) dramatic law library at golden hour, floor-to-ceiling leather-bound volumes,
mahogany and brass detailing, shafts of amber light through tall windows,
single leather chair at a massive desk, power and gravitas, cinematic color grade,
inspired by Gregory Crewdson lighting, [masterpiece boosters]

(hero variation) city skyline from corner office at dusk, deep navy sky with city lights
igniting below, reflection of attorney at window as silhouette, aspirational and commanding
\`\`\`

**Local Service Business**
\`\`\`
(positive) master craftsman at work in beautifully lit workshop, warm tungsten and natural light,
genuine concentration on face, hands showing skill and experience, depth of field separating subject
from background, documentary style like Sebastião Salgado, authentic and trustworthy,
color graded warm amber tones, [masterpiece boosters]

(hero variation) pristine white service van on open highway at sunrise, golden hour lens flare,
dramatic sky, sense of reliability and reach, cinematic wide angle
\`\`\`

**Restaurant / Hospitality**
\`\`\`
(positive) intimate restaurant at peak dinner service, candlelight flickering across white tablecloths,
shallow depth of field on hero dish in foreground, warm bokeh of guests in background,
rich jewel tones — burgundy velvet, dark walnut, brass fixtures, steam rising from dish,
food editorial photography by Mikkel Vang, [masterpiece boosters]

(hero variation) chef's hands plating a dish, dramatic overhead lighting, marble prep surface,
steam, rich saturated colors, Michelin-star presentation
\`\`\`

**SaaS / App**
\`\`\`
(positive) abstract data visualization in deep space, luminous electric indigo and violet light trails
forming neural network patterns, dark near-black background (#080810), particles and nodes
connected by glowing filaments, ultra-sharp foreground elements with atmospheric depth falloff,
inspired by Julius Horsthuis fractal art, [masterpiece boosters]

(hero variation) futuristic dashboard interface reflected in rain-slicked glass at night,
neon reflections, cyberpunk minimal aesthetic, dark blue and cyan palette
\`\`\`

**E-commerce**
\`\`\`
(positive) luxury product hero shot on seamless white, single hero product perfectly centered,
dramatic split lighting with one hard source and soft fill, razor-sharp product detail,
deep shadows anchoring to surface, inspired by Nick Knight commercial photography,
color graded clean and premium, [masterpiece boosters]

(hero variation) lifestyle flatlay on aged oak surface, natural window light, artisan props,
aspirational but attainable, warm neutral palette
\`\`\`

**Agency / Creative**
\`\`\`
(positive) bold graphic art direction, massive brutalist concrete space with single colored
light source cutting diagonally, lone creative professional mid-motion, strong geometric
composition, high contrast black and white with single color accent (electric orange or acid green),
inspired by Wolfgang Tillmans and Helmut Newton, [masterpiece boosters]

(hero variation) creative studio interior, golden hour through industrial skylights, exposed
brick and steel, design work pinned to walls, cinematic 2.39:1 aspect ratio crop
\`\`\`

**Real Estate**
\`\`\`
(positive) architectural masterwork at magic hour, warm interior glow spilling through
floor-to-ceiling windows onto manicured grounds, infinity pool reflecting sunset,
mountain or water vista in background, drone perspective 30° down angle,
HDR exposure blended golden exterior with luminous interior, Architectural Digest quality,
[masterpiece boosters]

(hero variation) grand entryway interior, double-height ceiling with chandelier, herringbone
marble floors catching window light, luxury aspirational atmosphere
\`\`\`

---

### Slot Assignments

| File | Dimensions | Use |
|------|-----------|-----|
| \`public/images/hero-bg.jpg\` | 1920×1080 | Hero section full-bleed |
| \`public/images/section-2-bg.jpg\` | 1920×800 | Second major section |
| \`public/images/section-3-bg.jpg\` | 1920×800 | Third major section |
| \`public/images/og-image.jpg\` | 1200×630 | Open Graph / social share |

After generation, run the upscaler pass. Images live in \`public/\` — no \`next.config.ts\` domain changes needed.`,

  parallax: `**Parallax Sections**
Use Framer Motion useScroll + useTransform (requires framer-motion):
\`\`\`tsx
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
export function ParallaxSection({ children, src }: { children: React.ReactNode; src: string }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%'])
  return (
    <div ref={ref} className="relative overflow-hidden">
      <motion.div style={{ y }} className="absolute inset-[-8%]">
        <Image src={src} alt="" fill className="object-cover" />
      </motion.div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}
\`\`\`
Apply to any section that has a full-bleed background image.`,
}

// ─── Credentials ─────────────────────────────────────────────────────────────

type EnvVarDef = { key: string; label: string; hint: string; secret: boolean }

const SUPABASE_VARS: EnvVarDef[] = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL',   label: 'Supabase URL',          hint: 'https://xxx.supabase.co', secret: false },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key',  hint: 'eyJ...',  secret: true },
  { key: 'SUPABASE_SERVICE_ROLE_KEY',  label: 'Supabase Service Role', hint: 'eyJ...',  secret: true },
]
const STRIPE_VARS: EnvVarDef[] = [
  { key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', label: 'Stripe Publishable Key', hint: 'pk_live_...', secret: false },
  { key: 'STRIPE_SECRET_KEY',          label: 'Stripe Secret Key',       hint: 'sk_live_...', secret: true },
  { key: 'STRIPE_WEBHOOK_SECRET',      label: 'Stripe Webhook Secret',   hint: 'whsec_...',   secret: true },
]
const EMAIL_VAR: EnvVarDef =
  { key: 'RESEND_API_KEY',             label: 'Resend API Key (email)',  hint: 're_...',      secret: true }
const ADMIN_VAR: EnvVarDef =
  { key: 'ADMIN_SECRET',               label: 'Admin Secret',            hint: 'random 32-char string', secret: true }
const ANTHROPIC_VAR: EnvVarDef =
  { key: 'ANTHROPIC_API_KEY',          label: 'Anthropic API Key (chatbot)', hint: 'sk-ant-...',   secret: true }

const ENV_VARS_BY_TYPE: Record<string, EnvVarDef[]> = {
  medical:          [...SUPABASE_VARS, ...STRIPE_VARS, EMAIL_VAR, ADMIN_VAR],
  legal:            [...SUPABASE_VARS, ...STRIPE_VARS, EMAIL_VAR, ADMIN_VAR],
  'local-service':  [...SUPABASE_VARS, ...STRIPE_VARS, ADMIN_VAR, ANTHROPIC_VAR],
  restaurant:       [...SUPABASE_VARS, { key: 'STRIPE_SECRET_KEY', label: 'Stripe Secret Key', hint: 'sk_live_...', secret: true }, EMAIL_VAR],
  saas:             [...SUPABASE_VARS, ...STRIPE_VARS, ADMIN_VAR, ANTHROPIC_VAR],
  ecommerce:        [...SUPABASE_VARS, ...STRIPE_VARS, EMAIL_VAR],
  'real-estate':    [...SUPABASE_VARS, EMAIL_VAR, ADMIN_VAR],
  agency:           [...SUPABASE_VARS, EMAIL_VAR, ADMIN_VAR],
  general:          [...SUPABASE_VARS, ADMIN_VAR],
}

function generateEnvSection(envVars: EnvVarDef[]): string {
  if (envVars.length === 0) return '# No credentials needed for this site type\n'
  const lines = [
    '# 1e. Vercel — link project (credentials wired separately from Worker Bee after build)',
    'vercel link',
    '#',
    '# Required env vars — add via Worker Bee dashboard after build completes:',
    ...envVars.map(v => `#   ${v.key}  (${v.label})`),
    '#',
    '# Worker Bee will inject these via the Vercel API and trigger a redeploy.',
  ]
  return lines.join('\n')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function inferPath(title: string, type: CardData['type']): string {
  const slug = toSlug(title)
  const pascal = title.replace(/\s+(.)/g, (_, c) => c.toUpperCase()).replace(/^\w/, c => c.toUpperCase())
  switch (type) {
    case 'page': return slug === 'home' || slug === 'homepage' ? 'app/page.tsx' : `app/${slug}/page.tsx`
    case 'section': return `components/${slug}/${pascal}.tsx`
    case 'component': return `components/${pascal}.tsx`
    case 'api': return `app/api/${slug}/route.ts`
    case 'data': return `lib/db/${slug}.ts`
  }
}

function topologicalOrder(nodes: BlueprintNode[], edges: BlueprintEdge[]): BlueprintNode[] {
  const inDegree = new Map(nodes.map(n => [n.id, 0]))
  const adj = new Map(nodes.map(n => [n.id, [] as string[]]))
  for (const e of edges) {
    adj.get(e.source)?.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
  }
  const queue = nodes.filter(n => (inDegree.get(n.id) ?? 0) === 0)
  const result: BlueprintNode[] = []
  while (queue.length) {
    const node = queue.shift()!
    result.push(node)
    for (const next of adj.get(node.id) ?? []) {
      const deg = (inDegree.get(next) ?? 1) - 1
      inDegree.set(next, deg)
      if (deg === 0) queue.push(nodes.find(n => n.id === next)!)
    }
  }
  for (const n of nodes) { if (!result.find(r => r.id === n.id)) result.push(n) }
  return result
}

function generateClaudeMd(site: Site): string {
  return `# CLAUDE.md\n\n## Project: ${site.name}\n${site.notes ? `\n${site.notes}\n` : ''}
### Commands
\`\`\`bash
npm run dev      # dev server on localhost:3000
npm run build    # production build
npm run lint     # ESLint
\`\`\`

### Stack
- ${STACK_LABEL[site.stack] ?? site.stack}
- Supabase (if applicable — see lib/supabase/ for client patterns)
- Tailwind CSS · TypeScript

### Key Rules
- Never import server-only Supabase client in client components
- All pages must be mobile-responsive
- Follow existing patterns from the blueprint
`
}

function generateBuildSpec(site: Site, nodes: BlueprintNode[], edges: BlueprintEdge[], config: Config): string {
  const slug = toSlug(site.name)
  const localPath = config.localPath || `/Users/drive/${slug}`
  const githubRepo = config.githubRepo || `adobetoby-maker/${slug}`
  const domain = config.domain || `${slug}.worker-bee.app`
  const scaffold = STACK_SCAFFOLD[site.stack] ?? STACK_SCAFFOLD.general
  const orderedNodes = topologicalOrder(nodes, edges)
  const nodesWithoutPrompt = orderedNodes.filter(n => !n.data.claudePrompt?.trim())
  const claudeMd = generateClaudeMd(site)
  const designStandards = DESIGN_STANDARDS[config.siteType] ?? DESIGN_STANDARDS.general
  const researchSources = RESEARCH_SOURCES[config.siteType] ?? RESEARCH_SOURCES.general
  const subjectName = config.subjectName || site.name
  const referenceUrls = config.referenceUrls.split(',').map(u => u.trim()).filter(Boolean)

  const { enhancements } = config
  const enabledEnhancements = ENHANCEMENT_META.filter(e => enhancements[e.key])
  const allPackages = [...new Set(enabledEnhancements.flatMap(e => e.packages))]
  const npmInstall = allPackages.length > 0 ? `npm install ${allPackages.join(' ')}` : '# No extra packages needed'
  const enhancementSpecs = enabledEnhancements.map(e => ENHANCEMENT_SPEC[e.key]).join('\n\n')
  const envVarDefs = ENV_VARS_BY_TYPE[config.siteType] ?? ENV_VARS_BY_TYPE.general
  const envSection = generateEnvSection(envVarDefs)

  return `# Build Workflow: ${site.name}

You are orchestrating the full build of a client website. Work through each phase in order. Do not skip phases.

## Site Profile
- **Client:** ${site.name}
- **Stack:** ${STACK_LABEL[site.stack] ?? site.stack}
- **GitHub repo:** ${githubRepo}
- **Local path:** ${localPath}
- **Domain:** ${domain}
${config.supabaseProject ? `- **Supabase project:** ${config.supabaseProject}` : ''}
${referenceUrls.length > 0 ? `- **Reference sites (study these):** ${referenceUrls.join(', ')}` : ''}

${nodesWithoutPrompt.length > 0 ? `⚠️  ${nodesWithoutPrompt.length} card(s) have no build instructions: ${nodesWithoutPrompt.map(n => n.data.title).join(', ')}. Use context clues to implement them sensibly.\n` : ''}

---

## DESIGN STANDARDS — NON-NEGOTIABLE PRODUCTION FLOOR

Read before writing a single line of code. These are hard requirements, not suggestions.

${designStandards}
${referenceUrls.length > 0 ? `
**Before designing, open each reference site and study it:**
${referenceUrls.map(u => `- ${u}`).join('\n')}
Note their typography scale, color palette, card patterns, and hero treatment. Match that quality tier or exceed it.
` : ''}

---

${TECH_GUARDRAILS}

---

## MOTION & ENHANCEMENT REQUIREMENTS

The following enhancements are enabled for this build. Each must be implemented:

${enabledEnhancements.length > 0 ? enabledEnhancements.map(e => `- **${e.label}** (${e.icon}) — ${e.detail}`).join('\n') : '- None selected — CSS transitions only'}

${enhancementSpecs ? `\n### Implementation Patterns\n\n${enhancementSpecs}` : ''}

---

## Phase 0 — Research

Before writing any code, find real assets for "${subjectName}". Real content in production, always.

**Where to look:** ${researchSources}

1. Search "${subjectName}" on each source above using Playwright (browser_navigate + browser_evaluate)
2. Extract: professional headshot URL, official bio text, real credentials, reviews, phone/address/hours
3. If reference sites are listed above, open and screenshot them for visual benchmarking

Save to \`/tmp/research-brief-${slug}.json\`:
\`\`\`json
{
  "photoUrl": "<real headshot URL>",
  "heroImageUrl": "<real facility or setting photo URL, or null>",
  "bio": "<real bio text>",
  "credentials": [],
  "reviews": [],
  "phone": "", "address": "", "hours": ""
}
\`\`\`

**Rule:** If a real asset exists, use it. Unsplash is only a fallback when nothing real was found. Never use a generic stock person as a portrait.

---

## Phase 1 — ${config.buildMode === 'iteration' ? 'Setup' : 'Provision'}

${config.buildMode === 'iteration' ? `**This is an iteration build.** The repo already exists at \`${localPath}\`. Do NOT scaffold a new project, do NOT run create-next-app, do NOT git init.

\`\`\`bash
# Work in the existing repo
cd ${localPath}

# Install any new enhancement packages
${npmInstall}

# Make sure next.config.ts includes images.unsplash.com in remotePatterns
\`\`\`

Update \`CLAUDE.md\` to reflect the new build goals:` : `\`\`\`bash
# 1a. GitHub repo
gh repo create ${githubRepo} --private --description "${site.name} — Worker-Bee client site"

# 1b. Scaffold
mkdir -p ${localPath} && cd ${localPath}
${scaffold}

# 1c. Install enhancements
${npmInstall}

# 1d. Git
git init
git remote add origin git@github.com:${githubRepo}.git
git add . && git commit -m "Initial ${site.stack} scaffold"
git push -u origin main

vercel link
${envSection}
\`\`\`

Whitelist all image domains found in the research brief in \`next.config.ts\` remotePatterns. Always include images.unsplash.com as fallback.

Drop \`CLAUDE.md\`:`}
\`\`\`
${claudeMd}
\`\`\`
${config.supabaseProject ? '\nCreate Supabase tables based on any data cards in Phase 2.' : ''}

---

## Phase 2 — ${config.buildMode === 'iteration' ? 'Rewrite / Enhance' : 'Build'} Blueprint Cards

${config.buildMode === 'iteration' ? `**Iteration mode:** Rewrite or replace existing components to match each blueprint card's spec exactly. If the file already exists, replace its content — do not patch around it. The goal is a complete visual and content refresh, not incremental edits. Each card gets its own git commit.` : 'Each card gets its own git commit.'} Apply Design Standards and Motion Requirements to every component.

${orderedNodes.map((node, i) => {
  const d = node.data
  const path = inferPath(d.title, d.type)
  return `### Card ${i + 1}: ${d.title} (${d.type.toUpperCase()})
**File:** \`${path}\`
**Description:** ${d.description || '(none)'}

${d.claudePrompt?.trim() || `Build a ${d.type} for "${d.title}". Apply Design Standards above. Use real assets from /tmp/research-brief-${slug}.json. Apply all enabled Motion & Enhancement patterns. Be thorough and production-quality.`}

\`\`\`bash
git add . && git commit -m "feat: ${d.title}"
\`\`\``
}).join('\n\n---\n\n')}

---

## Phase 2.5 — Visual Verification (REQUIRED before Phase 3)

Do not skip. This phase catches layout bugs before they go to production.

1. Run \`npm run build\` — must pass with **zero TypeScript errors**. Fix all errors before continuing.

2. Start the dev server: \`npm run dev &\`

3. Open http://localhost:3000 in Playwright and screenshot the full page:
\`\`\`
browser_navigate http://localhost:3000
browser_take_screenshot (fullPage: true)
\`\`\`

4. Check each item — if any fail, fix before Phase 3:
   - [ ] Content is centered with proper side margins (not flush-left)
   - [ ] All images load and show the correct subject matter
   - [ ] Navbar is visible, properly spaced, and links work
   - [ ] No horizontal scrollbar / overflow-x at desktop width
   - [ ] Resize to 375px mobile: \`browser_resize 375 812\` — screenshot again, verify mobile layout

5. If the layout is flush-left: check \`globals.css\` for any CSS outside \`@layer base\` — see TECH GUARDRAILS #1.

6. If any image shows wrong content: navigate to the Unsplash URL, screenshot it, swap for a verified URL.

7. Commit all fixes: \`git add . && git commit -m "fix: visual verification pass"\`

---

## Phase 3 — Design Elevation

Design Standards set the floor. This phase goes above it.

\`\`\`
/frontend-design Elevate ${site.name} above the production floor. Site type: ${config.siteType}. Bigger type, richer photography treatment, more considered spacing and motion. Every section should make a client say yes on the spot.${referenceUrls.length > 0 ? ` Reference sites: ${referenceUrls.join(', ')}.` : ''} Context: ${site.notes || site.name}.
\`\`\`

Apply all recommendations. Commit.

---

## Phase 4 — Final QA Gate (three-pass review before deploy)

Run all three passes in order. Fix every issue raised. Commit after each pass.

### Pass 1 — Code Quality
\`\`\`
/review
\`\`\`
Fix all high-confidence issues. Commit: \`git add . && git commit -m "fix: code review pass"\`

### Pass 2 — CEO Lens (conversion + trust)
\`\`\`
/plan-ceo-review Review this physician website for conversion effectiveness and patient trust signals. Does the hero establish credibility in 3 seconds? Is the CTA path obvious? Are credentials prominent? Does every section earn its place?
\`\`\`
Implement all recommendations that would make a skeptical patient say yes faster. Commit: \`git add . && git commit -m "fix: ceo review pass"\`

### Pass 3 — Strategy + Messaging
\`\`\`
/ultrathink Review the site's messaging consistency end-to-end. Does the tone stay professional and warm throughout? Is the value prop stated clearly in the hero and repeated in the CTA banner? Are there any messaging gaps, repetitions, or trust-killers?
\`\`\`
Apply all messaging fixes. Commit: \`git add . && git commit -m "fix: messaging pass"\`

---

## Phase 5 — Deploy

\`\`\`bash
cd ${localPath}
vercel --prod
vercel alias set <deployment-url> ${domain}
\`\`\`

---

## Phase 6 — Report Back

\`\`\`bash
curl -s -X POST https://manage.worker-bee.app/api/blueprints/update \\
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \\
  -H "content-content: application/json" \\
  -d '{"siteId":"${site.id}","summary":"Build complete. ${orderedNodes.length} cards implemented and deployed to ${domain}.","nodes":[],"edges":[]}'
\`\`\`

Output: production URL · one-line card summary · research assets found vs Unsplash fallbacks · any deviations.
`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BuildWorkflow({ site, nodes, edges }: { site: Site; nodes: object[]; edges: object[] }) {
  const [config, setConfig] = useState<Config>({
    githubRepo: site.github_repo ?? `adobetoby-maker/${toSlug(site.name)}`,
    domain: site.url?.replace(/^https?:\/\//, '') || `${toSlug(site.name)}.worker-bee.app`,
    localPath: `/Users/drive/${site.github_repo ? site.github_repo.split('/')[1] : toSlug(site.name)}`,
    supabaseProject: '',
    siteType: 'general',
    referenceUrls: '',
    subjectName: site.name,
    enhancements: DEFAULT_ENHANCEMENTS.general,
    buildMode: 'new',
  })
  const [copied, setCopied] = useState('')
  const [showSpec, setShowSpec] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [creds, setCreds] = useState<Record<string, string>>({})
  const [showCreds, setShowCreds] = useState<Record<string, boolean>>({})
  const [vaultImporting, setVaultImporting] = useState(false)
  const [building, setBuilding] = useState(false)
  const [buildDone, setBuildDone] = useState(false)
  const [buildLog, setBuildLog] = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(`build-log-${site.id}`) ?? ''
  })
  const [buildError, setBuildError] = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(`build-error-${site.id}`) ?? ''
  })

  // When site type changes, update enhancement defaults automatically
  useEffect(() => {
    setConfig(c => ({ ...c, enhancements: DEFAULT_ENHANCEMENTS[c.siteType] ?? DEFAULT_ENHANCEMENTS.general }))
  }, [config.siteType])

  useEffect(() => {
    if (buildLog) localStorage.setItem(`build-log-${site.id}`, buildLog)
  }, [buildLog, site.id])

  useEffect(() => {
    if (buildError) localStorage.setItem(`build-error-${site.id}`, buildError)
    else localStorage.removeItem(`build-error-${site.id}`)
  }, [buildError, site.id])

  const typedNodes = nodes as BlueprintNode[]
  const typedEdges = edges as BlueprintEdge[]
  const orderedNodes = useMemo(() => topologicalOrder(typedNodes, typedEdges), [typedNodes, typedEdges])
  const nodesWithoutPrompt = orderedNodes.filter(n => !n.data.claudePrompt?.trim())
  const spec = useMemo(() => generateBuildSpec(site, typedNodes, typedEdges, config), [site, typedNodes, typedEdges, config])

  const enabledCount = Object.values(config.enhancements).filter(Boolean).length

  function toggleEnhancement(key: keyof Enhancements) {
    setConfig(c => ({ ...c, enhancements: { ...c.enhancements, [key]: !c.enhancements[key] } }))
  }

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  function download() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([spec], { type: 'text/markdown' }))
    a.download = `build-${toSlug(site.name)}.md`
    a.click()
  }

  async function importFromVault() {
    setVaultImporting(true)
    try {
      const r = await fetch('/api/credentials?q=' + encodeURIComponent(site.name))
      if (!r.ok) { alert('Vault is locked — unlock it in the Vault tab first.'); return }
      const { credentials } = await r.json() as { credentials: { title: string; apiKey?: string; password?: string }[] }
      const matched: Record<string, string> = {}
      const envVarDefs = ENV_VARS_BY_TYPE[config.siteType] ?? ENV_VARS_BY_TYPE.general
      for (const def of envVarDefs) {
        const hit = credentials.find(c => {
          const t = c.title.toLowerCase()
          const k = def.key.toLowerCase().replace(/_/g, ' ')
          return t.includes(k.split(' ')[0]) || k.split(' ').some(word => word.length > 4 && t.includes(word))
        })
        if (hit?.apiKey) matched[def.key] = hit.apiKey
        else if (hit?.password) matched[def.key] = hit.password
      }
      if (Object.keys(matched).length === 0) {
        alert('No matching credentials found in vault for this site. Add them in the Vault tab first.')
      } else {
        setCreds(prev => ({ ...prev, ...matched }))
      }
    } catch {
      alert('Vault import failed — check your network connection.')
    } finally {
      setVaultImporting(false)
    }
  }

  async function fireLocalBuild() {
    setBuilding(true)
    setBuildLog('')
    setBuildError('')
    setBuildDone(false)
    try {
      const res = await fetch('https://build-api.worker-bee.app/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': 'wb-build-local-9f4a2c' },
        body: JSON.stringify({ spec, siteName: site.name }),
      })
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}))
        setBuildError(d.error ?? `Error ${res.status}`)
        return
      }
      setShowTerminal(true)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullLog = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullLog += chunk
        setBuildLog(prev => prev + chunk)
      }
      if (fullLog.includes('exit code: 0')) setBuildDone(true)
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : String(err))
    } finally {
      setBuilding(false)
    }
  }

  const downloadThenRun = `# 1. Download the spec, then run:\nclaude --dangerously-skip-permissions "$(cat ~/Downloads/build-${toSlug(site.name)}.md)"`

  // Group enhancements for the UI
  const groups = ['Motion', '3D', 'Media & Polish', 'AI Images']

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/sites/${site.id}/blueprint`} className="text-slate-500 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Hammer size={18} className="text-indigo-400" />
            <h1 className="text-2xl font-bold text-white">Build {site.name}</h1>
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{STACK_LABEL[site.stack] ?? site.stack} · {orderedNodes.length} cards</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── PRIMARY: Wizard column ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Step 1 — Site type + subject */}
          <div className="rounded-xl border p-5 space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <span className="text-base">🎯</span>
              <h3 className="text-sm font-bold text-white">Step 1 — What kind of site?</h3>
            </div>
            <div className="flex gap-2 mb-1">
              {(['new', 'iteration'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setConfig(c => ({ ...c, buildMode: mode }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: config.buildMode === mode ? (mode === 'iteration' ? 'rgba(234,179,8,0.15)' : 'rgba(99,102,241,0.2)') : 'var(--surface2)',
                    border: `1px solid ${config.buildMode === mode ? (mode === 'iteration' ? 'rgba(234,179,8,0.4)' : 'rgba(99,102,241,0.5)') : 'transparent'}`,
                    color: config.buildMode === mode ? (mode === 'iteration' ? '#fbbf24' : '#a5b4fc') : 'var(--muted)',
                  }}
                >
                  {mode === 'new' ? '🆕 New Build' : '🔁 Iteration'}
                </button>
              ))}
              {config.buildMode === 'iteration' && (
                <span className="text-[10px] self-center" style={{ color: '#fbbf24' }}>
                  Rewrites existing repo — no scaffold
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SITE_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setConfig(c => ({ ...c, siteType: t.value }))}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all"
                  style={{
                    background: config.siteType === t.value ? 'rgba(99,102,241,0.2)' : 'var(--surface2)',
                    border: `1px solid ${config.siteType === t.value ? 'rgba(99,102,241,0.5)' : 'transparent'}`,
                    color: config.siteType === t.value ? '#a5b4fc' : 'var(--muted-light)',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ConfigField icon={<Search size={13} />} label="Subject / Person Name">
                <input value={config.subjectName} onChange={e => setConfig(c => ({ ...c, subjectName: e.target.value }))} placeholder="e.g. Dr. Toby Anderton" style={inputStyle} className={inputClass} />
              </ConfigField>
              <ConfigField icon={<Globe size={13} />} label="Sites that look like what you want">
                <input value={config.referenceUrls} onChange={e => setConfig(c => ({ ...c, referenceUrls: e.target.value }))} placeholder="e.g. drsmith.com, exampleclinic.com" style={inputStyle} className={inputClass} />
                <p className="text-[10px] mt-1" style={{ color: 'var(--muted)' }}>We will open these and study the design. More = better results.</p>
              </ConfigField>
            </div>
          </div>

          {/* Step 2 — Quality Enhancements */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'rgba(99,102,241,0.06)' }}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">✨</span>
                  <h3 className="text-sm font-bold text-white">Step 2 — Quality Enhancements</h3>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  Smart defaults for <strong className="text-indigo-400">{SITE_TYPES.find(t => t.value === config.siteType)?.label}</strong>. Toggle to adjust.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: enabledCount > 0 ? 'rgba(99,102,241,0.2)' : 'var(--surface2)', color: enabledCount > 0 ? '#818cf8' : 'var(--muted)' }}>
                {enabledCount} active
              </span>
            </div>
            <div className="p-4 space-y-5">
              {groups.map(group => {
                const items = ENHANCEMENT_META.filter(e => e.group === group)
                return (
                  <div key={group}>
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--muted)' }}>{group}</div>
                    <div className="space-y-1.5">
                      {items.map(e => {
                        const on = config.enhancements[e.key]
                        return (
                          <button
                            key={e.key}
                            onClick={() => toggleEnhancement(e.key)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                            style={{
                              background: on ? 'rgba(99,102,241,0.12)' : 'var(--surface2)',
                              border: `1px solid ${on ? 'rgba(99,102,241,0.35)' : 'transparent'}`,
                            }}
                          >
                            <div className="shrink-0 rounded-full flex items-center transition-all px-0.5" style={{ background: on ? '#6366f1' : 'rgba(255,255,255,0.1)', minWidth: 32, height: 18 }}>
                              <div className="w-3.5 h-3.5 rounded-full bg-white transition-transform" style={{ transform: on ? 'translateX(14px)' : 'translateX(0)' }} />
                            </div>
                            <span className="text-base leading-none">{e.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold" style={{ color: on ? 'white' : 'var(--muted-light)' }}>{e.label}</div>
                              <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{e.detail}</div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step 2.5 — Credentials */}
          {/* Step 2.5 — Wire Credentials (post-build) */}
          {(() => {
            const envVarDefs = ENV_VARS_BY_TYPE[config.siteType] ?? ENV_VARS_BY_TYPE.general
            const filledCount = envVarDefs.filter(v => creds[v.key]?.trim()).length
            const [wiring, setWiring] = useState(false)
            const [wireResult, setWireResult] = useState<{ ok: boolean; message: string; redeployUrl?: string } | null>(null)

            async function wireToVercel() {
              setWiring(true)
              setWireResult(null)
              const filled = Object.fromEntries(
                envVarDefs.filter(v => creds[v.key]?.trim()).map(v => [v.key, creds[v.key]])
              )
              try {
                const r = await fetch('/api/vercel-wire', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ projectName: toSlug(site.name), envVars: filled }),
                })
                const data = await r.json()
                setWireResult({ ok: data.ok, message: data.message ?? data.error, redeployUrl: data.redeployUrl })
              } catch (e) {
                setWireResult({ ok: false, message: String(e) })
              } finally {
                setWiring(false)
              }
            }

            return (
              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'rgba(16,185,129,0.05)' }}>
                  <div>
                    <div className="flex items-center gap-2">
                      <KeyRound size={14} className="text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">Step 2.5 — Wire Credentials</h3>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      Fill in after build. Site deploys first — credentials get pushed to Vercel and trigger a redeploy.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{
                      background: filledCount > 0 ? 'rgba(16,185,129,0.2)' : 'var(--surface2)',
                      color: filledCount > 0 ? '#34d399' : 'var(--muted)',
                    }}>
                      {filledCount}/{envVarDefs.length} filled
                    </span>
                    <button
                      onClick={importFromVault}
                      disabled={vaultImporting}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
                      style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', cursor: vaultImporting ? 'default' : 'pointer' }}
                    >
                      <ShieldCheck size={11} />
                      {vaultImporting ? 'Importing…' : 'Import from Vault'}
                    </button>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 gap-2.5">
                  {envVarDefs.map(v => (
                    <div key={v.key} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <label className="text-[10px] font-bold uppercase tracking-wide block mb-1" style={{ color: 'var(--muted)' }}>{v.label}</label>
                        <div className="relative">
                          <input
                            type={v.secret && !showCreds[v.key] ? 'password' : 'text'}
                            value={creds[v.key] ?? ''}
                            onChange={e => setCreds(prev => ({ ...prev, [v.key]: e.target.value }))}
                            placeholder={v.hint}
                            className={inputClass}
                            style={{ ...inputStyle, paddingRight: v.secret ? '36px' : undefined }}
                          />
                          {v.secret && (
                            <button
                              onClick={() => setShowCreds(p => ({ ...p, [v.key]: !p[v.key] }))}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                            >
                              {showCreds[v.key] ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          )}
                        </div>
                      </div>
                      {creds[v.key]?.trim() && <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-5" />}
                    </div>
                  ))}

                  {/* Wire button */}
                  <button
                    onClick={wireToVercel}
                    disabled={wiring || filledCount === 0}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all mt-1"
                    style={{
                      background: filledCount === 0 ? 'var(--surface2)' : wiring ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg, #059669, #10b981)',
                      color: filledCount === 0 ? 'var(--muted)' : wiring ? '#34d399' : 'white',
                      border: filledCount === 0 ? '1px solid var(--border)' : 'none',
                      cursor: filledCount === 0 || wiring ? 'default' : 'pointer',
                    }}
                  >
                    {wiring
                      ? <><Loader2 size={14} className="animate-spin" /> Wiring to Vercel…</>
                      : <><ShieldCheck size={14} /> Wire {filledCount > 0 ? filledCount : ''} Credential{filledCount !== 1 ? 's' : ''} to Vercel</>
                    }
                  </button>

                  {wireResult && (
                    <div className={`flex items-start gap-2 text-xs p-3 rounded-lg ${wireResult.ok ? 'text-emerald-300' : 'text-red-400'}`}
                      style={{ background: wireResult.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${wireResult.ok ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                      {wireResult.ok ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> : <AlertCircle size={13} className="shrink-0 mt-0.5" />}
                      <div>
                        {wireResult.message}
                        {wireResult.redeployUrl && (
                          <a href={wireResult.redeployUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 underline text-emerald-400">
                            Redeploy in progress ↗
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {filledCount === 0 && !wireResult && (
                    <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                      Build runs without credentials. Fill these in after the site is up, then wire them with one click.
                    </p>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Step 3 — Launch */}
          <div className="rounded-xl border p-5" style={{ background: 'rgba(99,102,241,0.07)', borderColor: 'rgba(99,102,241,0.3)' }}>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={15} className="text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Step 3 — Send to Worker Bee</h3>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
              Fires the build on your Mac Studio with the full spec. Streams output live. Deploys automatically when done.
            </p>

            {/* Success banner */}
            {buildDone && (
              <div className="flex items-center gap-3 rounded-xl px-4 py-3 mb-3" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)' }}>
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-emerald-300">Build complete!</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    {config.domain
                      ? <a href={`https://${config.domain}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline">{config.domain} ↗</a>
                      : 'Check the build log for the deployment URL.'
                    }
                    <span className="ml-2">Deployment protection disabled — live for clients.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Send to Worker Bee button */}
            <button
              onClick={fireLocalBuild}
              disabled={building}
              className="flex items-center justify-center gap-2 w-full px-4 py-4 rounded-xl text-sm font-bold transition-all mb-3"
              style={{
                background: building ? 'rgba(16,185,129,0.2)' : buildDone ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg, #10b981, #059669)',
                color: building ? '#34d399' : buildDone ? '#6ee7b7' : 'white',
                border: (building || buildDone) ? '1px solid rgba(16,185,129,0.4)' : 'none',
                cursor: building ? 'default' : 'pointer',
              }}
            >
              {building
                ? <><Loader2 size={15} className="animate-spin" /> Building on Mac Studio…</>
                : buildDone
                  ? <><CheckCircle2 size={15} /> Done — Run Again</>
                  : <><Zap size={15} /> Send to Worker Bee</>
              }
            </button>

            {buildError && (
              <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2 mb-3">
                {buildError.includes('fetch') || buildError.includes('Failed')
                  ? 'Mac Studio offline — start worker-bee-dev/start.sh first'
                  : buildError}
              </div>
            )}

            {/* Build log stream */}
            {buildLog && (
              <div className="rounded-lg overflow-hidden mb-3" style={{ background: '#0a0f0a', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'rgba(16,185,129,0.15)' }}>
                  <span className="text-xs font-semibold" style={{ color: '#34d399' }}>Build output</span>
                  <button onClick={() => setBuildLog('')} className="text-xs text-slate-600 hover:text-slate-400">clear</button>
                </div>
                <pre className="text-xs p-3 overflow-auto max-h-48 leading-relaxed whitespace-pre-wrap" style={{ color: '#86efac' }}>{buildLog}</pre>
              </div>
            )}

            <div className="flex gap-2 mb-3">
              {/* Browser terminal */}
              <button
                onClick={() => setShowTerminal(v => !v)}
                className="flex items-center gap-1.5 flex-1 justify-center px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: 'var(--surface2)', color: 'var(--muted-light)', border: `1px solid ${showTerminal ? 'rgba(99,102,241,0.4)' : 'var(--border)'}` }}
              >
                <Terminal size={12} /> {showTerminal ? 'Hide Terminal' : 'Browser Terminal'}
              </button>

              {/* Download fallback */}
              <button onClick={download} className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors" style={{ background: 'var(--surface2)', color: 'var(--muted-light)', border: '1px solid var(--border)' }}>
                <Download size={12} /> Download spec
              </button>
              <button onClick={() => copy(spec, 'spec')} className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors" style={{ background: 'var(--surface2)', color: 'var(--muted-light)', border: '1px solid var(--border)' }}>
                <Copy size={12} />{copied === 'spec' ? 'Copied!' : 'Copy spec'}
              </button>
            </div>

            {/* Terminal iframe */}
            {showTerminal && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.3)', height: 420 }}>
                <div className="flex items-center justify-between px-3 py-2" style={{ background: '#0a0d14', borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
                  <span className="text-xs font-semibold" style={{ color: '#818cf8' }}>terminal.worker-bee.app</span>
                  <a href="https://terminal.worker-bee.app" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-600 hover:text-slate-400">pop out ↗</a>
                </div>
                <iframe
                  src="https://terminal.worker-bee.app"
                  className="w-full"
                  style={{ height: 376, border: 'none', background: '#0a0f0a' }}
                  allow="clipboard-read; clipboard-write"
                />
              </div>
            )}
          </div>

          {/* Spec preview */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setShowSpec(v => !v)} className="flex items-center gap-1.5 text-sm font-semibold text-white">
                {showSpec ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Build Spec Preview
              </button>
              <button onClick={() => copy(spec, 'spec')} className="flex items-center gap-1.5 text-xs border px-2.5 py-1.5 rounded-lg transition-colors hover:border-white/20" style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
                <Copy size={11} />{copied === 'spec' ? 'Copied!' : 'Copy full spec'}
              </button>
            </div>
            {showSpec
              ? <pre className="text-xs p-4 overflow-auto max-h-96 leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--muted-light)' }}>{spec}</pre>
              : <div className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{spec.split('\n').length} lines · 7 phases · {enabledCount} enhancement{enabledCount !== 1 ? 's' : ''} — click to preview</div>
            }
          </div>
        </div>

        {/* ── SECONDARY: Blueprint + Advanced config ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Blueprint summary */}
          <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Blueprint ({orderedNodes.length} cards)</h3>
            {orderedNodes.length === 0 ? (
              <p className="text-sm text-slate-500">No cards yet. <Link href={`/sites/${site.id}/blueprint`} className="text-indigo-400 hover:text-indigo-300">Open blueprint →</Link></p>
            ) : (
              <div className="space-y-1.5">
                {orderedNodes.map((n, i) => (
                  <div key={n.id} className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>{i + 1}</span>
                    <span className="text-white font-medium truncate">{n.data.title || 'Untitled'}</span>
                    <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide shrink-0" style={{ color: TYPE_COLOR[n.data.type] ?? 'var(--muted)' }}>{n.data.type}</span>
                    {!n.data.claudePrompt?.trim() ? <AlertCircle size={12} className="text-amber-500 shrink-0" /> : <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
            {nodesWithoutPrompt.length > 0 && (
              <div className="mt-3 flex items-start gap-2 text-xs p-2.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b' }}>
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                {nodesWithoutPrompt.length} card{nodesWithoutPrompt.length > 1 ? 's' : ''} missing instructions — we will infer.
              </div>
            )}
          </div>

          {/* Build Phases */}
          <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Build Phases</h3>
            <div className="space-y-2">
              {[
                ['Phase 0', 'Research',            'Real photos · bio · reviews',     'text-pink-400'],
                ['Phase 1', 'Provision',            'GitHub · scaffold · Vercel',      'text-blue-400'],
                ['Phase 2', `Build ${orderedNodes.length} Cards`, 'Design floor + enhancements', 'text-purple-400'],
                ['Phase 3', 'Design Elevation',    '/frontend-design',                'text-amber-400'],
                ['Phase 4', 'Code Review',          '/review',                         'text-green-400'],
                ['Phase 5', 'Deploy',               'vercel --prod · alias domain',    'text-indigo-400'],
                ['Phase 6', 'Report Back',          'Blueprint status update',         'text-slate-400'],
              ].map(([phase, title, detail, color]) => (
                <div key={phase} className="flex items-start gap-3 text-sm">
                  <span className={`text-xs font-bold shrink-0 w-16 ${color}`}>{phase}</span>
                  <div>
                    <div className="text-white font-medium">{title}</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>{detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced config — collapsed by default */}
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--muted-light)' }}>
                {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Advanced Config
              </div>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>GitHub · domain · path</span>
            </button>
            {showAdvanced && (
              <div className="px-4 pb-4 pt-1 space-y-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <ConfigField icon={<GitBranch size={13} />} label="GitHub Repo">
                  <input value={config.githubRepo} onChange={e => setConfig(c => ({ ...c, githubRepo: e.target.value }))} placeholder="org/repo-name" style={inputStyle} className={inputClass} />
                </ConfigField>
                <ConfigField icon={<Globe size={13} />} label="Domain">
                  <input value={config.domain} onChange={e => setConfig(c => ({ ...c, domain: e.target.value }))} placeholder="example.worker-bee.app" style={inputStyle} className={inputClass} />
                </ConfigField>
                <ConfigField icon={<Database size={13} />} label="Local path">
                  <input value={config.localPath} onChange={e => setConfig(c => ({ ...c, localPath: e.target.value }))} placeholder="/Users/drive/project" style={inputStyle} className={inputClass} />
                </ConfigField>
                <ConfigField icon={<Database size={13} />} label="Supabase project">
                  <input value={config.supabaseProject} onChange={e => setConfig(c => ({ ...c, supabaseProject: e.target.value }))} placeholder="leave blank if not needed" style={inputStyle} className={inputClass} />
                </ConfigField>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfigField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>
        {icon}{label}
      </label>
      {children}
    </div>
  )
}

const inputClass = "w-full rounded-lg border px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
const inputStyle = { background: 'var(--surface2)', borderColor: 'var(--border)' }
const TYPE_COLOR: Record<string, string> = {
  page: '#3b82f6', section: '#8b5cf6', component: '#f59e0b', api: '#10b981', data: '#ef4444',
}

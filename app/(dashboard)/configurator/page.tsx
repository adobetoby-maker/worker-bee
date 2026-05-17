'use client'
import { useState } from 'react'
import { Download, Copy, Cpu, ChevronDown, ChevronRight, RefreshCw, Terminal, Package, BookOpen, Hash, Wifi, WifiOff, ExternalLink, RotateCcw, Layers } from 'lucide-react'
import { useEffect, useCallback } from 'react'

// ── Project Configurator data ─────────────────────────────────────────────────

const TEMPLATES = {
  nextjs: {
    label: 'Next.js App',
    claude: (d: FormData) => `# CLAUDE.md

## Project: ${d.name}
${d.description ? `\n${d.description}\n` : ''}
## Commands
\`\`\`bash
npm run dev      # dev server on localhost:3000
npm run build    # production build
npm run lint     # ESLint
\`\`\`

## Stack
- Next.js ${d.nextjsVersion || '16'} App Router (read \`node_modules/next/dist/docs/\` before writing Next.js code — breaking changes)
${d.supabase ? '- Supabase — use \`lib/supabase/server.ts\` in Server Components, \`lib/supabase/client.ts\` in client components\n' : ''}\
${d.tailwind ? '- Tailwind CSS v4 (CSS-first config in globals.css — no tailwind.config.js)\n' : ''}\
${d.typescript ? '- TypeScript — strict mode\n' : ''}\

## Route Map
${d.routes || '- `/` — home page'}

## Key Rules
- Never import server-only Supabase clients (service role) in client components
- Use \`export const dynamic = "force-dynamic"\` on pages that query the DB
- All admin routes require session validation before any data access
- Prefer RSC for data fetching; use client components only for interactivity

## Model Routing
- **Haiku 4.5** — file ops, renames, installs, git commits, string replacements (~1/10 cost)
- **Sonnet 4.6** — TypeScript, architecture, multi-file debugging, content writing (default)
- **Opus 4.7** — high-stakes strategic decisions only (10× cost — use sparingly)

Switch with: \`/model haiku\` | \`/model sonnet\` | \`/model opus\`

## Site Build Pipeline

Follow these phases in order. Invoke each skill with \`/skill-name\` in Claude Code.

${generatePipelineClaude()}

## Pre-Ship Checklist

Before every deploy, verify:

- [ ] \`app/sitemap.ts\` exists and lists all public routes
- [ ] \`app/robots.ts\` exists and points to sitemap URL
- [ ] Every page has \`export const metadata\` with title + description
- [ ] Layout has \`metadataBase\`, OG tags, and Twitter card
- [ ] JSON-LD structured data in layout (Organization) or per-page (Article/Product)
- [ ] All \`<form>\` elements POST to a real \`/api/\` route — no fake timeouts
- [ ] \`@vercel/analytics\` imported in root layout
- [ ] CLAUDE.md reflects current Next.js version, env vars, and stack

## Visual Excellence Standards

Every site targets Apple/Linear/Vercel quality. Use this tiered stack:

### Tier 1 — Always on (zero maintenance, pure CSS)
\`\`\`css
/* Animatable CSS variables — smooth, hardware-accelerated */
@property --accent-h { syntax: '<number>'; initial-value: 250; inherits: false; }
@property --gradient-stop { syntax: '<percentage>'; initial-value: 0%; inherits: false; }

/* Glass depth layers */
.glass { backdrop-filter: blur(20px) saturate(180%); background: rgba(255,255,255,0.08); }

/* High-contrast text inversion (Apple-style) */
.blend-text { mix-blend-mode: difference; color: white; }
\`\`\`

### Tier 2 — Scroll animation (low maintenance, React-native)
\`\`\`bash
npm i lenis framer-motion
\`\`\`
- **Lenis**: Wrap root layout — 1 import, inertia scroll used by Vercel/Linear
- **Framer Motion \`useScroll\` + \`useTransform\`**: Scroll-driven parallax, scale, opacity
- Use \`<motion.div style={{ y, opacity, scale }}\` from scroll transforms — no GSAP needed for most effects

### Tier 3 — Complex timelines (medium maintenance, use selectively)
\`\`\`bash
npm i gsap @gsap/react
\`\`\`
- Only when multiple elements need scrub-exact synchronized timing
- Wrap in \`useGSAP\` hook to prevent memory leaks
- Always cleanup: \`return () => ctx.revert()\`

### Tier 4 — 3D / WebGL (higher maintenance, hero moments only)
\`\`\`bash
npm i three @react-three/fiber @react-three/drei
\`\`\`
- One 3D canvas per page maximum — performance budget matters
- Always add \`<Canvas dpr={[1, 2]} performance={{ min: 0.5 }}\` for mobile
- Fallback to a static image if \`canvas\` not supported: \`<noscript><img …/>\`
- Use \`Suspense\` + \`useLoader\` — never block the main thread

### Variable Fonts
\`\`\`css
/* Use CSS optical sizing — single font file covers all weights */
body { font-optical-sizing: auto; }
h1 { font-variation-settings: 'opsz' 72, 'wght' 800; }
\`\`\`

### Rule of thumb
CSS techniques → always. Framer Motion → scroll reveals. GSAP → complex scrub. Three.js → hero only. This = Apple visual quality at low-to-medium maintenance cost.

## Image Generation
ComfyUI runs locally at \`127.0.0.1:8000\` with SDXL Base 1.0. Use the \`comfy\` MCP plugin:
1. \`create_workflow\` (template: "txt2img") with a descriptive photorealistic prompt
2. \`enqueue_workflow\` — returns \`prompt_id\` immediately
3. Monitor then \`list_output_images\` to get the result
4. Save to \`public/images/\` and reference in code

Always include \`negative_prompt: "text, watermark, letters, words, blurry"\`. Best at 1024×1024 or 1216×832.
`,
    settings: {
      model: 'claude-sonnet-4-6',
      permissions: { defaultMode: 'auto' },
      visual_stack: {
        tier1_always: ['CSS @property', 'backdrop-filter', 'mix-blend-mode'],
        tier2_scroll: ['lenis', 'framer-motion'],
        tier3_timelines: ['gsap', '@gsap/react'],
        tier4_3d: ['three', '@react-three/fiber', '@react-three/drei'],
        fonts: ['font-optical-sizing: auto', 'font-variation-settings'],
      },
    },
  },
  wordpress: {
    label: 'WordPress',
    claude: (d: FormData) => `# CLAUDE.md

## Project: ${d.name}
${d.description ? `\n${d.description}\n` : ''}
### Site Info
- **URL:** ${d.url || 'https://example.com'}
- **Stack:** WordPress
- **Theme:** ${d.wpTheme || 'custom'}

### Common Operations
- Edit theme: \`wp-content/themes/${d.wpTheme || 'custom'}/\`
- REST API: \`${d.url || 'https://example.com'}/wp-json/wp/v2/\`
- Plugins: \`wp-content/plugins/\`

### Key Rules
- Always test on staging before prod
- Use child themes for customizations
- Back up database before migrations

### Image Generation
ComfyUI runs locally at \`127.0.0.1:8000\` with SDXL Base 1.0. Use the \`comfy\` MCP plugin: \`create_workflow\` (txt2img) → \`enqueue_workflow\` → monitor → save result to the theme's images folder. Use for hero images, banners, and any site photography.
`,
    settings: { model: 'claude-sonnet-4-6', permissions: { defaultMode: 'auto' } },
  },
  general: {
    label: 'General',
    claude: (d: FormData) => `# CLAUDE.md

## Project: ${d.name}
${d.description ? `\n${d.description}\n` : ''}
### Commands
\`\`\`bash
${d.devCommand || '# add your dev command here'}
${d.buildCommand || '# add your build command here'}
\`\`\`

### Key Rules
- ${d.rules || 'Add your project-specific rules here'}

### Image Generation
ComfyUI runs locally at \`127.0.0.1:8000\` with SDXL Base 1.0. Use the \`comfy\` MCP plugin: \`create_workflow\` (txt2img) → \`enqueue_workflow\` → monitor → save result to the project's images folder. Use for hero images, section backgrounds, and any site photography.
`,
    settings: { model: 'claude-sonnet-4-6', permissions: { defaultMode: 'auto' } },
  },
}

type Mode = 'project' | 'restore' | 'commands' | 'tunnel' | 'pipeline'
type ServiceStatus = 'checking' | 'up' | 'down'
type TemplateKey = keyof typeof TEMPLATES
type FormData = {
  name: string; description: string; url: string; routes: string; rules: string
  devCommand: string; buildCommand: string; nextjsVersion: string; wpTheme: string
  supabase: boolean; tailwind: boolean; typescript: boolean
}

const SKILLS = [
  { id: 'superpowers', label: 'Superpowers', desc: 'Brainstorming, TDD, debugging workflows' },
  { id: 'searchfit-seo', label: 'SearchFit SEO', desc: 'Content strategy, keyword clustering, schema markup' },
  { id: 'ruflo-rag-memory', label: 'Ruflo RAG Memory', desc: 'Vector memory, hybrid search, graph RAG' },
  { id: 'ruflo-swarm', label: 'Ruflo Swarm', desc: 'Hierarchical multi-agent coordination' },
  { id: 'feature-dev', label: 'Feature Dev', desc: 'Architecture, code exploration, review' },
  { id: 'vercel', label: 'Vercel', desc: 'Deployment, CI/CD, performance' },
  { id: 'pr-review-toolkit', label: 'PR Review', desc: 'Code review, type design, test analysis' },
]

// ── Workspace Restore data ────────────────────────────────────────────────────

const PLUGIN_GROUPS = [
  {
    label: 'Core Workflow',
    plugins: [
      'superpowers@claude-plugins-official',
      'frontend-design@claude-plugins-official',
      'feature-dev@claude-plugins-official',
      'code-review@claude-plugins-official',
      'code-simplifier@claude-plugins-official',
      'pr-review-toolkit@claude-plugins-official',
      'commit-commands@claude-plugins-official',
      'hookify@claude-plugins-official',
    ],
  },
  {
    label: 'AI & Agent Development',
    plugins: [
      'agent-sdk-dev@claude-plugins-official',
      'claude-code-setup@claude-plugins-official',
      'claude-md-management@claude-plugins-official',
      'skill-creator@claude-plugins-official',
      'plugin-dev@claude-plugins-official',
      'mcp-server-dev@claude-plugins-official',
      'playground@claude-plugins-official',
    ],
  },
  {
    label: 'Platform Integrations',
    plugins: [
      'vercel@claude-plugins-official',
      'supabase@claude-plugins-official',
      'cloudflare@claude-plugins-official',
      'stripe@claude-plugins-official',
      'slack@claude-plugins-official',
      'github@claude-plugins-official',
      'figma@claude-plugins-official',
      'postman@claude-plugins-official',
      'sentry@claude-plugins-official',
      'firecrawl@claude-plugins-official',
      'playwright@claude-plugins-official',
      'chrome-devtools-mcp@claude-plugins-official',
      'serena@claude-plugins-official',
    ],
  },
  {
    label: 'Ruflo Suite',
    plugins: [
      'ruflo-rag-memory@ruflo',
      'ruflo-swarm@ruflo',
      'ruflo-intelligence@ruflo',
      'ruflo-agentdb@ruflo',
      'ruflo-aidefence@ruflo',
      'ruflo-autopilot@ruflo',
      'ruflo-browser@ruflo',
      'ruflo-core@ruflo',
      'ruflo-cost-tracker@ruflo',
      'ruflo-daa@ruflo',
      'ruflo-ddd@ruflo',
      'ruflo-docs@ruflo',
      'ruflo-federation@ruflo',
      'ruflo-goals@ruflo',
      'ruflo-jujutsu@ruflo',
      'ruflo-knowledge-graph@ruflo',
      'ruflo-loop-workers@ruflo',
      'ruflo-market-data@ruflo',
      'ruflo-migrations@ruflo',
      'ruflo-neural-trader@ruflo',
      'ruflo-observability@ruflo',
      'ruflo-plugin-creator@ruflo',
      'ruflo-ruvector@ruflo',
      'ruflo-ruvllm@ruflo',
      'ruflo-rvf@ruflo',
      'ruflo-security-audit@ruflo',
      'ruflo-sparc@ruflo',
      'ruflo-testgen@ruflo',
      'ruflo-wasm@ruflo',
      'ruflo-workflows@ruflo',
      'ruflo-adr@ruflo',
      'ruflo-iot-cognitum@ruflo',
    ],
  },
  {
    label: 'Specialized',
    plugins: [
      'searchfit-seo@claude-plugins-official',
      'huggingface-skills@claude-plugins-official',
      'coderabbit@claude-plugins-official',
      'remember@claude-plugins-official',
      'product-tracking-skills@claude-plugins-official',
      'mintlify@claude-plugins-official',
      'microsoft-docs@claude-plugins-official',
      'imessage@claude-plugins-official',
      'zapier@claude-plugins-official',
      'spotify-ads-api@claude-plugins-official',
      'amazon-location-service@claude-plugins-official',
      'qodo-skills@claude-plugins-official',
      'comfy@comfyui-mcp',
    ],
  },
]

// ── Slash Commands reference data ────────────────────────────────────────────

const COMMAND_GROUPS = [
  {
    label: 'TAC — Session Bootstrap',
    color: '#f59e0b',
    commands: [
      { cmd: '/tac', desc: 'Full session bootstrap: sync memory, show projects, model routing guide, skills menu, and ask what to work on' },
      { cmd: '/tac <topic>', desc: 'Bootstrap and immediately focus on a topic — e.g. /tac worker-bee or /tac jrs-auto-repair' },
    ],
  },
  {
    label: 'Built-in Claude Code',
    color: '#6366f1',
    commands: [
      { cmd: '/help', desc: 'Show all available commands and keyboard shortcuts' },
      { cmd: '/clear', desc: 'Clear the conversation and start fresh' },
      { cmd: '/compact', desc: 'Compact conversation history to free context window' },
      { cmd: '/resume [id]', desc: 'Resume a previous session by ID (or omit for a picker)' },
      { cmd: '/init', desc: 'Create CLAUDE.md in the current project' },
      { cmd: '/cost', desc: 'Show token usage and estimated cost for the session' },
      { cmd: '/model', desc: 'Switch AI model (sonnet / opus / haiku)' },
      { cmd: '/fast', desc: 'Toggle Fast mode (Opus 4.6 with faster output)' },
      { cmd: '/bug', desc: 'Report a Claude Code bug with context' },
      { cmd: '/doctor', desc: 'Diagnose Claude Code installation issues' },
      { cmd: '/login', desc: 'Switch Anthropic accounts' },
      { cmd: '/logout', desc: 'Sign out of current account' },
      { cmd: '/memory', desc: 'View or edit memory files' },
      { cmd: '/permissions', desc: 'Show current permission settings' },
      { cmd: '/mcp', desc: 'Manage MCP servers (list, add, remove)' },
      { cmd: '/ide', desc: 'Open current file in IDE extension' },
      { cmd: '/review', desc: 'Review staged git changes' },
      { cmd: '/pr [#]', desc: 'Review a GitHub pull request by number' },
      { cmd: '/status', desc: 'Show workspace and project status' },
      { cmd: '/terminal', desc: 'Open a new terminal pane' },
      { cmd: '/vim', desc: 'Open a file in vim within the session' },
    ],
  },
  {
    label: 'Superpowers Plugin',
    color: '#f59e0b',
    commands: [
      { cmd: '/btw', desc: 'Branch the current conversation into a side thread' },
      { cmd: '/ultrareview', desc: 'Multi-agent cloud code review (current branch or /ultrareview <PR#>)' },
      { cmd: '/loop', desc: 'Start an autonomous self-pacing loop for a task' },
      { cmd: '/hookify', desc: 'Analyze conversation to surface patterns worth preventing via hooks' },
      { cmd: '/statusline-setup', desc: 'Configure the Claude Code status line display' },
    ],
  },
  {
    label: 'GStack (garrytan/gstack)',
    color: '#10b981',
    commands: [
      { cmd: '/review', desc: 'Thorough code review with actionable feedback' },
      { cmd: '/qa', desc: 'QA pass — find edge cases, test gaps, regressions' },
      { cmd: '/ship', desc: 'Pre-ship checklist: review → QA → commit → deploy' },
      { cmd: '/cso', desc: 'Chief Security Officer lens — security audit of current changes' },
      { cmd: '/office-hours', desc: 'Business / product strategy session (landscape, positioning)' },
      { cmd: '/plan-ceo-review', desc: 'CEO-lens review of a plan or spec before execution' },
      { cmd: '/brainstorm', desc: 'Structured brainstorm with multiple divergent options' },
      { cmd: '/debug', desc: 'Systematic debugging workflow with root-cause focus' },
      { cmd: '/refactor', desc: 'Refactor code for clarity, DRY, and maintainability' },
      { cmd: '/perf', desc: 'Performance audit — identify and fix bottlenecks' },
      { cmd: '/docs', desc: 'Generate or improve documentation for current code' },
      { cmd: '/test', desc: 'Write comprehensive tests for the current code' },
      { cmd: '/explain', desc: 'Deep explanation of how the current code works' },
      { cmd: '/standup', desc: 'Generate a standup summary from recent git activity' },
      { cmd: '/pr-draft', desc: 'Draft a pull request description from current changes' },
    ],
  },
  {
    label: 'Vercel Plugin',
    color: '#e2e8f0',
    commands: [
      { cmd: '/deploy', desc: 'Deploy current project to Vercel (preview or production)' },
      { cmd: '/deploy prod', desc: 'Deploy directly to production with confirmation prompt' },
      { cmd: '/bootstrap', desc: 'Bootstrap a new Vercel project: link, env, DB, dev server' },
      { cmd: '/status', desc: 'Full project observability: deployments, drains, errors' },
      { cmd: '/env list', desc: 'List all environment variables for the linked project' },
      { cmd: '/env pull', desc: 'Sync Vercel env vars to local .env.local' },
    ],
  },
  {
    label: 'Ruflo Suite',
    color: '#a78bfa',
    commands: [
      { cmd: '/memory search <q>', desc: 'Semantic search across RAG memory (ruflo-rag-memory)' },
      { cmd: '/swarm init', desc: 'Initialize hierarchical multi-agent swarm (ruflo-swarm)' },
      { cmd: '/swarm spawn', desc: 'Spawn a specialized agent within the swarm' },
      { cmd: '/audit', desc: 'Security audit of current code (ruflo-security-audit)' },
      { cmd: '/testgen', desc: 'Generate comprehensive test suite (ruflo-testgen)' },
      { cmd: '/workflow run', desc: 'Execute a named workflow (ruflo-workflows)' },
    ],
  },
  {
    label: 'SearchFit SEO',
    color: '#06b6d4',
    commands: [
      { cmd: '/seo-audit', desc: 'Full SEO audit of current site or codebase' },
      { cmd: '/content-strategy', desc: 'Build a content plan for a given site and audience' },
      { cmd: '/competitor-analysis', desc: 'Analyze competitors SEO and content strategy' },
    ],
  },
]

const PIPELINE_PHASES = [
  {
    phase: 1,
    label: 'Design',
    color: '#f59e0b',
    tagline: 'Before writing any code — pick a visual direction and set the visual standard',
    skills: [
      { cmd: '/design-shotgun', source: 'GStack', desc: 'Generate 3 divergent UI directions — pick the strongest before building' },
      { cmd: '/tailwind-design-system', source: 'Antigravity', desc: 'Define color palette, type scale, and spacing tokens for the whole site' },
      { cmd: '/shadcn', source: 'Antigravity', desc: 'Scaffold shadcn/ui: radius, accent color, and base component set' },
      { cmd: '/landing-page-generator', source: 'Antigravity', desc: 'Hero layout, CTA structure, social proof, conversion section patterns' },
      { cmd: 'CSS @property + backdrop-filter', source: 'Visual', desc: 'Zero-maintenance: animatable CSS variables, glass layers, mix-blend-mode text — always on' },
      { cmd: 'Lenis smooth scroll', source: 'Visual', desc: 'npm i lenis — inertia scroll used by Vercel/Linear/Apple. 1 import, near-zero maintenance' },
      { cmd: 'Framer Motion useScroll', source: 'Visual', desc: 'Scroll-driven parallax, opacity, scale reveals — React-native, low maintenance, no canvas' },
      { cmd: 'GSAP ScrollTrigger', source: 'Visual', desc: 'Scrub-exact multi-element timelines — use when Framer Motion is not precise enough (medium maintenance)' },
      { cmd: 'Three.js / R3F hero', source: 'Visual', desc: 'WebGL 3D product renders, particle fields — hero moments only, not every page (higher maintenance)' },
      { cmd: 'Variable fonts + optical sizing', source: 'Visual', desc: 'font-variation-settings, font-optical-sizing: auto — single font file, infinite weight range' },
    ],
  },
  {
    phase: 2,
    label: 'Architecture',
    color: '#6366f1',
    tagline: 'Before writing routes or components — plan the build',
    skills: [
      { cmd: '/autoplan', source: 'GStack', desc: 'Auto-plan implementation approach before any coding begins' },
      { cmd: '/nextjs-best-practices', source: 'Antigravity', desc: 'App Router rules, RSC vs client, data fetching, caching strategy' },
      { cmd: '/nextjs-app-router-patterns', source: 'Antigravity', desc: 'Streaming, PPR, parallel routes, layout composition' },
      { cmd: '/nextjs-supabase-auth', source: 'Antigravity', desc: 'Server-side auth, session management, protected routes' },
      { cmd: '/react-best-practices', source: 'Antigravity', desc: 'React 19 patterns, memoization, transitions, concurrent features' },
      { cmd: '/supabase-automation', source: 'Antigravity', desc: 'DB schema design, RLS policies, edge functions, storage buckets' },
      { cmd: '/vercel-ai-sdk-expert', source: 'Antigravity', desc: 'AI SDK streaming, tool calls, embedding + retrieval patterns' },
    ],
  },
  {
    phase: 3,
    label: 'Content & SEO',
    color: '#06b6d4',
    tagline: 'After routes exist — fill with high-ranking content',
    skills: [
      { cmd: '/content-strategy', source: 'Antigravity', desc: 'Topic clusters, pillar pages, content roadmap for 6–12 months' },
      { cmd: '/seo-keyword-strategist', source: 'Antigravity', desc: 'Keyword targeting, density analysis, search intent mapping' },
      { cmd: '/seo-technical', source: 'Antigravity', desc: 'Per-page metadata, OG/Twitter tags, canonical URLs, title template' },
      { cmd: '/seo-aeo-blog-writer', source: 'Antigravity', desc: 'Long-form SEO posts with AEO optimization for AI answer engines' },
      { cmd: '/copywriting', source: 'Antigravity', desc: 'Conversion-focused hero copy, CTAs, benefit-led section content' },
      { cmd: 'app/sitemap.ts', source: 'Checklist', desc: 'Create Next.js sitemap route — all URLs with changeFrequency + priority' },
      { cmd: 'app/robots.ts', source: 'Checklist', desc: 'Create robots route — allow all, point to sitemap URL' },
      { cmd: 'JSON-LD script', source: 'Checklist', desc: 'Add Organization/Offer/Article structured data to layout or page' },
    ],
  },
  {
    phase: 4,
    label: 'Quality & Security',
    color: '#10b981',
    tagline: 'Before deployment — catch every issue',
    skills: [
      { cmd: '/production-code-audit', source: 'Antigravity', desc: 'Deep static analysis: security holes, perf bottlenecks, correctness' },
      { cmd: '/review', source: 'GStack', desc: 'Staff engineer lens: architecture, patterns, maintainability' },
      { cmd: '/qa', source: 'GStack', desc: 'Browser QA: golden path, edge cases, regression check' },
      { cmd: '/cso', source: 'GStack', desc: 'Security audit: OWASP Top 10 + STRIDE threat model' },
      { cmd: '/testing-patterns', source: 'Antigravity', desc: 'Jest + factory pattern test suite for critical code paths' },
      { cmd: 'Forms wired?', source: 'Checklist', desc: 'Every form POSTs to a real /api/ route — no setTimeout fake submits' },
      { cmd: 'Analytics added?', source: 'Checklist', desc: 'Add @vercel/analytics or Plausible before deploy — 1 import in layout' },
      { cmd: 'CLAUDE.md current?', source: 'Checklist', desc: 'Update stack versions, env vars, and model routing before shipping' },
    ],
  },
  {
    phase: 5,
    label: 'Ship & Monetize',
    color: '#a78bfa',
    tagline: 'Deploy, measure, and optimize for revenue',
    skills: [
      { cmd: '/ship', source: 'GStack', desc: 'Pre-ship checklist: review → QA → commit → Vercel deploy' },
      { cmd: '/vercel-deployment', source: 'Antigravity', desc: 'Vercel project config, env vars, domain, and preview URL setup' },
      { cmd: '/office-hours', source: 'GStack', desc: 'CEO lens: business model, pricing, positioning, monetization hooks' },
      { cmd: '/seo-audit', source: 'Antigravity', desc: 'Post-launch SEO crawl: index coverage, ranking signals, fixes' },
    ],
  },
]

function generatePipelineClaude(): string {
  return PIPELINE_PHASES.map(p =>
    `**Phase ${p.phase} — ${p.label}** _(${p.tagline})_\n` +
    p.skills.map(s => `- \`${s.cmd}\` [${s.source}] — ${s.desc}`).join('\n')
  ).join('\n\n')
}

const GSTACK_INSTALL = `# GStack (garrytan/gstack) — requires bun
curl -fsSL https://bun.sh/install | bash
git clone https://github.com/garrytan/gstack ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup`

const HOOKS_JSON = `{
  "description": "Global auto-bootstrap hooks for Toby's Claude Code workspace",
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/bootstrap/session-start.sh",
            "timeout": 30
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/bootstrap/memory-writeback.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}`

const MEMORY_REPO = 'https://github.com/adobetoby-maker/toby-claude-memory'

function generateRestoreScript(): string {
  const allPlugins = PLUGIN_GROUPS.flatMap(g => g.plugins)
  const pluginInstalls = allPlugins.map(p => `claude plugin install ${p}`).join('\n')

  return `#!/usr/bin/env bash
# Workspace Restore Script — Toby's Claude Code M1 Ultra
# Run on a fresh machine to restore full workspace
# Generated by manage.worker-bee.app/configurator

set -e

echo "── Step 1: Memory repo ─────────────────────────────"
mkdir -p ~/.claude/projects/-Users-drive
git clone ${MEMORY_REPO} ~/.claude/projects/-Users-drive/memory 2>/dev/null || (
  cd ~/.claude/projects/-Users-drive/memory && git pull origin main
)
bash ~/.claude/projects/-Users-drive/memory/laptop-setup.sh

echo ""
echo "── Step 2: Install claude-mem ──────────────────────"
sudo chown -R $(id -u):$(id -g) ~/.npm 2>/dev/null || true
npx claude-mem install

echo ""
echo "── Step 3: Add third-party marketplaces ────────────"
claude plugin marketplace add artokun/comfyui-mcp --sparse .claude-plugin plugin 2>/dev/null || true

echo ""
echo "── Step 4: Install all plugins (${allPlugins.length} total) ────────────"
${pluginInstalls}

echo ""
echo "── Step 5: GStack skills ───────────────────────────"
if ! command -v bun &>/dev/null; then
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi
if [ ! -d ~/.claude/skills/gstack ]; then
  git clone https://github.com/garrytan/gstack ~/.claude/skills/gstack
  cd ~/.claude/skills/gstack && ./setup
fi

echo ""
echo "── Step 6: TAC session skill ───────────────────────"
mkdir -p ~/.claude/skills/tac
SKILL_SRC="$HOME/.claude/projects/-Users-drive/memory/skills/tac/SKILL.md"
if [ -f "$SKILL_SRC" ]; then
  cp "$SKILL_SRC" ~/.claude/skills/tac/SKILL.md
  echo "✅ TAC skill installed at ~/.claude/skills/tac/SKILL.md"
else
  echo "⚠️  TAC skill not found in memory repo — pulling latest and retrying..."
  cd ~/.claude/projects/-Users-drive/memory && git pull origin main --quiet
  cp "$SKILL_SRC" ~/.claude/skills/tac/SKILL.md 2>/dev/null && echo "✅ TAC skill installed" || echo "❌ TAC skill missing from memory repo"
fi

echo ""
echo "── Step 7: Antigravity skills (1460+) ──────────────"
npx antigravity-awesome-skills --claude
echo ""
echo "Cherry-picked skills now available (/skill-name to invoke):"
echo "  Next.js:  /nextjs-best-practices  /nextjs-app-router-patterns  /nextjs-supabase-auth"
echo "  React/UI: /react-best-practices  /shadcn  /tailwind-design-system  /tailwind-patterns"
echo "  Platform: /supabase-automation  /cloudflare-workers-expert  /vercel-ai-sdk-expert"
echo "  SEO:      /seo-aeo-blog-writer  /seo-audit  /seo-technical  /seo-keyword-strategist"
echo "  Content:  /content-strategy  /copywriting  /landing-page-generator  /blog-writing-guide"
echo "  Arch:     /multi-agent-patterns  /parallel-agents  /production-code-audit"
echo "  Dev:      /prompt-engineering  /github-actions-templates  /testing-patterns"

echo ""
echo "── Done ────────────────────────────────────────────"
echo "Restart Claude Code and run /tac to start your session."
echo ""
echo "First session flow:"
echo "  1. Open project: claude code ."
echo "  2. Type: /tac  (or /tac <topic> to focus immediately)"
echo "  3. TAC syncs memory → projects + model routing + skills menu"
echo "  4. Skills menu shows 29 cherry-picked antigravity + GStack + Ruflo"
echo "  5. Answer: 'What do you want to work on today?'"
`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConfiguratorPage() {
  const [mode, setMode] = useState<Mode>('project')

  // Project configurator state
  const [template, setTemplate] = useState<TemplateKey>('nextjs')
  const [form, setForm] = useState<FormData>({
    name: '', description: '', url: '', routes: '', rules: '',
    devCommand: '', buildCommand: '', nextjsVersion: '16',
    wpTheme: '', supabase: true, tailwind: true, typescript: true,
  })
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['superpowers', 'searchfit-seo'])
  const [showPreview, setShowPreview] = useState(false)

  // Restore state
  const [expandedGroup, setExpandedGroup] = useState<string | null>('Core Workflow')
  const [showHooks, setShowHooks] = useState(false)
  const [showGstack, setShowGstack] = useState(false)

  // Tunnel status
  const [buildApiStatus, setBuildApiStatus] = useState<ServiceStatus>('checking')
  const [terminalStatus, setTerminalStatus] = useState<ServiceStatus>('checking')
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkServices = useCallback(async () => {
    setBuildApiStatus('checking')
    setTerminalStatus('checking')
    const check = async (url: string): Promise<ServiceStatus> => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
        return res.ok ? 'up' : 'down'
      } catch {
        return 'down'
      }
    }
    const [api, term] = await Promise.all([
      check('https://build-api.worker-bee.app/health'),
      check('https://terminal.worker-bee.app'),
    ])
    setBuildApiStatus(api)
    setTerminalStatus(term)
    setLastChecked(new Date())
  }, [])

  useEffect(() => {
    if (mode === 'tunnel') {
      checkServices()
      const id = setInterval(checkServices, 30000)
      return () => clearInterval(id)
    }
  }, [mode, checkServices])

  const [copied, setCopied] = useState('')

  function set(k: keyof FormData, v: string | boolean) {
    setForm(f => ({ ...f, [k]: v }))
  }
  function toggleSkill(id: string) {
    setSelectedSkills(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  const claudeMd = TEMPLATES[template].claude(form)
  const settings = {
    ...TEMPLATES[template].settings,
    enabledPlugins: Object.fromEntries(selectedSkills.map(s => [`${s}@claude-plugins-official`, true])),
  }
  const settingsJson = JSON.stringify(settings, null, 2)
  const restoreScript = generateRestoreScript()

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }
  function download(content: string, filename: string) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
    a.download = filename
    a.click()
  }

  const input = "w-full rounded-xl border px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
  const inputStyle = { background: 'var(--surface2)', borderColor: 'var(--border)' }
  const totalPlugins = PLUGIN_GROUPS.reduce((acc, g) => acc + g.plugins.length, 0)

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Cpu size={20} className="text-indigo-400" />
        <h1 className="text-2xl font-bold text-white">Claude Configurator</h1>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ background: 'var(--surface)' }}>
        <button
          onClick={() => setMode('project')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'project' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <Package size={14} />New Project
        </button>
        <button
          onClick={() => setMode('restore')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'restore' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <RefreshCw size={14} />Plugin &amp; Skill Set
        </button>
        <button
          onClick={() => setMode('commands')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'commands' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <Hash size={14} />Slash Commands
        </button>
        <button
          onClick={() => setMode('tunnel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'tunnel' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <Terminal size={14} />Dev Tunnel
        </button>
        <button
          onClick={() => setMode('pipeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'pipeline' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          <Layers size={14} />Pipeline
        </button>
      </div>

      {/* ── Project Configurator ── */}
      {mode === 'project' && (
        <>
          <p className="text-sm mb-8" style={{ color: 'var(--muted-light)' }}>Generate CLAUDE.md and settings.json for any project.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Template */}
              <div>
                <label className="label-xs">Template</label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(TEMPLATES) as TemplateKey[]).map(k => (
                    <button key={k} onClick={() => setTemplate(k)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border ${template === k ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}>
                      {TEMPLATES[k].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Project details */}
              <div className="space-y-4 rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-bold text-white">Project Details</h3>
                <div>
                  <label className="label-xs">Project Name</label>
                  <input className={input} style={inputStyle} placeholder="Jr.'s Auto Repair" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div>
                  <label className="label-xs">Description <span style={{ color: 'var(--muted)' }}>(optional)</span></label>
                  <input className={input} style={inputStyle} placeholder="Local auto repair shop in Twin Falls, ID" value={form.description} onChange={e => set('description', e.target.value)} />
                </div>
                {template === 'nextjs' && (
                  <>
                    <div>
                      <label className="label-xs">Route Map <span style={{ color: 'var(--muted)' }}>(optional)</span></label>
                      <textarea className={input} style={inputStyle} rows={3} placeholder="- `/` — home&#10;- `/admin` — admin dashboard" value={form.routes} onChange={e => set('routes', e.target.value)} />
                    </div>
                    <div className="flex gap-4">
                      {[['supabase', 'Supabase'], ['tailwind', 'Tailwind'], ['typescript', 'TypeScript']].map(([k, l]) => (
                        <label key={k} className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                          <input type="checkbox" checked={form[k as keyof FormData] as boolean} onChange={e => set(k as keyof FormData, e.target.checked)} className="accent-indigo-500 w-4 h-4" />
                          {l}
                        </label>
                      ))}
                    </div>
                  </>
                )}
                {template === 'wordpress' && (
                  <>
                    <div>
                      <label className="label-xs">Site URL</label>
                      <input className={input} style={inputStyle} placeholder="https://example.com" value={form.url} onChange={e => set('url', e.target.value)} />
                    </div>
                    <div>
                      <label className="label-xs">Theme Name</label>
                      <input className={input} style={inputStyle} placeholder="my-custom-theme" value={form.wpTheme} onChange={e => set('wpTheme', e.target.value)} />
                    </div>
                  </>
                )}
                {template === 'general' && (
                  <>
                    <div>
                      <label className="label-xs">Dev Command</label>
                      <input className={input} style={inputStyle} placeholder="npm run dev" value={form.devCommand} onChange={e => set('devCommand', e.target.value)} />
                    </div>
                    <div>
                      <label className="label-xs">Build Command</label>
                      <input className={input} style={inputStyle} placeholder="npm run build" value={form.buildCommand} onChange={e => set('buildCommand', e.target.value)} />
                    </div>
                    <div>
                      <label className="label-xs">Key Rules</label>
                      <textarea className={input} style={inputStyle} rows={3} placeholder="Important guidelines for Claude…" value={form.rules} onChange={e => set('rules', e.target.value)} />
                    </div>
                  </>
                )}
              </div>

              {/* Skills */}
              <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-bold text-white mb-3">Skills / Plugins</h3>
                <div className="space-y-2">
                  {SKILLS.map(s => (
                    <label key={s.id} className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" checked={selectedSkills.includes(s.id)} onChange={() => toggleSkill(s.id)} className="accent-indigo-500 w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">{s.label}</span>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{s.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: preview + export */}
            <div className="space-y-5">
              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-1.5 text-sm font-semibold text-white">
                    {showPreview ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    CLAUDE.md
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => copy(claudeMd, 'claude')} className="flex items-center gap-1.5 text-xs border px-2.5 py-1.5 rounded-lg transition-colors hover:border-white/20" style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
                      <Copy size={11} />{copied === 'claude' ? 'Copied!' : 'Copy'}
                    </button>
                    <button onClick={() => download(claudeMd, 'CLAUDE.md')} className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg transition-colors">
                      <Download size={11} />Download
                    </button>
                  </div>
                </div>
                {showPreview
                  ? <pre className="text-xs p-4 overflow-auto max-h-64 leading-relaxed" style={{ color: 'var(--muted-light)' }}>{claudeMd}</pre>
                  : <div className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{claudeMd.split('\n').length} lines — click to preview</div>
                }
              </div>

              <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-sm font-semibold text-white">.claude/settings.json</span>
                  <div className="flex gap-2">
                    <button onClick={() => copy(settingsJson, 'settings')} className="flex items-center gap-1.5 text-xs border px-2.5 py-1.5 rounded-lg transition-colors hover:border-white/20" style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
                      <Copy size={11} />{copied === 'settings' ? 'Copied!' : 'Copy'}
                    </button>
                    <button onClick={() => download(settingsJson, 'settings.json')} className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg transition-colors">
                      <Download size={11} />Download
                    </button>
                  </div>
                </div>
                <pre className="text-xs p-4 overflow-auto max-h-64 leading-relaxed" style={{ color: 'var(--muted-light)' }}>{settingsJson}</pre>
              </div>

              <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-bold text-white mb-1">Export Package</h3>
                <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>Download both files to drop into any repo.</p>
                <div className="flex gap-2">
                  <button onClick={() => download(claudeMd, 'CLAUDE.md')} className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-semibold transition-colors">
                    <Download size={14} />CLAUDE.md
                  </button>
                  <button onClick={() => download(settingsJson, 'settings.json')} className="flex items-center gap-1.5 text-sm border hover:border-white/20 px-4 py-2 rounded-lg font-semibold transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
                    <Download size={14} />settings.json
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Restore Workspace ── */}
      {mode === 'restore' && (
        <div className="space-y-6">
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            Preferred Claude plugin &amp; skill set for building — {totalPlugins} plugins, memory system, hooks, and GStack skills.
          </p>

          {/* Quick start */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-white">One-Command Restore</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copy(restoreScript, 'restore')} className="flex items-center gap-1.5 text-xs border px-2.5 py-1.5 rounded-lg transition-colors hover:border-white/20" style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
                  <Copy size={11} />{copied === 'restore' ? 'Copied!' : 'Copy script'}
                </button>
                <button onClick={() => download(restoreScript, 'restore-workspace.sh')} className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg transition-colors">
                  <Download size={11} />Download .sh
                </button>
              </div>
            </div>
            <pre className="text-xs p-3 rounded-lg overflow-auto max-h-48 leading-relaxed" style={{ background: 'var(--surface2)', color: 'var(--muted-light)' }}>
              {`bash restore-workspace.sh\n\n# Or run the memory step only (laptop bridge):\ngit clone ${MEMORY_REPO} \\\n  ~/.claude/projects/-Users-drive/memory\nbash ~/.claude/projects/-Users-drive/memory/laptop-setup.sh`}
            </pre>
          </div>

          {/* Memory & hooks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={15} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Memory Repo</h3>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>Git-synced flat-file memory. Auto-pushed after every session turn.</p>
              <code className="text-xs block px-3 py-2 rounded-lg mb-2" style={{ background: 'var(--surface2)', color: 'var(--muted-light)' }}>
                github.com/adobetoby-maker/toby-claude-memory
              </code>
              <button onClick={() => copy(MEMORY_REPO, 'memrepo')} className="flex items-center gap-1.5 text-xs border px-2.5 py-1.5 rounded-lg transition-colors hover:border-white/20" style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
                <Copy size={11} />{copied === 'memrepo' ? 'Copied!' : 'Copy URL'}
              </button>
            </div>

            <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <button onClick={() => setShowHooks(!showHooks)} className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-2">
                  <Terminal size={15} className="text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">hooks.json</h3>
                </div>
                {showHooks ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
              </button>
              <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>SessionStart loads memory. Stop hook pushes to git + dumps claude-mem SQLite.</p>
              {showHooks && (
                <>
                  <pre className="text-xs p-3 rounded-lg overflow-auto max-h-40 mb-2" style={{ background: 'var(--surface2)', color: 'var(--muted-light)' }}>{HOOKS_JSON}</pre>
                  <button onClick={() => copy(HOOKS_JSON, 'hooks')} className="flex items-center gap-1.5 text-xs border px-2.5 py-1.5 rounded-lg transition-colors hover:border-white/20" style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
                    <Copy size={11} />{copied === 'hooks' ? 'Copied!' : 'Copy'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* TAC session bootstrap */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'inset 3px 0 0 0 rgba(245,158,11,0.6)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Terminal size={15} className="text-amber-400" />
              <h3 className="text-sm font-bold text-white">TAC — Session Bootstrap</h3>
              <span className="text-[10px] bg-amber-900/40 text-amber-400 border border-amber-800/50 px-1.5 py-0.5 rounded-full">auto-installed in restore script</span>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
              TAC is a local skill (<code className="px-1 rounded" style={{ background: 'var(--surface2)' }}>~/.claude/skills/tac/</code>) that runs on session start.
              The restore script copies it from the memory repo automatically.
            </p>
            <div className="rounded-lg p-3 mb-3 space-y-2" style={{ background: 'var(--surface2)' }}>
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold shrink-0" style={{ color: 'var(--muted-light)' }}>After setup:</span>
                <code className="text-xs text-amber-300">claude code .</code>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>→ open project in Claude Code</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold shrink-0" style={{ color: 'var(--muted-light)' }}>Then type:</span>
                <code className="text-xs text-amber-300">/tac</code>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>→ syncs memory, shows projects + model routing + skills</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold shrink-0" style={{ color: 'var(--muted-light)' }}>Or focus:</span>
                <code className="text-xs text-amber-300">/tac worker-bee</code>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>→ bootstrap and immediately surface context on that topic</span>
              </div>
            </div>
            <button onClick={() => copy('/tac', 'tac-cmd')} className="flex items-center gap-1.5 text-xs border px-2.5 py-1.5 rounded-lg transition-colors hover:border-white/20" style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
              <Copy size={11} />{copied === 'tac-cmd' ? 'Copied!' : 'Copy /tac command'}
            </button>
          </div>

          {/* GStack */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <button onClick={() => setShowGstack(!showGstack)} className="flex items-center justify-between w-full mb-1">
              <h3 className="text-sm font-bold text-white">GStack Skills (garrytan/gstack)</h3>
              {showGstack ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            </button>
            <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>25 slash-command skills: /review, /qa, /ship, /cso, /office-hours, /plan-ceo-review, etc. Requires bun.</p>
            {showGstack && (
              <>
                <pre className="text-xs p-3 rounded-lg overflow-auto mb-2" style={{ background: 'var(--surface2)', color: 'var(--muted-light)' }}>{GSTACK_INSTALL}</pre>
                <button onClick={() => copy(GSTACK_INSTALL, 'gstack')} className="flex items-center gap-1.5 text-xs border px-2.5 py-1.5 rounded-lg transition-colors hover:border-white/20" style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
                  <Copy size={11} />{copied === 'gstack' ? 'Copied!' : 'Copy'}
                </button>
              </>
            )}
          </div>

          {/* Plugin groups */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">{totalPlugins} Plugins</h3>
              <button
                onClick={() => {
                  const all = PLUGIN_GROUPS.flatMap(g => g.plugins).map(p => `claude plugin install ${p}`).join('\n')
                  copy(all, 'allplugins')
                }}
                className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                <Copy size={11} />{copied === 'allplugins' ? 'Copied all!' : `Copy all ${totalPlugins} install commands`}
              </button>
            </div>
            <div className="space-y-2">
              {PLUGIN_GROUPS.map(group => (
                <div key={group.label} className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => setExpandedGroup(expandedGroup === group.label ? null : group.label)}
                    className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedGroup === group.label ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                      <span className="text-sm font-semibold text-white">{group.label}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>{group.plugins.length}</span>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        copy(group.plugins.map(p => `claude plugin install ${p}`).join('\n'), `group-${group.label}`)
                      }}
                      className="text-xs border px-2 py-1 rounded-lg hover:border-white/20 transition-colors"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                    >
                      {copied === `group-${group.label}` ? 'Copied!' : 'Copy installs'}
                    </button>
                  </button>
                  {expandedGroup === group.label && (
                    <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {group.plugins.map(p => (
                        <code key={p} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--surface2)', color: 'var(--muted-light)' }}>
                          {p}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Dev Tunnel ── */}
      {mode === 'tunnel' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
              Local services exposed via Cloudflare Tunnel. Requires <code className="text-xs px-1 py-0.5 rounded" style={{ background: 'var(--surface2)' }}>start.sh</code> running on your Mac.
            </p>
            <button onClick={checkServices} className="flex items-center gap-1.5 text-xs border px-2.5 py-1.5 rounded-lg transition-colors hover:border-white/20" style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
              <RotateCcw size={11} />Refresh
            </button>
          </div>

          {/* Service cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ServiceCard
              name="Build API"
              url="https://build-api.worker-bee.app"
              description="Streams Claude Code output for one-click builds"
              status={buildApiStatus}
            />
            <ServiceCard
              name="Browser Terminal"
              url="https://terminal.worker-bee.app"
              description="ttyd bash shell running on your Mac"
              status={terminalStatus}
              openable
            />
          </div>

          {lastChecked && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Last checked: {lastChecked.toLocaleTimeString()} · auto-refreshes every 30s
            </p>
          )}

          {/* Start script */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-bold text-white mb-1">Start Services</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>Run this on your Mac whenever services are down.</p>
            <pre className="text-xs p-3 rounded-lg mb-3" style={{ background: 'var(--surface2)', color: 'var(--muted-light)' }}>
              bash ~/worker-bee-dev/start.sh
            </pre>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Stop all: <code className="px-1 py-0.5 rounded" style={{ background: 'var(--surface2)' }}>pkill -f ttyd; pkill -f build-api; pkill -f &apos;cloudflared tunnel&apos;</code>
            </p>
          </div>

          {/* Embedded terminal */}
          {terminalStatus === 'up' && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-sm font-bold text-white">Terminal</span>
                </div>
                <a href="https://terminal.worker-bee.app" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs border px-2.5 py-1.5 rounded-lg transition-colors hover:border-white/20"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
                  <ExternalLink size={11} />Open full screen
                </a>
              </div>
              <iframe
                src="https://terminal.worker-bee.app"
                style={{ width: '100%', height: 400, border: 'none', background: '#0d1117' }}
                title="Worker Bee Terminal"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Slash Commands + Terminal ── */}
      {mode === 'commands' && (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Commands list */}
          <div className="space-y-5" style={{ flex: 1, minWidth: 0 }}>
            <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
              Every slash command available across built-in Claude Code, plugins, and GStack skills.
            </p>
            {COMMAND_GROUPS.map(group => (
              <div key={group.label} className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: group.color }} />
                  <span className="text-sm font-bold text-white">{group.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
                    {group.commands.length} commands
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {group.commands.map(({ cmd, desc }) => (
                    <div key={cmd} className="flex items-start gap-4 px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                      <code
                        className="text-xs font-mono font-bold shrink-0 mt-0.5 px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--surface2)', color: group.color, minWidth: 160 }}
                      >
                        {cmd}
                      </code>
                      <span className="text-sm leading-relaxed" style={{ color: 'var(--muted-light)' }}>{desc}</span>
                      <button
                        onClick={() => copy(cmd.split(' ')[0], `cmd-${cmd}`)}
                        className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copy command"
                      >
                        <Copy size={11} style={{ color: 'var(--muted)' }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sticky terminal panel */}
          <div style={{ width: 420, flexShrink: 0, position: 'sticky', top: 24 }}>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  {terminalStatus === 'up'
                    ? <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    : terminalStatus === 'checking'
                      ? <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
                      : <div className="w-2 h-2 rounded-full bg-red-500" />
                  }
                  <span className="text-sm font-bold text-white">Terminal</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={checkServices} title="Refresh status">
                    <RotateCcw size={12} style={{ color: 'var(--muted)' }} />
                  </button>
                  <a href="https://terminal.worker-bee.app" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors hover:border-white/20"
                    style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
                    <ExternalLink size={10} />Full screen
                  </a>
                </div>
              </div>
              {terminalStatus === 'up' ? (
                <iframe
                  src="https://terminal.worker-bee.app"
                  style={{ width: '100%', height: 500, border: 'none', background: '#0d1117' }}
                  title="Worker Bee Terminal"
                />
              ) : (
                <div style={{ height: 500, background: '#0d1117', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  {terminalStatus === 'checking'
                    ? <p className="text-sm" style={{ color: 'var(--muted)' }}>Checking…</p>
                    : <>
                        <WifiOff size={28} style={{ color: '#475569' }} />
                        <p className="text-sm font-semibold" style={{ color: 'var(--muted-light)' }}>Terminal offline</p>
                        <code className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface)', color: 'var(--muted)' }}>
                          bash ~/worker-bee-dev/start.sh
                        </code>
                      </>
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Pipeline ── */}
      {mode === 'pipeline' && (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm mb-1" style={{ color: 'var(--muted-light)' }}>
                The optimal 5-phase skill sequence for building high-quality, high-SEO, high-monetization sites.
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Use <code className="px-1 rounded" style={{ background: 'var(--surface2)' }}>/skill-name</code> in Claude Code to invoke any skill. The pipeline is baked into the Next.js CLAUDE.md template.
              </p>
            </div>
            <button
              onClick={() => copy(generatePipelineClaude(), 'pipeline-md')}
              className="shrink-0 flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <Copy size={11} />{copied === 'pipeline-md' ? 'Copied!' : 'Copy as CLAUDE.md section'}
            </button>
          </div>

          {/* Phase cards */}
          <div className="space-y-4">
            {PIPELINE_PHASES.map((phase, pi) => (
              <div key={phase.phase} className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: `inset 3px 0 0 0 ${phase.color}99` }}>
                {/* Phase header */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${phase.color}22`, color: phase.color }}>
                    {phase.phase}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-white mr-2">{phase.label}</span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{phase.tagline}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {pi < PIPELINE_PHASES.length - 1 && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
                        → Phase {phase.phase + 1}
                      </span>
                    )}
                  </div>
                </div>

                {/* Skills */}
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {phase.skills.map(skill => (
                    <div key={skill.cmd} className="flex items-start gap-4 px-5 py-3 hover:bg-white/[0.03] transition-colors group">
                      <code
                        className="text-xs font-mono font-bold shrink-0 mt-0.5 px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--surface2)', color: phase.color, minWidth: 200 }}
                      >
                        {skill.cmd}
                      </code>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm leading-relaxed" style={{ color: 'var(--muted-light)' }}>{skill.desc}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{
                          color: skill.source === 'GStack' ? '#10b981' : skill.source === 'Ruflo' ? '#a78bfa' : '#6366f1',
                          borderColor: skill.source === 'GStack' ? '#10b98133' : skill.source === 'Ruflo' ? '#a78bfa33' : '#6366f133',
                          background: skill.source === 'GStack' ? '#10b98111' : skill.source === 'Ruflo' ? '#a78bfa11' : '#6366f111',
                        }}>
                          {skill.source}
                        </span>
                        <button
                          onClick={() => copy(skill.cmd, `pipeline-${skill.cmd}`)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy command"
                        >
                          <Copy size={11} style={{ color: 'var(--muted)' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Model routing reminder */}
          <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'inset 3px 0 0 0 rgba(99,102,241,0.5)' }}>
            <h3 className="text-sm font-bold text-white mb-3">Model Routing — Use the Right Tool</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { name: 'Haiku 4.5', cost: '~1/10 cost', color: '#34d399', cmd: '/model haiku', uses: 'File ops, renames, installs, git commits, string replacements' },
                { name: 'Sonnet 4.6', cost: 'Default', color: '#6366f1', cmd: '/model sonnet', uses: 'TypeScript, architecture, debugging, content writing, agents' },
                { name: 'Opus 4.7', cost: '10× cost', color: '#f59e0b', cmd: '/model opus', uses: 'High-stakes strategic decisions only — use sparingly' },
              ].map(m => (
                <div key={m.name} className="rounded-lg p-3" style={{ background: 'var(--surface2)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold" style={{ color: m.color }}>{m.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface)', color: 'var(--muted)' }}>{m.cost}</span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>{m.uses}</p>
                  <button
                    onClick={() => copy(m.cmd, `model-${m.name}`)}
                    className="flex items-center gap-1 text-[10px] border px-1.5 py-1 rounded transition-colors hover:border-white/20"
                    style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}
                  >
                    <Copy size={9} />{copied === `model-${m.name}` ? 'Copied!' : m.cmd}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .label-xs{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:6px}
        .divide-y > * + * { border-top: 1px solid var(--border); }
      `}</style>
    </div>
  )
}

function ServiceCard({ name, url, description, status, openable }: {
  name: string; url: string; description: string
  status: ServiceStatus; openable?: boolean
}) {
  const isUp = status === 'up'
  const isChecking = status === 'checking'
  return (
    <div className="rounded-xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isChecking
              ? <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />
              : isUp
                ? <div className="w-2 h-2 rounded-full bg-emerald-400" />
                : <div className="w-2 h-2 rounded-full bg-red-500" />
            }
            <span className="text-sm font-bold text-white">{name}</span>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{description}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          isChecking ? 'bg-slate-800 text-slate-400'
          : isUp ? 'bg-emerald-900/50 text-emerald-400'
          : 'bg-red-900/50 text-red-400'
        }`}>
          {isChecking ? 'checking…' : isUp ? 'online' : 'offline'}
        </span>
      </div>
      <code className="text-xs block mb-3 px-2 py-1 rounded" style={{ background: 'var(--surface2)', color: 'var(--muted-light)' }}>
        {url}
      </code>
      {openable && isUp && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors font-semibold">
          <ExternalLink size={11} />Open Terminal
        </a>
      )}
      {!isUp && !isChecking && (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>Run <code className="px-1 rounded" style={{ background: 'var(--surface2)' }}>bash ~/worker-bee-dev/start.sh</code> on your Mac</p>
      )}
    </div>
  )
}

// Pipeline agents — each build phase is a named, dispatchable agent.
// Agents run sequentially by default but can be re-dispatched independently.

export type AgentStatus = 'idle' | 'running' | 'done' | 'error' | 'skipped'
export type AgentModel = 'haiku' | 'sonnet' | 'opus'

export interface PipelineAgent {
  id: string
  name: string
  role: string
  description: string
  model: AgentModel
  color: string
  icon: string          // lucide icon name
  estimatedMinutes: number
  prompt: (ctx: AgentContext) => string
  inputsRequired: string[]
  outputsProduced: string[]
}

export interface AgentContext {
  siteName: string
  siteId: string
  siteType: string
  stack: string
  slug: string
  localPath: string
  githubRepo: string
  domain: string
  subjectName: string
  referenceUrls: string[]
  supabaseProject?: string
  buildMode: 'new' | 'iteration'
  enhancements: Record<string, boolean>
  blueprintSummary: string    // human-readable list of cards
  researchBriefPath: string   // /tmp/research-brief-<slug>.json
}

export interface AgentNodeState {
  agentId: string
  status: AgentStatus
  startedAt?: string
  completedAt?: string
  errors: string[]
  log: string
  outputArtifacts: string[]
}

// ─── Agent Definitions ────────────────────────────────────────────────────────

export const PIPELINE_AGENTS: PipelineAgent[] = [
  {
    id: 'researcher',
    name: 'Researcher',
    role: 'Find real assets & competitive benchmarks',
    description: 'Searches the web for the subject\'s headshot, bio, credentials, reviews, contact info. Screenshots reference sites for visual benchmarking.',
    model: 'sonnet',
    color: '#8b5cf6',
    icon: 'Search',
    estimatedMinutes: 8,
    inputsRequired: ['siteName', 'siteType', 'subjectName', 'referenceUrls'],
    outputsProduced: ['researchBriefPath', 'referenceScreenshots'],
    prompt: (ctx) => `# WB Researcher Agent — ${ctx.siteName}

You are the Research phase agent for a Worker-Bee client site build.

## Your single job
Find real digital assets for **${ctx.subjectName}** and write them to \`${ctx.researchBriefPath}\`.

## Research sources (check in this order)
${ctx.siteType === 'medical' ? 'healthgrades.com, usnews.com/doctors, vitals.com' :
  ctx.siteType === 'legal' ? 'avvo.com, martindale.com, justia.com' :
  ctx.siteType === 'local-service' ? 'Google Business Profile, Yelp, their existing website' :
  ctx.siteType === 'restaurant' ? 'Google Business Profile, Yelp, OpenTable, TripAdvisor' :
  'Google search, LinkedIn, their existing website, social profiles'}

1. Search for "${ctx.subjectName}" on each source using browser_navigate + browser_evaluate
2. Extract: professional headshot URL, bio text, credentials, reviews, phone, address, hours
${ctx.referenceUrls.length > 0 ? `3. Screenshot each reference site for visual benchmarking:\n${ctx.referenceUrls.map(u => `   - ${u}`).join('\n')}` : ''}

## Output — write to ${ctx.researchBriefPath}
\`\`\`json
{
  "photoUrl": "<real headshot URL or null>",
  "heroImageUrl": "<real facility/setting photo URL or null>",
  "bio": "<real bio text or empty string>",
  "credentials": [],
  "reviews": [],
  "phone": "",
  "address": "",
  "hours": "",
  "referenceScreenshots": []
}
\`\`\`

## Rules
- If a real asset exists, use it. Unsplash is only a fallback when nothing real was found.
- Never use a generic stock person as a portrait.
- If zero results after 3 searches for a field, write null for that field and document it.

## Report back when done
\`\`\`bash
curl -s -X POST https://manage.worker-bee.app/api/build-log \\
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \\
  -H "content-type: application/json" \\
  -d '{"siteId":"${ctx.siteId}","phase":"researcher","status":"done","artifacts":["${ctx.researchBriefPath}"]}'
\`\`\`
`,
  },

  {
    id: 'provisioner',
    name: 'Provisioner',
    role: 'Scaffold repo, install packages, wire Vercel',
    description: 'Creates the GitHub repo, runs the stack scaffold, installs enhancement packages, sets up Vercel project, drops CLAUDE.md.',
    model: 'haiku',
    color: '#6366f1',
    icon: 'GitBranch',
    estimatedMinutes: 5,
    inputsRequired: ['stack', 'githubRepo', 'localPath', 'domain', 'enhancements'],
    outputsProduced: ['repoUrl', 'vercelProjectId', 'claudeMdPath'],
    prompt: (ctx) => `# WB Provisioner Agent — ${ctx.siteName}

You are the Provision phase agent. Your job is mechanical: create the repo, scaffold, and wire infrastructure.

## Target
- GitHub repo: ${ctx.githubRepo}
- Local path: ${ctx.localPath}
- Stack: ${ctx.stack}
- Domain: ${ctx.domain}

## Steps (run in order — do not skip)

\`\`\`bash
# 1. Create GitHub repo
gh repo create ${ctx.githubRepo} --private --description "${ctx.siteName} — Worker-Bee client site"

# 2. Scaffold
mkdir -p ${ctx.localPath} && cd ${ctx.localPath}
${ctx.stack === 'nextjs' ? 'npx create-next-app@latest . --typescript --tailwind --app --src-dir no --import-alias "@/*" --use-npm' :
  ctx.stack === 'vite' ? 'npm create vite@latest . -- --template react-ts && npm install && npm install -D tailwindcss @tailwindcss/vite' :
  'npm init -y'}

# 3. Install enhancement packages (only enabled ones)
${Object.entries(ctx.enhancements).filter(([,v]) => v).map(([k]) => {
  const pkgMap: Record<string, string[]> = {
    framerMotion: ['framer-motion'],
    lenis: ['lenis'],
    gsap: ['gsap'],
    spline: ['@splinetool/react-spline', '@splinetool/runtime'],
    r3f: ['three', '@react-three/fiber', '@react-three/drei'],
    pwa: ['@ducanh2912/next-pwa'],
    sentry: ['@sentry/nextjs'],
  }
  return pkgMap[k] ? `npm install ${pkgMap[k].join(' ')}` : ''
}).filter(Boolean).join('\n') || '# No extra packages needed'}

# 4. Git init + push
git init && git remote add origin git@github.com:${ctx.githubRepo}.git
git add . && git commit -m "Initial ${ctx.stack} scaffold"
git push -u origin main

# 5. Vercel link
vercel link --scope adobetoby-5572s-projects
\`\`\`

Whitelist all image domains from the research brief in next.config.ts remotePatterns. Always include images.unsplash.com.

## Report back
\`\`\`bash
curl -s -X POST https://manage.worker-bee.app/api/build-log \\
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \\
  -H "content-type: application/json" \\
  -d '{"siteId":"${ctx.siteId}","phase":"provisioner","status":"done","artifacts":["${ctx.localPath}","${ctx.githubRepo}"]}'
\`\`\`
`,
  },

  {
    id: 'builder',
    name: 'Builder',
    role: 'Implement all blueprint cards',
    description: 'Reads the topologically ordered blueprint nodes and implements each as a real Next.js component or API route. Commits each card separately.',
    model: 'sonnet',
    color: '#3b82f6',
    icon: 'Hammer',
    estimatedMinutes: 25,
    inputsRequired: ['blueprintSummary', 'researchBriefPath', 'localPath', 'siteType'],
    outputsProduced: ['builtComponents', 'gitLog'],
    prompt: (ctx) => `# WB Builder Agent — ${ctx.siteName}

You are the Build phase agent. Your job is to implement every blueprint card as production-quality code.

## Context
- Site type: ${ctx.siteType}
- Local path: ${ctx.localPath}
- Research brief: ${ctx.researchBriefPath}
- Mode: ${ctx.buildMode}

## Blueprint cards to implement
${ctx.blueprintSummary}

## Rules
1. Work through cards in topological order (dependencies first)
2. Read ${ctx.researchBriefPath} before writing any component — use real assets from it
3. Apply site-type design standards (${ctx.siteType} floor)
4. Include Framer Motion whileInView on every section with viewport={{ once: true, amount: 0 }}
5. Every image must use next/image with fill + relative parent
6. Each card gets its own git commit: \`git add . && git commit -m "feat: <card title>"\`
7. After all cards: run \`npm run build\` — fix any TypeScript errors before finishing

## Report back
\`\`\`bash
curl -s -X POST https://manage.worker-bee.app/api/build-log \\
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \\
  -H "content-type: application/json" \\
  -d '{"siteId":"${ctx.siteId}","phase":"builder","status":"done","artifacts":["${ctx.localPath}"]}'
\`\`\`
`,
  },

  {
    id: 'visual-qa',
    name: 'Visual QA',
    role: 'Screenshot, scroll, verify at 375px and 1440px',
    description: 'Opens the dev server in Playwright, screenshots desktop + mobile, checks for flush-left layout, broken images, horizontal overflow, and invisible Framer Motion content.',
    model: 'sonnet',
    color: '#f59e0b',
    icon: 'Eye',
    estimatedMinutes: 8,
    inputsRequired: ['localPath'],
    outputsProduced: ['screenshotPaths', 'visualIssues'],
    prompt: (ctx) => `# WB Visual QA Agent — ${ctx.siteName}

You are the Visual QA agent. Start the dev server, screenshot, find every visual bug.

## Steps

\`\`\`bash
cd ${ctx.localPath}
npm run dev &
sleep 5
\`\`\`

Open http://localhost:3000 in Playwright and:

1. Screenshot full page at 1440px desktop → save as /tmp/wb-qa-desktop.png
2. Resize to 375px mobile → screenshot → save as /tmp/wb-qa-mobile.png
3. Scroll to bottom, then back to top. Screenshot each section.
4. Check for:
   - [ ] Content centered with side margins (not flush-left)
   - [ ] All images load and show correct subject
   - [ ] No horizontal scrollbar at either viewport
   - [ ] No elements with opacity:0 after scroll completes
   - [ ] Phone number is tappable (a href=tel:) on mobile
   - [ ] Nav visible and functional

For each issue found: fix it immediately, commit, re-screenshot to verify fix.

\`\`\`bash
git add . && git commit -m "fix: visual qa pass"
\`\`\`

## Report back
\`\`\`bash
curl -s -X POST https://manage.worker-bee.app/api/build-log \\
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \\
  -H "content-type: application/json" \\
  -d '{"siteId":"${ctx.siteId}","phase":"visual-qa","status":"done","artifacts":["/tmp/wb-qa-desktop.png","/tmp/wb-qa-mobile.png"]}'
\`\`\`
`,
  },

  {
    id: 'designer',
    name: 'Designer',
    role: 'Elevate design above the production floor',
    description: 'Runs the /frontend-design skill to push typography, spacing, color, and motion past the baseline. Bigger type, richer photo treatments, more considered animation.',
    model: 'sonnet',
    color: '#ec4899',
    icon: 'Sparkles',
    estimatedMinutes: 15,
    inputsRequired: ['localPath', 'siteType', 'referenceUrls'],
    outputsProduced: ['designElevationCommit'],
    prompt: (ctx) => `# WB Designer Agent — ${ctx.siteName}

You are the Design Elevation agent. The builder set the floor — your job is to go above it.

## Site context
- Type: ${ctx.siteType}
- Local path: ${ctx.localPath}
${ctx.referenceUrls.length > 0 ? `- Reference sites: ${ctx.referenceUrls.join(', ')}` : ''}

## Invoke the design elevation skill
\`\`\`
/frontend-design Elevate ${ctx.siteName} above the production floor. Site type: ${ctx.siteType}. Bigger type, richer photography treatment, more considered spacing and motion. Every section should make a client say yes on the spot.${ctx.referenceUrls.length > 0 ? ` Reference sites: ${ctx.referenceUrls.join(', ')}.` : ''}
\`\`\`

Apply every recommendation. Commit:
\`\`\`bash
git add . && git commit -m "feat: design elevation pass"
\`\`\`

## Report back
\`\`\`bash
curl -s -X POST https://manage.worker-bee.app/api/build-log \\
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \\
  -H "content-type: application/json" \\
  -d '{"siteId":"${ctx.siteId}","phase":"designer","status":"done"}'
\`\`\`
`,
  },

  {
    id: 'qa-gate',
    name: 'QA Gate',
    role: 'Four-pass review before deploy',
    description: 'Runs /review (code quality), /qa (functional), /design-review (visual), then mobile + conversion audit. Fixes every issue before passing.',
    model: 'sonnet',
    color: '#10b981',
    icon: 'ShieldCheck',
    estimatedMinutes: 20,
    inputsRequired: ['localPath'],
    outputsProduced: ['qaReport', 'fixCommits'],
    prompt: (ctx) => `# WB QA Gate Agent — ${ctx.siteName}

You are the QA Gate agent. Run all four passes. Fix every issue. Do NOT skip any pass.

## Pass 1 — Code Quality
\`\`\`
/review
\`\`\`
Fix all high-confidence issues. Commit: \`git add . && git commit -m "fix: code review pass"\`

## Pass 2 — Functional QA
\`\`\`
/qa
\`\`\`
Verify: forms submit, nav links work, no broken images, no JS console errors. Commit: \`git add . && git commit -m "fix: functional qa pass"\`

## Pass 3 — Visual + Mobile QA
Screenshot at 375px mobile:
\`\`\`js
await page.setViewportSize({ width: 375, height: 812 })
const hasOverflow = await page.evaluate(() => document.body.scrollWidth > 375)
if (hasOverflow) throw new Error('Horizontal overflow on mobile')
\`\`\`
Commit: \`git add . && git commit -m "fix: mobile qa pass"\`

## Pass 4 — Conversion Audit
Check invisibility trap:
\`\`\`js
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(800)
const hidden = await page.evaluate(() =>
  document.querySelectorAll('[style*="opacity:0"],[style*="opacity: 0"]').length)
if (hidden > 0) throw new Error(\`\${hidden} invisible elements\`)
\`\`\`
Fix all issues. Commit: \`git add . && git commit -m "fix: conversion audit pass"\`

## Report back
\`\`\`bash
curl -s -X POST https://manage.worker-bee.app/api/build-log \\
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \\
  -H "content-type: application/json" \\
  -d '{"siteId":"${ctx.siteId}","phase":"qa-gate","status":"done"}'
\`\`\`
`,
  },

  {
    id: 'deployer',
    name: 'Deployer',
    role: 'Deploy, seed, report — site goes live',
    description: 'Runs vercel --prod, aliases the domain, seeds the master operator account, confirms HTTP 200, and posts the final build report to manage.worker-bee.app.',
    model: 'haiku',
    color: '#06b6d4',
    icon: 'Rocket',
    estimatedMinutes: 5,
    inputsRequired: ['localPath', 'domain', 'siteId'],
    outputsProduced: ['liveUrl', 'buildReport'],
    prompt: (ctx) => `# WB Deployer Agent — ${ctx.siteName}

You are the Deploy agent. Ship it.

## Deploy
\`\`\`bash
cd ${ctx.localPath}
vercel --prod --scope adobetoby-5572s-projects
vercel alias set <deployment-url> ${ctx.domain} --scope adobetoby-5572s-projects
\`\`\`

## Verify
\`\`\`bash
curl -sI https://${ctx.domain} | head -1    # must be HTTP/2 200 or 301→200
\`\`\`

## Seed master account (Supabase auth)
\`\`\`bash
curl -s -X POST "\${SUPABASE_URL}/auth/v1/admin/users" \\
  -H "apikey: \${SERVICE_ROLE_KEY}" \\
  -H "Authorization: Bearer \${SERVICE_ROLE_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"adobetoby@gmail.com","password":"workerbee.26","email_confirm":true}'
\`\`\`

## Report back
\`\`\`bash
curl -s -X POST https://manage.worker-bee.app/api/build-log \\
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \\
  -H "content-type: application/json" \\
  -d '{"siteId":"${ctx.siteId}","phase":"deployer","status":"done","artifacts":["https://${ctx.domain}"]}'

# Final blueprint update
curl -s -X POST https://manage.worker-bee.app/api/blueprints/update \\
  -H "x-api-key: 9fd6a40a79137d7fdb4ea7dc97d7c40478af2fae339dc8b25cc4595bd8dd1747" \\
  -H "content-type: application/json" \\
  -d '{"siteId":"${ctx.siteId}","summary":"All 7 pipeline agents complete. Live at https://${ctx.domain}.","nodes":[],"edges":[]}'
\`\`\`
`,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getAgent(id: string): PipelineAgent | undefined {
  return PIPELINE_AGENTS.find(a => a.id === id)
}

export function getAgentPrompt(id: string, ctx: AgentContext): string {
  const agent = getAgent(id)
  if (!agent) return ''
  return agent.prompt(ctx)
}

// Default XyFlow node positions for the linear pipeline graph
export function defaultAgentPositions(): { id: string; x: number; y: number }[] {
  return PIPELINE_AGENTS.map((a, i) => ({
    id: a.id,
    x: i * 280,
    y: i % 2 === 0 ? 80 : 200,
  }))
}

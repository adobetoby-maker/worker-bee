import Link from 'next/link'
import {
  LayoutDashboard,
  Globe,
  KeyRound,
  Hammer,
  Layers,
  Search,
  Wrench,
  GitBranch,
  Shield,
  Cpu,
  Zap,
  Inbox,
  Sparkles,
  Map,
  ArrowRight,
  Plus,
  type LucideIcon,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface Section {
  href: string
  icon: LucideIcon
  label: string
  accent: string
  description: string
  bullets: string[]
}

// ── Data ───────────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    href: '/',
    icon: LayoutDashboard,
    label: 'Dashboard',
    accent: '#818cf8',
    description:
      'The command center. At a glance you can see total sites, active sites, vault entries, and any open alerts.',
    bullets: [
      'Stat cards link directly to the relevant section — click Total Sites to go to the sites list.',
      'Quick actions surface the four most common tasks: add a site, open vault, configure Claude, and evaluate a URL.',
      'Client links let you share the plan wizard or site evaluator with a client directly.',
    ],
  },
  {
    href: '/sites',
    icon: Globe,
    label: 'Sites',
    accent: '#818cf8',
    description:
      'The full list of client sites registered in the system. Each row shows the site name, URL, status, and client name.',
    bullets: [
      'Click a site row to open its detail page.',
      'From the detail page you can view the blueprint canvas, trigger a new build, or edit site info.',
      'Use the "New Site" button (top right) to register a new client — only takes a minute.',
      'Status options: Active, Building, Maintenance, or Archived.',
    ],
  },
  {
    href: '/sites',
    icon: Map,
    label: 'Blueprint',
    accent: '#34d399',
    description:
      'A visual canvas built on xyflow/react for mapping out a site\'s architecture. Each card represents a page, route, or component.',
    bullets: [
      'Drag cards to reorganize the layout — positions save automatically to Supabase Storage.',
      'Use the canvas to plan the site before any code is written — pages, API routes, components, and their relationships.',
      'Blueprint data is referenced by the AI build pipeline when generating code.',
      'Access the blueprint from any site\'s detail page.',
    ],
  },
  {
    href: '/vault',
    icon: KeyRound,
    label: 'Vault',
    accent: '#fbbf24',
    description:
      'An AES-256-GCM encrypted credential store. Use it to store API keys, passwords, and environment variables per site.',
    bullets: [
      'Nothing is stored in plaintext — all values are encrypted before hitting the database.',
      'Access requires a vault PIN that is never transmitted to the server.',
      'Credentials are scoped per site so each client\'s secrets stay separate.',
      'Add entries via Vault → Add, or directly from a site\'s detail page.',
    ],
  },
  {
    href: '/builds',
    icon: Hammer,
    label: 'Builds',
    accent: '#34d399',
    description:
      'Trigger and monitor AI-assisted site builds. The build pipeline runs Claude through a series of phases to generate, refine, and ship code.',
    bullets: [
      'Each build shows real-time progress, logs, and which phase is active.',
      'Iteration history is stored so you can compare before/after across build cycles.',
      'Builds pull from the site\'s blueprint and vault credentials automatically.',
      'Start a build from the Sites detail page or directly from the Builds section.',
    ],
  },
  {
    href: '/batch',
    icon: Layers,
    label: 'Batch',
    accent: '#818cf8',
    description:
      'Run build or audit tasks across multiple sites at once. Useful when you\'ve updated a shared pattern and want to apply it everywhere.',
    bullets: [
      'Select the sites you want to target, choose the task type, then dispatch.',
      'Each site runs independently — one failure doesn\'t block others.',
      'Progress for each site is tracked separately in the build log.',
    ],
  },
  {
    href: '/audits',
    icon: Search,
    label: 'Audits',
    accent: '#818cf8',
    description:
      'SEO, security, and performance audits for any public URL. Results are stored per site for comparison over time.',
    bullets: [
      'Audits run a suite of checks: title/meta, canonical, OG tags, robots, sitemap, HTTPS, redirect chains, and more.',
      'Each check is scored and flagged as pass, warn, or critical.',
      'The blueprint auto-generates fix nodes from audit findings so you can resolve issues in the build pipeline.',
      'Share the evaluate link at /evaluate with a client to let them kick off an audit themselves.',
    ],
  },
  {
    href: '/maintenance',
    icon: Wrench,
    label: 'Maintenance',
    accent: '#818cf8',
    description:
      'Active maintenance requests, mod installations, and the dispatch queue. Tracks ongoing work for sites that are in a support contract.',
    bullets: [
      'Each request shows the site, description, status, and priority.',
      'Maintenance tasks can trigger targeted builds without a full rebuild.',
      'The dispatch queue integrates with Silver Creek Logistics for driver notification workflows.',
    ],
  },
  {
    href: '/language-lens',
    icon: Shield,
    label: 'Language Lens',
    accent: '#d4af37',
    description:
      'Feedback analytics dashboard for the LinguaLens language learning app. Tracks learner XP, rank tiers, and feature feedback.',
    bullets: [
      'View submitted feedback by learner tier (Beginner → Maestro) and rank tier (Bronze → Unreal).',
      'Use the feedback list to surface patterns across users before prioritizing features.',
      'Access the full feedback thread from any entry.',
    ],
  },
  {
    href: '/iterations',
    icon: GitBranch,
    label: 'Iterations',
    accent: '#818cf8',
    description:
      'Visual iteration history for sites under active development. Each iteration captures a snapshot of what was built, scored, and changed.',
    bullets: [
      'Compare iterations side-by-side to see visual and score progression.',
      'Iteration records include build notes, score deltas, and screenshot references.',
      'Useful for client check-ins — show exactly what changed between sessions.',
    ],
  },
  {
    href: '/configurator',
    icon: Cpu,
    label: 'Configurator',
    accent: '#818cf8',
    description:
      'Generate CLAUDE.md and Claude Code settings files tailored to a project. Also includes the workspace restore script and slash command reference.',
    bullets: [
      'Choose a template (Next.js, WordPress, General) and fill in project details.',
      'Toggle Supabase, Tailwind, TypeScript, and Apple Aesthetic mode.',
      'Download both CLAUDE.md and settings.json as a ready-to-drop package.',
      'The Plugin & Skill Set tab gives you a one-command script to restore the full workspace on a new machine.',
      'The Slash Commands tab is a live reference for every /command across GStack, Superpowers, Vercel, and Ruflo.',
    ],
  },
  {
    href: '/tetrad',
    icon: Zap,
    label: 'Tetrad',
    accent: '#fbbf24',
    description:
      'Internal research tool for running structured analysis tasks. Used for competitive research, market sizing, and strategic synthesis.',
    bullets: [
      'Input a topic or URL and select the analysis type.',
      'Results are structured and exportable for use in planning documents.',
      'Access is internal — not shared with clients.',
    ],
  },
  {
    href: '/submissions',
    icon: Inbox,
    label: 'Submissions',
    accent: '#818cf8',
    description:
      'Incoming submissions from client-facing forms, the plan wizard, and the evaluate page. Every lead or request lands here.',
    bullets: [
      'Each submission shows the client name, contact info, site URL, and submitted data.',
      'Convert a submission into a new Site entry directly from the detail view.',
      'Submissions are never auto-deleted — archived entries stay searchable.',
    ],
  },
  {
    href: '/mods',
    icon: Sparkles,
    label: 'Mods',
    accent: '#818cf8',
    description:
      'Mod installation tracking. Mods are optional add-ons that extend a site\'s functionality — analytics integrations, chat widgets, booking systems, and so on.',
    bullets: [
      'Each mod shows installation status across all sites.',
      'Use the mod detail page to see which sites have it active, pending, or skipped.',
      'Mod installs can be triggered as part of a maintenance task or standalone build.',
    ],
  },
]

// ── Walkthrough steps ─────────────────────────────────────────────────────

const WALKTHROUGH = [
  { step: 1, label: 'Go to Sites → New Site', desc: 'Click "New Site" in the top right of the Sites page. Fill in the site name, client name, URL, and initial status.' },
  { step: 2, label: 'Open Blueprint → map out pages', desc: 'From the site detail page, open the Blueprint canvas. Drag in cards for each planned page or route. Connect them to show the navigation structure.' },
  { step: 3, label: 'Use Builds to trigger the first build', desc: 'From the site detail page, click "Start Build". The AI pipeline reads the blueprint and generates the initial codebase. Monitor progress in the Builds section.' },
  { step: 4, label: 'Add credentials to Vault', desc: 'Open Vault and add an entry for the new site. Store API keys, environment variables, and any service passwords needed for the build.' },
  { step: 5, label: 'Run an Audit to check the live site', desc: 'Once the site is deployed, go to Audits and enter the live URL. Review the SEO, security, and performance findings and resolve any critical issues.' },
]

// ── Section card ──────────────────────────────────────────────────────────

function SectionCard({ section }: { section: Section }) {
  const Icon = section.icon
  return (
    <div className="card rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${section.accent}18` }}
        >
          <Icon size={15} style={{ color: section.accent }} />
        </div>
        <h3 className="text-sm font-bold text-white">{section.label}</h3>
        {section.href && (
          <Link
            href={section.href}
            className="ml-auto flex items-center gap-1 text-xs font-medium transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            Open <ArrowRight size={11} />
          </Link>
        )}
      </div>
      <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--muted-light)' }}>
        {section.description}
      </p>
      <ul className="space-y-1.5">
        {section.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--muted)' }}>
            <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--muted)' }} />
            {b}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function HelpPage() {
  return (
    <div className="max-w-5xl animate-fade-in">

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-white mb-1">Help</h1>
        <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
          How to use every section of manage.worker-bee.app
        </p>
      </div>

      {/* How to add a new client site */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          How to add a new client site
        </h2>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      <div className="card rounded-xl p-5 mb-10">
        <div className="flex flex-col gap-0">
          {WALKTHROUGH.map((item, i) => (
            <div key={item.step} className="flex gap-4">
              {/* Step number + connector */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'rgba(99,102,241,0.18)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}
                >
                  {item.step}
                </div>
                {i < WALKTHROUGH.length - 1 && (
                  <div className="w-px flex-1 my-1" style={{ background: 'var(--border)' }} />
                )}
              </div>
              {/* Content */}
              <div className={i < WALKTHROUGH.length - 1 ? 'pb-5' : ''}>
                <div className="text-sm font-semibold text-white mb-0.5 pt-1">{item.label}</div>
                <div className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
          <Link
            href="/sites/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Plus size={14} />
            Add your first site
          </Link>
        </div>
      </div>

      {/* Section reference */}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          Section reference
        </h2>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {SECTIONS.map(s => (
          <SectionCard key={s.label} section={s} />
        ))}
      </div>

      {/* Footer tip */}
      <div
        className="rounded-xl border px-5 py-4 flex items-start gap-3"
        style={{ borderColor: 'rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.07)' }}
      >
        <Map size={15} className="mt-0.5 shrink-0" style={{ color: '#818cf8' }} />
        <div>
          <div className="text-sm font-semibold text-white mb-0.5">Looking for a visual overview?</div>
          <div className="text-xs" style={{ color: 'var(--muted-light)' }}>
            The{' '}
            <Link href="/sitemap-visual" className="underline underline-offset-2" style={{ color: '#818cf8' }}>
              visual sitemap
            </Link>
            {' '}shows every route in the dashboard as a tree diagram — useful for finding a page quickly.
          </div>
        </div>
      </div>
    </div>
  )
}

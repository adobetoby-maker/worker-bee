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
  HelpCircle,
  ChevronRight,
  Map,
} from 'lucide-react'

// ── Tree data ──────────────────────────────────────────────────────────────

interface RouteNode {
  href: string
  label: string
  desc?: string
  icon?: React.ElementType
  accent?: string
  children?: RouteNode[]
}

const ROUTE_TREE: RouteNode[] = [
  {
    href: '/',
    label: 'Dashboard',
    desc: 'Stats, quick actions, client links',
    icon: LayoutDashboard,
    accent: '#818cf8',
  },
  {
    href: '/sites',
    label: 'Sites',
    desc: 'All client sites',
    icon: Globe,
    accent: '#818cf8',
    children: [
      { href: '/sites/new', label: 'New Site', desc: 'Register a new client site' },
      {
        href: '/sites/[id]',
        label: 'Site Detail',
        desc: 'Overview, status, client info',
        children: [
          { href: '/sites/[id]/blueprint', label: 'Blueprint', desc: 'Visual architecture canvas (xyflow)' },
          { href: '/sites/[id]/build', label: 'Build', desc: 'Trigger a build for this site' },
          { href: '/sites/[id]/edit', label: 'Edit', desc: 'Edit site name, URL, status' },
        ],
      },
    ],
  },
  {
    href: '/vault',
    label: 'Vault',
    desc: 'AES-256-GCM encrypted credentials',
    icon: KeyRound,
    accent: '#fbbf24',
    children: [
      { href: '/vault/add', label: 'Add Entry', desc: 'Store a new credential or API key' },
      { href: '/vault/edit', label: 'Edit Entry', desc: 'Update an existing credential' },
    ],
  },
  {
    href: '/builds',
    label: 'Builds',
    desc: 'AI-assisted site build pipeline',
    icon: Hammer,
    accent: '#34d399',
    children: [
      { href: '/builds/[id]/progress', label: 'Build Progress', desc: 'Real-time logs and phase status' },
    ],
  },
  {
    href: '/audits',
    label: 'Audits',
    desc: 'SEO, security, and performance checks',
    icon: Search,
    accent: '#818cf8',
  },
  {
    href: '/batch',
    label: 'Batch',
    desc: 'Run tasks across multiple sites',
    icon: Layers,
    accent: '#818cf8',
  },
  {
    href: '/maintenance',
    label: 'Maintenance',
    desc: 'Active requests and dispatch queue',
    icon: Wrench,
    accent: '#818cf8',
  },
  {
    href: '/mods',
    label: 'Mods',
    desc: 'Optional site add-ons and integrations',
    icon: Sparkles,
    accent: '#818cf8',
  },
  {
    href: '/language-lens',
    label: 'Language Lens',
    desc: 'LinguaLens feedback and analytics',
    icon: Shield,
    accent: '#d4af37',
    children: [
      { href: '/language-lens/feedback', label: 'Feedback', desc: 'Per-learner feedback threads' },
    ],
  },
  {
    href: '/iterations',
    label: 'Iterations',
    desc: 'Visual build iteration history',
    icon: GitBranch,
    accent: '#818cf8',
  },
  {
    href: '/configurator',
    label: 'Configurator',
    desc: 'Generate CLAUDE.md and settings files',
    icon: Cpu,
    accent: '#818cf8',
  },
  {
    href: '/tetrad',
    label: 'Tetrad',
    desc: 'Internal research and analysis tool',
    icon: Zap,
    accent: '#fbbf24',
  },
  {
    href: '/submissions',
    label: 'Submissions',
    desc: 'Incoming form submissions and leads',
    icon: Inbox,
    accent: '#818cf8',
  },
  {
    href: '/help',
    label: 'Help',
    desc: 'Documentation and walkthroughs',
    icon: HelpCircle,
    accent: '#818cf8',
  },
]

// ── Tree node component ────────────────────────────────────────────────────

function TreeNode({ node, depth = 0 }: { node: RouteNode; depth?: number }) {
  const Icon = node.icon
  const hasChildren = node.children && node.children.length > 0
  const isRoot = depth === 0

  const accentColor = node.accent ?? '#64748b'
  const leftPad = depth * 20

  return (
    <div className={isRoot ? 'mb-1' : ''}>
      {/* Connector lines for non-root */}
      <div className="relative flex items-start" style={{ paddingLeft: leftPad }}>

        {/* Vertical + horizontal connector for children */}
        {depth > 0 && (
          <div
            className="absolute top-0 bottom-0"
            style={{
              left: leftPad - 12,
              width: 12,
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              top: -2,
              height: 18,
            }}
          />
        )}

        {/* Node */}
        <Link
          href={node.href.includes('[') ? '#' : node.href}
          className={`group flex items-center gap-2.5 rounded-lg transition-all w-full min-w-0 ${
            isRoot ? 'px-3 py-2.5' : 'px-2.5 py-1.5'
          }`}
          style={{
            background: isRoot ? `${accentColor}10` : 'transparent',
            border: isRoot ? `1px solid ${accentColor}20` : '1px solid transparent',
          }}
          onMouseOver={undefined}
        >
          {/* Icon (root only) */}
          {Icon && isRoot && (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${accentColor}18` }}
            >
              <Icon size={14} style={{ color: accentColor }} />
            </div>
          )}

          {/* Chevron for non-root */}
          {!Icon && depth > 0 && (
            <ChevronRight
              size={10}
              className="shrink-0"
              style={{ color: 'var(--muted)', marginLeft: 2 }}
            />
          )}

          {/* Text */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`font-semibold leading-tight ${isRoot ? 'text-sm text-white' : 'text-xs text-white/80'}`}
              >
                {node.label}
              </span>
              <code
                className="text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--muted)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {node.href}
              </code>
            </div>
            {node.desc && (
              <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                {node.desc}
              </div>
            )}
          </div>

          {/* Arrow on hover */}
          {!node.href.includes('[') && (
            <ChevronRight
              size={12}
              className="shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
              style={{ color: accentColor }}
            />
          )}
        </Link>
      </div>

      {/* Children */}
      {hasChildren && (
        <div className="relative" style={{ paddingLeft: leftPad + 20 }}>
          {/* Vertical guide line */}
          <div
            className="absolute"
            style={{
              left: leftPad + 8,
              top: 0,
              bottom: 8,
              width: 1,
              background: 'rgba(255,255,255,0.06)',
            }}
          />
          <div className="space-y-0.5 mt-0.5">
            {node.children!.map(child => (
              <TreeNode key={child.href} node={child} depth={depth + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stats bar ──────────────────────────────────────────────────────────────

function countRoutes(nodes: RouteNode[]): number {
  return nodes.reduce((acc, n) => {
    const childCount = n.children ? countRoutes(n.children) : 0
    return acc + 1 + childCount
  }, 0)
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SitemapVisualPage() {
  const totalRoutes = countRoutes(ROUTE_TREE)
  const topLevel = ROUTE_TREE.length
  const withChildren = ROUTE_TREE.filter(n => n.children && n.children.length > 0).length

  return (
    <div className="max-w-4xl animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Map size={18} style={{ color: '#818cf8' }} />
            <h1 className="text-2xl font-bold text-white">Visual Sitemap</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            All routes in the manage.worker-bee.app dashboard
          </p>
        </div>

        <Link
          href="/help"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0"
          style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <HelpCircle size={12} />
          Help docs
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Total routes', value: totalRoutes, color: '#818cf8' },
          { label: 'Top-level sections', value: topLevel, color: '#34d399' },
          { label: 'With sub-routes', value: withChildren, color: '#fbbf24' },
        ].map(stat => (
          <div
            key={stat.label}
            className="card rounded-xl p-4 text-center"
          >
            <div className="text-2xl font-bold tabular-nums mb-0.5" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-6 text-[11px]" style={{ color: 'var(--muted)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.2)' }} />
          Top-level section
        </div>
        <div className="flex items-center gap-1.5">
          <ChevronRight size={11} />
          Sub-route
        </div>
        <div className="flex items-center gap-1.5">
          <code className="px-1 rounded text-[10px]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
            [id]
          </code>
          Dynamic segment
        </div>
      </div>

      {/* Tree */}
      <div className="card rounded-xl p-5">
        <div className="space-y-2">
          {ROUTE_TREE.map(node => (
            <TreeNode key={node.href} node={node} depth={0} />
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-6 text-xs text-center" style={{ color: 'var(--muted)' }}>
        Dynamic routes shown as{' '}
        <code className="px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>
          [id]
        </code>{' '}
        — click links to navigate to live pages. Dynamic segments are not clickable.
      </div>
    </div>
  )
}

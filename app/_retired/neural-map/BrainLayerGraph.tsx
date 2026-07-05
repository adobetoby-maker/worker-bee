'use client'
import { useState } from 'react'

// ─── Data: the three layers ───────────────────────────────────────────────────

const VAULT_FILES = [
  { name: 'CRITICAL_FACTS.md', tier: 1, desc: 'Always loaded — Tier 1', color: '#fb923c' },
  { name: 'North Star.md',     tier: 2, desc: 'Mission + priorities — Tier 2', color: '#fb923c' },
  { name: 'work/active/manage-worker-bee.md', tier: 3, desc: 'Project preamble', color: '#34d399' },
  { name: 'work/active/language-lens-elite.md', tier: 3, desc: 'Project preamble', color: '#34d399' },
  { name: 'work/active/jrs-auto-repair.md', tier: 3, desc: 'Project preamble', color: '#34d399' },
  { name: 'work/active/silver-creek-logistics.md', tier: 3, desc: 'Project preamble', color: '#34d399' },
  { name: 'work/active/orthobiologic-pathways.md', tier: 3, desc: 'Project preamble', color: '#34d399' },
  { name: 'work/active/climb-brasil.md', tier: 3, desc: 'Project preamble', color: '#34d399' },
  { name: 'work/active/climb-france.md', tier: 3, desc: 'Project preamble', color: '#34d399' },
  { name: 'work/active/tobyandertonmd.md', tier: 3, desc: 'Project preamble', color: '#34d399' },
  { name: 'work/active/tac-deck.md', tier: 3, desc: 'Project preamble', color: '#34d399' },
  { name: 'brain/credential-map.md', tier: 3, desc: 'Credential nav (no values)', color: '#64748b' },
  { name: 'brain/Key Decisions.md', tier: 3, desc: 'Architecture decisions log', color: '#64748b' },
  { name: 'brain/Patterns.md', tier: 3, desc: 'Recurring patterns + conventions', color: '#64748b' },
  { name: 'brain/climb-sites.md', tier: 3, desc: 'Climb site portfolio map', color: '#64748b' },
  { name: 'now.md', tier: 4, desc: 'Current session state — Tier 4', color: '#38bdf8' },
]

const SKILL_CLUSTERS = [
  {
    id: 'frontend',
    label: 'Frontend',
    color: '#6366f1',
    count: 8,
    skills: [
      '/nextjs-best-practices',
      '/nextjs-app-router-patterns',
      '/nextjs-supabase-auth',
      '/react-best-practices',
      '/shadcn',
      '/tailwind-design-system',
      '/tailwind-patterns',
      '/landing-page-generator',
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    color: '#818cf8',
    count: 5,
    skills: [
      '/supabase-automation',
      '/cloudflare-workers-expert',
      '/vercel-ai-sdk-expert',
      '/vercel-deployment',
      '/vercel-automation',
    ],
  },
  {
    id: 'seo',
    label: 'SEO (1,460)',
    color: '#06b6d4',
    count: 1460,
    skills: [
      '/seo-aeo-blog-writer',
      '/seo-audit',
      '/seo-technical',
      '/seo-keyword-strategist',
      '/content-strategy',
      '/copywriting',
      '/keyword-extractor',
      '/seo-aeo-meta-description-generator',
      '/seo-aeo-schema-generator',
      '/seo-aeo-internal-linking',
      '… and 1,450 more',
    ],
  },
  {
    id: 'agents',
    label: 'Agent / Arch',
    color: '#f59e0b',
    count: 8,
    skills: [
      '/multi-agent-patterns',
      '/parallel-agents',
      '/production-code-audit',
      '/prompt-engineering',
      '/testing-patterns',
      '/e2e-testing-patterns',
      '/github-actions-templates',
      '/api-design-principles',
    ],
  },
  {
    id: 'gstack',
    label: 'GStack',
    color: '#10b981',
    count: 12,
    skills: [
      '/review',
      '/qa',
      '/ship',
      '/cso',
      '/investigate',
      '/autoplan',
      '/office-hours',
      '/plan-eng-review',
      '/design-shotgun',
      '/context-save',
      '/context-restore',
      '/browse',
    ],
  },
  {
    id: 'ruflo',
    label: 'Ruflo Suite',
    color: '#d946ef',
    count: 6,
    skills: [
      '/ruflo-rag-memory:ruflo-memory',
      '/ruflo-sparc:ruflo-sparc',
      '/ruflo-swarm:coordinator',
      '/ruflo-goals:goal-planner',
      '/ruflo-security-audit:security-auditor',
      '/ruflo-testgen:tester',
    ],
  },
  {
    id: 'design',
    label: 'Design / 3D',
    color: '#f472b6',
    count: 6,
    skills: [
      '/threejs-skills',
      '/threejs-shaders',
      '/animejs-animation',
      '/ui-ux-pro-max',
      '/industrial-brutalist-ui',
      '/frontend-ui-dark-ts',
    ],
  },
  {
    id: 'haiku-ops',
    label: 'Haiku Ops',
    color: '#10b981',
    count: 5,
    skills: [
      'git commit/push',
      'npm install/lint/build',
      'curl / image resize',
      'string replacements',
      'file rename/mv/cp',
    ],
  },
]

const MEMORY_TIERS = [
  {
    tier: 1, label: 'CRITICAL_FACTS.md', color: '#fb923c',
    desc: 'Non-negotiable context — always in every session. Security rules, active aliases, credential locations, autonomy rules.',
    items: ['jr "task" syntax', 'Never echo secrets', 'claude-flow global binary', 'Vault nav map'],
  },
  {
    tier: 2, label: 'North Star.md', color: '#f59e0b',
    desc: 'Mission, priorities, and identity. First 50 lines only — concise.',
    items: ['Build quality > speed', 'Obsidian vault = source of truth', 'Active agent ecosystem', 'Client portfolio map'],
  },
  {
    tier: 3, label: '9 Project Preambles', color: '#34d399',
    desc: 'Per-project context files. Stack, current status, next steps, key patterns.',
    items: ['manage-worker-bee', 'language-lens-elite', 'jrs-auto-repair', 'silver-creek-logistics', '+ 5 more'],
  },
  {
    tier: 4, label: 'now.md (session state)', color: '#38bdf8',
    desc: 'Current session buffer. What was just done, what is in progress, pending items.',
    items: ['Written at Stop hook', 'Read at SessionStart', 'Max 40 lines', 'Rolling overwrite'],
  },
]

const HOOK_CHAIN = [
  { event: 'SessionStart',      file: 'session-start.sh',     color: '#fb923c', desc: 'Loads vault tiers into additionalContext. Runs ruflo-bridge.sh for AgentDB HNSW sync.' },
  { event: 'UserPromptSubmit',  file: 'prompt-gate.sh',       color: '#f59e0b', desc: 'Fires before any tool call. Injects "check local files first" reminder. Forces ls → CLAUDE.md → mem-search order.' },
  { event: 'PreToolUse/Write',  file: 'research-gate.sh',     color: '#6366f1', desc: 'Blocks new code if scores.md is missing and project has no commits. Research-first enforcement.' },
  { event: 'PreToolUse/Bash',   file: 'deploy-gate.sh',       color: '#818cf8', desc: 'Platform gate before any deploy command. Vercel vs Cloudflare Workers decision enforced here.' },
  { event: 'PreToolUse/Bash',   file: 'code-gate.sh',         color: '#818cf8', desc: 'tsc check before any deploy. Cannot deploy broken TypeScript.' },
  { event: 'PostToolUse/Write', file: 'visual-gate.sh',       color: '#22d3ee', desc: 'After any .tsx/.css edit: injects screenshot + video protocol. Enforces 4-viewport visual review.' },
  { event: 'Stop',              file: 'memory-writeback.sh',  color: '#34d399', desc: 'Writes session state to now.md. Git commits memory files. Pushes to GitHub for next session sync.' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function VaultLayer() {
  const [expanded, setExpanded] = useState<number | null>(null)
  const tiers = [1, 2, 3, 4]

  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3', marginBottom: 12 }}>
        Obsidian Vault — 4-Tier Load Order
      </h3>
      <p style={{ fontSize: 11, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>
        session-start.sh injects these into <code style={{ color: '#fb923c', fontFamily: 'monospace' }}>additionalContext</code> on every new Claude Code session. Lower tier = higher priority.
      </p>

      {tiers.map(t => {
        const files = VAULT_FILES.filter(f => f.tier === t)
        const tierColor = files[0]?.color ?? '#64748b'
        const tierLabel = t === 1 ? 'Tier 1 — Critical Facts' : t === 2 ? 'Tier 2 — North Star' : t === 3 ? 'Tier 3 — Project Preambles' : 'Tier 4 — Session State'
        return (
          <div key={t} style={{ marginBottom: 10 }}>
            <button
              onClick={() => setExpanded(prev => prev === t ? null : t)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: `${tierColor}11`, border: `1px solid ${tierColor}44`,
                borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: tierColor, boxShadow: `0 0 6px ${tierColor}` }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: tierColor }}>{tierLabel}</span>
              </div>
              <span style={{ fontSize: 10, color: '#484f58' }}>{expanded === t ? '▲' : '▼'} {files.length} file{files.length !== 1 ? 's' : ''}</span>
            </button>
            {expanded === t && (
              <div style={{ marginTop: 4, paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {files.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: '#0d1117', borderRadius: 5 }}>
                    <span style={{ fontSize: 9, color: '#484f58' }}>📄</span>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', flex: 1 }}>{f.name}</span>
                    <span style={{ fontSize: 9, color: '#484f58' }}>{f.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function SkillsLayer() {
  const [open, setOpen] = useState<string | null>(null)
  const total = SKILL_CLUSTERS.reduce((s, c) => s + c.count, 0)

  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3', marginBottom: 4 }}>
        Skills — {total.toLocaleString()} installed
      </h3>
      <p style={{ fontSize: 11, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>
        90+ plugins. Invoke any with <code style={{ color: '#22d3ee', fontFamily: 'monospace' }}>/skill-name</code>. Skill invocation fires BEFORE any reasoning — see skill-invocation-order.md.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {SKILL_CLUSTERS.map(c => (
          <div key={c.id}>
            <button
              onClick={() => setOpen(prev => prev === c.id ? null : c.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: `${c.color}11`, border: `1px solid ${c.color}44`,
                borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.color }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: c.color }}>{c.label}</span>
              </div>
              <span style={{ fontSize: 10, color: '#484f58' }}>{c.count}</span>
            </button>
            {open === c.id && (
              <div style={{ marginTop: 4, background: '#0d1117', borderRadius: 6, padding: '6px 8px' }}>
                {c.skills.map((s, i) => (
                  <div key={i} style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace', padding: '1.5px 0', borderBottom: '1px solid #161b22' }}>{s}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function MemoryLayer() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: '#e6edf3', marginBottom: 4 }}>
        Second Brain — Memory Architecture
      </h3>
      <p style={{ fontSize: 11, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>
        Three memory systems working together: flat-file vault (Obsidian), HNSW vector store (AgentDB), and rolling session state (.remember/).
      </p>

      {/* Memory tiers */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Context Load Order</div>
        {MEMORY_TIERS.map(t => (
          <div key={t.tier} style={{ marginBottom: 8 }}>
            <button
              onClick={() => setOpen(prev => prev === t.tier ? null : t.tier)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                background: `${t.color}0d`, border: `1px solid ${t.color}33`,
                borderRadius: 8, padding: '9px 12px', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: t.color, minWidth: 20 }}>{t.tier}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: t.color }}>{t.label}</div>
                <div style={{ fontSize: 9, color: '#64748b', marginTop: 1 }}>{t.desc}</div>
              </div>
              <span style={{ fontSize: 10, color: '#484f58' }}>{open === t.tier ? '▲' : '▼'}</span>
            </button>
            {open === t.tier && (
              <div style={{ marginTop: 4, paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {t.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', background: '#0d1117', borderRadius: 5 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AgentDB */}
      <div style={{ marginBottom: 20, background: '#a78bfa0d', border: '1px solid #a78bfa33', borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 6 }}>AgentDB — HNSW Vector Store</div>
        <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6, marginBottom: 10 }}>
          ruvector.db on disk. Bridged at SessionStart via ruflo-bridge.sh. Semantic search across all agents — TAC, Hermes Jr, and wba all share the same index.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            { cmd: 'mem-search "query"', desc: 'Semantic HNSW search' },
            { cmd: 'mem-store KEY "val"', desc: 'Write to vector store' },
            { cmd: 'mem-get KEY', desc: 'Exact key lookup' },
            { cmd: 'ruflo sync', desc: 'Re-sync from GitHub' },
          ].map(item => (
            <div key={item.cmd} style={{ background: '#0d1117', borderRadius: 6, padding: '6px 8px' }}>
              <div style={{ fontSize: 9, color: '#a78bfa', fontFamily: 'monospace', marginBottom: 2 }}>{item.cmd}</div>
              <div style={{ fontSize: 8.5, color: '#484f58' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hook chain */}
      <div>
        <div style={{ fontSize: 10, color: '#484f58', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Hook Chain — Enforcement Layer</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {HOOK_CHAIN.map((h, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: `${h.color}08`, border: `1px solid ${h.color}22`,
              borderRadius: 8, padding: '8px 12px',
            }}>
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                <div style={{ fontSize: 8, color: h.color, fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap' }}>{h.event}</div>
                <div style={{ fontSize: 8, color: '#484f58', fontFamily: 'monospace', marginTop: 1 }}>{h.file}</div>
              </div>
              <div style={{ fontSize: 9.5, color: '#64748b', lineHeight: 1.5 }}>{h.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type BrainTab = 'vault' | 'skills' | 'memory'

export default function BrainLayerGraph() {
  const [tab, setTab] = useState<BrainTab>('vault')

  const TABS: { key: BrainTab; label: string; color: string; desc: string }[] = [
    { key: 'vault',  label: 'Obsidian Vault',   color: '#34d399', desc: '4-tier context load · 16 files · auto-injected' },
    { key: 'skills', label: 'Skills / Mind',    color: '#22d3ee', desc: '1,460+ skills · 90 plugins · /skill-name' },
    { key: 'memory', label: '2nd Brain',        color: '#a78bfa', desc: 'AgentDB · .remember/ · hook chain' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117', borderRadius: 12, overflow: 'hidden' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, padding: '12px 16px 0', borderBottom: '1px solid #21262d', flexShrink: 0 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px', borderRadius: '8px 8px 0 0',
              background: tab === t.key ? '#161b22' : 'transparent',
              border: tab === t.key ? `1px solid ${t.color}55` : '1px solid transparent',
              borderBottom: tab === t.key ? '1px solid #161b22' : '1px solid transparent',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: tab === t.key ? t.color : '#64748b' }}>{t.label}</div>
            <div style={{ fontSize: 9, color: '#484f58' }}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {tab === 'vault'  && <VaultLayer />}
        {tab === 'skills' && <SkillsLayer />}
        {tab === 'memory' && <MemoryLayer />}
      </div>
    </div>
  )
}

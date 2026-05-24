'use client'

import { useState, useTransition } from 'react'
import { Copy, Check, Eye, EyeOff, Trash2, Plus, Download, RefreshCw, ChevronDown, ChevronRight, Bot } from 'lucide-react'
import type { ProjectConfig, ConfigCategory } from '@/lib/configStore'

const CATEGORY_META: Record<ConfigCategory, { label: string; color: string; dot: string }> = {
  sanity:    { label: 'Sanity CMS', color: '#f59e0b', dot: '#f59e0b' },
  supabase:  { label: 'Supabase',   color: '#3ecf8e', dot: '#3ecf8e' },
  resend:    { label: 'Email',      color: '#60a5fa', dot: '#60a5fa' },
  stripe:    { label: 'Stripe',     color: '#818cf8', dot: '#818cf8' },
  analytics: { label: 'Analytics',  color: '#a78bfa', dot: '#a78bfa' },
  auth:      { label: 'Auth',       color: '#fb7185', dot: '#fb7185' },
  general:   { label: 'General',    color: '#94a3b8', dot: '#94a3b8' },
}

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as ConfigCategory[]

type Props = { initialConfigs: ProjectConfig[]; siteId: string; siteName: string }

function CopyButton({ text, size = 12 }: { text: string; size?: number }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
      className="p-1 rounded hover:bg-white/10 transition-colors"
      style={{ color: 'var(--muted)' }}
    >
      {copied ? <Check size={size} className="text-emerald-400" /> : <Copy size={size} />}
    </button>
  )
}

function ConfigRow({
  config, siteId,
  onSave, onDelete, onSaveNotes,
}: {
  config: ProjectConfig
  siteId: string
  onSave: (id: string, key: string, value: string, site_id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onSaveNotes: (id: string, key: string, notes: string, site_id: string) => Promise<void>
}) {
  const [val, setVal] = useState(config.value ?? '')
  const [notes, setNotes] = useState(config.notes ?? '')
  const [revealed, setRevealed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showCmd, setShowCmd] = useState(false)
  const [pending, startTransition] = useTransition()
  const isDirty = val !== (config.value ?? '')
  const isNotesDirty = notes !== (config.notes ?? '')

  const save = () => {
    startTransition(async () => {
      await onSave(config.id, config.key, val, config.site_id)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    })
  }

  const saveNotes = () => {
    startTransition(async () => {
      await onSaveNotes(config.id, config.key, notes, config.site_id)
    })
  }

  // SQL command Claude can run via the Supabase MCP to fill this value
  const claudeCmd = `-- Paste in Claude (Supabase MCP for manage-worker-bee / qnrkifdbkcbacgznoabs)
UPDATE project_configs
SET value = '<REPLACE_VALUE_HERE>'
WHERE site_id = '${siteId}'
  AND key = '${config.key}';`

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      {/* Main row */}
      <div className="grid items-center px-4 py-2.5 gap-3"
        style={{ gridTemplateColumns: '16px 190px 1fr auto' }}>
        {/* Expand toggle */}
        <button onClick={() => setExpanded(e => !e)} className="text-left"
          style={{ color: 'var(--muted)', opacity: 0.5 }}>
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        {/* Key + description */}
        <div className="min-w-0">
          <div className="text-xs font-mono font-semibold truncate" style={{ color: '#e2e8f0' }}>
            {config.key}
          </div>
          {config.description && (
            <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)', fontSize: 10 }}>
              {config.description}
            </div>
          )}
        </div>

        {/* Value input */}
        <div className="flex items-center gap-1.5">
          <input
            type={config.is_secret && !revealed ? 'password' : 'text'}
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save() }}
            placeholder={config.is_secret ? '••••••••' : 'not set'}
            className="flex-1 text-xs font-mono rounded px-2.5 py-1.5 outline-none focus:ring-1 transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${isDirty ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.08)'}`,
              color: '#e2e8f0',
              minWidth: 0,
            }}
          />
          {config.is_secret && (
            <button onClick={() => setRevealed(r => !r)} className="p-1 rounded hover:bg-white/10 transition-colors" style={{ color: 'var(--muted)' }}>
              {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
            </button>
          )}
          {val && <CopyButton text={val} />}
          <button onClick={() => setShowCmd(c => !c)} title="Show Claude fill command"
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: showCmd ? '#818cf8' : 'var(--muted)' }}>
            <Bot size={12} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {isDirty && (
            <button onClick={save} disabled={pending}
              className="text-xs px-2.5 py-1 rounded font-semibold transition-colors"
              style={{
                background: saved ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.2)',
                color: saved ? '#34d399' : '#818cf8',
                border: `1px solid ${saved ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
              }}>
              {pending ? '…' : saved ? '✓' : 'Save'}
            </button>
          )}
          <button onClick={() => onDelete(config.id)}
            className="p-1 rounded hover:bg-red-500/10 transition-colors opacity-40 hover:opacity-100"
            style={{ color: '#f87171' }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Claude command */}
      {showCmd && (
        <div className="mx-4 mb-2 rounded-lg overflow-hidden"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
            <span className="text-xs font-semibold" style={{ color: '#818cf8' }}>🤖 Claude fill command</span>
            <CopyButton text={claudeCmd} size={11} />
          </div>
          <pre className="text-xs font-mono px-3 py-2 overflow-x-auto" style={{ color: '#a3e635', lineHeight: 1.6 }}>
            {claudeCmd}
          </pre>
        </div>
      )}

      {/* Expanded: notes / instructions */}
      {expanded && (
        <div className="px-10 pb-3">
          <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--muted)' }}>
            Instructions / Notes
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Where to find this value, what it does, how to verify it…"
            rows={3}
            className="w-full text-xs rounded px-2.5 py-2 outline-none resize-y"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--muted-light)',
              lineHeight: 1.5,
            }}
          />
          {isNotesDirty && (
            <button onClick={saveNotes} disabled={pending}
              className="mt-1.5 text-xs px-2.5 py-1 rounded transition-colors"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)' }}>
              Save notes
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ConfigPanel({ initialConfigs, siteId, siteName }: Props) {
  const [configs, setConfigs] = useState<ProjectConfig[]>(initialConfigs)
  const [activeTab, setActiveTab] = useState<ConfigCategory | 'all'>('all')
  const [newKey, setNewKey] = useState('')
  const [newCategory, setNewCategory] = useState<ConfigCategory>('general')
  const [adding, setAdding] = useState(false)
  const [seeding, startSeedTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  const visibleConfigs = activeTab === 'all' ? configs : configs.filter(c => c.category === activeTab)
  const groupedByCategory = ALL_CATEGORIES.reduce<Record<string, ProjectConfig[]>>((acc, cat) => {
    acc[cat] = configs.filter(c => c.category === cat)
    return acc
  }, {})
  const filledCount = configs.filter(c => c.value).length

  const handleSave = async (id: string, key: string, value: string, site_id: string) => {
    const res = await fetch('/api/configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id, key, value }),
    })
    if (!res.ok) return
    const updated = await res.json() as ProjectConfig
    setConfigs(cs => cs.map(c => c.id === id ? updated : c))
  }

  const handleSaveNotes = async (id: string, key: string, notes: string, site_id: string) => {
    const res = await fetch('/api/configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id, key, notes }),
    })
    if (!res.ok) return
    const updated = await res.json() as ProjectConfig
    setConfigs(cs => cs.map(c => c.id === id ? updated : c))
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/configs/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setConfigs(cs => cs.filter(c => c.id !== id))
  }

  const handleAddKey = async () => {
    if (!newKey.trim()) return
    const res = await fetch('/api/configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_id: siteId, key: newKey.trim(), category: newCategory, is_secret: true }),
    })
    if (!res.ok) return
    const created = await res.json() as ProjectConfig
    setConfigs(cs => [...cs, created])
    setNewKey('')
    setAdding(false)
  }

  const handleSeedDefaults = () => {
    startSeedTransition(async () => {
      const res = await fetch('/api/configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: siteId, seed: true }),
      })
      if (!res.ok) return
      const all = await res.json() as ProjectConfig[]
      setConfigs(all)
    })
  }

  const handleCopyEnv = () => {
    const lines = configs.filter(c => c.value).map(c => `${c.key}=${c.value}`).join('\n')
    navigator.clipboard.writeText(lines)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white">Environment Config</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {filledCount}/{configs.length} keys filled · {siteName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSeedDefaults} disabled={seeding}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
            <RefreshCw size={11} className={seeding ? 'animate-spin' : ''} />
            {seeding ? 'Seeding…' : 'Seed Defaults'}
          </button>
          <button onClick={() => setAdding(a => !a)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/5"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
            <Plus size={11} /> Add Key
          </button>
          <button onClick={handleCopyEnv}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:border-emerald-500/40"
            style={{ borderColor: 'var(--border)', color: '#34d399' }}>
            {copied ? <Check size={11} /> : <Download size={11} />}
            {copied ? 'Copied!' : 'Copy .env'}
          </button>
        </div>
      </div>

      {/* Add key form */}
      {adding && (
        <div className="rounded-xl border p-4 mb-4 flex items-end gap-3"
          style={{ background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.3)' }}>
          <div className="flex-1">
            <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--muted)' }}>Key name</label>
            <input type="text" value={newKey} onChange={e => setNewKey(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddKey() }}
              placeholder="MY_CUSTOM_KEY"
              className="w-full text-xs font-mono rounded px-2.5 py-1.5 outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
              autoFocus />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--muted)' }}>Category</label>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value as ConfigCategory)}
              className="text-xs rounded px-2.5 py-1.5 outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}>
              {ALL_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
            </select>
          </div>
          <button onClick={handleAddKey}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
            style={{ background: 'rgba(99,102,241,0.25)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.4)' }}>
            Add
          </button>
          <button onClick={() => setAdding(false)} className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ color: 'var(--muted)' }}>
            Cancel
          </button>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {(['all', ...ALL_CATEGORIES] as const).map(cat => {
          const count = cat === 'all' ? configs.length : (groupedByCategory[cat]?.length ?? 0)
          const filled = cat === 'all' ? filledCount : (groupedByCategory[cat] ?? []).filter(c => c.value).length
          const meta = cat !== 'all' ? CATEGORY_META[cat] : null
          const isActive = activeTab === cat
          return (
            <button key={cat} onClick={() => setActiveTab(cat)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors border"
              style={{
                background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                borderColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: isActive ? '#e2e8f0' : 'var(--muted)',
              }}>
              {meta && <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, display: 'inline-block', flexShrink: 0 }} />}
              {cat === 'all' ? 'All' : meta?.label}
              <span className="opacity-50">{filled}/{count}</span>
            </button>
          )
        })}
      </div>

      {/* Config table */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {visibleConfigs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="text-3xl opacity-10">⚙</div>
            <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
              No config keys yet.<br />Click <strong>Seed Defaults</strong> to pre-populate all standard keys.
            </p>
          </div>
        ) : (
          <div>
            <div className="grid px-4 py-2 border-b"
              style={{ gridTemplateColumns: '16px 190px 1fr auto', gap: 12, borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              <span />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Key</span>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Value</span>
              <span className="w-16" />
            </div>
            {visibleConfigs.map(config => (
              <ConfigRow
                key={config.id}
                config={config}
                siteId={siteId}
                onSave={handleSave}
                onDelete={handleDelete}
                onSaveNotes={handleSaveNotes}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pull script info */}
      <div className="mt-4 rounded-xl border p-4" style={{ background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.15)' }}>
        <div className="flex items-start gap-3">
          <div className="text-base mt-0.5">📋</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold mb-1" style={{ color: '#34d399' }}>Pull to any project</p>
            <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
              Run from any project root to write values directly to <code className="font-mono">.env.local</code>:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 block text-xs font-mono rounded px-3 py-2 truncate"
                style={{ background: 'rgba(0,0,0,0.3)', color: '#a3e635' }}>
                SITE_ID={siteId} node scripts/pull-manage-config.mjs
              </code>
              <CopyButton text={`SITE_ID=${siteId} node scripts/pull-manage-config.mjs`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

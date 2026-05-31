'use client'

import { useState, useCallback } from 'react'
import { RefreshCw, Palette, Type, Layout, AlertTriangle, Sparkles, Plus, GitBranch, Blend, Play, Check, Trash2, Star } from 'lucide-react'
import type { DesignScheme } from '@/lib/blueprintStore'

const DEVTOOLS_URL = 'http://100.117.143.57:3333'

interface Props {
  siteId: string
  initial: { schemes: Record<string, DesignScheme>; active: string } | null
  siteName: string
  projectPath?: string    // e.g. "/Users/drive/john-huber-baja"
  localPort?: number      // e.g. 3010
  cssVarMap?: Record<string, string>  // palette role → CSS var name
}

type Mode = 'browse' | 'recast' | 'compare' | 'blend'

const BLEND_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'palette', label: 'Palette' },
  { key: 'headingFont', label: 'Heading Font' },
  { key: 'bodyFont', label: 'Body Font' },
  { key: 'style', label: 'Style' },
  { key: 'landingPattern', label: 'Section Order' },
  { key: 'antiPatterns', label: 'Anti-Patterns' },
  { key: 'effects', label: 'Effects' },
]

function SwatchRow({ palette }: { palette: DesignScheme['palette'] }) {
  return (
    <div className="flex gap-2.5 flex-wrap">
      {palette?.map(s => (
        <div key={s.role} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-lg border" style={{
            background: s.hex,
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: `0 3px 8px ${s.hex}50`,
          }} />
          <span className="text-xs font-mono leading-none" style={{ color: 'var(--muted-light)', fontSize: 9 }}>{s.hex}</span>
          <span className="text-xs capitalize leading-none" style={{ color: 'var(--muted)', fontSize: 9 }}>{s.role}</span>
        </div>
      ))}
    </div>
  )
}

function SchemeCard({ scheme, compact = false }: { scheme: DesignScheme; compact?: boolean }) {
  return (
    <div className="space-y-3">
      <SwatchRow palette={scheme.palette ?? []} />
      {!compact && (
        <>
          <div className="flex gap-2">
            {scheme.headingFont && (
              <div className="flex-1 rounded px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--muted)', fontSize: 9 }} className="uppercase tracking-widest mb-0.5">Heading</p>
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--muted-light)' }}>{scheme.headingFont}</p>
              </div>
            )}
            {scheme.bodyFont && (
              <div className="flex-1 rounded px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--muted)', fontSize: 9 }} className="uppercase tracking-widest mb-0.5">Body</p>
                <p className="text-sm truncate" style={{ color: 'var(--muted-light)' }}>{scheme.bodyFont}</p>
              </div>
            )}
          </div>
          {scheme.landingPattern?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {scheme.landingPattern.slice(0, 6).map((s, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.15)', fontSize: 10 }}>
                  <span style={{ opacity: 0.5 }}>{i + 1}.</span> {s}
                </span>
              ))}
              {scheme.landingPattern.length > 6 && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.05)', color: '#818cf8', fontSize: 10 }}>+{scheme.landingPattern.length - 6}</span>
              )}
            </div>
          )}
          {scheme.antiPatterns?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {scheme.antiPatterns.map((a, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.07)', color: '#f87171', border: '1px solid rgba(239,68,68,0.12)', fontSize: 10 }}>{a}</span>
              ))}
            </div>
          )}
        </>
      )}
      {scheme.overrides && (
        <p className="text-xs italic" style={{ color: 'var(--muted)', opacity: 0.5, fontSize: 10 }}>{scheme.overrides}</p>
      )}
    </div>
  )
}

export default function DesignSchemePanel({ siteId, initial, siteName, projectPath, localPort, cssVarMap }: Props) {
  const [schemes, setSchemes] = useState<Record<string, DesignScheme>>(initial?.schemes ?? {})
  const [activeBranch, setActiveBranch] = useState(initial?.active ?? 'main')
  const [mode, setMode] = useState<Mode>('browse')

  // Recast state
  const [description, setDescription] = useState(
    Object.values(initial?.schemes ?? {})[0]?.businessDescription ?? ''
  )
  const [newBranchName, setNewBranchName] = useState('')
  const [recasting, setRecasting] = useState(false)
  const [recastError, setRecastError] = useState('')

  // Compare / blend state
  const [compareA, setCompareA] = useState(Object.keys(initial?.schemes ?? {})[0] ?? 'main')
  const [compareB, setCompareB] = useState(Object.keys(initial?.schemes ?? {})[1] ?? '')
  const [mergeMap, setMergeMap] = useState<Record<string, 'a' | 'b'>>({})
  const [blendName, setBlendName] = useState('blend')
  const [blending, setBlending] = useState(false)

  // Apply state
  const [applying, setApplying] = useState<string | null>(null)
  const [applyDone, setApplyDone] = useState<string | null>(null)

  const branchNames = Object.keys(schemes)

  const handleRecast = useCallback(async () => {
    if (!description.trim()) return
    setRecasting(true)
    setRecastError('')
    try {
      const res = await fetch(`/api/sites/${siteId}/design-scheme/recast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, branch: newBranchName.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Recast failed')
      setSchemes(prev => ({ ...prev, [json.branch]: json.scheme }))
      setActiveBranch(json.branch)
      setMode('browse')
      setNewBranchName('')
    } catch (err) {
      setRecastError(err instanceof Error ? err.message : 'Recast failed')
    } finally {
      setRecasting(false)
    }
  }, [description, newBranchName, siteId])

  const handleSetActive = useCallback(async (branch: string) => {
    setActiveBranch(branch)
    await fetch(`/api/sites/${siteId}/design-scheme`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeBranch: branch }),
    })
  }, [siteId])

  const handleDelete = useCallback(async (branch: string) => {
    if (branch === 'main') return
    const next = { ...schemes }
    delete next[branch]
    setSchemes(next)
    if (activeBranch === branch) setActiveBranch(Object.keys(next)[0] ?? 'main')
    await fetch(`/api/sites/${siteId}/design-scheme`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteBranch: branch }),
    })
  }, [schemes, activeBranch, siteId])

  const handleBlend = useCallback(async () => {
    if (!compareA || !compareB || !blendName.trim()) return
    setBlending(true)
    try {
      const res = await fetch(`/api/sites/${siteId}/design-scheme/blend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchA: compareA, branchB: compareB, mergeMap, newBranchName: blendName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSchemes(prev => ({ ...prev, [json.branch]: json.scheme }))
      setActiveBranch(json.branch)
      setMode('browse')
      setMergeMap({})
    } catch (err) {
      process.env.NODE_ENV !== 'production' && console.error(err)
    } finally {
      setBlending(false)
    }
  }, [compareA, compareB, mergeMap, blendName, siteId])

  const handleApply = useCallback(async (branch: string) => {
    if (!projectPath) return
    setApplying(branch)
    setApplyDone(null)
    try {
      const res = await fetch(`${DEVTOOLS_URL}/apply-design-scheme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath, scheme: schemes[branch], cssVarMap }),
      })
      if (res.ok) {
        setApplyDone(branch)
        setTimeout(() => setApplyDone(null), 3000)
      }
    } catch {
      // devtools offline — silent
    } finally {
      setApplying(null)
    }
  }, [projectPath, schemes, cssVarMap])

  const hasSchemes = branchNames.length > 0

  return (
    <div className="rounded-2xl border overflow-hidden mb-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Palette size={13} style={{ color: '#a78bfa' }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Design Schemes</span>
          {hasSchemes && <span className="text-xs px-1.5 py-0.5 rounded-full font-mono" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>{branchNames.length}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {hasSchemes && branchNames.length >= 2 && (
            <button onClick={() => setMode(mode === 'compare' ? 'browse' : 'compare')}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
              style={{ background: mode === 'compare' ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)', color: mode === 'compare' ? '#fbbf24' : 'var(--muted)', border: `1px solid ${mode === 'compare' ? 'rgba(251,191,36,0.2)' : 'var(--border)'}` }}>
              <Blend size={10} /> Compare
            </button>
          )}
          <button onClick={() => setMode(mode === 'recast' ? 'browse' : 'recast')}
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
            style={{ background: mode === 'recast' ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.04)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.2)' }}>
            <Plus size={10} /> New Branch
          </button>
        </div>
      </div>

      {/* ── Branch tabs ── */}
      {hasSchemes && (
        <div className="flex items-center gap-1 px-5 py-2 border-b overflow-x-auto" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.15)' }}>
          {branchNames.map(b => (
            <div key={b} className="flex items-center gap-1 shrink-0">
              <button onClick={() => { handleSetActive(b); setMode('browse') }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                style={{
                  background: activeBranch === b ? 'rgba(167,139,250,0.15)' : 'transparent',
                  color: activeBranch === b ? '#a78bfa' : 'var(--muted)',
                  border: `1px solid ${activeBranch === b ? 'rgba(167,139,250,0.3)' : 'transparent'}`,
                }}>
                <GitBranch size={9} />
                {b}
                {activeBranch === b && <Star size={8} style={{ opacity: 0.7 }} />}
              </button>
              {b !== 'main' && (
                <button onClick={() => handleDelete(b)}
                  className="text-xs p-1 rounded cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                  style={{ color: '#f87171' }}>
                  <Trash2 size={9} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Recast input ── */}
      {mode === 'recast' && (
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)', background: 'rgba(167,139,250,0.03)' }}>
          <div className="flex gap-2 mb-2">
            <div className="flex-1">
              <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Business description</p>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="independent fishing guide Baja California offshore marlin fly fishing..."
                className="w-full text-xs rounded px-3 py-2 resize-none outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted-light)' }} />
            </div>
            <div className="w-28">
              <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Branch name</p>
              <input value={newBranchName} onChange={e => setNewBranchName(e.target.value)}
                placeholder="auto"
                className="w-full text-xs rounded px-3 py-2 outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--muted-light)' }} />
            </div>
          </div>
          {recastError && <p className="text-xs mb-2 flex items-center gap-1" style={{ color: '#f87171' }}><AlertTriangle size={10} />{recastError}</p>}
          <button onClick={handleRecast} disabled={recasting || !description.trim()}
            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-semibold cursor-pointer disabled:opacity-40"
            style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
            <Sparkles size={10} className={recasting ? 'animate-pulse' : ''} />
            {recasting ? 'Running UUPM…' : 'Run Design System'}
          </button>
          <p className="text-xs mt-2" style={{ color: 'var(--muted)', opacity: 0.4, fontSize: 10 }}>Requires devtools server: node ~/devtools/server.mjs</p>
        </div>
      )}

      {/* ── Browse: single branch ── */}
      {mode === 'browse' && !hasSchemes && (
        <div className="flex flex-col items-center gap-2 py-10">
          <Palette size={20} style={{ color: 'var(--muted)', opacity: 0.2 }} />
          <p className="text-xs" style={{ color: 'var(--muted)' }}>No design schemes. Click New Branch to run UUPM.</p>
        </div>
      )}

      {mode === 'browse' && hasSchemes && schemes[activeBranch] && (
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-sm font-semibold" style={{ color: 'white' }}>{schemes[activeBranch].style}</span>
              {schemes[activeBranch].styleKeywords && (
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--muted)' }}>{schemes[activeBranch].styleKeywords.slice(0, 80)}</p>
              )}
            </div>
            {projectPath && (
              <button onClick={() => handleApply(activeBranch)} disabled={applying === activeBranch}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer shrink-0 ml-4 transition-colors"
                style={{ background: applyDone === activeBranch ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)', color: applyDone === activeBranch ? '#34d399' : '#6ee7b7', border: `1px solid ${applyDone === activeBranch ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.15)'}` }}>
                {applyDone === activeBranch ? <Check size={10} /> : applying === activeBranch ? <RefreshCw size={10} className="animate-spin" /> : <Play size={10} />}
                {applyDone === activeBranch ? 'Applied!' : 'Apply to Project'}
              </button>
            )}
          </div>
          <SchemeCard scheme={schemes[activeBranch]} />
          {localPort && (
            <a href={`http://localhost:${localPort}`} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)', opacity: 0.6 }}>
              localhost:{localPort} ↗
            </a>
          )}
          <p className="mt-3 text-xs" style={{ color: 'var(--muted)', opacity: 0.4, fontSize: 10 }}>
            Generated {new Date(schemes[activeBranch].generatedAt).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* ── Compare mode ── */}
      {mode === 'compare' && (
        <div className="px-5 py-4">
          {/* Branch selectors */}
          <div className="flex gap-3 mb-4">
            {(['a', 'b'] as const).map(side => (
              <div key={side} className="flex-1">
                <p className="text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: side === 'a' ? '#818cf8' : '#f59e0b' }}>
                  <GitBranch size={10} /> Branch {side.toUpperCase()}
                </p>
                <select value={side === 'a' ? compareA : compareB}
                  onChange={e => side === 'a' ? setCompareA(e.target.value) : setCompareB(e.target.value)}
                  className="w-full text-xs rounded px-2.5 py-1.5 outline-none cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }}>
                  {branchNames.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Side-by-side scheme cards */}
          {compareA && compareB && schemes[compareA] && schemes[compareB] && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[{ branch: compareA, color: '#818cf8' }, { branch: compareB, color: '#f59e0b' }].map(({ branch, color }) => (
                  <div key={branch} className="rounded-xl p-3" style={{ border: `1px solid ${color}22`, background: `${color}08` }}>
                    <p className="text-xs font-semibold mb-2 truncate" style={{ color }}>{branch} — {schemes[branch].style}</p>
                    <SchemeCard scheme={schemes[branch]} compact />
                    {projectPath && (
                      <button onClick={() => handleApply(branch)} disabled={applying === branch}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded cursor-pointer transition-colors"
                        style={{ background: applyDone === branch ? `${color}20` : `${color}10`, color, border: `1px solid ${color}30` }}>
                        {applyDone === branch ? <><Check size={9} />Applied!</> : applying === branch ? <><RefreshCw size={9} className="animate-spin" />Applying…</> : <><Play size={9} />Apply to :{localPort}</>}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Blend builder */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: '#a78bfa' }}>
                  <Blend size={11} /> Build Blend — pick per field
                </p>
                <div className="space-y-2 mb-3">
                  {BLEND_FIELDS.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-xs w-28 shrink-0" style={{ color: 'var(--muted)' }}>{label}</span>
                      <div className="flex gap-1.5">
                        {(['a', 'b'] as const).map(side => (
                          <button key={side} onClick={() => setMergeMap(m => ({ ...m, [key]: side }))}
                            className="text-xs px-3 py-1 rounded cursor-pointer transition-colors"
                            style={{
                              background: mergeMap[key] === side ? (side === 'a' ? 'rgba(129,140,248,0.2)' : 'rgba(245,158,11,0.2)') : 'rgba(255,255,255,0.04)',
                              color: mergeMap[key] === side ? (side === 'a' ? '#818cf8' : '#f59e0b') : 'var(--muted)',
                              border: `1px solid ${mergeMap[key] === side ? (side === 'a' ? 'rgba(129,140,248,0.3)' : 'rgba(245,158,11,0.3)') : 'transparent'}`,
                            }}>
                            {side === 'a' ? compareA : compareB}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input value={blendName} onChange={e => setBlendName(e.target.value)}
                    placeholder="blend name"
                    className="text-xs rounded px-2.5 py-1.5 outline-none w-32"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white' }} />
                  <button onClick={handleBlend} disabled={blending || !blendName.trim()}
                    className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-semibold cursor-pointer disabled:opacity-40 transition-colors"
                    style={{ background: 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
                    <Blend size={10} className={blending ? 'animate-pulse' : ''} />
                    {blending ? 'Saving…' : 'Save Blend'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

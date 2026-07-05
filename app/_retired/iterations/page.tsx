'use client'
import { useEffect, useState } from 'react'
import { ExternalLink, CheckCircle2, Clock, XCircle, ChevronRight } from 'lucide-react'

interface Iteration {
  id: number
  site: string
  version: string
  doctor: string
  specialty: string
  deployed_url: string
  commit?: string
  palette: string
  typography: string
  identity: string
  corrections: string[]
  elevations: string[]
  pass: boolean | null
  built_at: string
  screenshot?: string
  status?: string
  notes: string
}

interface Planned {
  id: number
  site: string
  version: string
  notes: string
}

interface MachineVersion {
  blueprint_model: string
  build_model: string
  guardrails: boolean
  visual_verification: boolean
  qa_gate: string | false
  identity_injection?: boolean
  notes?: string
}

interface Log {
  loop_target: number
  iterations: Iteration[]
  planned: Planned[]
  machine_versions: Record<string, MachineVersion>
}

const SITE_COLORS: Record<string, string> = {
  grooms:   '#c41e3a',
  nay:      '#e8a020',
  anderton: '#0891b2',
  new:      '#6366f1',
}

const STATUS_ICON = {
  pass:     <CheckCircle2 size={14} className="text-emerald-400" />,
  building: <Clock size={14} className="text-yellow-400 animate-pulse" />,
  fail:     <XCircle size={14} className="text-red-400" />,
  planned:  <Clock size={14} className="text-slate-500" />,
}

function statusKey(it: Iteration): keyof typeof STATUS_ICON {
  if (it.status === 'building') return 'building'
  if (it.pass === true) return 'pass'
  if (it.pass === false) return 'fail'
  return 'building'
}

export default function IterationsPage() {
  const [log, setLog] = useState<Log | null>(null)
  const [selected, setSelected] = useState<Iteration | null>(null)

  useEffect(() => {
    fetch('/api/iterations').then(r => r.json()).then(setLog)
    const t = setInterval(() => {
      fetch('/api/iterations').then(r => r.json()).then(setLog)
    }, 15_000)
    return () => clearInterval(t)
  }, [])

  if (!log) return (
    <div className="flex items-center justify-center h-64 text-slate-500 text-sm">Loading iterations…</div>
  )

  const done = log.iterations.filter(it => it.pass === true).length
  const total = log.loop_target

  // Group by site
  const sites = ['anderton', 'grooms', 'nay', 'new']
  const bySite = (site: string) => log.iterations.filter(it => it.site === site)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Build Iterations</h1>
          <p className="text-sm text-slate-400 mt-0.5">10-build quality loop — corrections + elevations per version</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-black text-white">{done}<span className="text-slate-500 text-xl font-normal">/{total}</span></div>
          <div className="text-xs text-slate-400">builds passing</div>
          <div className="mt-1 h-1.5 w-32 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(done/total)*100}%` }} />
          </div>
        </div>
      </div>

      {/* Machine version tracker */}
      <div className="border rounded-xl p-4 space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Machine Evolution</p>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(log.machine_versions).map(([ver, mv]) => (
            <div key={ver} className="border rounded-lg px-3 py-2 text-xs space-y-1 min-w-[180px]" style={{ borderColor: 'var(--border)' }}>
              <div className="font-bold text-white">{ver}</div>
              <div className="text-slate-400">Blueprint: <span className="text-slate-300">{mv.blueprint_model.replace('claude-','')}</span></div>
              <div className="flex flex-wrap gap-1 mt-1">
                {mv.guardrails && <span className="bg-indigo-900/50 text-indigo-300 px-1.5 py-0.5 rounded text-[10px]">guardrails</span>}
                {mv.visual_verification && <span className="bg-teal-900/50 text-teal-300 px-1.5 py-0.5 rounded text-[10px]">visual QA</span>}
                {mv.qa_gate && <span className="bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded text-[10px]">QA gate</span>}
                {mv.identity_injection && <span className="bg-amber-900/50 text-amber-300 px-1.5 py-0.5 rounded text-[10px]">identity</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Build grid by site */}
      <div className="space-y-6">
        {sites.map(site => {
          const builds = bySite(site)
          const planned = log.planned.filter(p => p.site === site)
          if (!builds.length && !planned.length) return null
          const color = SITE_COLORS[site] ?? '#6366f1'

          return (
            <div key={site}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <h2 className="text-sm font-semibold text-white capitalize">{site === 'new' ? 'New Clients' : site}</h2>
                <span className="text-xs text-slate-500">{builds[0]?.doctor ?? '—'}</span>
              </div>

              <div className="flex gap-3 flex-wrap">
                {builds.map(it => (
                  <button key={it.id} onClick={() => setSelected(it === selected ? null : it)}
                    className={`border rounded-xl p-4 text-left w-64 transition-all hover:border-slate-500 ${selected?.id === it.id ? 'border-indigo-500 bg-indigo-950/30' : ''}`}
                    style={{ borderColor: selected?.id === it.id ? undefined : 'var(--border)', background: selected?.id === it.id ? undefined : 'var(--surface)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-white uppercase tracking-widest">{it.version}</span>
                      <div className="flex items-center gap-1.5">
                        {STATUS_ICON[statusKey(it)]}
                        <span className="text-[10px] text-slate-400">{it.built_at}</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 mb-2 truncate">{it.palette}</div>
                    <div className="text-[11px] text-slate-500 mb-3 line-clamp-2">{it.notes}</div>
                    <div className="flex gap-1 flex-wrap">
                      {it.elevations.slice(0, 2).map((e, i) => (
                        <span key={i} className="bg-emerald-900/40 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded truncate max-w-[110px]">{e}</span>
                      ))}
                      {it.corrections.length > 0 && (
                        <span className="bg-blue-900/40 text-blue-400 text-[9px] px-1.5 py-0.5 rounded">{it.corrections.length} fixes</span>
                      )}
                    </div>
                    {it.deployed_url && (
                      <a href={it.deployed_url} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}
                        className="mt-2 flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300">
                        <ExternalLink size={10} />{it.deployed_url.replace('https://','')}
                      </a>
                    )}
                  </button>
                ))}

                {planned.map(p => (
                  <div key={p.id} className="border border-dashed rounded-xl p-4 w-64 opacity-40"
                    style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      {STATUS_ICON.planned}
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{p.version}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">{p.notes}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="border rounded-xl p-5 space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-white font-bold">{selected.doctor} — {selected.version}</h3>
              <p className="text-xs text-slate-400">{selected.specialty} · {selected.identity}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-slate-500 mb-1 font-medium uppercase text-[10px] tracking-wider">Palette</div>
              <div className="text-slate-300">{selected.palette}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1 font-medium uppercase text-[10px] tracking-wider">Typography</div>
              <div className="text-slate-300">{selected.typography}</div>
            </div>
          </div>

          {selected.corrections.length > 0 && (
            <div>
              <div className="text-blue-400 text-[10px] font-semibold uppercase tracking-wider mb-2">Corrections</div>
              <ul className="space-y-0.5">
                {selected.corrections.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <ChevronRight size={12} className="text-blue-500 mt-0.5 shrink-0" />{c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selected.elevations.length > 0 && (
            <div>
              <div className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wider mb-2">Elevations</div>
              <ul className="space-y-0.5">
                {selected.elevations.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <ChevronRight size={12} className="text-emerald-500 mt-0.5 shrink-0" />{e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-xs text-slate-500 italic border-t pt-3" style={{ borderColor: 'var(--border)' }}>{selected.notes}</div>
        </div>
      )}
    </div>
  )
}

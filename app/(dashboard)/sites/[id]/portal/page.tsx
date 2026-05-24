export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Users, ShieldCheck, FileSignature, BadgeCheck, Activity, FolderOpen, Clock } from 'lucide-react'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { supabaseAdmin as _db } from '@/lib/supabase'
const db = _db as any

// ── Types ────────────────────────────────────────────────────────────────────
type Investor = {
  id: string; email: string; full_name: string | null; organization: string | null
  investment_type: string | null; tier: number; kyc_verified_at: string | null
  nda_signed_at: string | null; accredited_certified_at: string | null
  accredited_self_certified: boolean | null; created_at: string
}
type InvestorActivity = { id: string; action: string; metadata: Record<string,unknown>; created_at: string; investor_id: string | null }
type AccessLog        = { id: string; document_id: string; accessed_at: string; ip: string | null; investor_id: string | null }

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.65rem] font-medium"
      style={{
        backgroundColor: ok ? 'rgba(34,197,94,0.12)' : 'rgba(100,116,139,0.15)',
        color: ok ? '#22c55e' : '#64748b',
        border: `1px solid ${ok ? 'rgba(34,197,94,0.25)' : 'rgba(100,116,139,0.2)'}`,
      }}
    >
      {ok ? '✓' : '–'} {label}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} style={{ color }} />
        <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{label}</span>
      </div>
      <p className="text-3xl font-bold" style={{ color: 'var(--fg)' }}>{value}</p>
    </div>
  )
}

export default async function PortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // ── Fetch site name ──
  const { data: siteRaw } = await db.from('sites').select('id, name, url').eq('id', id).single()
  if (!siteRaw) notFound()
  const site = siteRaw as { id: string; name: string; url: string }

  // ── Fetch investor data via our API ──
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}/api/sites/${id}/investor-data`, { cache: 'no-store' })
  const payload = await res.json()

  const error     = payload.error as string | undefined
  const stats     = payload.stats     as { total: number; kyc: number; nda: number; accredited: number } | undefined
  const investors = (payload.investors ?? []) as Investor[]
  const activity  = (payload.activity  ?? []) as InvestorActivity[]
  const accessLog = (payload.accessLog ?? []) as AccessLog[]

  const portalUrl = site.url ? `${site.url.replace(/\/$/, '')}/portal` : null
  const investorUrl = site.url ? `${site.url.replace(/\/$/, '')}/investors` : null

  return (
    <div className="max-w-5xl">
      <Link href={`/sites/${id}`} className="flex items-center gap-1.5 text-sm mb-6 hover:text-indigo-400 transition-colors" style={{ color: 'var(--muted)' }}>
        <ArrowLeft size={14} /> Back to {site.name}
      </Link>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>INVESTOR CRM</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Portal Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          {investorUrl && (
            <a href={investorUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs border px-3 py-2 rounded-lg transition-colors hover:border-indigo-500/40"
              style={{ borderColor: 'var(--border)', color: 'var(--muted-light)' }}>
              <ExternalLink size={12} /> Investor Hub
            </a>
          )}
          {portalUrl && (
            <a href={portalUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#4f46e5', color: '#fff' }}>
              <ExternalLink size={12} /> Open Portal
            </a>
          )}
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div className="rounded-xl border p-6 mb-8" style={{ borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.06)' }}>
          <p className="text-sm font-medium text-red-400 mb-1">Configuration required</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{error}</p>
          <Link href={`/sites/${id}/config`} className="inline-flex items-center gap-1 mt-3 text-xs text-indigo-400 hover:text-indigo-300">
            Open Config panel →
          </Link>
        </div>
      )}

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users}          label="Registered"  value={stats.total}       color="#818cf8" />
          <StatCard icon={ShieldCheck}    label="KYC Verified" value={stats.kyc}         color="#22c55e" />
          <StatCard icon={FileSignature}  label="NDA Signed"   value={stats.nda}         color="#f59e0b" />
          <StatCard icon={BadgeCheck}     label="Accredited"   value={stats.accredited}  color="#a78bfa" />
        </div>
      )}

      {/* ── Investor table ── */}
      <div className="rounded-xl border mb-8" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Users size={14} style={{ color: '#818cf8' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Registered Investors</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(129,140,248,0.12)', color: '#818cf8' }}>
            {investors.length} total
          </span>
        </div>

        {investors.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users size={28} className="mx-auto mb-3 opacity-20" style={{ color: 'var(--muted)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>No investors registered yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>The portal is live — investor sign-ups will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {['Email', 'Name', 'Org', 'KYC', 'NDA', 'Accredited', 'Tier', 'Joined'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium" style={{ color: 'var(--muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {investors.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-5 py-3 text-xs font-mono" style={{ color: 'var(--fg)' }}>{inv.email}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--fg)' }}>{inv.full_name ?? '—'}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--muted)' }}>{inv.organization ?? '—'}</td>
                    <td className="px-5 py-3"><StatusChip ok={!!inv.kyc_verified_at} label="KYC" /></td>
                    <td className="px-5 py-3"><StatusChip ok={!!inv.nda_signed_at} label="NDA" /></td>
                    <td className="px-5 py-3"><StatusChip ok={!!inv.accredited_certified_at} label="Acc." /></td>
                    <td className="px-5 py-3 text-xs text-center" style={{ color: 'var(--muted)' }}>{inv.tier}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--muted)' }}>
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Activity + Access Log ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Activity feed */}
        <div className="rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <Activity size={14} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Investor Activity</span>
          </div>
          {activity.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Activity size={22} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--muted)' }} />
              <p className="text-xs" style={{ color: 'var(--muted)' }}>No activity yet</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {activity.slice(0, 15).map((ev) => (
                <div key={ev.id} className="px-5 py-3 flex items-start gap-3">
                  <Clock size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--muted)' }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--fg)' }}>{ev.action}</p>
                    <p className="text-[0.65rem]" style={{ color: 'var(--muted)' }}>
                      {new Date(ev.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Document access log */}
        <div className="rounded-xl border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <FolderOpen size={14} style={{ color: '#a78bfa' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Document Access</span>
          </div>
          {accessLog.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <FolderOpen size={22} className="mx-auto mb-2 opacity-20" style={{ color: 'var(--muted)' }} />
              <p className="text-xs" style={{ color: 'var(--muted)' }}>No documents accessed yet</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {accessLog.slice(0, 15).map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                  <FolderOpen size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--muted)' }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate font-mono" style={{ color: 'var(--fg)' }}>{log.document_id}</p>
                    <p className="text-[0.65rem]" style={{ color: 'var(--muted)' }}>
                      {new Date(log.accessed_at).toLocaleString()}{log.ip ? ` · ${log.ip}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

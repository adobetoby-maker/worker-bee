export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { ArrowLeft, Mail } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any

const TOUCH_LABELS: Record<number, string> = {
  1: 'Email 1', 4: 'Email 2', 7: 'Email 3',
}

type Template = {
  id: string
  name: string
  touch_number: number | null
  subject_template: string
  plain_text_body: string
  html_body: string
  variables: string[]
  created_at: string
}

export default async function TemplateLibraryPage() {
  const { data } = await db
    .from('email_templates')
    .select('id, name, touch_number, subject_template, plain_text_body, html_body, variables, created_at')
    .order('touch_number', { ascending: true, nullsFirst: false })

  const templates: Template[] = data ?? []

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/leads"
          className="flex items-center gap-1.5 text-sm transition-colors hover:text-white"
          style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={14} /> Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Email Templates</h1>
          <p className="text-sm" style={{ color: 'var(--muted-light)' }}>
            9-touch outreach sequence · {templates.length} templates
          </p>
        </div>
      </div>

      {/* Sequence overview */}
      <div className="card rounded-xl p-5 mb-6">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--muted)' }}>
          Sequence Timing
        </h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {[
            { touch: 1, label: 'Email 1', day: 'Day 0 — First contact' },
            { touch: 2, label: 'Text 1',  day: 'Day 4 — Follow-up text' },
            { touch: 3, label: 'Call 1',  day: 'Day 7 — Phone call' },
            { touch: 4, label: 'Email 2', day: 'Day 10 — Second email' },
            { touch: 5, label: 'Text 2',  day: 'Day 14 — Check in text' },
            { touch: 6, label: 'Call 2',  day: 'Day 17 — Second call' },
            { touch: 7, label: 'Email 3', day: 'Day 21 — Final email' },
            { touch: 8, label: 'Text 3',  day: 'Day 24 — Last text' },
            { touch: 9, label: 'Call 3',  day: 'Day 28 → Archive Day 32+' },
          ].map(({ touch, label, day }) => {
            const color = [1, 4, 7].includes(touch)
              ? '#818cf8'
              : [2, 5, 8].includes(touch)
                ? '#34d399'
                : '#f59e0b'
            return (
              <div key={touch} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                  {touch}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">{label}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>{day}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Template cards */}
      {templates.length === 0 ? (
        <div className="card rounded-xl p-10 text-center">
          <Mail size={28} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            No templates yet. Templates were seeded with the database migration.
            <br />Check that Phase 1 migration completed successfully.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map(t => {
            const touchColor = t.touch_number
              ? [1, 4, 7].includes(t.touch_number) ? '#818cf8'
                : [2, 5, 8].includes(t.touch_number) ? '#34d399'
                  : '#f59e0b'
              : '#64748b'
            const previewLines = t.plain_text_body.split('\n').filter(Boolean).slice(0, 4).join('\n')

            return (
              <div key={t.id} className="card rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b flex items-center justify-between gap-4" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3">
                    {t.touch_number && (
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: `${touchColor}15`, color: touchColor, border: `1px solid ${touchColor}30` }}>
                        {t.touch_number}
                      </span>
                    )}
                    <div>
                      <h3 className="text-sm font-bold text-white">{t.name}</h3>
                      {t.touch_number && (
                        <span className="text-xs" style={{ color: touchColor }}>
                          {TOUCH_LABELS[t.touch_number] ?? `Touch ${t.touch_number}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>
                      Subject
                    </div>
                    <div className="text-sm text-white font-medium">{t.subject_template}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>
                      Preview
                    </div>
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap rounded-lg px-3 py-2"
                      style={{
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        color: 'var(--muted-light)',
                        fontFamily: 'inherit',
                      }}>
                      {previewLines}
                      {t.plain_text_body.split('\n').filter(Boolean).length > 4 ? '\n…' : ''}
                    </pre>
                  </div>

                  {t.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {t.variables.map(v => (
                        <span key={v} className="text-xs px-2 py-0.5 rounded font-mono"
                          style={{ background: 'rgba(99,102,241,0.08)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.15)' }}>
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

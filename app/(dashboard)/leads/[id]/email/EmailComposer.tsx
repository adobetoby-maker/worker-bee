'use client'
import { useState } from 'react'
import { Eye, EyeOff, Mail, ChevronDown, CheckCircle2, Send } from 'lucide-react'

type Template = {
  id: string
  name: string
  touch_number: number | null
  subject_template: string
  plain_text_body: string
  html_body: string
  variables: string[]
}

type Prospect = {
  id: string
  business_name: string
  owner_name: string | null
  email: string | null
  city: string
  category: string
  demo_url: string | null
  payment_link: string | null
}

const TOUCH_NAMES: Record<number, string> = {
  1: 'Email 1', 4: 'Email 2', 7: 'Email 3',
}

type Preview = {
  subject: string
  html: string
  plain_text: string
}

type SendResult = {
  subject: string
  resend_id?: string
  next_touch_date: string | null
}

export default function EmailComposer({
  prospect,
  templates,
}: {
  prospect: Prospect
  templates: Template[]
}) {
  const [selectedId, setSelectedId]     = useState(templates[0]?.id ?? '')
  const [showHtml, setShowHtml]         = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [preview, setPreview]           = useState<Preview | null>(null)
  const [sent, setSent]                 = useState<SendResult | null>(null)
  const [err, setErr]                   = useState('')

  const selectedTemplate = templates.find(t => t.id === selectedId)
  const hasEmail = !!prospect.email

  async function loadPreview() {
    if (!selectedId) return
    setErr('')
    setLoading(true)
    setPreview(null)
    setSent(null)
    try {
      const res = await fetch(`/api/leads/prospects/${prospect.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: selectedId }),
      })
      const data = await res.json()
      if (!res.ok) setErr(data.error ?? 'Failed to render preview')
      else setPreview(data)
    } catch {
      setErr('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function sendEmail() {
    if (!selectedId) return
    setErr('')
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/prospects/${prospect.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: selectedId }),
      })
      const data = await res.json()
      if (!res.ok) setErr(data.error ?? 'Send failed')
      else setSent({ subject: data.subject, resend_id: data.resend_id, next_touch_date: data.next_touch_date })
    } catch {
      setErr('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Template selector */}
      <div className="card rounded-xl p-5">
        <h2 className="text-sm font-bold text-white mb-4">Select Template</h2>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors"
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              color: selectedTemplate ? 'var(--text)' : 'var(--muted)',
            }}>
            <span>
              {selectedTemplate
                ? `${selectedTemplate.name}${selectedTemplate.touch_number ? ` — ${TOUCH_NAMES[selectedTemplate.touch_number] ?? `Touch ${selectedTemplate.touch_number}`}` : ''}`
                : 'Choose a template…'}
            </span>
            <ChevronDown size={14} style={{ color: 'var(--muted)', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
          </button>

          {dropdownOpen && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-2xl"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              {templates.map(t => (
                <button key={t.id}
                  onClick={() => { setSelectedId(t.id); setDropdownOpen(false); setPreview(null); setSent(null) }}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors hover:bg-white/[0.04]"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <span className="font-medium text-white">{t.name}</span>
                  {t.touch_number && (
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                      {TOUCH_NAMES[t.touch_number] ?? `Touch ${t.touch_number}`}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Template static preview (before generating) */}
      {selectedTemplate && !preview && !sent && (
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-bold text-white">{selectedTemplate.name}</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              From: toby@andertongroup.com → To: {prospect.email ?? '(no email on file)'}
            </p>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Subject</div>
              <div className="text-sm font-medium text-white rounded-lg px-3 py-2"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                {selectedTemplate.subject_template}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Body preview</div>
              <pre className="text-sm leading-relaxed whitespace-pre-wrap rounded-lg px-3 py-3 max-h-48 overflow-y-auto"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted-light)', fontFamily: 'inherit' }}>
                {selectedTemplate.plain_text_body.slice(0, 600)}
                {selectedTemplate.plain_text_body.length > 600 ? '…' : ''}
              </pre>
            </div>

            {selectedTemplate.variables.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                  Variables
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTemplate.variables.map(v => (
                    <span key={v} className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-5 pb-5 flex gap-3">
            <button onClick={loadPreview} disabled={loading || !hasEmail}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: hasEmail ? 'white' : 'var(--muted)',
                border: '1px solid var(--border)',
                cursor: !hasEmail ? 'not-allowed' : 'pointer',
              }}>
              <Eye size={14} />
              {loading ? 'Loading…' : 'Preview with prospect data'}
            </button>
          </div>

          {!hasEmail && (
            <p className="text-xs text-center pb-4" style={{ color: 'var(--muted)' }}>
              Add an email address to this prospect to send.
            </p>
          )}
        </div>
      )}

      {/* Rendered preview */}
      {preview && !sent && (
        <div className="card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                  Preview
                </span>
                <h3 className="text-sm font-bold text-white">Ready to send</h3>
              </div>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                From toby@andertongroup.com → {prospect.email}
              </p>
            </div>
            <button onClick={() => setShowHtml(h => !h)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{
                background: showHtml ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                color: showHtml ? '#818cf8' : 'var(--muted)',
                border: '1px solid var(--border)',
              }}>
              {showHtml ? <EyeOff size={12} /> : <Eye size={12} />}
              {showHtml ? 'Plain text' : 'HTML'}
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Subject</div>
              <div className="text-sm font-medium text-white">{preview.subject}</div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                {showHtml ? 'HTML preview' : 'Plain text'}
              </div>
              {showHtml ? (
                <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                  <iframe
                    srcDoc={preview.html}
                    className="w-full"
                    style={{ height: '400px', background: '#fff' }}
                    title="Email HTML preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                <pre className="text-sm leading-relaxed whitespace-pre-wrap rounded-lg px-3 py-3 max-h-64 overflow-y-auto"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted-light)', fontFamily: 'inherit' }}>
                  {preview.plain_text}
                </pre>
              )}
            </div>
          </div>

          <div className="px-5 pb-5 flex items-center gap-3">
            <button onClick={sendEmail} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-colors"
              style={{
                background: loading ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.9)',
                color: '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}>
              <Send size={14} />
              {loading ? 'Sending…' : 'Send via andertongroup.com'}
            </button>
            <button onClick={() => { setPreview(null); setSent(null) }}
              className="px-4 py-3 rounded-lg text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
              Back
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {err && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
          {err}
        </div>
      )}

      {/* Sent confirmation */}
      {sent && (
        <div className="card rounded-xl p-5 text-center">
          <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: '#34d399' }} />
          <p className="text-base font-semibold text-white mb-1">Email sent</p>
          <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
            &ldquo;{sent.subject}&rdquo; → {prospect.email}
          </p>
          {sent.next_touch_date && (
            <p className="text-xs font-medium"
              style={{ color: '#f59e0b' }}>
              Next touch due: {new Date(sent.next_touch_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          )}
          <button onClick={() => { setPreview(null); setSent(null) }}
            className="mt-4 text-xs px-4 py-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
            Send another template
          </button>
        </div>
      )}
    </div>
  )
}

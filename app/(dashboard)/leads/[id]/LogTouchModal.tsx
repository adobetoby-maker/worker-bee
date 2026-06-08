'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

const TOUCHES = [
  { num: 1, label: 'Email 1', channel: 'email' },
  { num: 2, label: 'Text 1',  channel: 'text' },
  { num: 3, label: 'Call 1',  channel: 'call' },
  { num: 4, label: 'Email 2', channel: 'email' },
  { num: 5, label: 'Text 2',  channel: 'text' },
  { num: 6, label: 'Call 2',  channel: 'call' },
  { num: 7, label: 'Email 3', channel: 'email' },
  { num: 8, label: 'Text 3',  channel: 'text' },
  { num: 9, label: 'Call 3',  channel: 'call' },
]

const EMAIL_STATUSES = ['sent', 'delivered', 'opened', 'replied', 'bounced']
const TEXT_STATUSES  = ['sent', 'delivered', 'replied']
const CALL_STATUSES  = ['connected', 'voicemail', 'no_answer', 'callback_requested']

function statusOptions(channel: string): string[] {
  if (channel === 'email') return EMAIL_STATUSES
  if (channel === 'text') return TEXT_STATUSES
  return CALL_STATUSES
}

export default function LogTouchModal({
  prospectId,
  currentTouch,
}: {
  prospectId: string
  currentTouch: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const defaultNum = Math.min((currentTouch ?? 0) + 1, 9)
  const [touchNum, setTouchNum] = useState(defaultNum)
  const [status, setStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [callOutcome, setCallOutcome] = useState('')
  const [callDuration, setCallDuration] = useState('')

  const selectedTouch = TOUCHES.find(t => t.num === touchNum)
  const channel = selectedTouch?.channel ?? 'email'
  const statuses = statusOptions(channel)

  async function submit() {
    setErr('')
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/prospects/${prospectId}/touch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touch_number: touchNum,
          channel,
          status: status || statuses[0],
          notes: notes || undefined,
          call_outcome: callOutcome || undefined,
          call_duration_seconds: callDuration ? parseInt(callDuration) * 60 : undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setErr(d.error ?? 'Failed to log touch')
      } else {
        setOpen(false)
        router.refresh()
      }
    } catch {
      setErr('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
        Log Touch
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-white">Log Contact Touch</h3>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 transition-colors hover:bg-white/[0.06]">
                <X size={15} style={{ color: 'var(--muted)' }} />
              </button>
            </div>

            {/* Touch selector */}
            <div className="mb-4">
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--muted)' }}>
                Touch
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {TOUCHES.map(t => (
                  <button key={t.num} onClick={() => { setTouchNum(t.num); setStatus('') }}
                    className="px-2 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: touchNum === t.num ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
                      color: touchNum === t.num ? '#818cf8' : 'var(--muted-light)',
                      border: touchNum === t.num ? '1px solid rgba(99,102,241,0.4)' : '1px solid var(--border)',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="mb-4">
              <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--muted)' }}>
                Status
              </label>
              <div className="flex flex-wrap gap-1.5">
                {statuses.map(s => (
                  <button key={s} onClick={() => setStatus(s)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium transition-all capitalize"
                    style={{
                      background: status === s ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)',
                      color: status === s ? '#34d399' : 'var(--muted-light)',
                      border: status === s ? '1px solid rgba(52,211,153,0.3)' : '1px solid var(--border)',
                    }}>
                    {s.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Call-specific fields */}
            {channel === 'call' && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>
                    Outcome
                  </label>
                  <select value={callOutcome} onChange={e => setCallOutcome(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                    <option value="">—</option>
                    {['connected', 'voicemail', 'no_answer', 'callback_requested'].map(o => (
                      <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>
                    Duration (min)
                  </label>
                  <input type="number" min="0" value={callDuration} onChange={e => setCallDuration(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg px-3 py-2 text-sm"
                    style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mb-5">
              <label className="text-xs font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>
                Notes
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                rows={3} placeholder="Call notes, reply content, etc."
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            </div>

            {err && (
              <div className="mb-4 text-sm px-3 py-2 rounded-lg"
                style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                {err}
              </div>
            )}

            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: 'var(--muted)' }}>
                Cancel
              </button>
              <button onClick={submit} disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  background: saving ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.9)',
                  color: '#ffffff',
                  opacity: saving ? 0.7 : 1,
                }}>
                {saving ? 'Saving…' : 'Log Touch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

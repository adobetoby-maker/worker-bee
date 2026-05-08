'use client'
import { useState } from 'react'
import type { Node } from '@xyflow/react'
import type { CardData, CardType, CardStatus } from './types'
import { TYPE_COLOR } from './types'
import { X, Sparkles, Trash2, Wand2, Loader2 } from 'lucide-react'

const TYPES: CardType[] = ['page', 'section', 'component', 'api', 'data']
const STATUSES: { value: CardStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

type CleanField = 'title' | 'description' | 'prompt'

interface Props {
  node: Node | null
  onClose: () => void
  onUpdate: (id: string, data: Partial<CardData>) => void
  onDelete: (id: string) => void
}

export function CardEditor({ node, onClose, onUpdate, onDelete }: Props) {
  const [cleaning, setCleaning] = useState<CleanField | 'generating' | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  if (!node) return null
  const d = node.data as unknown as CardData
  const prompt = d.claudePrompt ?? ''

  function set(field: keyof CardData, value: string | number) {
    onUpdate(node!.id, { [field]: value })
  }

  async function callCleanup(body: object): Promise<string | null> {
    setApiError(null)
    const res = await fetch('/api/blueprint-cleanup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) {
      setApiError(json.error ?? `Error ${res.status}`)
      return null
    }
    return json.result ?? null
  }

  async function clean(field: CleanField) {
    const value = field === 'title' ? d.title : field === 'description' ? d.description : prompt
    if (!value?.trim() || cleaning) return
    setCleaning(field)
    try {
      const result = await callCleanup({ field, value, cardType: d.type })
      if (result) set(field === 'prompt' ? 'claudePrompt' : field, result)
    } finally {
      setCleaning(null)
    }
  }

  async function generatePrompt() {
    if (cleaning) return
    setCleaning('generating')
    try {
      const result = await callCleanup({
        field: 'generate',
        cardType: d.type,
        cardTitle: d.title,
        cardDescription: d.description,
      })
      if (result) set('claudePrompt', result)
    } finally {
      setCleaning(null)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: '#0f1419', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          display: 'flex', flexDirection: 'column', maxHeight: '90vh',
        }}
      >
      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#818cf8', marginBottom: 3 }}>Start Here</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0' }}>{d.title || 'New Card'}</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 6 }}>
          <X size={18} />
        </button>
      </div>

      {/* Fields */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        <Field label="Title" onClean={d.title ? () => clean('title') : undefined} isLoading={cleaning === 'title'}>
          <input value={d.title} onChange={e => set('title', e.target.value)}
            placeholder="e.g. Home Hero, Services Page…"
            style={inputStyle} />
        </Field>

        <Field label="Type">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TYPES.map(t => (
              <button key={t} onClick={() => set('type', t)} style={{
                padding: '4px 12px', borderRadius: 4, border: `1.5px solid ${d.type === t ? TYPE_COLOR[t] : 'rgba(255,255,255,0.12)'}`,
                background: d.type === t ? `${TYPE_COLOR[t]}20` : 'transparent',
                color: d.type === t ? TYPE_COLOR[t] : '#94a3b8',
                fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{t}</button>
            ))}
          </div>
        </Field>

        <Field label="Status">
          <div style={{ display: 'flex', gap: 6 }}>
            {STATUSES.map(s => (
              <button key={s.value} onClick={() => set('status', s.value)} style={{
                flex: 1, padding: '6px 4px', borderRadius: 4,
                border: `1.5px solid ${d.status === s.value ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                background: d.status === s.value ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: d.status === s.value ? '#e2e8f0' : '#64748b',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}>{s.label}</button>
            ))}
          </div>
        </Field>

        <Field label="Description" onClean={d.description ? () => clean('description') : undefined} isLoading={cleaning === 'description'}>
          <textarea value={d.description} onChange={e => set('description', e.target.value)}
            rows={3} placeholder="What does this page/section do?"
            style={{ ...inputStyle, resize: 'vertical' }} />
        </Field>

        <Field
          label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sparkles size={11} style={{ color: '#818cf8' }} />
              Claude Prompt
            </span>
          }
          onClean={prompt ? () => clean('prompt') : undefined}
          isLoading={cleaning === 'prompt'}
        >
          <textarea value={prompt} onChange={e => set('claudePrompt', e.target.value)}
            rows={6} placeholder="Describe exactly what Claude should build for this section. Be specific about design, content, and functionality…"
            style={{ ...inputStyle, resize: 'vertical', borderColor: 'rgba(129,140,248,0.3)', fontFamily: 'monospace', fontSize: 12 }} />
          <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>
            {prompt.length} chars · This becomes the build instruction
          </div>
        </Field>

        {apiError && (
          <div style={{ fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '8px 12px', marginTop: -8 }}>
            {apiError}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8 }}>
        <button
          onClick={generatePrompt}
          disabled={!d.title || !!cleaning}
          style={{
            flex: 1, padding: '9px 16px', borderRadius: 8,
            background: (!d.title || !!cleaning) ? 'rgba(79,70,229,0.3)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            border: 'none', color: (!d.title || !!cleaning) ? '#6366f1' : '#fff',
            fontSize: 12, fontWeight: 600, cursor: !d.title || !!cleaning ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.15s',
          }}>
          {cleaning === 'generating'
            ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
            : <><Sparkles size={13} /> Generate Prompt</>
          }
        </button>
        <button onClick={() => { onDelete(node.id); onClose() }} style={{
          padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
          background: 'transparent', color: '#ef4444', cursor: 'pointer',
        }}>
          <Trash2 size={14} />
        </button>
      </div>
      </div>
    </div>
  )
}

interface FieldProps {
  label: React.ReactNode
  children: React.ReactNode
  onClean?: () => void
  isLoading?: boolean
}

function Field({ label, children, onClean, isLoading }: FieldProps) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569' }}>
          {label}
        </label>
        {isLoading ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#818cf8' }}>
            <Loader2 size={10} className="animate-spin" /> Fixing…
          </span>
        ) : onClean ? (
          <button onClick={onClean} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', borderRadius: 4, padding: '2px 6px',
            color: '#334155', fontSize: 10, fontWeight: 600, cursor: 'pointer',
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#818cf8')}
            onMouseLeave={e => (e.currentTarget.style.color = '#334155')}
          >
            <Wand2 size={9} /> Polish
          </button>
        ) : null}
      </div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
  color: '#e2e8f0', fontSize: 13, padding: '8px 11px',
  outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

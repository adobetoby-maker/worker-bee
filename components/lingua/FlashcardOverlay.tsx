'use client'
import { useState, useEffect, useCallback, useMemo, type CSSProperties } from 'react'
import { X, Volume2, VolumeX, ChevronRight, Check, RotateCcw, Settings, Loader2 } from 'lucide-react'
import { usePronunciation } from './usePronunciation'

export interface FlashCard {
  id: string
  word: string
  translation: string
  language: string   // BCP-47 e.g. 'ja', 'es', 'ko', 'pt-BR'
  reading?: string   // phonetic/furigana reading
  example?: string
  xp?: number        // XP per correct answer (default 5)
}

interface Props {
  cards: FlashCard[]
  onClose: () => void
  onCorrect?: (card: FlashCard, totalXp: number) => void
  onMissed?: (card: FlashCard) => void
  onComplete?: (results: { correct: number; missed: number; xpEarned: number }) => void
}

type Phase = 'study' | 'complete'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function FlashcardOverlay({ cards, onClose, onCorrect, onMissed, onComplete }: Props) {
  const [deck] = useState(() => shuffle(cards))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [phase, setPhase] = useState<Phase>('study')
  const [correct, setCorrect] = useState(0)
  const [missed, setMissed] = useState(0)
  const [xpEarned, setXpEarned] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const [showVoicePanel, setShowVoicePanel] = useState(false)

  const current = deck[index]
  const cardLang = current?.language ?? 'en'

  const { voices, selectedVoiceURI, setSelectedVoiceURI, speak, isSpeaking, supported } =
    usePronunciation(cardLang)

  const googleVoices = useMemo(
    () => voices.filter(v => v.isGoogle),
    [voices]
  )
  const otherVoices = useMemo(
    () => voices.filter(v => !v.isGoogle),
    [voices]
  )

  const pronounce = useCallback(() => {
    if (!current) return
    speak(current.word, current.language)
  }, [current, speak])

  // Auto-pronounce word when a new card shows (front face only)
  useEffect(() => {
    if (autoPlay && !flipped && current && supported) {
      const t = setTimeout(() => speak(current.word, current.language), 300)
      return () => clearTimeout(t)
    }
  }, [index, flipped, autoPlay, supported])

  function handleFlip() {
    setFlipped(f => !f)
  }

  function handleGotIt() {
    const xp = current.xp ?? 5
    const newXp = xpEarned + xp
    setCorrect(c => c + 1)
    setXpEarned(newXp)
    onCorrect?.(current, newXp)
    advance()
  }

  function handleMissed() {
    setMissed(m => m + 1)
    onMissed?.(current)
    advance()
  }

  function advance() {
    if (index + 1 >= deck.length) {
      setPhase('complete')
      onComplete?.({ correct, missed, xpEarned })
    } else {
      setIndex(i => i + 1)
      setFlipped(false)
    }
  }

  const accuracy = deck.length > 0 ? Math.round((correct / deck.length) * 100) : 0

  if (phase === 'complete') {
    return (
      <Overlay onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>
            {accuracy >= 80 ? '🎉' : accuracy >= 50 ? '📚' : '💪'}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>
            Session Complete
          </div>
          <div style={{ fontSize: 15, color: '#94a3b8', marginBottom: 28 }}>
            {accuracy}% accuracy · +{xpEarned} XP
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
            <StatChip label="Correct" value={correct} color="#22c55e" />
            <StatChip label="Missed" value={missed} color="#f87171" />
            <StatChip label="Total" value={deck.length} color="#818cf8" />
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '12px 32px', borderRadius: 10,
              background: 'linear-gradient(135deg, #00d4aa, #0891b2)',
              border: 'none', color: '#000', fontWeight: 700, fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </Overlay>
    )
  }

  if (!current) return null

  return (
    <Overlay onClose={onClose}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
          {index + 1} / {deck.length}
        </div>

        <ProgressBar value={index} max={deck.length} />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Auto-play toggle */}
          <button
            onClick={() => setAutoPlay(a => !a)}
            title={autoPlay ? 'Auto-play on (click to disable)' : 'Auto-play off'}
            style={iconBtn(autoPlay ? '#00d4aa' : '#475569')}
          >
            {autoPlay ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {/* Voice settings */}
          {supported && (
            <button
              onClick={() => setShowVoicePanel(p => !p)}
              title="Voice settings"
              style={iconBtn(showVoicePanel ? '#818cf8' : '#475569')}
            >
              <Settings size={15} />
            </button>
          )}

          <button onClick={onClose} style={iconBtn('#475569')}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Voice selector panel */}
      {showVoicePanel && supported && (
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 8 }}>
            Voice — Google voices preferred
          </div>
          <select
            value={selectedVoiceURI}
            onChange={e => setSelectedVoiceURI(e.target.value)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 6, color: '#e2e8f0', fontSize: 12,
              padding: '7px 10px', outline: 'none',
            }}
          >
            {googleVoices.length > 0 && (
              <optgroup label="Google Voices (Recommended)">
                {googleVoices.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </optgroup>
            )}
            {otherVoices.length > 0 && (
              <optgroup label="Other Voices">
                {otherVoices.map(v => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}

      {/* Card area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div
          onClick={handleFlip}
          style={{
            width: '100%', maxWidth: 420, minHeight: 220,
            background: flipped
              ? 'linear-gradient(160deg, #0f1e30 0%, #0a1628 100%)'
              : 'linear-gradient(160deg, #1a2a3a 0%, #0f1e2e 100%)',
            border: `1px solid ${flipped ? 'rgba(0,212,170,0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 16,
            padding: '28px 24px',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center',
            transition: 'background 0.3s ease, border-color 0.3s ease',
            userSelect: 'none',
            position: 'relative',
          }}
        >
          {/* Language / face label */}
          <div style={{
            position: 'absolute', top: 14, left: 16,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: flipped ? '#00d4aa' : '#64748b',
          }}>
            {flipped ? 'Translation' : current.language.toUpperCase()}
          </div>

          {/* Pronounce button — shown on front face */}
          {!flipped && supported && (
            <button
              onClick={e => { e.stopPropagation(); pronounce() }}
              title="Pronounce"
              style={{
                position: 'absolute', top: 10, right: 12,
                background: isSpeaking ? 'rgba(0,212,170,0.2)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${isSpeaking ? 'rgba(0,212,170,0.5)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 8, padding: '5px 8px',
                color: isSpeaking ? '#00d4aa' : '#94a3b8',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600,
                transition: 'all 0.15s',
              }}
            >
              {isSpeaking
                ? <><Loader2 size={12} className="animate-spin" /> Playing…</>
                : <><Volume2 size={12} /> Pronounce</>
              }
            </button>
          )}

          {/* Front: word + optional reading */}
          {!flipped ? (
            <>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#f1f5f9', marginBottom: 8, lineHeight: 1.2 }}>
                {current.word}
              </div>
              {current.reading && (
                <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>
                  {current.reading}
                </div>
              )}
              <div style={{ fontSize: 12, color: '#475569', marginTop: 12 }}>
                Tap to reveal translation
              </div>
            </>
          ) : (
            /* Back: translation + example */
            <>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#00d4aa', marginBottom: current.example ? 14 : 0, lineHeight: 1.3 }}>
                {current.translation}
              </div>
              {current.example && (
                <div style={{
                  fontSize: 13, color: '#94a3b8', lineHeight: 1.6,
                  borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12, width: '100%',
                }}>
                  <span style={{ color: '#475569', fontStyle: 'italic' }}>e.g. </span>
                  {current.example}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Action row — only visible after flip */}
      <div style={{ padding: '0 20px 20px' }}>
        {flipped ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleMissed}
              style={{
                flex: 1, padding: '13px 16px', borderRadius: 10,
                border: '1px solid rgba(248,113,113,0.4)',
                background: 'rgba(248,113,113,0.08)',
                color: '#f87171', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              Missed
            </button>
            <button
              onClick={handleGotIt}
              style={{
                flex: 1, padding: '13px 16px', borderRadius: 10,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                border: 'none', color: '#fff', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 6,
              }}
            >
              <Check size={15} /> Got it +{current.xp ?? 5} XP
            </button>
          </div>
        ) : (
          <button
            onClick={handleFlip}
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e2e8f0', fontWeight: 600, fontSize: 14,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
            }}
          >
            Flip card <ChevronRight size={15} />
          </button>
        )}
      </div>
    </Overlay>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 500,
          background: '#0d1a26',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '90vh', overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  return (
    <div style={{ flex: 1, margin: '0 16px', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 2,
        background: 'linear-gradient(90deg, #00d4aa, #0891b2)',
        width: `${(value / max) * 100}%`,
        transition: 'width 0.3s ease',
      }} />
    </div>
  )
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      background: `${color}15`, border: `1px solid ${color}40`,
      borderRadius: 10, padding: '10px 20px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function iconBtn(color: string): CSSProperties {
  return {
    background: 'none', border: 'none', cursor: 'pointer',
    color, padding: 6, borderRadius: 6, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    transition: 'color 0.15s',
  }
}

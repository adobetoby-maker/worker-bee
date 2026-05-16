'use client'
import { useState } from 'react'
import { FlashcardOverlay, type FlashCard } from '@/components/lingua/FlashcardOverlay'
import { BookOpen, Play } from 'lucide-react'

const DEMO_CARDS: FlashCard[] = [
  {
    id: '1',
    word: 'こんにちは',
    reading: 'Konnichiwa',
    translation: 'Hello / Good afternoon',
    language: 'ja',
    example: 'こんにちは、田中さん！— Hello, Tanaka-san!',
    xp: 5,
  },
  {
    id: '2',
    word: 'ありがとう',
    reading: 'Arigatou',
    translation: 'Thank you',
    language: 'ja',
    example: 'ありがとうございます。— Thank you very much.',
    xp: 5,
  },
  {
    id: '3',
    word: 'さようなら',
    reading: 'Sayounara',
    translation: 'Goodbye',
    language: 'ja',
    xp: 5,
  },
  {
    id: '4',
    word: 'すみません',
    reading: 'Sumimasen',
    translation: 'Excuse me / I\'m sorry',
    language: 'ja',
    example: 'すみません、駅はどこですか？— Excuse me, where is the station?',
    xp: 5,
  },
  {
    id: '5',
    word: 'わかりました',
    reading: 'Wakarimashita',
    translation: 'I understand / Got it',
    language: 'ja',
    xp: 5,
  },
]

export default function LinguaPage() {
  const [open, setOpen] = useState(false)
  const [lastResult, setLastResult] = useState<{ correct: number; missed: number; xpEarned: number } | null>(null)

  return (
    <div style={{ padding: 32, maxWidth: 640 }}>
      <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#818cf8' }}>
        juniornlinguist.com
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>
        Flashcard Pronunciation
      </h1>
      <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7, marginBottom: 32 }}>
        Flashcard overlay for the LinguaLens vocabulary deck. Google voices are the default — the browser automatically selects a Google voice when available (Chrome/Edge). Users can override the voice from the settings gear on the card.
      </p>

      <div style={{
        background: '#0f1a26', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: '20px 24px', marginBottom: 24,
      }}>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Demo deck</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 }}>
          Japanese Basics · {DEMO_CARDS.length} cards
        </div>
        <button
          onClick={() => { setOpen(true); setLastResult(null) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 8,
            background: 'linear-gradient(135deg, #00d4aa, #0891b2)',
            border: 'none', color: '#000', fontWeight: 700, fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <Play size={14} /> Study Now
        </button>
      </div>

      {lastResult && (
        <div style={{
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 10, padding: '14px 20px',
          fontSize: 13, color: '#86efac',
        }}>
          Last session: {lastResult.correct}/{DEMO_CARDS.length} correct · +{lastResult.xpEarned} XP
        </div>
      )}

      <div style={{ marginTop: 32, padding: '20px 24px', background: '#0f1a26', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569', marginBottom: 12 }}>
          Integration
        </div>
        <pre style={{
          fontSize: 11, color: '#94a3b8', lineHeight: 1.7,
          background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: 8,
          overflowX: 'auto',
        }}>{`import { FlashcardOverlay } from '@/components/lingua/FlashcardOverlay'

// cards come from the saved_words / vocabulary deck
<FlashcardOverlay
  cards={deck}
  onClose={() => setOpen(false)}
  onCorrect={(card, xp) => dispatch({ type: 'UPDATE_STREAK', xp })}
  onComplete={({ correct, xpEarned }) => toast(\`+\${xpEarned} XP earned!\`)}
/>`}</pre>
      </div>

      {open && (
        <FlashcardOverlay
          cards={DEMO_CARDS}
          onClose={() => setOpen(false)}
          onComplete={r => { setLastResult(r); setOpen(false) }}
        />
      )}
    </div>
  )
}

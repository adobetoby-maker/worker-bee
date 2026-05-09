'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, X, Sparkles, Check } from 'lucide-react'

export function Walkthrough({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDismissed = localStorage.getItem('walkthrough-dismissed')
      if (savedDismissed) setDismissed(true)
    }
  }, [])

  if (dismissed) return null

  const steps = [
    {
      title: 'Welcome to the Blueprint Builder',
      description: 'Let\'s build your website together. We\'ll walk you through it step by step.',
      action: 'Click "AI Blueprint Wizard" to get started',
      highlight: 'ai-wizard-button',
    },
    {
      title: 'Tell us about your business',
      description: 'The AI wizard will ask you a few quick questions about what you do, your goals, and the features you need.',
      action: 'Answer the 3 questions',
      highlight: 'wizard-questions',
    },
    {
      title: 'Review your pages',
      description: 'The wizard generates a full blueprint — each card is a page or section of your site. You\'ll see titles, descriptions, and what each section will do.',
      action: 'Look through the cards. Happy with them?',
      highlight: 'blueprint-cards',
    },
    {
      title: 'Add more if you like',
      description: 'Use the "+ Add Card" button to add custom pages or sections. You can edit card titles, descriptions, and notes.',
      action: 'Optional: customize your blueprint',
      highlight: 'add-card-button',
    },
    {
      title: 'Send it to us',
      description: 'When you\'re happy with your blueprint, hit the gold "Send to Worker-Bee" button. We\'ll get your vision and start building.',
      action: 'Click "Send to Worker-Bee"',
      highlight: 'send-button',
    },
  ]

  const current = steps[step]

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'flex-end',
      zIndex: 300,
      backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        background: '#0b1f3a',
        width: '100%',
        maxWidth: 480,
        padding: 24,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderTop: '1px solid rgba(0, 212, 170, 0.2)',
        animation: 'slideUp 0.3s ease-out',
      }}>
        {/* Close button */}
        <button
          onClick={() => {
            setDismissed(true)
            localStorage.setItem('walkthrough-dismissed', 'true')
            onComplete?.()
          }}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <X size={18} />
        </button>

        {/* Step indicator */}
        <div style={{ fontSize: 12, color: '#00d4aa', fontWeight: 600, marginBottom: 12, letterSpacing: '0.05em' }}>
          STEP {step + 1} OF {steps.length}
        </div>

        {/* Title */}
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>
          {current.title}
        </h2>

        {/* Description */}
        <p style={{ fontSize: 14, color: '#cbd5e1', marginBottom: 20, lineHeight: 1.6 }}>
          {current.description}
        </p>

        {/* Action hint */}
        <div style={{
          background: 'rgba(0, 212, 170, 0.08)',
          border: '1px solid rgba(0, 212, 170, 0.2)',
          borderRadius: 8,
          padding: 12,
          marginBottom: 20,
          fontSize: 13,
          color: '#a8e6da',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Next:</div>
          {current.action}
        </div>

        {/* Progress bar */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          height: 3,
          borderRadius: 2,
          marginBottom: 20,
          overflow: 'hidden',
        }}>
          <div style={{
            background: 'linear-gradient(90deg, #00d4aa, #0891b2)',
            height: '100%',
            width: `${((step + 1) / steps.length) * 100}%`,
            transition: 'width 0.3s ease-out',
          }} />
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: step === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(100, 116, 139, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: step === 0 ? '#64748b' : '#cbd5e1',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: step === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Back
          </button>
          {step === steps.length - 1 ? (
            <button
              onClick={() => {
                setDismissed(true)
                localStorage.setItem('walkthrough-dismissed', 'true')
                onComplete?.()
              }}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #00d4aa, #0891b2)',
                border: 'none',
                color: '#000',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Check size={14} /> Got it!
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #00d4aa, #0891b2)',
                border: 'none',
                color: '#000',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          )}
        </div>

        <style>{`
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  )
}

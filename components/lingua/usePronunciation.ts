'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

export interface VoiceOption {
  name: string
  voiceURI: string
  lang: string
  isGoogle: boolean
}

export function usePronunciation(lang?: string) {
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const defaultSet = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    function loadVoices() {
      const raw = window.speechSynthesis.getVoices()
      const mapped: VoiceOption[] = raw.map(v => ({
        name: v.name,
        voiceURI: v.voiceURI,
        lang: v.lang,
        isGoogle: v.name.toLowerCase().startsWith('google'),
      }))
      setVoices(mapped)

      // Pick a default once: prefer Google voice matching the language, then any Google, then first available
      if (!defaultSet.current && mapped.length > 0) {
        const google = mapped.find(v => v.isGoogle && lang && v.lang.toLowerCase().startsWith(lang.toLowerCase()))
          ?? mapped.find(v => v.isGoogle)
          ?? mapped[0]
        setSelectedVoiceURI(google.voiceURI)
        defaultSet.current = true
      }
    }

    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [lang])

  const speak = useCallback((text: string, langOverride?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)

    const targetLang = langOverride ?? lang
    const raw = window.speechSynthesis.getVoices()

    const voice = raw.find(v => v.voiceURI === selectedVoiceURI)
      ?? raw.find(v => v.name.toLowerCase().startsWith('google') && targetLang && v.lang.toLowerCase().startsWith(targetLang.toLowerCase()))
      ?? raw.find(v => v.name.toLowerCase().startsWith('google'))
      ?? (targetLang ? raw.find(v => v.lang.toLowerCase().startsWith(targetLang.toLowerCase())) : undefined)

    if (voice) utterance.voice = voice
    if (targetLang) utterance.lang = targetLang

    utterance.rate = 0.9
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }, [voices, selectedVoiceURI, lang])

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  return { voices, selectedVoiceURI, setSelectedVoiceURI, speak, stop, isSpeaking, supported }
}

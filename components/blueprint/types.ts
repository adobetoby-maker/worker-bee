export type CardType = 'page' | 'section' | 'component' | 'api' | 'data'
export type CardStatus = 'planned' | 'in-progress' | 'done'

export interface CardData {
  title: string
  type: CardType
  description: string
  claudePrompt: string
  status: CardStatus
  rotation: number
}

export const TYPE_COLOR: Record<CardType, string> = {
  page: '#3b82f6',
  section: '#8b5cf6',
  component: '#f59e0b',
  api: '#10b981',
  data: '#ef4444',
}

export const STATUS_META: Record<CardStatus, { label: string; color: string; bg: string }> = {
  planned: { label: 'PLANNED', color: '#78716c', bg: 'transparent' },
  'in-progress': { label: 'IN PROGRESS', color: '#d97706', bg: 'transparent' },
  done: { label: 'DONE', color: '#059669', bg: 'transparent' },
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

export function parseDollars(s: string): number {
  return Math.round(parseFloat(s.replace(/[^0-9.]/g, '')) * 100) || 0
}

export function getInvoiceStatusColor(status: string): string {
  switch (status) {
    case 'paid': return '#10b981'
    case 'sent': return '#3b82f6'
    case 'overdue': return '#ef4444'
    default: return '#6b7280'
  }
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue'

export type InvoiceItem = {
  id: string
  invoice_id: string
  description: string
  category: 'service' | 'ai-cost' | 'hosting' | 'affiliate-setup' | 'maintenance'
  quantity: number
  unit_price_cents: number
  total_cents: number
}

export type Invoice = {
  id: string
  site_id: string | null
  client_name: string
  client_email: string | null
  invoice_number: string
  status: InvoiceStatus
  issued_date: string
  due_date: string | null
  subtotal_cents: number
  tax_rate_pct: number
  total_cents: number
  notes: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export type InvoiceWithMeta = Invoice & {
  site_name: string | null
  site_url: string | null
  item_count: number
}

export type InvoiceWithItems = Invoice & {
  invoice_items: InvoiceItem[]
  sites: { name: string; url: string } | null
}

/**
 * Smoke tests for /api/clients — verify the route exists and returns valid JSON.
 * These tests call the actual handler functions directly (no HTTP server needed).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing the route
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ order: () => ({ data: mockClients, error: null }) }),
      insert: () => ({ select: () => ({ single: () => ({ data: mockClients[0], error: null }) }) }),
    }),
  },
}))

const mockClients = [
  { id: '1', name: 'Jay Anderton', email: 'jay@example.com', phone: null, company: null, notes: null, created_at: '2026-01-01' },
  { id: '2', name: 'JRS Auto Repair', email: null, phone: '208-555-0100', company: null, notes: null, created_at: '2026-01-01' },
]

describe('GET /api/clients', () => {
  it('returns a list of clients', async () => {
    const { GET } = await import('@/app/api/clients/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeGreaterThanOrEqual(0)
  })
})

describe('POST /api/clients', () => {
  it('rejects missing name', async () => {
    const { POST } = await import('@/app/api/clients/route')
    const req = new Request('http://localhost/api/clients', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/name/)
  })

  it('creates a client with valid name', async () => {
    const { POST } = await import('@/app/api/clients/route')
    const req = new Request('http://localhost/api/clients', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Test Client', email: 'test@example.com' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.name).toBe('Jay Anderton') // mock returns first client
  })
})

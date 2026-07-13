/**
 * Unit tests for parseMissionState — pure function, no Supabase mocking needed.
 */
import { describe, it, expect } from 'vitest'
import { parseMissionState } from '@/lib/missionStore'

function validBody() {
  return {
    slug: 'live-build-board',
    gates: { map: 'approved', prd: 'pending', blueprint: 'pending' },
    blocks: [{ id: '01-mission-store', status: 'BUILDING' }],
    final_say: 'none',
    ts: '2026-07-12T00:00:00Z',
  }
}

describe('parseMissionState', () => {
  it('parses a valid mission state', () => {
    const result = parseMissionState(validBody())
    expect(result).toEqual(validBody())
  })

  it('rejects a slug that attempts path traversal', () => {
    const body = { ...validBody(), slug: '../etc' }
    expect(parseMissionState(body)).toBeNull()
  })

  it('rejects an uppercase slug', () => {
    const body = { ...validBody(), slug: 'Live-Build-Board' }
    expect(parseMissionState(body)).toBeNull()
  })

  it('rejects non-array blocks', () => {
    const body = { ...validBody(), blocks: { id: '01', status: 'PASS' } }
    expect(parseMissionState(body)).toBeNull()
  })

  it('defaults final_say to "none" when missing', () => {
    const { final_say, ...rest } = validBody()
    void final_say
    const result = parseMissionState(rest)
    expect(result?.final_say).toBe('none')
  })

  it('accepts an unknown status string on a block', () => {
    const body = { ...validBody(), blocks: [{ id: '01-mission-store', status: 'ACCEPTED' }] }
    const result = parseMissionState(body)
    expect(result).not.toBeNull()
    expect(result?.blocks[0].status).toBe('ACCEPTED')
  })
})

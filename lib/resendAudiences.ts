// Resend audience IDs per site — created 2026-05-29
// These are Resend's contact list IDs for each site's subscriber base
export const RESEND_AUDIENCES: Record<string, string> = {
  medicalspanish: '2849585a-b7dc-44fc-b2d4-c87840807dae',
  constructionspanish: '3f6ec6eb-052d-412f-ac1c-6a257d156906',
  languagethreshold: 'b59338b6-5cb7-4b5d-80a9-b6d8fac83ab5',
  'worker-bee': '558a4229-3b49-4685-a0fd-9b1ebf48549a',
}

export const RESEND_API_KEY = process.env.RESEND_API_KEY ?? 're_7yAskh9s_B5fERdUz4C4CGS7JoytQQ8DW'

export async function getOrCreateAudience(siteId: string): Promise<string | null> {
  const existing = RESEND_AUDIENCES[siteId]
  if (existing) return existing
  // Create new audience
  const res = await fetch('https://api.resend.com/audiences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `${siteId} subscribers` }),
  })
  const data = await res.json() as { id?: string }
  return data.id ?? null
}

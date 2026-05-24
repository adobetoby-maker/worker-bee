import crypto from 'crypto'

export type GA4Metrics = {
  sessions: number
  users: number
  pageviews: number
  topPages: { page: string; views: number }[]
  error?: string
}

async function getAccessToken(saJson: string): Promise<string> {
  const sa = JSON.parse(saJson)
  const now = Math.floor(Date.now() / 1000)

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    sub: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url')

  const unsigned = `${header}.${payload}`
  const sign = crypto.createSign('SHA256')
  sign.update(unsigned)
  const signature = sign.sign(sa.private_key, 'base64url')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${unsigned}.${signature}`,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await res.json() as any
  if (!data.access_token) throw new Error(data.error_description ?? 'Failed to get access token')
  return data.access_token
}

async function runReport(propertyId: string, token: string, body: object) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GA4 API ${res.status}: ${text.slice(0, 120)}`)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await res.json() as any
}

export async function fetchGA4Metrics(propertyId: string, days = 7): Promise<GA4Metrics> {
  const saJson = process.env.GOOGLE_SA_KEY
  if (!saJson) {
    return { sessions: 0, users: 0, pageviews: 0, topPages: [], error: 'GOOGLE_SA_KEY not set' }
  }

  try {
    const token = await getAccessToken(saJson)
    const dateRange = { startDate: `${days}daysAgo`, endDate: 'today' }

    const [totals, pages] = await Promise.all([
      runReport(propertyId, token, {
        dateRanges: [dateRange],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
        ],
      }),
      runReport(propertyId, token, {
        dateRanges: [dateRange],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 5,
      }),
    ])

    const row = totals.rows?.[0]
    const sessions  = parseInt(row?.metricValues?.[0]?.value ?? '0')
    const users     = parseInt(row?.metricValues?.[1]?.value ?? '0')
    const pageviews = parseInt(row?.metricValues?.[2]?.value ?? '0')

    const topPages = (pages.rows ?? []).map((r: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }) => ({
      page: r.dimensionValues[0].value,
      views: parseInt(r.metricValues[0].value),
    }))

    return { sessions, users, pageviews, topPages }
  } catch (e) {
    return { sessions: 0, users: 0, pageviews: 0, topPages: [], error: String(e) }
  }
}

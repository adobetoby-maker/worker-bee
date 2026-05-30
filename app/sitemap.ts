import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://manage.worker-bee.app'
  const now = new Date()

  // Only public-facing pages — dashboard routes are auth-protected
  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${base}/plan`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${base}/evaluate`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${base}/ship-ready`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}

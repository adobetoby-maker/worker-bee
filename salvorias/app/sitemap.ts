import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://salvorias.worker-bee.app'
  const now = new Date()

  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/package`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/settlement`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/process`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/provenance`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/apply`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
  ]
}

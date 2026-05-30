import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/plan', '/evaluate', '/ship-ready', '/client/'],
        disallow: [
          '/sites',
          '/clients',
          '/billing',
          '/vault',
          '/monitor',
          '/builds',
          '/analytics',
          '/neural-map',
          '/submissions',
          '/requests',
          '/campaigns',
          '/contacts',
          '/audits',
          '/iterations',
          '/maintenance',
          '/batch',
          '/mods',
          '/configurator',
          '/flow-boards',
          '/help',
          '/api/',
          '/login',
        ],
      },
    ],
    sitemap: 'https://manage.worker-bee.app/sitemap.xml',
  }
}

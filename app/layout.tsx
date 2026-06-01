import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a18',
}

export const metadata: Metadata = {
  title: 'Worker-Bee | Agency Management',
  description: 'Manage client sites, credentials, and AI agents.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Worker-Bee',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        {children}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-RP0TZ1MP7E" strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-RP0TZ1MP7E');
        `}</Script>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {});
          }
        `}</Script>
      </body>
    </html>
  )
}

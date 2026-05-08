import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Worker-Bee | Agency Management',
  description: 'Manage client sites, credentials, and AI agents.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  )
}

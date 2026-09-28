import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Toaster from '@/components/Toaster'
import { SITE_URL } from '@/lib/site'

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter' })

const description = 'Mesai sonrası etkinlikler — konser, tiyatro, stand-up ve daha fazlası. İstanbul, Ankara ve İzmir.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: '18-23 | Etkinlik Rehberi',
  description,
  manifest: '/manifest.json',
  openGraph: { type: 'website', siteName: '18-23', locale: 'tr_TR', title: '18-23 | Etkinlik Rehberi', description, url: SITE_URL },
  twitter: { card: 'summary', title: '18-23 | Etkinlik Rehberi', description },
}

// viewport must be a separate export in Next.js 14+
export const viewport: Viewport = {
  themeColor: '#800020',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} font-sans antialiased bg-gray-50`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}

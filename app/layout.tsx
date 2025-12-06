import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css' // <--- BU SATIR OLMAZSA TASARIM ÇALIŞMAZ

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: '18-23 | Etkinlik Rehberi',
  description: 'Mesai sonrası etkinlikler',
  manifest: '/manifest.json', // <--- EKLENDİ
  themeColor: '#800020',      // <--- EKLENDİ
  viewport: {                 // <--- EKLENDİ (Mobilde zoom engelleme vb.)
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} font-sans antialiased bg-gray-50`}>{children}</body>
    </html>
  )
}
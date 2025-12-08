import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KESTI Pro - نظام إدارة الأعمال',
  description: 'نظام متكامل لإدارة الأعمال التجارية',
  icons: {
    icon: '/icon.svg',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="min-h-screen bg-slate-50 touch-manipulation">
        {children}
      </body>
    </html>
  )
}

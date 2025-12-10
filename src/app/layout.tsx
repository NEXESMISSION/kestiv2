import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import SplashScreen from '@/components/SplashScreen'
import { PWAProvider } from '@/components/pwa'
import './globals.css'

// ============================================
// SEO KEYWORDS - كلمات مفتاحية
// ============================================
// Arabic (عربي):
// كاستي، كاستي برو، نظام كاشير، برنامج محاسبة، إدارة المخزون، نقطة البيع،
// برنامج مبيعات، إدارة المحلات، نظام إدارة الأعمال، برنامج الكاشير،
// محاسبة المحلات، تتبع المخزون، نظام نقاط البيع، إدارة المتاجر،
// برنامج إدارة المحل، كاشير ذكي، نظام محاسبة، برنامج إدارة المبيعات
//
// English:
// Kesti, Kesti Pro, POS system, point of sale, inventory management,
// business management, cashier software, retail management, sales tracking,
// stock management, Tunisia POS, Arabic POS, shop management software
// ============================================

const siteUrl = 'https://kestipro.com'
const siteName = 'Kesti Pro | كاستي برو'
const siteTitle = 'Kesti Pro - كاستي برو | نظام إدارة المبيعات والمخزون الذكي'
const siteDescription = 'كاستي برو - نظام نقاط البيع (POS) الأذكى في تونس. إدارة المبيعات، المخزون، والمحاسبة من هاتفك. بدون أجهزة غالية، بدون تعقيد. ابدأ مجاناً اليوم! | Kesti Pro - Smart POS & Inventory Management System'

export const metadata: Metadata = {
  // === Base URL for Open Graph images ===
  metadataBase: new URL(siteUrl),
  
  // === Basic Meta ===
  title: {
    default: siteTitle,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: 'Kesti Pro', url: siteUrl }],
  generator: 'Next.js',
  keywords: [
    // Arabic Keywords
    'كاستي',
    'كاستي برو',
    'نظام كاشير',
    'برنامج كاشير',
    'نظام نقاط البيع',
    'إدارة المخزون',
    'برنامج محاسبة',
    'نظام إدارة المحلات',
    'برنامج مبيعات',
    'كاشير ذكي',
    'نظام محاسبة تونس',
    'إدارة المتاجر',
    'تتبع المخزون',
    'برنامج إدارة المبيعات',
    'نظام POS عربي',
    'كاشير هاتف',
    'برنامج محل تجاري',
    // English Keywords  
    'Kesti',
    'Kesti Pro',
    'POS system',
    'point of sale',
    'inventory management',
    'business management software',
    'cashier software',
    'retail management',
    'sales tracking',
    'stock management',
    'Tunisia POS',
    'Arabic POS system',
    'shop management',
    'mobile POS',
    'cloud POS',
  ],
  creator: 'Kesti Pro Team',
  publisher: 'Kesti Pro',
  
  // === Icons ===
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/kesti.png',
    shortcut: '/favicon.ico',
  },
  
  // === Manifest ===
  manifest: '/manifest.json',
  
  // === Open Graph (Facebook, LinkedIn, WhatsApp) ===
  openGraph: {
    type: 'website',
    locale: 'ar_TN',
    alternateLocale: ['en_US', 'fr_TN'],
    url: siteUrl,
    siteName: siteName,
    title: 'Kesti Pro - كاستي برو | نظام الكاشير الذكي',
    description: 'ودّع الدفاتر والحسابات اليدوية! كاستي برو - نظام إدارة المبيعات والمخزون الأذكى. يعمل من هاتفك، بدون أجهزة غالية. تجربة مجانية 15 يوم!',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'Kesti Pro - كاستي برو | نظام إدارة المبيعات الذكي',
        type: 'image/png',
      },
      {
        url: `${siteUrl}/kesti.png`,
        width: 512,
        height: 512,
        alt: 'Kesti Pro Logo',
        type: 'image/png',
      },
    ],
  },
  
  // === Twitter Card ===
  twitter: {
    card: 'summary_large_image',
    site: '@kestipro',
    creator: '@kestipro',
    title: 'Kesti Pro - كاستي برو | نظام الكاشير الذكي',
    description: 'ودّع الدفاتر والحسابات اليدوية! نظام إدارة المبيعات والمخزون الأذكى. يعمل من هاتفك. تجربة مجانية!',
    images: [`${siteUrl}/og-image.png`],
  },
  
  // === Robots ===
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // === Verification (Add your codes here) ===
  verification: {
    google: 'YOUR_GOOGLE_VERIFICATION_CODE',
    yandex: 'YOUR_YANDEX_CODE',
    // bing: 'YOUR_BING_CODE', // Add via meta tag below
  },
  
  // === Alternate Languages ===
  alternates: {
    canonical: siteUrl,
    languages: {
      'ar-TN': siteUrl,
      'en-US': `${siteUrl}/en`,
    },
  },
  
  // === Category ===
  category: 'Business Software',
  
  // === Other ===
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
}

// Viewport export (Next.js 14+)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
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
        {/* Bing Verification - Replace with your actual code */}
        <meta name="msvalidate.01" content="YOUR_BING_VERIFICATION_CODE" />
        {/* Additional SEO Meta */}
        <meta name="geo.region" content="TN" />
        <meta name="geo.placename" content="Tunisia" />
        <meta name="language" content="Arabic" />
        <meta name="revisit-after" content="7 days" />
        <meta name="rating" content="general" />
        {/* Structured Data - JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Kesti Pro - كاستي برو',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web, iOS, Android',
              offers: {
                '@type': 'Offer',
                price: '15',
                priceCurrency: 'TND',
                priceValidUntil: '2025-12-31',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.9',
                ratingCount: '150',
              },
              description: 'نظام إدارة المبيعات والمخزون الذكي - Smart POS & Inventory Management',
              url: 'https://kestipro.com',
              image: 'https://kestipro.com/og-image.png',
              author: {
                '@type': 'Organization',
                name: 'Kesti Pro',
                url: 'https://kestipro.com',
              },
            }),
          }}
        />
        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Kesti Pro - كاستي برو',
              url: 'https://kestipro.com',
              logo: 'https://kestipro.com/kesti.png',
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: '+216-53-518-337',
                contactType: 'customer service',
                availableLanguage: ['Arabic', 'French', 'English'],
              },
              sameAs: [
                'https://instagram.com/kestipro',
                'https://wa.me/21653518337',
              ],
            }),
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 touch-manipulation">
        <PWAProvider>
          <SplashScreen />
          {children}
          <Analytics />
        </PWAProvider>
      </body>
    </html>
  )
}

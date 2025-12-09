'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ExternalLink, Smartphone, CheckCircle } from 'lucide-react'
import { detectPlatform } from '@/lib/pwa/platform'

export default function InstallPage() {
  const [mounted, setMounted] = useState(false)
  const [platform, setPlatform] = useState<ReturnType<typeof detectPlatform> | null>(null)

  useEffect(() => {
    setMounted(true)
    setPlatform(detectPlatform())
  }, [])

  // Safari URL scheme to open in Safari
  const openInSafari = () => {
    const targetUrl = `${window.location.origin}/login?install=safari`
    // Try using Safari URL scheme
    window.location.href = targetUrl
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // If user is on Safari, redirect to login with install flag
  if (platform?.platform === 'ios-safari') {
    if (typeof window !== 'undefined') {
      window.location.href = '/login?install=safari'
    }
    return null
  }

  // If user is in standalone mode, redirect to login
  if (platform?.isStandalone) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return null
  }

  // If not on iOS, redirect to login (native install available there)
  if (!platform?.isIOS) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return null
  }

  // Show install page for iOS non-Safari browsers
  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center px-4 py-8 bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center bg-gradient-to-b from-primary-50 to-white">
            {/* App Icon */}
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl shadow-lg overflow-hidden animate-bounce-slow">
              <Image 
                src="/kesti.png" 
                alt="Kesti Pro" 
                width={96} 
                height={96} 
                className="w-full h-full object-cover"
              />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">تثبيت Kesti Pro</h1>
            <p className="text-gray-500">للحصول على أفضل تجربة</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Browser Notice */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-800 font-medium text-sm">
                    {platform?.isChrome && 'Chrome لا يدعم تثبيت التطبيقات على iPhone'}
                    {platform?.isFirefox && 'Firefox لا يدعم تثبيت التطبيقات على iPhone'}
                    {platform?.isBrave && 'Brave لا يدعم تثبيت التطبيقات على iPhone'}
                    {!platform?.isChrome && !platform?.isFirefox && !platform?.isBrave && 'هذا المتصفح لا يدعم تثبيت التطبيقات'}
                  </p>
                  <p className="text-amber-700 text-xs mt-1">
                    يجب استخدام Safari لتثبيت التطبيق
                  </p>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={openInSafari}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5 transition-all active:scale-95"
            >
              <ExternalLink className="w-5 h-5" />
              <span>فتح في Safari</span>
            </button>

            {/* Instructions */}
            <div className="text-center text-xs text-gray-400 space-y-1">
              <p>انسخ الرابط وافتحه في Safari</p>
              <code className="block p-2 bg-gray-100 rounded-lg text-gray-600 text-xs break-all">
                {typeof window !== 'undefined' ? window.location.origin : 'kestipro.com'}
              </code>
            </div>

            {/* Benefits */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  وصول سريع
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  بدون تحميل
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  تلقائي
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

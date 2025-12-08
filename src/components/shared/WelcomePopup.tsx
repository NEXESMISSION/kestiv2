'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Clock, Gift } from 'lucide-react'

interface WelcomePopupProps {
  userName?: string
  trialDays?: number
}

export default function WelcomePopup({ userName, trialDays = 15 }: WelcomePopupProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check if user has seen the welcome popup
    const hasSeenWelcome = localStorage.getItem('kesti_welcome_shown')
    if (!hasSeenWelcome) {
      // Small delay for better UX
      const timer = setTimeout(() => setIsOpen(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem('kesti_welcome_shown', 'true')
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 p-6 text-center relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2" />
          
          <div className="relative">
            <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              مرحباً بك{userName ? ` ${userName}` : ''} ! 🎉
            </h2>
            <p className="text-primary-100">نحن سعداء بانضمامك إلينا</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Trial info card */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Gift className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-green-800">فترة تجريبية مجانية</h3>
                <p className="text-green-600 text-sm">
                  لديك <span className="font-bold text-lg">{trialDays}</span> يوم للاستمتاع بجميع المميزات
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-primary-600" />
              </div>
              <span>إدارة كاملة لنشاطك التجاري</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-600" />
              </div>
              <span>تقارير مالية شاملة ومفصلة</span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleClose}
            className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-bold text-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg shadow-primary-200 active:scale-[0.98]"
          >
            ابدأ الآن 🚀
          </button>

          <p className="text-center text-xs text-gray-400">
            يمكنك الترقية في أي وقت من الإعدادات
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

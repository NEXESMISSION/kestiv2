'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, LogOut, Loader2, Phone, Mail, CreditCard, AlertCircle, MessageCircle } from 'lucide-react'
import { createClient, resetClient } from '@/lib/supabase/client'

export default function ExpiredPage() {
  const router = useRouter()
  const [userName, setUserName] = useState<string>('')
  const [expiredDate, setExpiredDate] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const checkSubscriptionStatus = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Get profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_end_date, full_name, role')
        .eq('id', user.id)
        .single()

      const name = profile?.full_name || user.user_metadata?.full_name || user.email || 'المستخدم'
      const role = profile?.role || user.user_metadata?.role || 'user'
      const subscriptionStatus = profile?.subscription_status
      const endDate = profile?.subscription_end_date

      // Super admin always has access
      if (role === 'super_admin') {
        router.push('/superadmin')
        return
      }

      // Check if subscription is truly active (status AND end date)
      let isSubscriptionValid = false
      if (subscriptionStatus === 'active' || subscriptionStatus === 'trial') {
        if (endDate) {
          const endDateTime = new Date(endDate)
          isSubscriptionValid = endDateTime > new Date()
        } else {
          // No end date set, consider as valid
          isSubscriptionValid = true
        }
      }

      // If subscription is valid, redirect to app
      if (isSubscriptionValid) {
        router.push('/pos')
        return
      }

      // User should stay on expired page
      setUserName(name)
      if (endDate) {
        setExpiredDate(new Date(endDate).toLocaleDateString('ar-TN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }))
      }
      setIsLoading(false)
    }

    checkSubscriptionStatus()
  }, [router])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    resetClient()
    window.location.href = '/login'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-red-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-rose-500 p-8 text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              انتهى اشتراكك
            </h1>
            <p className="text-red-100 text-sm">
              مرحباً {userName}
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Expired Info */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 font-medium mb-1">انتهت صلاحية اشتراكك</p>
                  <p className="text-red-600 text-sm">
                    {expiredDate ? `انتهى في: ${expiredDate}` : 'يرجى تجديد اشتراكك للمتابعة'}
                  </p>
                </div>
              </div>
            </div>

            {/* Renewal Info */}
            <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <CreditCard className="w-5 h-5 text-primary-600" />
                <p className="text-primary-700 font-medium">تجديد الاشتراك</p>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                لاستمرار استخدام KESTI Pro، يرجى تجديد اشتراكك أو التواصل مع فريق الدعم
              </p>
              <a 
                href="mailto:support@kestipro.com?subject=تجديد الاشتراك"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-colors font-medium"
              >
                <CreditCard className="w-5 h-5" />
                طلب تجديد الاشتراك
              </a>
            </div>

            {/* Contact Info */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-gray-600 text-sm mb-3 text-center">
                للمساعدة، تواصل معنا
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <a href="tel:+21653518337" className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700">
                  <Phone className="w-4 h-4" />
                  +216 53518337
                </a>
                <a href="https://wa.me/21653518337" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700">
                  <MessageCircle className="w-4 h-4" />
                  واتساب
                </a>
                <a href="mailto:support@kestipro.com" className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700">
                  <Mail className="w-4 h-4" />
                  support@kestipro.com
                </a>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors font-medium"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري تسجيل الخروج...
                </>
              ) : (
                <>
                  <LogOut className="w-5 h-5" />
                  تسجيل الخروج
                </>
              )}
            </button>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 p-4 text-center bg-gray-50">
            <p className="text-gray-400 text-xs">
              KESTI Pro © 2024
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

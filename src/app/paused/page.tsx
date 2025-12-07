'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PauseCircle, LogOut, Loader2, Phone, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function PausedPage() {
  const router = useRouter()
  const [pauseReason, setPauseReason] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    const checkPauseStatus = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Check session storage first (from login redirect)
      const storedReason = sessionStorage.getItem('pauseReason')
      
      // Get profile data for pause status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_paused, pause_reason, full_name, role')
        .eq('id', user.id)
        .single()

      const isPaused = profile?.is_paused || false
      const reason = storedReason || profile?.pause_reason || 'تم إيقاف حسابك مؤقتاً'
      const name = profile?.full_name || user.user_metadata?.full_name || user.email || 'المستخدم'
      const role = profile?.role || user.user_metadata?.role || 'user'

      if (!isPaused) {
        // Not paused, redirect to appropriate page
        sessionStorage.removeItem('pauseReason')
        if (role === 'super_admin') {
          router.push('/superadmin')
        } else {
          router.push('/pos')
        }
        return
      }

      setPauseReason(reason)
      setUserName(name)
      setIsLoading(false)
    }

    checkPauseStatus()
  }, [router])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-orange-100">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4">
              <PauseCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              الحساب موقوف مؤقتاً
            </h1>
            <p className="text-orange-100 text-sm">
              مرحباً {userName}
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Pause Reason */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-6">
              <p className="text-orange-600 text-sm font-medium mb-2">سبب الإيقاف:</p>
              <p className="text-gray-800 text-lg leading-relaxed">
                {pauseReason}
              </p>
            </div>

            {/* Contact Info */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-gray-600 text-sm mb-3 text-center">
                إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الدعم الفني
              </p>
              <div className="flex justify-center gap-4">
                <a href="tel:+21600000000" className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700">
                  <Phone className="w-4 h-4" />
                  اتصل بنا
                </a>
                <a href="mailto:support@kestipro.com" className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700">
                  <Mail className="w-4 h-4" />
                  راسلنا
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

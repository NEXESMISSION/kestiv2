'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LogIn, Loader2, XCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginData } from '@/lib/validations/auth'
import { InstallButton } from '@/components/pwa'

type NotificationType = 'success' | 'error'

interface Notification {
  type: NotificationType
  message: string
}

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [notification, setNotification] = useState<Notification | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message })
  }

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true)
    setNotification(null)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (authError) {
        console.error('Login error:', authError)
        // Handle different error cases with Arabic messages
        if (authError.message.includes('Invalid login credentials') || authError.status === 400) {
          showNotification('error', 'البريد الإلكتروني أو كلمة المرور غير صحيحة')
        } else if (authError.message.includes('Email not confirmed')) {
          showNotification('error', 'يرجى تأكيد بريدك الإلكتروني أولاً قبل تسجيل الدخول')
        } else if (authError.message.includes('rate limit') || authError.message.includes('Too many requests') || authError.status === 429) {
          showNotification('error', 'محاولات كثيرة جداً. انتظر دقيقة ثم حاول مرة أخرى.')
        } else if (authError.message.includes('network') || authError.message.includes('fetch')) {
          showNotification('error', 'خطأ في الاتصال. تحقق من الإنترنت وحاول مرة أخرى.')
        } else {
          showNotification('error', 'حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.')
        }
        return
      }

      // Get the logged in user to check role and pause status
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        showNotification('error', 'حدث خطأ غير متوقع. حاول مرة أخرى.')
        return
      }
      
      // Check profile for pause status and role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_paused, pause_reason')
        .eq('id', user.id)
        .maybeSingle()
      
      // Use profile data if available, otherwise fall back to metadata
      const userRole = profile?.role || user.user_metadata?.role || 'user'
      const isPaused = profile?.is_paused || false
      const pauseReason = profile?.pause_reason || ''
      
      // Success - redirect based on role and pause status
      showNotification('success', 'تم تسجيل الدخول بنجاح! جاري التحويل...')
      
      // Force a full page refresh to ensure session is properly recognized
      setTimeout(() => {
        if (isPaused) {
          // Store pause reason in session for the paused page
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('pauseReason', pauseReason)
          }
          window.location.href = '/paused'
        } else if (userRole === 'super_admin') {
          window.location.href = '/superadmin'
        } else {
          window.location.href = '/pos'
        }
      }, 1000)
    } catch {
      showNotification('error', 'حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center px-4 py-6 sm:p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="mb-4">
          <Link
            href="/landing"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowRight size={18} />
            <span>العودة للصفحة الرئيسية</span>
          </Link>
        </div>

        {/* Logo/Brand */}
        <div className="text-center mb-6 sm:mb-8">
          <Link href="/landing">
            <Image src="/kesti.png" alt="Kesti Pro" width={100} height={100} className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-shadow" />
          </Link>
          <p className="text-gray-500 text-sm sm:text-base">نظام إدارة الأعمال المتكامل</p>
        </div>

        {/* Login Card */}
        <div className="card !p-5 sm:!p-8">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">تسجيل الدخول</h2>
            <p className="text-gray-500 text-sm sm:text-base">أدخل بياناتك للوصول إلى حسابك</p>
          </div>

          {/* Notification Banner */}
          {notification && (
            <div className={`mb-4 p-4 rounded-xl flex items-start gap-3 ${
              notification.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className={`flex-shrink-0 ${notification.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                {notification.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              </div>
              <p className={`text-sm font-medium ${notification.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                {notification.message}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                id="email"
                {...register('email')}
                className={`input-field ${errors.email ? 'input-error' : ''}`}
                placeholder="example@email.com"
                dir="ltr"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  كلمة المرور
                </label>
                <Link href="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  {...register('password')}
                  className={`input-field pl-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  dir="ltr"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  جاري تسجيل الدخول...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  تسجيل الدخول
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-500">
              ليس لديك حساب؟{' '}
              <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                إنشاء حساب جديد
              </Link>
            </p>
          </div>
        </div>

        {/* PWA Install Section */}
        <div className="mt-6 text-center">
          <InstallButton variant="primary" className="w-full" />
          <p className="mt-2 text-xs text-gray-400">
            ثبّت التطبيق للوصول السريع وتجربة أفضل
          </p>
        </div>
      </div>
    </div>
  )
}

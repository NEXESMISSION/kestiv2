'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, XCircle, CheckCircle2, KeyRound, ShieldCheck, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    .regex(/[0-9]/, 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل')
    .regex(/[a-zA-Z]/, 'كلمة المرور يجب أن تحتوي على حرف واحد على الأقل'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword']
})

type ResetPasswordData = z.infer<typeof resetPasswordSchema>

type NotificationType = 'success' | 'error'

interface Notification {
  type: NotificationType
  message: string
}

// Wrapper component for Suspense
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [notification, setNotification] = useState<Notification | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message })
  }

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema)
  })

  // Handle URL hash tokens (for mobile/PWA compatibility)
  const handleHashToken = useCallback(async () => {
    const supabase = createClient()
    
    // Check URL hash for tokens (Supabase sends tokens in hash for recovery)
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')
      const errorDesc = hashParams.get('error_description')
      
      // Check for errors in hash
      if (errorDesc) {
        console.error('Auth error:', errorDesc)
        return false
      }
      
      if (accessToken) {
        // Set the session using the tokens from URL hash
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        })
        
        if (!error) {
          // Clear the hash from URL for security
          window.history.replaceState(null, '', window.location.pathname)
          return true
        }
        console.error('Session error:', error)
      }
      
      // Also try recovery type without explicit check
      if (type === 'recovery' && accessToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        })
        
        if (!error) {
          window.history.replaceState(null, '', window.location.pathname)
          return true
        }
      }
    }
    
    // Also check for code in search params (PKCE flow)
    const code = searchParams.get('code')
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        // Clear URL params for security
        window.history.replaceState(null, '', window.location.pathname)
        return true
      }
      console.error('Code exchange error:', error)
    }
    
    // Check for token in query params (alternative format)
    const token = searchParams.get('token')
    const tokenType = searchParams.get('type')
    if (token && tokenType === 'recovery') {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery'
      })
      if (!error) {
        window.history.replaceState(null, '', window.location.pathname)
        return true
      }
    }
    
    return false
  }, [searchParams])

  // Check if user has a valid reset session
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      
      // First try to handle hash tokens (for mobile/browser transitions)
      const hashedSession = await handleHashToken()
      
      if (hashedSession) {
        setIsValidSession(true)
        setCheckingSession(false)
        return
      }
      
      // Check existing session
      const { data: { session } } = await supabase.auth.getSession()
      
      // User should have a session from the reset link
      if (session) {
        setIsValidSession(true)
      }
      setCheckingSession(false)
    }
    
    checkSession()
  }, [handleHashToken])

  const onSubmit = async (data: ResetPasswordData) => {
    setIsLoading(true)
    setNotification(null)

    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.updateUser({
        password: data.password
      })

      if (error) {
        if (error.message.includes('same password')) {
          showNotification('error', 'كلمة المرور الجديدة يجب أن تكون مختلفة عن السابقة')
        } else if (error.message.includes('weak')) {
          showNotification('error', 'كلمة المرور ضعيفة. استخدم كلمة مرور أقوى.')
        } else {
          showNotification('error', 'حدث خطأ. حاول مرة أخرى أو اطلب رابط جديد.')
        }
        return
      }

      setIsSuccess(true)
      showNotification('success', 'تم تغيير كلمة المرور بنجاح!')
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch {
      showNotification('error', 'حدث خطأ غير متوقع. حاول مرة أخرى.')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">جاري التحقق...</p>
        </div>
      </div>
    )
  }

  // Invalid session - no reset token
  if (!isValidSession && !checkingSession) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center px-4 py-6 sm:p-6 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <Image src="/kesti.png" alt="Kesti Pro" width={100} height={100} className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 rounded-2xl shadow-lg" />
          </div>
          
          <div className="card !p-5 sm:!p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">رابط غير صالح</h2>
            <p className="text-gray-500 text-sm sm:text-base mb-6">
              انتهت صلاحية الرابط أو أنه غير صحيح. يرجى طلب رابط جديد لإعادة تعيين كلمة المرور.
            </p>
            <Link 
              href="/forgot-password" 
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <KeyRound size={20} />
              طلب رابط جديد
            </Link>
            <div className="mt-4">
              <Link 
                href="/login" 
                className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium text-sm"
              >
                <ArrowRight size={16} />
                العودة لتسجيل الدخول
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center px-4 py-6 sm:p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-6 sm:mb-8">
          <Image src="/kesti.png" alt="Kesti Pro" width={100} height={100} className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 rounded-2xl shadow-lg" />
          <p className="text-gray-500 text-sm sm:text-base">نظام إدارة الأعمال المتكامل</p>
        </div>

        {/* Card */}
        <div className="card !p-5 sm:!p-8">
          {!isSuccess ? (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-4">
                  <ShieldCheck className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">إعادة تعيين كلمة المرور</h2>
                <p className="text-gray-500 text-sm sm:text-base">
                  أدخل كلمة المرور الجديدة لحسابك
                </p>
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
                {/* New Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    كلمة المرور الجديدة
                  </label>
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
                  <p className="mt-1 text-xs text-gray-400">
                    8 أحرف على الأقل، مع رقم وحرف واحد
                  </p>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                    تأكيد كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      {...register('confirmPassword')}
                      className={`input-field pl-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                      placeholder="••••••••"
                      dir="ltr"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-500">{errors.confirmPassword.message}</p>
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
                      جاري التحديث...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={20} />
                      تحديث كلمة المرور
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">تم بنجاح! 🎉</h2>
              <p className="text-gray-500 text-sm sm:text-base mb-4">
                تم تغيير كلمة المرور بنجاح. سيتم توجيهك لصفحة تسجيل الدخول...
              </p>
              <div className="flex items-center justify-center gap-2 text-primary-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">جاري التحويل...</span>
              </div>
            </div>
          )}

          {/* Back to Login */}
          {!isSuccess && (
            <div className="mt-6 text-center">
              <Link 
                href="/login" 
                className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                <ArrowRight size={18} />
                العودة لتسجيل الدخول
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

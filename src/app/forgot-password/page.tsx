'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Loader2, XCircle, CheckCircle2, ArrowRight, KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const forgotPasswordSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح')
})

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>

type NotificationType = 'success' | 'error'

interface Notification {
  type: NotificationType
  message: string
}

export default function ForgotPasswordPage() {
  const [notification, setNotification] = useState<Notification | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message })
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema)
  })

  const onSubmit = async (data: ForgotPasswordData) => {
    setIsLoading(true)
    setNotification(null)

    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        if (error.message.includes('rate limit')) {
          showNotification('error', 'محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى.')
        } else {
          showNotification('error', 'حدث خطأ. تأكد من البريد الإلكتروني وحاول مرة أخرى.')
        }
        return
      }

      setEmailSent(true)
      showNotification('success', 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني')
    } catch {
      showNotification('error', 'حدث خطأ غير متوقع. حاول مرة أخرى.')
    } finally {
      setIsLoading(false)
    }
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
          {!emailSent ? (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center mb-4">
                  <KeyRound className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">نسيت كلمة المرور؟</h2>
                <p className="text-gray-500 text-sm sm:text-base">
                  لا تقلق! أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور
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

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      id="email"
                      {...register('email')}
                      className={`input-field pr-10 ${errors.email ? 'input-error' : ''}`}
                      placeholder="example@email.com"
                      dir="ltr"
                      disabled={isLoading}
                    />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
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
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Mail size={20} />
                      إرسال رابط إعادة التعيين
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
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">تم الإرسال بنجاح! 📧</h2>
              <p className="text-gray-500 text-sm sm:text-base mb-2">
                تم إرسال رابط إعادة تعيين كلمة المرور إلى:
              </p>
              <p className="font-medium text-primary-600 mb-4" dir="ltr">
                {getValues('email')}
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-right mb-6">
                <p className="text-yellow-800 text-sm">
                  💡 <strong>نصيحة:</strong> إذا لم تجد الرسالة في البريد الوارد، تحقق من مجلد الرسائل غير المرغوب فيها (Spam)
                </p>
              </div>
              <button
                onClick={() => setEmailSent(false)}
                className="text-primary-600 hover:text-primary-700 font-medium text-sm"
              >
                إرسال مرة أخرى
              </button>
            </div>
          )}

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              <ArrowRight size={18} />
              العودة لتسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

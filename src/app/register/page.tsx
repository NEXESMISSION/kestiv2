'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  Eye, EyeOff, ArrowRight, Loader2, 
  Dumbbell, ShoppingBag,
  Info, Check, CheckCircle2, AlertCircle, XCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { registerStep1Schema, type RegisterStep1Data } from '@/lib/validations/auth'
import type { BusinessMode } from '@/types/database'

// Business category configuration - Only 2 types: subscription and retail
const businessCategories: {
  id: BusinessMode
  title: string
  description: string
  icon: React.ReactNode
  examples: string
}[] = [
  {
    id: 'subscription',
    title: 'اشتراكات',
    description: 'إدارة الأعضاء والاشتراكات مع متجر جانبي',
    icon: <Dumbbell className="w-8 h-8" />,
    examples: 'صالات رياضية، نوادي، مساحات عمل مشتركة'
  },
  {
    id: 'retail',
    title: 'تجزئة',
    description: 'بيع المنتجات بالقطعة أو الوزن مع تتبع المخزون',
    icon: <ShoppingBag className="w-8 h-8" />,
    examples: 'متاجر، بقالات، مقاهي، حوانيت'
  }
]

// Notification types
type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface Notification {
  type: NotificationType
  message: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<BusinessMode | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [notification, setNotification] = useState<Notification | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Helper to set error in Arabic
  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message })
  }

  const clearNotification = () => {
    setNotification(null)
  }

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterStep1Data>({
    resolver: zodResolver(registerStep1Schema)
  })

  // Submit form and create account
  const onSubmit = async (formData: RegisterStep1Data) => {
    if (!selectedCategory) {
      showNotification('warning', 'يرجى اختيار نوع النشاط التجاري')
      return
    }

    setIsLoading(true)
    clearNotification()

    try {
      const supabase = createClient()

      // Create auth user - the database trigger will auto-create the profile
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone_number: formData.phone || null,
            pin_code: formData.pinCode,
            business_mode: selectedCategory,
            role: 'user' // Default role for all new users
          }
        }
      })

      if (authError) {
        console.error('Signup error:', authError)
        // Handle different error cases with Arabic messages
        if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
          showNotification('error', 'هذا البريد الإلكتروني مسجّل مسبقاً. جرّب تسجيل الدخول.')
        } else if (authError.message.includes('Invalid email')) {
          showNotification('error', 'البريد الإلكتروني غير صالح. تأكد من كتابته بشكل صحيح.')
        } else if (authError.message.includes('Password') || authError.message.includes('password')) {
          showNotification('error', 'كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل مع رقم وحرف.')
        } else if (authError.message.includes('rate limit') || authError.message.includes('Too many requests') || authError.status === 429) {
          showNotification('error', 'لقد قمت بمحاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى.')
        } else if (authError.message.includes('network') || authError.message.includes('fetch')) {
          showNotification('error', 'خطأ في الاتصال بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.')
        } else if (authError.status === 500 || authError.message.includes('sending') || authError.message.includes('email')) {
          showNotification('error', 'خدمة التسجيل غير متاحة حالياً. يرجى المحاولة لاحقاً أو التواصل مع الدعم.')
        } else {
          showNotification('error', 'حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى.')
        }
        return
      }

      // Check if user was actually created (handle fake success for existing emails)
      if (!authData.user) {
        showNotification('error', 'حدث خطأ غير متوقع. حاول مرة أخرى.')
        return
      }

      // Check for existing user (Supabase returns user but no session for existing emails)
      if (authData.user && !authData.session && authData.user.identities?.length === 0) {
        showNotification('error', 'هذا البريد الإلكتروني مسجّل مسبقاً. جرّب تسجيل الدخول.')
        return
      }
      
      try {
        // Calculate trial end date (15 days from now)
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 15)
        
        // Try a direct insert first (for better error handling)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.fullName,
            phone_number: formData.phone || null,
            pin_code: formData.pinCode, // This is important for the PIN verification
            business_mode: selectedCategory,
            role: 'user',
            is_active: true,
            is_paused: false,
            pause_reason: null,
            subscription_status: 'trial',
            subscription_end_date: trialEndDate.toISOString(),
            subscription_days: 15
          })
        
        if (profileError) {
          // Profile already exists (created by trigger) - update it with full data
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              email: formData.email,
              full_name: formData.fullName,
              phone_number: formData.phone || null,
              pin_code: formData.pinCode,
              business_mode: selectedCategory,
              subscription_status: 'trial',
              subscription_end_date: trialEndDate.toISOString(),
              subscription_days: 15,
              updated_at: new Date().toISOString()
            })
            .eq('id', authData.user.id)
          
          // Update error is not critical - profile was created by trigger
        }
      } catch (profileErr) {
        console.error('Unexpected error during profile creation:', profileErr)
        showNotification('warning', 'تم إنشاء الحساب ولكن قد تكون هناك مشكلة في الملف الشخصي')
      }

      // Success! Account created - auto login
      showNotification('success', 'تم إنشاء حسابك بنجاح! جاري تسجيل الدخول...')
      
      // Auto login the user
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })
      
      if (loginError) {
        // If auto-login fails, redirect to login page
        console.error('Auto-login failed:', loginError)
        setTimeout(() => {
          router.push('/login')
        }, 2000)
        return
      }
      
      // Redirect to POS after successful auto-login
      setTimeout(() => {
        router.push('/pos')
        router.refresh()
      }, 1500)
    } catch (err) {
      console.error('Unexpected error:', err)
      showNotification('error', 'حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center px-4 py-6 sm:p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-lg">
        {/* Back Button - More visible */}
        <div className="mb-4">
          <Link
            href="/landing"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50 transition-all shadow-sm"
          >
            <ArrowRight size={18} />
            <span className="font-medium">الرئيسية</span>
          </Link>
        </div>

        {/* Logo/Brand */}
        <div className="text-center mb-4">
          <Link href="/landing">
            <Image src="/kesti.png" alt="Kesti Pro" width={80} height={80} className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-2 rounded-2xl shadow-lg cursor-pointer hover:shadow-xl transition-shadow" />
          </Link>
        </div>

        {/* Card */}
        <div className="card !p-5 sm:!p-6">
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">إنشاء حساب جديد</h2>
            <p className="text-gray-500 text-sm">أدخل بياناتك واختر نوع نشاطك</p>
          </div>

          {/* Notification Banner */}
          {notification && (
            <div className={`mb-4 p-3 rounded-xl flex items-start gap-3 ${
              notification.type === 'success' ? 'bg-green-50 border border-green-200' :
              notification.type === 'error' ? 'bg-red-50 border border-red-200' :
              notification.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              <div className={`flex-shrink-0 ${
                notification.type === 'success' ? 'text-green-500' :
                notification.type === 'error' ? 'text-red-500' :
                notification.type === 'warning' ? 'text-yellow-500' :
                'text-blue-500'
              }`}>
                {notification.type === 'success' && <CheckCircle2 size={18} />}
                {notification.type === 'error' && <XCircle size={18} />}
                {notification.type === 'warning' && <AlertCircle size={18} />}
                {notification.type === 'info' && <Info size={18} />}
              </div>
              <p className={`text-sm font-medium ${
                notification.type === 'success' ? 'text-green-700' :
                notification.type === 'error' ? 'text-red-700' :
                notification.type === 'warning' ? 'text-yellow-700' :
                'text-blue-700'
              }`}>
                {notification.message}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* Business Type Selection - Compact */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع النشاط *</label>
              <div className="grid grid-cols-2 gap-2">
                {businessCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className={`relative p-3 rounded-xl border-2 text-right transition-all ${
                      selectedCategory === category.id 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`mb-1 ${
                      selectedCategory === category.id ? 'text-primary-600' : 'text-gray-400'
                    }`}>
                      {category.icon}
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm">{category.title}</h3>
                    <p className="text-xs text-gray-500">{category.examples}</p>
                    {selectedCategory === category.id && (
                      <div className="absolute top-2 left-2 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {!selectedCategory && errors.acceptTerms && (
                <p className="mt-1 text-xs text-red-500">يرجى اختيار نوع النشاط</p>
              )}
            </div>

            {/* Two column layout for name and email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
                <input
                  type="text"
                  id="fullName"
                  {...register('fullName')}
                  className={`input-field ${errors.fullName ? 'input-error' : ''}`}
                  placeholder="اسمك الكامل"
                />
                {errors.fullName && <p className="mt-0.5 text-xs text-red-500">{errors.fullName.message}</p>}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">الهاتف <span className="text-gray-400 text-xs">(اختياري)</span></label>
                <input
                  type="tel"
                  id="phone"
                  {...register('phone')}
                  className="input-field"
                  placeholder="+216 XX XXX XXX"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني *</label>
              <input
                type="email"
                id="email"
                {...register('email')}
                className={`input-field ${errors.email ? 'input-error' : ''}`}
                placeholder="example@email.com"
                dir="ltr"
              />
              {errors.email && <p className="mt-0.5 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password and PIN in same row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    {...register('password')}
                    className={`input-field pl-9 ${errors.password ? 'input-error' : ''}`}
                    placeholder="••••••"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <p className="mt-0.5 text-xs text-red-500">{errors.password.message}</p>}
              </div>

              {/* PIN Code */}
              <div>
                <label htmlFor="pinCode" className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="flex items-center gap-1">
                    PIN *
                    <span className="group relative">
                      <Info size={14} className="text-gray-400 cursor-help" />
                      <span className="absolute bottom-full right-0 mb-2 w-40 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        كود 4-6 أرقام للعمليات
                      </span>
                    </span>
                  </span>
                </label>
                <input
                  type="password"
                  id="pinCode"
                  {...register('pinCode')}
                  className={`input-field ${errors.pinCode ? 'input-error' : ''}`}
                  placeholder="••••"
                  maxLength={6}
                  dir="ltr"
                />
                {errors.pinCode && <p className="mt-0.5 text-xs text-red-500">{errors.pinCode.message}</p>}
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="acceptTerms"
                {...register('acceptTerms')}
                className="mt-0.5 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-600">
                أوافق على <a href="#" className="text-primary-600 hover:underline">الشروط</a>
              </label>
            </div>
            {errors.acceptTerms && <p className="text-xs text-red-500">{errors.acceptTerms.message}</p>}

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading || !selectedCategory}
              className="btn-primary flex items-center justify-center gap-2 mt-4 w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  جاري إنشاء الحساب...
                </>
              ) : (
                'إنشاء الحساب'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-4 text-center">
            <p className="text-gray-500 text-sm">
              لديك حساب؟{' '}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">تسجيل الدخول</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

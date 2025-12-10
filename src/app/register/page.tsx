'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  Eye, EyeOff, ArrowLeft, ArrowRight, ChevronLeft, Loader2, 
  Dumbbell, ShoppingBag, Camera,
  Info, Check, CheckCircle2, AlertCircle, XCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { registerStep1Schema, type RegisterStep1Data } from '@/lib/validations/auth'
import type { BusinessMode } from '@/types/database'

// Business category configuration
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
    examples: 'متاجر، بقالات، مشاريع صغيرة'
  },
  {
    id: 'freelancer',
    title: 'مستقل',
    description: 'إدارة العملاء والمشاريع والمدفوعات بكل بساطة',
    icon: <Camera className="w-8 h-8" />,
    examples: 'مصورين، مونتاج، مصممين، مستقلين'
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
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<RegisterStep1Data | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<BusinessMode | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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

  // Step 1: Save form data and proceed to step 2
  const onStep1Submit = (data: RegisterStep1Data) => {
    setFormData(data)
    setStep(2)
  }

  // Step 2: Create account with Supabase
  const onStep2Submit = async () => {
    if (!formData || !selectedCategory) {
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

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-bold text-sm sm:text-base transition-all ${
            step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {step > 1 ? <Check size={20} /> : '1'}
          </div>
          <div className={`w-10 sm:w-16 h-1 rounded-full transition-all ${
            step > 1 ? 'bg-primary-600' : 'bg-gray-200'
          }`} />
          <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-bold text-sm sm:text-base transition-all ${
            step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            2
          </div>
        </div>

        {/* Card */}
        <div className="card !p-5 sm:!p-8">
          {/* Step 1: User Information */}
          {step === 1 && (
            <>
              <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">إنشاء حساب جديد</h2>
                <p className="text-gray-500 text-sm sm:text-base">أدخل بياناتك الشخصية</p>
              </div>

              <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    الاسم الكامل
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    {...register('fullName')}
                    className={`input-field ${errors.fullName ? 'input-error' : ''}`}
                    placeholder="أدخل اسمك الكامل"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-500">{errors.fullName.message}</p>
                  )}
                </div>

                {/* Email */}
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
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                    رقم الهاتف <span className="text-gray-400">(اختياري)</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    {...register('phone')}
                    className="input-field"
                    placeholder="+216 XX XXX XXX"
                    dir="ltr"
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      {...register('password')}
                      className={`input-field pl-10 ${errors.password ? 'input-error' : ''}`}
                      placeholder="••••••••"
                      dir="ltr"
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

                {/* Confirm Password */}
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

                {/* PIN Code */}
                <div>
                  <label htmlFor="pinCode" className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="flex items-center gap-2">
                      كود العرف (PIN)
                      <span className="group relative">
                        <Info size={16} className="text-gray-400 cursor-help" />
                        <span className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          كود سري 4-6 أرقام لتأكيد العمليات المهمة
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
                  {errors.pinCode && (
                    <p className="mt-1 text-sm text-red-500">{errors.pinCode.message}</p>
                  )}
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-start gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    {...register('acceptTerms')}
                    className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="acceptTerms" className="text-sm text-gray-600">
                    أوافق على{' '}
                    <a href="#" className="text-primary-600 hover:underline">شروط الاستخدام والأحكام</a>
                  </label>
                </div>
                {errors.acceptTerms && (
                  <p className="text-sm text-red-500">{errors.acceptTerms.message}</p>
                )}

                {/* Next Button */}
                <button type="submit" className="btn-primary flex items-center justify-center gap-2 mt-6">
                  <span>التالي</span>
                  <ChevronLeft size={20} />
                </button>
              </form>

              {/* Login Link */}
              <div className="mt-6 text-center">
                <p className="text-gray-500">
                  لديك حساب بالفعل؟{' '}
                  <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                    تسجيل الدخول
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* Step 2: Business Category */}
          {step === 2 && (
            <>
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4"
                >
                  <ArrowLeft size={18} />
                  <span>رجوع</span>
                </button>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">اختر نوع نشاطك التجاري</h2>
                <p className="text-gray-500 text-sm sm:text-base">حدد الفئة الأنسب لعملك</p>
              </div>

              {/* Notification Banner */}
              {notification && (
                <div className={`mb-4 p-4 rounded-xl flex items-start gap-3 ${
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
                    {notification.type === 'success' && <CheckCircle2 size={20} />}
                    {notification.type === 'error' && <XCircle size={20} />}
                    {notification.type === 'warning' && <AlertCircle size={20} />}
                    {notification.type === 'info' && <Info size={20} />}
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

              {/* Category Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
                {businessCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    disabled={isLoading}
                    className={`category-card text-right ${
                      selectedCategory === category.id ? 'selected' : ''
                    }`}
                  >
                    <div className={`mb-3 ${
                      selectedCategory === category.id ? 'text-primary-600' : 'text-gray-400'
                    }`}>
                      {category.icon}
                    </div>
                    <h3 className="font-bold text-gray-800 mb-1">{category.title}</h3>
                    <p className="text-xs text-gray-500 mb-2">{category.description}</p>
                    <p className="text-xs text-gray-400">{category.examples}</p>
                    
                    {selectedCategory === category.id && (
                      <div className="absolute top-3 left-3 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Create Account Button */}
              <button
                type="button"
                onClick={onStep2Submit}
                disabled={isLoading || !selectedCategory}
                className="btn-primary flex items-center justify-center gap-2"
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}

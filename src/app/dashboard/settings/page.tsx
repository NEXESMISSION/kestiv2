'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowRight, Save, Loader2, Eye, EyeOff, 
  User, Lock, KeyRound, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

type NotificationType = 'success' | 'error' | 'warning'

interface Notification {
  type: NotificationType
  message: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notification, setNotification] = useState<Notification | null>(null)
  
  // Form states
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // Check if user is paused - redirect to paused page
      if (profileData?.is_paused) {
        router.push('/paused')
        return
      }

      if (profileData) {
        setProfile(profileData)
        setFullName(profileData.full_name)
        setPhoneNumber(profileData.phone_number || '')
      } else {
        // Fallback to user metadata if profile fetch fails (RLS issue)
        const fallbackProfile: Profile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email || '',
          phone_number: user.user_metadata?.phone_number || null,
          business_mode: user.user_metadata?.business_mode || 'subscription',
          pin_code: user.user_metadata?.pin_code || null,
          role: user.user_metadata?.role || 'user',
          is_active: true,
          is_paused: false,
          pause_reason: null,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setProfile(fallbackProfile)
        setFullName(fallbackProfile.full_name)
        setPhoneNumber(fallbackProfile.phone_number || '')
        
        if (error) {
          console.error('Profile fetch error:', error.message)
        }
      }
      setIsLoading(false)
    }

    loadProfile()
  }, [router])

  const handleUpdateProfile = async () => {
    if (!profile) return
    setIsSaving(true)

    try {
      const supabase = createClient()
      
      // Try to update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_number: phoneNumber || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) {
        // Fallback: Update user metadata if profile update fails
        const { error: metaError } = await supabase.auth.updateUser({
          data: {
            full_name: fullName,
            phone_number: phoneNumber || null
          }
        })
        
        if (metaError) {
          showNotification('error', 'حدث خطأ أثناء تحديث البيانات')
        } else {
          showNotification('success', 'تم تحديث بياناتك بنجاح')
          setProfile({ ...profile, full_name: fullName, phone_number: phoneNumber || null })
        }
      } else {
        showNotification('success', 'تم تحديث بياناتك بنجاح')
        setProfile({ ...profile, full_name: fullName, phone_number: phoneNumber || null })
      }
    } catch {
      showNotification('error', 'حدث خطأ غير متوقع')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showNotification('error', 'كلمتا المرور غير متطابقتين')
      return
    }

    if (newPassword.length < 6) {
      showNotification('error', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    setIsSaving(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        showNotification('error', 'حدث خطأ أثناء تغيير كلمة المرور')
      } else {
        showNotification('success', 'تم تغيير كلمة المرور بنجاح')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      showNotification('error', 'حدث خطأ غير متوقع')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePin = async () => {
    if (!profile) return

    // Verify current PIN (check both profile and metadata)
    const currentStoredPin = profile.pin_code
    if (currentStoredPin && currentPin !== currentStoredPin) {
      showNotification('error', 'كود PIN الحالي غير صحيح')
      return
    }

    if (newPin !== confirmPin) {
      showNotification('error', 'كودا PIN غير متطابقين')
      return
    }

    if (newPin.length < 4 || newPin.length > 6) {
      showNotification('error', 'كود PIN يجب أن يكون 4-6 أرقام')
      return
    }

    if (!/^\d+$/.test(newPin)) {
      showNotification('error', 'كود PIN يجب أن يحتوي على أرقام فقط')
      return
    }

    setIsSaving(true)

    try {
      const supabase = createClient()
      
      // Try to update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({
          pin_code: newPin,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) {
        // Fallback: Update user metadata if profile update fails
        const { error: metaError } = await supabase.auth.updateUser({
          data: { pin_code: newPin }
        })
        
        if (metaError) {
          showNotification('error', 'حدث خطأ أثناء تغيير كود PIN')
        } else {
          showNotification('success', 'تم تغيير كود PIN بنجاح')
          setCurrentPin('')
          setNewPin('')
          setConfirmPin('')
          setProfile({ ...profile, pin_code: newPin })
        }
      } else {
        showNotification('success', 'تم تغيير كود PIN بنجاح')
        setCurrentPin('')
        setNewPin('')
        setConfirmPin('')
        setProfile({ ...profile, pin_code: newPin })
      }
    } catch {
      showNotification('error', 'حدث خطأ غير متوقع')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
              >
                <ArrowRight size={20} />
                <span>رجوع</span>
              </Link>
              <h1 className="text-xl font-bold text-gray-800">الإعدادات</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification */}
        {notification && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200' :
            notification.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className={`flex-shrink-0 ${
              notification.type === 'success' ? 'text-green-500' :
              notification.type === 'error' ? 'text-red-500' :
              'text-yellow-500'
            }`}>
              {notification.type === 'success' && <CheckCircle2 size={20} />}
              {notification.type === 'error' && <XCircle size={20} />}
              {notification.type === 'warning' && <AlertCircle size={20} />}
            </div>
            <p className={`text-sm font-medium ${
              notification.type === 'success' ? 'text-green-700' :
              notification.type === 'error' ? 'text-red-700' :
              'text-yellow-700'
            }`}>
              {notification.message}
            </p>
          </div>
        )}

        {/* Profile Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">المعلومات الشخصية</h2>
              <p className="text-sm text-gray-500">تعديل اسمك ورقم هاتفك</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                الاسم الكامل
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                placeholder="أدخل اسمك الكامل"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                رقم الهاتف
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="input-field"
                placeholder="+216 XX XXX XXX"
                dir="ltr"
              />
            </div>

            <button
              onClick={handleUpdateProfile}
              disabled={isSaving}
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              حفظ التغييرات
            </button>
          </div>
        </div>

        {/* Password Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">تغيير كلمة المرور</h2>
              <p className="text-sm text-gray-500">تأمين حسابك بكلمة مرور جديدة</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="••••••••"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                تأكيد كلمة المرور الجديدة
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                dir="ltr"
              />
            </div>

            <button
              onClick={handleChangePassword}
              disabled={isSaving || !newPassword || !confirmPassword}
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}
              تغيير كلمة المرور
            </button>
          </div>
        </div>

        {/* PIN Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">تغيير كود PIN</h2>
              <p className="text-sm text-gray-500">كود سري لتأكيد العمليات المهمة</p>
            </div>
          </div>

          <div className="space-y-4">
            {profile?.pin_code && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  كود PIN الحالي
                </label>
                <input
                  type="password"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  className="input-field"
                  placeholder="••••"
                  maxLength={6}
                  dir="ltr"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                كود PIN الجديد
              </label>
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="input-field"
                placeholder="••••"
                maxLength={6}
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                تأكيد كود PIN الجديد
              </label>
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="input-field"
                placeholder="••••"
                maxLength={6}
                dir="ltr"
              />
            </div>

            <button
              onClick={handleChangePin}
              disabled={isSaving || !newPin || !confirmPin}
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}
              تغيير كود PIN
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

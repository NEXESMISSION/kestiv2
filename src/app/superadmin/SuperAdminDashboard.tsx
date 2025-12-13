'use client'

import { useState, useEffect } from 'react'
import { 
  Users, LogOut, Search, Loader2, X, RefreshCw,
  PauseCircle, PlayCircle, Timer, Plus, Minus,
  Calendar, Clock, CheckCircle, XCircle, ChevronLeft, Trash2, AlertTriangle,
  Eye, Package, CreditCard, UserCheck, Briefcase, TrendingUp, TrendingDown,
  ShoppingCart, Wallet, FileText, Mail, MessageSquare, Check
} from 'lucide-react'
import { createClient, resetClient } from '@/lib/supabase/client'
import { PullToRefresh } from '@/components/pwa'
import type { Profile, UserRole } from '@/types/database'

// Serialized user type for server-to-client transfer
interface SerializedUser {
  id: string
  email: string
  user_metadata: Record<string, unknown>
}

interface SuperAdminDashboardProps {
  currentUser: SerializedUser
  currentProfile: Profile
}

export default function SuperAdminDashboard({ currentUser, currentProfile }: SuperAdminDashboardProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  
  // Pause Modal
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [pauseReason, setPauseReason] = useState('')
  const [pauseUserId, setPauseUserId] = useState<string | null>(null)
  
  // Subscription Modal
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [subscriptionDays, setSubscriptionDays] = useState(30)
  const [subscriptionMinutes, setSubscriptionMinutes] = useState(0)
  const [subscriptionUserId, setSubscriptionUserId] = useState<string | null>(null)
  
  // Cleanup Modal
  const [showCleanupModal, setShowCleanupModal] = useState(false)
  const [cleanupUserId, setCleanupUserId] = useState<string | null>(null)
  const [cleanupConfirmText, setCleanupConfirmText] = useState('')
  
  // See Through Modal
  const [showSeeThroughModal, setShowSeeThroughModal] = useState(false)
  const [seeThroughUserId, setSeeThroughUserId] = useState<string | null>(null)
  const [seeThroughData, setSeeThroughData] = useState<any>(null)
  const [seeThroughLoading, setSeeThroughLoading] = useState(false)
  const [seeThroughTab, setSeeThroughTab] = useState<'overview' | 'transactions' | 'products' | 'members' | 'freelancer'>('overview')

  // Inquiries Modal
  const [showInquiriesModal, setShowInquiriesModal] = useState(false)
  const [inquiries, setInquiries] = useState<any[]>([])
  const [inquiriesLoading, setInquiriesLoading] = useState(false)
  const [inquiriesError, setInquiriesError] = useState<string | null>(null)

  // Fetch profiles using secure API route
  const fetchProfiles = async () => {
    setIsLoadingProfiles(true)
    setFetchError(null)
    try {
      const response = await fetch('/api/admin/users')
      const result = await response.json()
      
      if (!response.ok) {
        const errorMsg = result.details 
          ? `${result.error}: ${result.details}` 
          : result.error || 'فشل في تحميل المستخدمين'
        setFetchError(errorMsg)
      } else {
        setProfiles(result.profiles || [])
      }
    } catch (err) {
      setFetchError('فشل في الاتصال بالخادم')
    } finally {
      setIsLoadingProfiles(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    resetClient()
    window.location.href = '/login'
  }

  // Pause handlers
  const openPauseModal = (userId: string) => {
    setPauseUserId(userId)
    setPauseReason('')
    setShowPauseModal(true)
  }

  const handlePauseUser = async () => {
    if (!pauseUserId || !pauseReason.trim()) return
    setActionLoading(pauseUserId)
    try {
      // Use secure server-side API instead of direct DB access
      const response = await fetch(`/api/admin/users/${pauseUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'pause', 
          pause_reason: pauseReason.trim() 
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        alert('خطأ: ' + (result.error || 'فشل في إيقاف الحساب'))
        return
      }
      
      setProfiles(prev => prev.map(p => 
        p.id === pauseUserId ? { ...p, is_paused: true, pause_reason: pauseReason.trim() } : p
      ))
      if (selectedUser?.id === pauseUserId) {
        setSelectedUser({ ...selectedUser, is_paused: true, pause_reason: pauseReason.trim() })
      }
    } catch (err) {
      alert('حدث خطأ أثناء إيقاف الحساب')
    } finally {
      setActionLoading(null)
      setShowPauseModal(false)
      setPauseUserId(null)
      setPauseReason('')
    }
  }

  const handleUnpauseUser = async (profileId: string) => {
    setActionLoading(profileId)
    try {
      // Use secure server-side API instead of direct DB access
      const response = await fetch(`/api/admin/users/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unpause' })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        alert('خطأ: ' + (result.error || 'فشل في إلغاء الإيقاف'))
        return
      }
      
      setProfiles(prev => prev.map(p => 
        p.id === profileId ? { ...p, is_paused: false, pause_reason: null } : p
      ))
      if (selectedUser?.id === profileId) {
        setSelectedUser({ ...selectedUser, is_paused: false, pause_reason: null })
      }
    } catch (err) {
      alert('حدث خطأ أثناء إلغاء الإيقاف')
    } finally {
      setActionLoading(null)
    }
  }

  // Subscription handlers
  const openSubscriptionModal = (userId: string, currentDays?: number | null) => {
    setSubscriptionUserId(userId)
    setSubscriptionDays(currentDays || 30)
    setSubscriptionMinutes(0)
    setShowSubscriptionModal(true)
  }

  const handleSetSubscription = async () => {
    if (!subscriptionUserId) return
    setActionLoading(subscriptionUserId)
    try {
      // Use secure server-side API instead of direct DB access
      const response = await fetch(`/api/admin/users/${subscriptionUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'set_subscription',
          days: subscriptionDays,
          minutes: subscriptionMinutes
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        alert('خطأ: ' + (result.error || 'فشل في تعيين الاشتراك'))
        return
      }
      
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + subscriptionDays)
      endDate.setMinutes(endDate.getMinutes() + subscriptionMinutes)
      
      setProfiles(prev => prev.map(p => 
        p.id === subscriptionUserId ? { 
          ...p, 
          subscription_status: 'active' as const,
          subscription_end_date: endDate.toISOString(),
          subscription_days: subscriptionDays
        } : p
      ))
      if (selectedUser?.id === subscriptionUserId) {
        setSelectedUser({ 
          ...selectedUser, 
          subscription_status: 'active',
          subscription_end_date: endDate.toISOString(),
          subscription_days: subscriptionDays
        })
      }
    } catch (err) {
      alert('حدث خطأ أثناء تعيين الاشتراك')
    } finally {
      setActionLoading(null)
      setShowSubscriptionModal(false)
      setSubscriptionUserId(null)
      setSubscriptionDays(30)
      setSubscriptionMinutes(0)
    }
  }

  const handleCancelSubscription = async (profileId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء الاشتراك؟')) return
    setActionLoading(profileId)
    try {
      // Use secure server-side API instead of direct DB access
      const response = await fetch(`/api/admin/users/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_subscription' })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        alert('خطأ: ' + (result.error || 'فشل في إلغاء الاشتراك'))
        return
      }
      
      setProfiles(prev => prev.map(p => 
        p.id === profileId ? { ...p, subscription_status: 'cancelled' as const } : p
      ))
      if (selectedUser?.id === profileId) {
        setSelectedUser({ ...selectedUser, subscription_status: 'cancelled' })
      }
    } catch (err) {
      alert('حدث خطأ أثناء إلغاء الاشتراك')
    } finally {
      setActionLoading(null)
    }
  }

  // Cleanup handlers
  const openCleanupModal = (userId: string) => {
    setCleanupUserId(userId)
    setCleanupConfirmText('')
    setShowCleanupModal(true)
  }

  const handleCleanupUser = async () => {
    if (!cleanupUserId || cleanupConfirmText !== 'تأكيد') return
    setActionLoading(cleanupUserId)
    try {
      const response = await fetch(`/api/admin/users/${cleanupUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        alert('خطأ: ' + (result.error || 'فشل في مسح البيانات'))
        return
      }
      
      alert('تم مسح بيانات المستخدم بنجاح')
      fetchProfiles()
    } catch (err) {
      alert('حدث خطأ أثناء مسح البيانات')
    } finally {
      setActionLoading(null)
      setShowCleanupModal(false)
      setCleanupUserId(null)
      setCleanupConfirmText('')
      setSelectedUser(null)
    }
  }

  // See Through handler
  const handleSeeThrough = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSeeThroughUserId(userId)
    setSeeThroughLoading(true)
    setShowSeeThroughModal(true)
    setSeeThroughTab('overview')
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/details`)
      const result = await response.json()
      
      if (!response.ok) {
        alert('خطأ: ' + (result.error || 'فشل في جلب البيانات'))
        setShowSeeThroughModal(false)
        return
      }
      
      setSeeThroughData(result)
    } catch (err) {
      alert('حدث خطأ أثناء جلب البيانات')
      setShowSeeThroughModal(false)
    } finally {
      setSeeThroughLoading(false)
    }
  }

  const closeSeeThroughModal = () => {
    setShowSeeThroughModal(false)
    setSeeThroughUserId(null)
    setSeeThroughData(null)
  }

  // Inquiries handlers
  const fetchInquiries = async () => {
    setInquiriesLoading(true)
    setInquiriesError(null)
    try {
      const response = await fetch('/api/inquiries')
      const result = await response.json()
      
      if (!response.ok) {
        setInquiriesError(result.error || 'فشل في جلب الاستفسارات')
        return
      }
      
      setInquiries(result.inquiries || [])
    } catch {
      setInquiriesError('فشل في الاتصال بالخادم')
    } finally {
      setInquiriesLoading(false)
    }
  }

  const openInquiriesModal = () => {
    setShowInquiriesModal(true)
    fetchInquiries()
  }

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    try {
      const response = await fetch(`/api/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: isRead })
      })
      
      if (response.ok) {
        setInquiries(prev => prev.map(inq => 
          inq.id === id ? { ...inq, is_read: isRead } : inq
        ))
      }
    } catch {
      // Silently fail
    }
  }

  const handleDeleteInquiry = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الاستفسار؟')) return
    
    try {
      const response = await fetch(`/api/inquiries/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setInquiries(prev => prev.filter(inq => inq.id !== id))
      }
    } catch {
      // Silently fail
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-TN', { style: 'decimal', minimumFractionDigits: 2 }).format(amount) + ' د.ت'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-TN', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  // Helper functions
  const getRemainingTime = (endDate: string | null) => {
    if (!endDate) return null
    const diff = new Date(endDate).getTime() - Date.now()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return { days, hours, minutes, total: Math.floor(diff / (1000 * 60)) }
  }

  const formatRemainingTime = (endDate: string | null): string => {
    const time = getRemainingTime(endDate)
    if (!time) return 'غير محدد'
    if (time.total <= 0) return 'منتهي'
    if (time.days > 0) return `${time.days} يوم ${time.hours > 0 ? `و ${time.hours} ساعة` : ''}`
    if (time.hours > 0) return `${time.hours} ساعة ${time.minutes > 0 ? `و ${time.minutes} دقيقة` : ''}`
    return `${time.minutes} دقيقة`
  }

  const filteredProfiles = profiles.filter(profile => 
    profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.phone_number?.includes(searchQuery) ||
    profile.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: profiles.length,
    // Count 'active' and 'trial' as active subscriptions (both have valid time remaining)
    active: profiles.filter(p => p.subscription_status === 'active' || p.subscription_status === 'trial').length,
    paused: profiles.filter(p => p.is_paused).length
  }

  return (
    <PullToRefresh onRefresh={fetchProfiles}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary-600">KESTI Pro</h1>
              <p className="text-sm text-gray-500">لوحة إدارة المستخدمين</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={openInquiriesModal}
                className="relative flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">الرسائل</span>
                {inquiries.filter(i => !i.is_read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {inquiries.filter(i => !i.is_read).length}
                  </span>
                )}
              </button>
              <span className="text-sm text-gray-600 hidden sm:inline">{currentProfile.full_name}</span>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                خروج
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card !p-4 text-center">
            <Users className="w-8 h-8 text-primary-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{isLoadingProfiles ? '-' : stats.total}</p>
            <p className="text-sm text-gray-500">إجمالي المستخدمين</p>
          </div>
          <div className="card !p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-sm text-gray-500">اشتراك نشط</p>
          </div>
          <div className="card !p-4 text-center">
            <PauseCircle className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">{stats.paused}</p>
            <p className="text-sm text-gray-500">موقوف مؤقتاً</p>
          </div>
        </div>

        {/* Search & Refresh */}
        <div className="card !p-4 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث بالاسم أو رقم الهاتف..."
                className="input-field !pr-10"
              />
            </div>
            <button
              onClick={fetchProfiles}
              disabled={isLoadingProfiles}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingProfiles ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error */}
        {fetchError && (
          <div className="card !p-4 mb-6 bg-red-50 border-red-200">
            <p className="text-red-700">{fetchError}</p>
          </div>
        )}

        {/* Users List */}
        <div className="card !p-0 overflow-hidden">
          {isLoadingProfiles ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
              <p className="text-gray-500 mt-2">جاري التحميل...</p>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">لا يوجد مستخدمين</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredProfiles.map((profile) => {
                const remaining = getRemainingTime(profile.subscription_end_date)
                const isExpired = remaining && remaining.total <= 0
                
                return (
                  <div
                    key={profile.id}
                    onClick={() => setSelectedUser(profile)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                        profile.is_paused ? 'bg-orange-500' : 
                        isExpired ? 'bg-red-500' : 
                        'bg-primary-500'
                      }`}>
                        {profile.full_name.charAt(0)}
                      </div>
                      
                      {/* Info */}
                      <div>
                        <p className="font-medium text-gray-800">{profile.full_name}</p>
                        <p className="text-xs text-primary-600 font-mono">{profile.email || 'بدون بريد'}</p>
                        <p className="text-sm text-gray-500">{profile.phone_number || 'بدون رقم'}</p>
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-2">
                      {/* See Through Button */}
                      <button
                        onClick={(e) => handleSeeThrough(profile.id, e)}
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                        title="عرض التفاصيل الكاملة"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {profile.is_paused ? (
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full">
                          موقوف
                        </span>
                      ) : isExpired ? (
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full">
                          منتهي
                        </span>
                      ) : remaining ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                          {formatRemainingTime(profile.subscription_end_date)}
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                          غير محدد
                        </span>
                      )}
                      <ChevronLeft className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* User Detail Panel */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedUser(null)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={`p-6 text-white ${
              selectedUser.is_paused ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
              getRemainingTime(selectedUser.subscription_end_date)?.total! <= 0 ? 'bg-gradient-to-r from-red-500 to-rose-500' :
              'bg-gradient-to-r from-primary-500 to-primary-600'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
                <span className="text-sm opacity-80">تفاصيل المستخدم</span>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-3">
                  {selectedUser.full_name.charAt(0)}
                </div>
                <h3 className="text-xl font-bold">{selectedUser.full_name}</h3>
                <p className="text-white/90 text-xs font-mono">{selectedUser.email || 'بدون بريد'}</p>
                <p className="text-white/80 text-sm">{selectedUser.phone_number || 'بدون رقم'}</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Subscription Status */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">حالة الاشتراك</span>
                  {selectedUser.subscription_end_date && (
                    <span className={`text-sm font-medium ${
                      getRemainingTime(selectedUser.subscription_end_date)?.total! > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatRemainingTime(selectedUser.subscription_end_date)}
                    </span>
                  )}
                </div>
                {selectedUser.subscription_end_date && (
                  <p className="text-xs text-gray-400">
                    ينتهي: {new Date(selectedUser.subscription_end_date).toLocaleString('ar-TN')}
                  </p>
                )}
              </div>

              {/* Pause Banner */}
              {selectedUser.is_paused && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                  <p className="text-orange-700 font-medium text-sm mb-1">الحساب موقوف</p>
                  <p className="text-orange-600 text-sm">{selectedUser.pause_reason}</p>
                </div>
              )}

              {/* Actions */}
              {selectedUser.id !== currentProfile.id && (
                <div className="space-y-3 pt-2">
                  {/* Subscription Button */}
                  <button
                    onClick={() => openSubscriptionModal(selectedUser.id, selectedUser.subscription_days)}
                    disabled={actionLoading === selectedUser.id}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors"
                  >
                    <Timer className="w-5 h-5" />
                    تعيين مدة الاشتراك
                  </button>

                  {/* Pause/Unpause Button */}
                  {selectedUser.is_paused ? (
                    <button
                      onClick={() => handleUnpauseUser(selectedUser.id)}
                      disabled={actionLoading === selectedUser.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors"
                    >
                      {actionLoading === selectedUser.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                      إلغاء الإيقاف
                    </button>
                  ) : (
                    <button
                      onClick={() => openPauseModal(selectedUser.id)}
                      disabled={actionLoading === selectedUser.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors"
                    >
                      <PauseCircle className="w-5 h-5" />
                      إيقاف مؤقت
                    </button>
                  )}

                  {/* Cancel Subscription */}
                  {selectedUser.subscription_status === 'active' && (
                    <button
                      onClick={() => handleCancelSubscription(selectedUser.id)}
                      disabled={actionLoading === selectedUser.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                      إلغاء الاشتراك
                    </button>
                  )}
                  
                  {/* Cleanup User Data */}
                  <button
                    onClick={() => openCleanupModal(selectedUser.id)}
                    disabled={actionLoading === selectedUser.id}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors border border-red-200"
                  >
                    <Trash2 className="w-5 h-5" />
                    مسح بيانات المستخدم
                  </button>
                </div>
              )}

              {selectedUser.id === currentProfile.id && (
                <div className="p-4 bg-primary-50 text-primary-700 rounded-xl text-center">
                  <p className="text-sm">هذا هو حسابك</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-white">
              <h3 className="text-lg font-bold">إيقاف الحساب مؤقتاً</h3>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">سبب الإيقاف</label>
              <textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="أدخل سبب إيقاف الحساب..."
                className="input-field min-h-[100px] resize-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  onClick={handlePauseUser}
                  disabled={!pauseReason.trim() || actionLoading === pauseUserId}
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-xl"
                >
                  {actionLoading === pauseUserId ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'إيقاف'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white">
              <h3 className="text-lg font-bold">تعيين مدة الاشتراك</h3>
            </div>
            <div className="p-5">
              {/* Days Input */}
              <label className="block text-sm font-medium text-gray-700 mb-2">عدد الأيام</label>
              <div className="flex items-center gap-3 mb-4">
                <button onClick={() => setSubscriptionDays(d => d - 1)} className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center">
                  <Minus className="w-5 h-5" />
                </button>
                <input
                  type="number"
                  value={subscriptionDays}
                  onChange={(e) => setSubscriptionDays(parseInt(e.target.value) || 0)}
                  className="flex-1 input-field text-center text-2xl font-bold"
                />
                <button onClick={() => setSubscriptionDays(d => d + 1)} className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Select */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[0, 7, 30, 365].map(d => (
                  <button
                    key={d}
                    onClick={() => { setSubscriptionDays(d); setSubscriptionMinutes(0); }}
                    className={`py-2 rounded-lg text-sm ${subscriptionDays === d ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {d === 0 ? 'منتهي' : d === 7 ? 'أسبوع' : d === 30 ? 'شهر' : 'سنة'}
                  </button>
                ))}
              </div>

              {/* Minutes for Testing */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl mb-4">
                <label className="block text-xs font-medium text-yellow-700 mb-2">🧪 للاختبار: دقائق</label>
                <div className="flex gap-2">
                  {[1, 2, 5, 10].map(m => (
                    <button
                      key={m}
                      onClick={() => { setSubscriptionDays(0); setSubscriptionMinutes(m); }}
                      className="flex-1 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm"
                    >
                      {m}د
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 bg-gray-50 rounded-xl mb-4 text-center">
                <p className="text-xs text-gray-500 mb-1">تاريخ الانتهاء</p>
                <p className="font-medium text-gray-800">
                  {new Date(Date.now() + (subscriptionDays * 86400000) + (subscriptionMinutes * 60000)).toLocaleString('ar-TN')}
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowSubscriptionModal(false)} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl">
                  إلغاء
                </button>
                <button
                  onClick={handleSetSubscription}
                  disabled={actionLoading === subscriptionUserId}
                  className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl flex items-center justify-center gap-2"
                >
                  {actionLoading === subscriptionUserId ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> تأكيد</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cleanup Modal */}
      {showCleanupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-5 text-white">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-lg font-bold">مسح بيانات المستخدم</h3>
              </div>
            </div>
            <div className="p-5">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
                <p className="text-red-700 text-sm font-medium mb-2">⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!</p>
                <p className="text-red-600 text-xs">سيتم مسح جميع البيانات:</p>
                <ul className="text-red-600 text-xs mt-1 mr-4 list-disc">
                  <li>الأعضاء والعملاء</li>
                  <li>المشاريع والمعاملات</li>
                  <li>المنتجات والخدمات</li>
                  <li>السجلات المالية</li>
                </ul>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  للتأكيد، اكتب تأكيد
                </label>
                <input
                  type="text"
                  value={cleanupConfirmText}
                  onChange={(e) => setCleanupConfirmText(e.target.value)}
                  placeholder="تأكيد"
                  className="input-field text-center"
                  dir="rtl"
                />
              </div>
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setShowCleanupModal(false); setCleanupConfirmText(''); }}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCleanupUser}
                  disabled={cleanupConfirmText !== 'تأكيد' || actionLoading === cleanupUserId}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-xl flex items-center justify-center gap-2"
                >
                  {actionLoading === cleanupUserId ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Trash2 className="w-5 h-5" /> مسح</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* See Through Modal - Full Account Details */}
      {showSeeThroughModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/50" onClick={closeSeeThroughModal}>
          <div className="w-full max-w-4xl max-h-[95vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <button onClick={closeSeeThroughModal} className="p-2 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  <span className="font-bold">عرض شامل للحساب</span>
                </div>
                <div className="w-9" />
              </div>
              {seeThroughData?.profile && (
                <div className="mt-3 text-center">
                  <p className="text-lg font-bold">{seeThroughData.profile.full_name}</p>
                  <p className="text-white/80 text-sm">{seeThroughData.profile.email || seeThroughData.profile.phone_number}</p>
                  <p className="text-white/60 text-xs mt-1">نوع النشاط: {
                    seeThroughData.profile.business_mode === 'subscription' ? 'اشتراكات' :
                    seeThroughData.profile.business_mode === 'retail' ? 'بيع بالتجزئة' :
                    seeThroughData.profile.business_mode === 'freelancer' ? 'عمل حر' : 'خدمات'
                  }</p>
                </div>
              )}
            </div>

            {/* Loading State */}
            {seeThroughLoading ? (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-500">جاري تحميل البيانات...</p>
                </div>
              </div>
            ) : seeThroughData ? (
              <>
                {/* Tabs */}
                <div className="flex border-b bg-gray-50 overflow-x-auto flex-shrink-0">
                  {[
                    { id: 'overview', label: 'نظرة عامة', icon: FileText },
                    { id: 'transactions', label: 'المعاملات', icon: CreditCard },
                    { id: 'products', label: 'المنتجات', icon: Package },
                    { id: 'members', label: 'الأعضاء', icon: UserCheck },
                    { id: 'freelancer', label: 'العمل الحر', icon: Briefcase }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSeeThroughTab(tab.id as any)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                        seeThroughTab === tab.id 
                          ? 'border-blue-500 text-blue-600 bg-white' 
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Overview Tab */}
                  {seeThroughTab === 'overview' && (
                    <div className="space-y-4">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                          <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
                          <p className="text-xs text-green-600 mb-1">إجمالي الإيرادات</p>
                          <p className="text-lg font-bold text-green-700">{formatCurrency(seeThroughData.stats?.totalRevenue || 0)}</p>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                          <TrendingDown className="w-6 h-6 text-red-600 mx-auto mb-2" />
                          <p className="text-xs text-red-600 mb-1">إجمالي المصروفات</p>
                          <p className="text-lg font-bold text-red-700">{formatCurrency(seeThroughData.stats?.totalExpenses || 0)}</p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                          <Wallet className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                          <p className="text-xs text-blue-600 mb-1">صافي الربح</p>
                          <p className="text-lg font-bold text-blue-700">{formatCurrency(seeThroughData.stats?.netProfit || 0)}</p>
                        </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                          <ShoppingCart className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                          <p className="text-xs text-purple-600 mb-1">عدد المعاملات</p>
                          <p className="text-lg font-bold text-purple-700">{seeThroughData.stats?.transactionsCount || 0}</p>
                        </div>
                      </div>

                      {/* Counts Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-gray-800">{seeThroughData.stats?.membersCount || 0}</p>
                          <p className="text-xs text-gray-500">أعضاء</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-gray-800">{seeThroughData.stats?.productsCount || 0}</p>
                          <p className="text-xs text-gray-500">منتجات</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-gray-800">{seeThroughData.stats?.servicesCount || 0}</p>
                          <p className="text-xs text-gray-500">خدمات</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-gray-800">{seeThroughData.stats?.freelancerClientsCount || 0}</p>
                          <p className="text-xs text-gray-500">عملاء حر</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-gray-800">{seeThroughData.stats?.freelancerProjectsCount || 0}</p>
                          <p className="text-xs text-gray-500">مشاريع</p>
                        </div>
                      </div>

                      {/* Account Info */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          معلومات الحساب
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="text-gray-500">الاسم:</span> <span className="font-medium">{seeThroughData.profile?.full_name}</span></div>
                          <div><span className="text-gray-500">البريد:</span> <span className="font-medium font-mono text-xs">{seeThroughData.profile?.email || '-'}</span></div>
                          <div><span className="text-gray-500">الهاتف:</span> <span className="font-medium">{seeThroughData.profile?.phone_number || '-'}</span></div>
                          <div><span className="text-gray-500">تاريخ التسجيل:</span> <span className="font-medium">{formatDate(seeThroughData.profile?.created_at)}</span></div>
                          <div><span className="text-gray-500">حالة الاشتراك:</span> <span className={`font-medium ${seeThroughData.profile?.subscription_status === 'active' ? 'text-green-600' : 'text-red-600'}`}>{seeThroughData.profile?.subscription_status === 'active' ? 'نشط' : 'غير نشط'}</span></div>
                          <div><span className="text-gray-500">موقوف:</span> <span className={`font-medium ${seeThroughData.profile?.is_paused ? 'text-orange-600' : 'text-green-600'}`}>{seeThroughData.profile?.is_paused ? 'نعم' : 'لا'}</span></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transactions Tab */}
                  {seeThroughTab === 'transactions' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-800">المعاملات ({seeThroughData.data?.transactions?.length || 0})</h4>
                      </div>
                      {seeThroughData.data?.transactions?.length > 0 ? (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {seeThroughData.data.transactions.map((t: any) => (
                            <div key={t.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-800">{t.type === 'sale' ? 'بيع' : t.type === 'subscription' ? 'اشتراك' : t.type}</p>
                                <p className="text-xs text-gray-500">{formatDate(t.created_at)}</p>
                                {t.notes && <p className="text-xs text-gray-400 mt-1">{t.notes}</p>}
                              </div>
                              <div className="text-left">
                                <p className={`font-bold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrency(t.amount)}
                                </p>
                                <p className="text-xs text-gray-500">{t.payment_method === 'cash' ? 'نقدي' : t.payment_method === 'card' ? 'بطاقة' : t.payment_method}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>لا توجد معاملات</p>
                        </div>
                      )}

                      {/* Expenses */}
                      <h4 className="font-bold text-gray-800 mt-6 mb-2">المصروفات ({seeThroughData.data?.expenses?.length || 0})</h4>
                      {seeThroughData.data?.expenses?.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {seeThroughData.data.expenses.map((e: any) => (
                            <div key={e.id} className="bg-red-50 rounded-lg p-3 flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-800">{e.category}</p>
                                <p className="text-xs text-gray-500">{formatDate(e.date || e.created_at)}</p>
                                {e.notes && <p className="text-xs text-gray-400 mt-1">{e.notes}</p>}
                              </div>
                              <p className="font-bold text-red-600">-{formatCurrency(e.amount)}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">لا توجد مصروفات</div>
                      )}
                    </div>
                  )}

                  {/* Products Tab */}
                  {seeThroughTab === 'products' && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-gray-800 mb-2">المنتجات ({seeThroughData.data?.products?.length || 0})</h4>
                      {seeThroughData.data?.products?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {seeThroughData.data.products.map((p: any) => (
                            <div key={p.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-gray-800">{p.name}</p>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                  {p.is_active ? 'نشط' : 'غير نشط'}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div><span className="text-gray-500">السعر:</span> <span className="font-medium">{formatCurrency(p.price)}</span></div>
                                <div><span className="text-gray-500">التكلفة:</span> <span className="font-medium">{formatCurrency(p.cost || 0)}</span></div>
                                <div><span className="text-gray-500">المخزون:</span> <span className="font-medium">{p.stock ?? '-'}</span></div>
                              </div>
                              {p.category && <p className="text-xs text-gray-400 mt-1">التصنيف: {p.category}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>لا توجد منتجات</p>
                        </div>
                      )}

                      {/* Services */}
                      <h4 className="font-bold text-gray-800 mt-6 mb-2">الخدمات ({seeThroughData.data?.services?.length || 0})</h4>
                      {seeThroughData.data?.services?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {seeThroughData.data.services.map((s: any) => (
                            <div key={s.id} className="bg-blue-50 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-800">{s.name}</p>
                                <p className="font-bold text-blue-600">{formatCurrency(s.price)}</p>
                              </div>
                              {s.description && <p className="text-xs text-gray-500 mt-1">{s.description}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">لا توجد خدمات</div>
                      )}

                      {/* Subscription Plans */}
                      <h4 className="font-bold text-gray-800 mt-6 mb-2">خطط الاشتراك ({seeThroughData.data?.subscriptionPlans?.length || 0})</h4>
                      {seeThroughData.data?.subscriptionPlans?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {seeThroughData.data.subscriptionPlans.map((plan: any) => (
                            <div key={plan.id} className="bg-purple-50 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-800">{plan.name}</p>
                                <p className="font-bold text-purple-600">{formatCurrency(plan.price)}</p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {plan.duration_days > 0 ? `${plan.duration_days} يوم` : plan.sessions > 0 ? `${plan.sessions} حصة` : 'غير محدد'}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">لا توجد خطط</div>
                      )}
                    </div>
                  )}

                  {/* Members Tab */}
                  {seeThroughTab === 'members' && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-gray-800 mb-2">الأعضاء ({seeThroughData.data?.members?.length || 0})</h4>
                      {seeThroughData.data?.members?.length > 0 ? (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                          {seeThroughData.data.members.map((m: any) => (
                            <div key={m.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold">
                                    {m.name?.charAt(0) || '?'}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-800">{m.name}</p>
                                    <p className="text-xs text-gray-500">{m.phone}</p>
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  m.is_frozen ? 'bg-blue-100 text-blue-700' :
                                  m.expires_at && new Date(m.expires_at) < new Date() ? 'bg-red-100 text-red-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {m.is_frozen ? 'مجمد' : m.expires_at && new Date(m.expires_at) < new Date() ? 'منتهي' : 'نشط'}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div><span className="text-gray-500">الخطة:</span> <span className="font-medium">{m.plan_name || '-'}</span></div>
                                <div><span className="text-gray-500">الدين:</span> <span className={`font-medium ${m.debt > 0 ? 'text-red-600' : ''}`}>{formatCurrency(m.debt || 0)}</span></div>
                                <div><span className="text-gray-500">الانتهاء:</span> <span className="font-medium">{m.expires_at ? formatDate(m.expires_at) : '-'}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>لا يوجد أعضاء</p>
                        </div>
                      )}

                      {/* Subscription History */}
                      <h4 className="font-bold text-gray-800 mt-6 mb-2">سجل الاشتراكات ({seeThroughData.data?.subscriptionHistory?.length || 0})</h4>
                      {seeThroughData.data?.subscriptionHistory?.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {seeThroughData.data.subscriptionHistory.slice(0, 50).map((h: any) => (
                            <div key={h.id} className="bg-gray-50 rounded-lg p-2 text-xs flex items-center justify-between">
                              <div>
                                <span className="font-medium">{h.type === 'subscription' ? 'تجديد' : h.type === 'session_use' ? 'استخدام حصة' : h.type}</span>
                                <span className="text-gray-400 mr-2">{formatDate(h.created_at)}</span>
                              </div>
                              {h.amount > 0 && <span className="text-green-600 font-medium">{formatCurrency(h.amount)}</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">لا يوجد سجل</div>
                      )}
                    </div>
                  )}

                  {/* Freelancer Tab */}
                  {seeThroughTab === 'freelancer' && (
                    <div className="space-y-3">
                      {/* Freelancer Clients */}
                      <h4 className="font-bold text-gray-800 mb-2">عملاء العمل الحر ({seeThroughData.data?.freelancerClients?.length || 0})</h4>
                      {seeThroughData.data?.freelancerClients?.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {seeThroughData.data.freelancerClients.map((c: any) => (
                            <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-gray-800">{c.name}</p>
                                <span className="text-xs text-gray-500">{c.projects_count || 0} مشاريع</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div><span className="text-gray-500">المدفوع:</span> <span className="font-medium text-green-600">{formatCurrency(c.total_spent || 0)}</span></div>
                                <div><span className="text-gray-500">المستحق:</span> <span className="font-medium text-red-600">{formatCurrency(c.total_credit || 0)}</span></div>
                              </div>
                              {c.phone && <p className="text-xs text-gray-400 mt-1">{c.phone}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-30" />
                          <p>لا يوجد عملاء</p>
                        </div>
                      )}

                      {/* Freelancer Projects */}
                      <h4 className="font-bold text-gray-800 mt-6 mb-2">المشاريع ({seeThroughData.data?.freelancerProjects?.length || 0})</h4>
                      {seeThroughData.data?.freelancerProjects?.length > 0 ? (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {seeThroughData.data.freelancerProjects.map((p: any) => (
                            <div key={p.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-gray-800">{p.title}</p>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  p.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  p.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                  p.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {p.status === 'completed' ? 'مكتمل' : p.status === 'in_progress' ? 'جاري' : p.status === 'cancelled' ? 'ملغي' : 'معلق'}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div><span className="text-gray-500">الإجمالي:</span> <span className="font-medium">{formatCurrency(p.total_price || 0)}</span></div>
                                <div><span className="text-gray-500">المدفوع:</span> <span className="font-medium text-green-600">{formatCurrency(p.paid_amount || 0)}</span></div>
                                <div><span className="text-gray-500">المتبقي:</span> <span className="font-medium text-red-600">{formatCurrency(p.remaining || 0)}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">لا توجد مشاريع</div>
                      )}

                      {/* Freelancer Payments */}
                      <h4 className="font-bold text-gray-800 mt-6 mb-2">المدفوعات ({seeThroughData.data?.freelancerPayments?.length || 0})</h4>
                      {seeThroughData.data?.freelancerPayments?.length > 0 ? (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {seeThroughData.data.freelancerPayments.slice(0, 30).map((p: any) => (
                            <div key={p.id} className="bg-green-50 rounded-lg p-2 text-xs flex items-center justify-between">
                              <div>
                                <span className="font-medium">{p.payment_type === 'full' ? 'دفعة كاملة' : p.payment_type === 'deposit' ? 'عربون' : 'دفعة جزئية'}</span>
                                <span className="text-gray-400 mr-2">{formatDate(p.created_at)}</span>
                              </div>
                              <span className="text-green-600 font-bold">{formatCurrency(p.amount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">لا توجد مدفوعات</div>
                      )}

                      {/* Freelancer Expenses */}
                      <h4 className="font-bold text-gray-800 mt-6 mb-2">مصروفات العمل الحر ({seeThroughData.data?.freelancerExpenses?.length || 0})</h4>
                      {seeThroughData.data?.freelancerExpenses?.length > 0 ? (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {seeThroughData.data.freelancerExpenses.slice(0, 30).map((e: any) => (
                            <div key={e.id} className="bg-red-50 rounded-lg p-2 text-xs flex items-center justify-between">
                              <div>
                                <span className="font-medium">{e.category}</span>
                                <span className="text-gray-400 mr-2">{formatDate(e.date)}</span>
                                {e.description && <span className="text-gray-500 mr-2">- {e.description}</span>}
                              </div>
                              <span className="text-red-600 font-bold">-{formatCurrency(e.amount)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 text-sm">لا توجد مصروفات</div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Inquiries Modal */}
      {showInquiriesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowInquiriesModal(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6" />
                <div>
                  <h3 className="text-lg font-bold">استفسارات الموقع</h3>
                  <p className="text-sm text-white/80">{inquiries.length} رسالة</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchInquiries}
                  disabled={inquiriesLoading}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 ${inquiriesLoading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setShowInquiriesModal(false)} className="p-2 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {inquiriesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
              ) : inquiriesError ? (
                <div className="text-center py-12">
                  <p className="text-red-600">{inquiriesError}</p>
                  <button onClick={fetchInquiries} className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg">
                    إعادة المحاولة
                  </button>
                </div>
              ) : inquiries.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">لا توجد استفسارات</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inquiries.map((inquiry) => (
                    <div 
                      key={inquiry.id} 
                      className={`p-4 rounded-xl border transition-all ${
                        inquiry.is_read 
                          ? 'bg-gray-50 border-gray-200' 
                          : 'bg-primary-50 border-primary-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-gray-800">{inquiry.name}</span>
                            {!inquiry.is_read && (
                              <span className="px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">جديد</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-2">
                            <span>{inquiry.phone}</span>
                            {inquiry.email && <span>{inquiry.email}</span>}
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{inquiry.message}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(inquiry.created_at).toLocaleString('ar-TN')}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleMarkAsRead(inquiry.id, !inquiry.is_read)}
                            className={`p-2 rounded-lg transition-colors ${
                              inquiry.is_read 
                                ? 'bg-gray-200 hover:bg-gray-300 text-gray-600' 
                                : 'bg-green-100 hover:bg-green-200 text-green-600'
                            }`}
                            title={inquiry.is_read ? 'تحديد كغير مقروء' : 'تحديد كمقروء'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteInquiry(inquiry.id)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  )
}

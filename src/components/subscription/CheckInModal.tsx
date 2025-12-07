'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Clock, Phone, CreditCard, AlertTriangle, XCircle, RefreshCw, X, Pause, Play, Ticket, Plus, Zap, Package, Calendar } from 'lucide-react'
import { Member } from '@/types/database'
import { getMemberStatus, getMemberPlanType, getSessionsRemaining, isSingleSessionUsed } from '@/lib/utils/member'

interface SubscriptionHistoryItem {
  id: string
  type: string
  sessions_before: number
  sessions_after: number
  notes: string | null
  created_at: string
}

interface CheckInModalProps {
  member: Member | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (member: Member) => void
  onRenew?: (member: Member) => void
  onFreeze?: (member: Member, reason: string) => void
  onUnfreeze?: (member: Member) => void
  onAddSession?: (member: Member, sessions: number, paymentMethod: 'cash' | 'debt') => void
  onUseSession?: (member: Member) => void
  sessionHistory?: SubscriptionHistoryItem[]
}

// Get detailed time remaining
function getTimeRemaining(expiresAt: string): { text: string; detailed: string } {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  // Check if unlimited (more than 50 years)
  if (days > 18250) {
    return { text: 'غير محدود', detailed: 'unlimited' }
  }
  
  if (diff < 0) {
    const absDays = Math.abs(days)
    const absHours = Math.abs(hours)
    const absMinutes = Math.abs(minutes)
    if (absDays > 0) {
      return { text: `منتهي منذ ${absDays} يوم`, detailed: `منتهي` }
    } else if (absHours > 0) {
      return { text: `منتهي منذ ${absHours} ساعة`, detailed: `منتهي` }
    } else {
      return { text: `منتهي منذ ${absMinutes} دقيقة`, detailed: `منتهي` }
    }
  }
  
  if (days > 0) {
    return { 
      text: `${days} يوم ${hours} ساعة ${minutes} دقيقة`,
      detailed: `${days}d ${hours}h ${minutes}m`
    }
  } else if (hours > 0) {
    return { 
      text: `${hours} ساعة ${minutes} دقيقة`,
      detailed: `${hours}h ${minutes}m`
    }
  } else if (minutes > 0) {
    return { 
      text: `${minutes} دقيقة ${seconds} ثانية`,
      detailed: `${minutes}m ${seconds}s`
    }
  } else {
    return { 
      text: `${seconds} ثانية`,
      detailed: `${seconds}s`
    }
  }
}

export default function CheckInModal({
  member,
  isOpen,
  onClose,
  onConfirm,
  onRenew,
  onFreeze,
  onUnfreeze,
  onAddSession,
  onUseSession,
  sessionHistory = []
}: CheckInModalProps) {
  const [showFreezeInput, setShowFreezeInput] = useState(false)
  const [freezeReason, setFreezeReason] = useState('')
  const [timeRemaining, setTimeRemaining] = useState({ text: '', detailed: '' })

  // Real-time countdown
  useEffect(() => {
    if (!member || !member.expires_at) return
    setTimeRemaining(getTimeRemaining(member.expires_at))
    
    const planType = getMemberPlanType(member)
    const status = getMemberStatus(member)
    
    // Only update in real-time for subscriptions that aren't expired
    if (planType !== 'subscription' || status === 'expired') return
    
    const interval = setInterval(() => {
      if (member.expires_at) setTimeRemaining(getTimeRemaining(member.expires_at))
    }, 1000)
    
    return () => clearInterval(interval)
  }, [member])

  if (!isOpen || !member) return null

  const planType = getMemberPlanType(member)
  const status = getMemberStatus(member)
  const isExpired = status === 'expired'
  const isExpiringSoon = status === 'expiring_soon'
  const isFrozen = status === 'frozen'
  const isSingle = planType === 'single'
  const isPackage = planType === 'package'
  const isSubscription = planType === 'subscription'
  const sessionsLeft = getSessionsRemaining(member)
  const singleUsed = isSingleSessionUsed(member)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-TN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const statusConfig = {
    expired: { bg: 'bg-red-500', label: 'منتهي', icon: XCircle },
    expiring_soon: { bg: 'bg-yellow-500', label: 'ينتهي قريباً', icon: AlertTriangle },
    active: { bg: 'bg-green-500', label: 'نشط', icon: CheckCircle },
    frozen: { bg: 'bg-blue-500', label: 'مجمد', icon: Pause }
  }

  const config = statusConfig[status]
  const StatusIcon = config.icon

  const handleConfirmAndClose = () => {
    if (!isExpired && !isFrozen) {
      onConfirm(member)
    }
    onClose()
  }

  const handleFreeze = () => {
    if (onFreeze && freezeReason.trim()) {
      onFreeze(member, freezeReason)
      setShowFreezeInput(false)
      setFreezeReason('')
      onClose()
    }
  }

  const handleUnfreeze = () => {
    if (onUnfreeze) {
      onUnfreeze(member)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative">
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 left-4 z-10 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className={`p-8 ${config.bg} text-center relative`}>
          <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
            <StatusIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">
            {member.name}
          </h2>
          <p className="text-white/80">{member.member_code || member.phone}</p>
        </div>

        {/* Content */}
        <div className="p-6" dir="rtl">
          {/* Status Badge with detailed time/sessions */}
          <div className="flex flex-col items-center mb-6">
            {/* SINGLE SESSION Display */}
            {isSingle ? (
              <>
                <span className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${
                  singleUsed ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-700'
                }`}>
                  <Zap className="w-4 h-4" />
                  حصة واحدة
                </span>
                <div className="mt-3 text-center">
                  <div className={`text-2xl font-bold ${singleUsed ? 'text-gray-500' : 'text-orange-600'}`}>
                    {singleUsed ? '✓ مستخدمة' : '⚡ متاحة'}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {singleUsed ? 'اشتري حصة جديدة' : 'جاهز للدخول'}
                  </div>
                </div>
              </>
            ) : isPackage ? (
              <>
                <span className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${
                  sessionsLeft === 0 ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  <Package className="w-4 h-4" />
                  باقة حصص
                </span>
                <div className="mt-3 text-center">
                  <div className={`text-3xl font-bold ${sessionsLeft === 0 ? 'text-red-600' : 'text-purple-600'}`}>
                    {sessionsLeft}
                  </div>
                  <div className="text-sm text-gray-500">
                    {sessionsLeft === 0 ? 'لا حصص متبقية' : 'حصص متبقية'}
                  </div>
                </div>
              </>
            ) : (
              <>
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                  isExpired ? 'bg-red-100 text-red-700' :
                  isExpiringSoon ? 'bg-yellow-100 text-yellow-700' :
                  isFrozen ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {config.label}
                </span>
                {!isFrozen && (
                  <div className="mt-2 text-center">
                    <div className={`text-lg font-bold ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : 'text-green-600'}`}>
                      {timeRemaining.text}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Member Details */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                الخطة
              </span>
              <span className="font-bold text-gray-900">{member.plan_name || 'غير محدد'}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                الهاتف
              </span>
              <span className="font-bold text-gray-900" dir="ltr">{member.phone}</span>
            </div>

            {/* Show expiry date only for time-based subscriptions */}
            {isSubscription && member.expires_at && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-500 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  تاريخ الانتهاء
                </span>
                <span className={`font-bold ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : 'text-gray-900'}`}>
                  {formatDate(member.expires_at)}
                </span>
              </div>
            )}

            {/* Session count for package members */}
            {isPackage && (
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                <span className="text-purple-600 flex items-center gap-2">
                  <Ticket className="w-4 h-4" />
                  الحصص
                </span>
                <span className="font-bold text-purple-700">
                  {member.sessions_used} / {member.sessions_total}
                </span>
              </div>
            )}

            {member.debt > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                <span className="text-red-600">الدين</span>
                <span className="font-bold text-red-700">{member.debt.toFixed(3)} DT</span>
              </div>
            )}
          </div>

          {/* Session History for session-based members */}
          {(isSingle || isPackage) && sessionHistory.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                سجل الحصص
              </h4>
              <div className="bg-gray-50 rounded-xl p-3 max-h-32 overflow-y-auto space-y-2">
                {sessionHistory.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className={`${item.type === 'session_use' ? 'text-red-600' : 'text-green-600'}`}>
                      {item.type === 'session_use' ? '- استخدام حصة' : item.type === 'session_add' ? '+ إضافة حصة' : '+ اشتراك جديد'}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {new Date(item.created_at).toLocaleDateString('ar-TN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning for expired - Different for each plan type */}
          {isSubscription && isExpired && (
            <div className="p-4 rounded-xl mb-6 bg-red-100 border-2 border-red-300">
              <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                <XCircle className="w-5 h-5" />
                <span>الاشتراك منتهي!</span>
              </div>
              <p className="text-sm text-red-600">
                ⛔ يجب تجديد الاشتراك للدخول.
              </p>
            </div>
          )}

          {/* Single Session Used - Special Message (NOT "منتهي") */}
          {isSingle && singleUsed && (
            <div className="p-4 rounded-xl mb-6 bg-gray-100 border-2 border-gray-300">
              <div className="flex items-center gap-2 text-gray-700 font-bold mb-2">
                <Zap className="w-5 h-5" />
                <span>تم استخدام الحصة</span>
              </div>
              <p className="text-sm text-gray-600">
                هذه الحصة مستخدمة بالفعل. اشتري حصة جديدة للدخول.
              </p>
            </div>
          )}

          {/* Package Empty */}
          {isPackage && sessionsLeft <= 0 && (
            <div className="p-4 rounded-xl mb-6 bg-purple-100 border-2 border-purple-300">
              <div className="flex items-center gap-2 text-purple-700 font-bold mb-2">
                <Package className="w-5 h-5" />
                <span>لا حصص متبقية</span>
              </div>
              <p className="text-sm text-purple-600">
                اشتري باقة جديدة أو أضف حصص إضافية.
              </p>
            </div>
          )}

          {/* Warning for expiring soon */}
          {isExpiringSoon && !isExpired && (
            <div className="p-4 rounded-xl mb-6 bg-yellow-50 border border-yellow-200">
              <p className="text-sm text-yellow-700">
                ⚠️ اشتراك هذا العضو سينتهي قريباً. يُنصح بالتجديد.
              </p>
            </div>
          )}

          {/* Freeze reason input */}
          {showFreezeInput && (
            <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <label className="block text-sm font-medium text-blue-700 mb-2">سبب الإيقاف</label>
              <textarea
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                placeholder="مثال: سفر، مرض، ظروف شخصية..."
                className="w-full px-3 py-2 border rounded-lg text-sm"
                rows={2}
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleFreeze}
                  disabled={!freezeReason.trim()}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium"
                >
                  تأكيد الإيقاف
                </button>
                <button
                  onClick={() => { setShowFreezeInput(false); setFreezeReason('') }}
                  className="px-4 py-2 bg-gray-200 rounded-lg text-sm"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          {/* Renew button for expired subscriptions */}
          {isSubscription && isExpired && onRenew && (
            <button
              onClick={() => onRenew(member)}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-3 shadow-lg shadow-red-600/30"
            >
              <RefreshCw className="w-6 h-6" />
              تجديد الاشتراك
            </button>
          )}

          {/* Unfreeze button for frozen members */}
          {isFrozen && onUnfreeze && (
            <button
              onClick={handleUnfreeze}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              إلغاء التجميد
            </button>
          )}

          {/* Freeze button for active/expiring members */}
          {!isExpired && !isFrozen && onFreeze && !showFreezeInput && (
            <button
              onClick={() => setShowFreezeInput(true)}
              className="w-full py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Pause className="w-5 h-5" />
              إيقاف مؤقت
            </button>
          )}

          {/* SINGLE SESSION Actions */}
          {isSingle && (
            <div className="space-y-2">
              {/* Use session if available */}
              {!singleUsed && onUseSession && (
                <button
                  onClick={() => onUseSession(member)}
                  className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-3"
                >
                  <Zap className="w-6 h-6" />
                  تسجيل الدخول ⚡
                </button>
              )}
              
              {/* Buy another single session - ALWAYS available */}
              {onAddSession && (
                <button
                  onClick={() => onAddSession(member, 1, 'cash')}
                  className={`w-full py-3 ${singleUsed ? 'bg-orange-600 hover:bg-orange-700 text-white font-bold' : 'bg-orange-100 hover:bg-orange-200 text-orange-700'} rounded-xl transition-colors flex items-center justify-center gap-2`}
                >
                  <Plus className="w-5 h-5" />
                  {singleUsed ? 'اشتري حصة جديدة' : 'أضف حصة أخرى'}
                </button>
              )}
            </div>
          )}

          {/* PACKAGE Actions */}
          {isPackage && (
            <div className="space-y-2">
              {/* Use session if available */}
              {sessionsLeft > 0 && onUseSession && (
                <button
                  onClick={() => onUseSession(member)}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-3"
                >
                  <Ticket className="w-6 h-6" />
                  استخدام حصة ({sessionsLeft} متبقية)
                </button>
              )}
              
              {/* Add sessions */}
              {onAddSession && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onAddSession(member, 1, 'cash')}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    +1 حصة
                  </button>
                  <button
                    onClick={() => onAddSession(member, 5, 'cash')}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    +5 حصص
                  </button>
                </div>
              )}
              
              {/* Buy new package when empty */}
              {sessionsLeft <= 0 && onRenew && (
                <button
                  onClick={() => onRenew(member)}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-3 shadow-lg shadow-purple-600/30"
                >
                  <RefreshCw className="w-6 h-6" />
                  شراء باقة جديدة
                </button>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}

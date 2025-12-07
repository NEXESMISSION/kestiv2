'use client'

import { Member } from '@/types/database'
import { getMemberStatus, getMemberPlanType, getSessionsRemaining, isSingleSessionUsed } from '@/lib/utils/member'
import { Phone, Snowflake, RefreshCw, Zap, Package, Calendar, Clock } from 'lucide-react'

interface MemberCardProps {
  member: Member
  onCheckIn: (member: Member) => void
  onRenew: (member: Member) => void
  onManage: (member: Member) => void
}

// Clean status config based on plan type
function getCardConfig(member: Member) {
  const planType = getMemberPlanType(member)
  const status = getMemberStatus(member)
  const sessionsLeft = getSessionsRemaining(member)
  const singleUsed = isSingleSessionUsed(member)
  
  // SINGLE SESSION - Special handling (NEVER show "منتهي")
  if (planType === 'single') {
    if (singleUsed) {
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        badge: 'bg-gray-400',
        badgeText: 'text-gray-600 bg-gray-100',
        label: 'تم استخدامها',
        icon: 'used',
        color: 'gray'
      }
    }
    return {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      badge: 'bg-orange-500',
      badgeText: 'text-orange-700 bg-orange-100',
      label: '⚡ حصة متاحة',
      icon: 'available',
      color: 'orange'
    }
  }
  
  // PACKAGE
  if (planType === 'package') {
    if (sessionsLeft <= 0) {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        badge: 'bg-red-500',
        badgeText: 'text-red-700 bg-red-100',
        label: 'لا حصص متبقية',
        icon: 'empty',
        color: 'red'
      }
    }
    return {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      badge: 'bg-purple-500',
      badgeText: 'text-purple-700 bg-purple-100',
      label: `${sessionsLeft} حصة`,
      icon: 'sessions',
      color: 'purple'
    }
  }
  
  // SUBSCRIPTION (time-based)
  if (status === 'frozen') {
    return {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      badge: 'bg-blue-400',
      badgeText: 'text-blue-600 bg-blue-100',
      label: '❄️ مجمد',
      icon: 'frozen',
      color: 'blue'
    }
  }
  if (status === 'expired') {
    return {
      bg: 'bg-red-50',
      border: 'border-red-200',
      badge: 'bg-red-500',
      badgeText: 'text-red-700 bg-red-100',
      label: 'منتهي',
      icon: 'expired',
      color: 'red'
    }
  }
  if (status === 'expiring_soon') {
    return {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      badge: 'bg-yellow-500',
      badgeText: 'text-yellow-700 bg-yellow-100',
      label: 'ينتهي قريباً',
      icon: 'warning',
      color: 'yellow'
    }
  }
  return {
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-500',
    badgeText: 'text-green-700 bg-green-100',
    label: 'نشط',
    icon: 'active',
    color: 'green'
  }
}

// Get time display for subscriptions
function getTimeDisplay(expiresAt: string | null): string {
  if (!expiresAt) return ''
  
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  // Unlimited (more than 50 years)
  if (days > 18250) return 'غير محدود'
  
  if (diff < 0) {
    const absDays = Math.abs(days)
    return absDays > 0 ? `منتهي منذ ${absDays} يوم` : 'منتهي'
  }
  
  return `${days} يوم`
}

export default function MemberCard({ member, onCheckIn, onRenew }: MemberCardProps) {
  const config = getCardConfig(member)
  const planType = getMemberPlanType(member)
  const status = getMemberStatus(member)
  const needsRenewal = (planType === 'single' && isSingleSessionUsed(member)) || 
                       (planType === 'package' && getSessionsRemaining(member) <= 0) ||
                       (planType === 'subscription' && status === 'expired')
  
  // Initials for avatar
  const initials = member.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className={`rounded-2xl border-2 ${config.border} ${config.bg} overflow-hidden transition-all hover:shadow-lg`}>
      {/* Main Card - Clickable */}
      <button onClick={() => onCheckIn(member)} className="w-full text-right p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className={`w-14 h-14 rounded-full ${config.badge} flex items-center justify-center text-lg font-bold text-white shadow-lg flex-shrink-0`}>
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Name + Status Badge */}
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-gray-900 truncate">{member.name}</h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${config.badgeText}`}>
                {config.label}
              </span>
            </div>
            
            {/* Plan Type Icon + Info */}
            <div className="flex items-center gap-3 text-sm">
              {/* Plan Type Badge */}
              <span className="flex items-center gap-1.5">
                {planType === 'single' && <Zap className="w-4 h-4 text-orange-500" />}
                {planType === 'package' && <Package className="w-4 h-4 text-purple-500" />}
                {planType === 'subscription' && <Calendar className="w-4 h-4 text-blue-500" />}
                <span className="text-gray-600 font-medium">{member.plan_name}</span>
              </span>
              
              {/* Time display for subscriptions only */}
              {planType === 'subscription' && member.expires_at && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    {getTimeDisplay(member.expires_at)}
                  </span>
                </>
              )}
            </div>
            
            {/* Phone */}
            <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
              <Phone className="w-3.5 h-3.5" />
              <span dir="ltr">{member.phone}</span>
            </div>
          </div>

          {/* Frozen indicator */}
          {status === 'frozen' && (
            <Snowflake className="w-6 h-6 text-blue-500 flex-shrink-0" />
          )}
        </div>
      </button>

      {/* Renew Button - Only when needed */}
      {needsRenewal && (
        <div className="px-4 pb-4">
          <button
            onClick={(e) => { e.stopPropagation(); onRenew(member) }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            {planType === 'single' ? 'اشتري حصة جديدة' : planType === 'package' ? 'اشتري باقة جديدة' : 'تجديد الاشتراك'}
          </button>
        </div>
      )}
    </div>
  )
}

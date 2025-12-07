import { Member, MemberStatus, PlanType } from '@/types/database'

// Get member's plan type (with fallback logic for backwards compatibility)
export function getMemberPlanType(member: Member): PlanType {
  // Use explicit plan_type if available
  if (member.plan_type) return member.plan_type
  // Fallback: infer from sessions
  if ((member.sessions_total || 0) === 1) return 'single'
  if ((member.sessions_total || 0) > 1) return 'package'
  return 'subscription'
}

// Check if member has a session-based subscription (package or single)
export function isSessionBased(member: Member): boolean {
  const planType = getMemberPlanType(member)
  return planType === 'single' || planType === 'package'
}

// Check if member has a single session plan (حصة واحدة)
export function isSingleSession(member: Member): boolean {
  return getMemberPlanType(member) === 'single'
}

// Check if member has a package plan (multiple sessions)
export function isPackagePlan(member: Member): boolean {
  return getMemberPlanType(member) === 'package'
}

// Get remaining sessions for session-based subscriptions
export function getSessionsRemaining(member: Member): number {
  if (!isSessionBased(member)) return 0
  return Math.max(0, (member.sessions_total || 0) - (member.sessions_used || 0))
}

// Check if single session has been used
export function isSingleSessionUsed(member: Member): boolean {
  if (!isSingleSession(member)) return false
  return (member.sessions_used || 0) >= (member.sessions_total || 1)
}

// Utility function to get member status
// IMPORTANT: Single sessions are NEVER "expired" - they are either "available" or "used"
export function getMemberStatus(member: Member): MemberStatus {
  if (member.is_frozen) return 'frozen'
  
  const planType = getMemberPlanType(member)
  
  // SINGLE SESSION: Never show as expired - only "active" (available) or special status
  if (planType === 'single') {
    const used = isSingleSessionUsed(member)
    // If used, we return 'expired' but the UI will handle this differently for singles
    // The card will show "تم استخدامها" not "منتهي"
    return used ? 'expired' : 'active'
  }
  
  // PACKAGE: Check sessions remaining
  if (planType === 'package') {
    const remaining = getSessionsRemaining(member)
    if (remaining <= 0) return 'expired'
    if (remaining === 1) return 'expiring_soon' // Last session
    return 'active'
  }
  
  // SUBSCRIPTION: Check expiration date
  if (!member.expires_at) return 'active' // No expiry = active
  
  const now = new Date()
  const expiresAt = new Date(member.expires_at)
  const diff = expiresAt.getTime() - now.getTime()
  
  // If expired (past the expiration date/time)
  if (diff < 0) return 'expired'
  
  // Calculate days remaining
  const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24))
  
  // If 7 days or less remaining
  if (daysRemaining <= 7) return 'expiring_soon'
  
  return 'active'
}

// Get display text for member status (Arabic)
export function getStatusDisplay(member: Member): { text: string; color: string; icon: string } {
  const planType = getMemberPlanType(member)
  const status = getMemberStatus(member)
  
  // SINGLE SESSION - Special display
  if (planType === 'single') {
    const used = isSingleSessionUsed(member)
    if (used) {
      return { text: 'تم استخدامها', color: 'text-gray-500', icon: 'used' }
    }
    return { text: 'حصة متاحة', color: 'text-orange-600', icon: 'available' }
  }
  
  // PACKAGE
  if (planType === 'package') {
    const remaining = getSessionsRemaining(member)
    if (remaining <= 0) {
      return { text: 'لا حصص متبقية', color: 'text-red-600', icon: 'empty' }
    }
    return { text: `${remaining} حصة متبقية`, color: 'text-purple-600', icon: 'sessions' }
  }
  
  // SUBSCRIPTION
  if (status === 'frozen') {
    return { text: 'مجمد', color: 'text-blue-600', icon: 'frozen' }
  }
  if (status === 'expired') {
    return { text: 'منتهي', color: 'text-red-600', icon: 'expired' }
  }
  if (status === 'expiring_soon') {
    return { text: 'ينتهي قريباً', color: 'text-yellow-600', icon: 'warning' }
  }
  return { text: 'نشط', color: 'text-green-600', icon: 'active' }
}

export function getDaysRemaining(expiresAt: string): number {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

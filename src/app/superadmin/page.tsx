import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SuperAdminDashboard from './SuperAdminDashboard'
import type { Profile } from '@/types/database'

export default async function SuperAdminPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/login')
  }

  // Check if user is super_admin from user metadata
  const userRole = user.user_metadata?.role || 'user'
  
  if (userRole !== 'super_admin') {
    // Not a super admin, redirect to POS
    redirect('/pos')
  }

  // Serialize user data for client component
  const serializedUser = {
    id: user.id,
    email: user.email || '',
    user_metadata: user.user_metadata || {}
  }

  // Create profile from user metadata
  const currentProfile: Profile = {
    id: user.id,
    full_name: user.user_metadata?.full_name || user.email || 'Admin',
    phone_number: user.user_metadata?.phone_number || null,
    business_mode: user.user_metadata?.business_mode || 'subscription',
    pin_code: user.user_metadata?.pin_code || null,
    role: 'super_admin',
    is_active: true,
    is_paused: false,
    pause_reason: null,
    subscription_status: 'active',
    subscription_end_date: null,
    subscription_days: null,
    created_at: user.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return (
    <SuperAdminDashboard 
      currentUser={serializedUser}
      currentProfile={currentProfile}
    />
  )
}

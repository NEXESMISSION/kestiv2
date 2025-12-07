import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check user role, pause and subscription status from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_paused, subscription_status, subscription_end_date')
    .eq('id', user.id)
    .single()

  // Check if user is paused - redirect to paused page
  if (profile?.is_paused) {
    redirect('/paused')
  }

  const userRole = profile?.role || user.user_metadata?.role || 'user'
  
  // Check subscription for non-admin users
  if (userRole !== 'super_admin') {
    // Check subscription status
    if (profile?.subscription_status === 'expired' || profile?.subscription_status === 'cancelled') {
      redirect('/expired')
    }
    
    // Check if subscription end date has passed
    if (profile?.subscription_end_date) {
      const endDate = new Date(profile.subscription_end_date)
      if (endDate < new Date()) {
        redirect('/expired')
      }
    }
  }

  // Super admin goes to admin panel, normal users go to POS
  if (userRole === 'super_admin') {
    redirect('/superadmin')
  } else {
    redirect('/pos')
  }
}

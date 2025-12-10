import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FreelancerDashboard from './FreelancerDashboard'
import type { Profile } from '@/types/database'

// Service/Freelancer POS Page
// This is for any business that provides services (not retail products or subscriptions)
export default async function FreelancerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')
  
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()
  
  // If no profile or wrong business mode, redirect to main POS
  if (!profile || (profile.business_mode !== 'freelancer' && profile.business_mode !== 'service')) {
    redirect('/pos')
  }

  return <FreelancerDashboard userId={user.id} profile={profile} />
}

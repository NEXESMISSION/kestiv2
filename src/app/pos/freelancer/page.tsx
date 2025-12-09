import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FreelancerDashboard from './FreelancerDashboard'
import type { Profile } from '@/types/database'

export default async function FreelancerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')
  
  // Verify user is freelancer
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()
  
  if (!profile || profile.business_mode !== 'freelancer') {
    redirect('/pos')
  }

  return <FreelancerDashboard userId={user.id} profile={profile} />
}

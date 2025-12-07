import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'
import { Profile } from '@/types/database'

// Auth checks handled by middleware
export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<Profile>()

  // Redirect retail users to retail dashboard
  if (profile?.business_mode === 'retail') {
    redirect('/dashboard/retail')
  }

  const serializedUser = {
    id: user.id,
    email: user.email || '',
    user_metadata: user.user_metadata || {}
  }

  return <DashboardClient user={serializedUser} profile={profile} />
}

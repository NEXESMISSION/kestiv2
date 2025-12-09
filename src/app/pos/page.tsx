import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type ProfileData = { business_mode: string | null }

// POS Page - Redirects based on business type
// Auth checks handled by middleware
export default async function POSPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/login')
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_mode')
    .eq('id', user.id)
    .single<ProfileData>()
  
  // Redirect based on business type
  if (profile?.business_mode === 'retail') {
    redirect('/pos/retail')
  } else if (profile?.business_mode === 'freelancer') {
    redirect('/pos/freelancer')
  } else {
    redirect('/pos/subscription')
  }
}

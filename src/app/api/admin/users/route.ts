import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized', details: userError?.message }, { status: 401 })
    }

    // Check if service role key exists
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
      // Fallback: use user's own session to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      
      const role = (profile as { role?: string } | null)?.role
      if (role !== 'super_admin') {
        return NextResponse.json({ 
          error: 'Forbidden', 
          details: `Your role is "${role || 'no profile found'}". Super admin access required.`
        }, { status: 403 })
      }
      
      // Use regular client for profiles (RLS must allow super_admin)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone_number, business_mode, role, is_active, is_paused, pause_reason, subscription_status, subscription_end_date, subscription_days, created_at, updated_at')
        .order('created_at', { ascending: false })
      
      return NextResponse.json({ profiles: profiles || [] })
    }

    // Use service client to check role (bypasses RLS)
    const serviceClient = createServiceClient()
    const { data: userProfile, error: profileError } = await serviceClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    
    if (profileError) {
      return NextResponse.json({ 
        error: 'Failed to check role', 
        details: profileError.message 
      }, { status: 500 })
    }
    
    if (!userProfile) {
      return NextResponse.json({ 
        error: 'Profile not found', 
        details: `No profile exists for user ${user.email}. Please create a profile first.`
      }, { status: 404 })
    }
    
    const role = (userProfile as { role?: string } | null)?.role
    if (role !== 'super_admin') {
      return NextResponse.json({ 
        error: 'Forbidden', 
        details: `Your role is "${role || 'unknown'}". Super admin access required.`
      }, { status: 403 })
    }

    // Fetch all profiles using service client (bypasses RLS)
    const { data: profiles, error: profilesError } = await serviceClient
      .from('profiles')
      .select('id, email, full_name, phone_number, business_mode, role, is_active, is_paused, pause_reason, subscription_status, subscription_end_date, subscription_days, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (profilesError) {
      return NextResponse.json({ error: 'Failed to fetch profiles', details: profilesError.message }, { status: 500 })
    }

    return NextResponse.json({ profiles: profiles || [] })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 })
  }
}

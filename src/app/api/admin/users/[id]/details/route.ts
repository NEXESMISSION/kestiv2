import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// SECURITY: Validate UUID format to prevent injection attacks
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id)
}

// Helper to verify super admin
async function verifySuperAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  
  const userRole = (profile as { role?: string } | null)?.role
  
  if (userRole !== 'super_admin') {
    return { error: 'Forbidden - Super admin access required', status: 403 }
  }

  return { user, profile }
}

// GET - Fetch all user data for "See Through" view
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: targetUserId } = await params
    
    // SECURITY: Validate UUID format before any database operations
    if (!targetUserId || !isValidUUID(targetUserId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
    }
    
    // Verify super admin
    const authResult = await verifySuperAdmin(supabase)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    // Use service client to bypass RLS for admin operations
    const serviceClient = createServiceClient()

    // SECURITY: Fetch minimal profile fields only (avoid leaking sensitive fields like pin_code)
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .select('id,email,full_name,phone_number,business_mode,role,is_active,is_paused,pause_reason,subscription_status,subscription_end_date,subscription_days,created_at,updated_at')
      .eq('id', targetUserId)
      .maybeSingle()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // SECURITY: Prevent viewing other super admins (except self)
    const targetRole = (profile as { role?: string } | null)?.role
    if (targetRole === 'super_admin' && targetUserId !== authResult.user.id) {
      return NextResponse.json({ error: 'Cannot view another super admin' }, { status: 403 })
    }

    // Fetch all related data in parallel
    const [
      membersResult,
      productsResult,
      servicesResult,
      transactionsResult,
      subscriptionPlansResult,
      subscriptionHistoryResult,
      expensesResult,
      freelancerClientsResult,
      freelancerProjectsResult,
      freelancerServicesResult,
      freelancerPaymentsResult,
      freelancerExpensesResult,
      freelancerRemindersResult
    ] = await Promise.all([
      // Members (for subscription business)
      serviceClient
        .from('members')
        .select('*')
        .eq('business_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(100),
      
      // Products (for retail business)
      serviceClient
        .from('products')
        .select('*')
        .eq('business_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(100),
      
      // Services
      serviceClient
        .from('services')
        .select('*')
        .eq('business_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(100),
      
      // Transactions
      serviceClient
        .from('transactions')
        .select('*')
        .eq('business_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(200),
      
      // Subscription Plans
      serviceClient
        .from('subscription_plans')
        .select('*')
        .eq('business_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(50),
      
      // Subscription History
      serviceClient
        .from('subscription_history')
        .select('*')
        .eq('business_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(200),
      
      // Expenses
      serviceClient
        .from('expenses')
        .select('*')
        .eq('business_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(100),
      
      // Freelancer Clients
      serviceClient
        .from('freelancer_clients')
        .select('*')
        .eq('business_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(100),
      
      // Freelancer Projects
      serviceClient
        .from('freelancer_projects')
        .select('*')
        .eq('business_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(100),
      
      // Freelancer Services
      serviceClient
        .from('freelancer_services')
        .select('*')
        .eq('business_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(50),
      
      // Freelancer Payments
      serviceClient
        .from('freelancer_payments')
        .select('*')
        .eq('business_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(200),
      
      // Freelancer Expenses
      serviceClient
        .from('freelancer_expenses')
        .select('*')
        .eq('business_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(100),
      
      // Freelancer Reminders
      serviceClient
        .from('freelancer_reminders')
        .select('*')
        .eq('business_id', targetUserId)
        .order('date', { ascending: false })
        .limit(50)
    ])

    // Calculate statistics
    const transactions = transactionsResult.data || []
    const freelancerPayments = freelancerPaymentsResult.data || []
    const expenses = expensesResult.data || []
    const freelancerExpenses = freelancerExpensesResult.data || []

    const totalRevenue = transactions.reduce((sum: number, t: { amount: number }) => sum + (t.amount || 0), 0) +
                        freelancerPayments.reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0)
    
    const totalExpenses = expenses.reduce((sum: number, e: { amount: number }) => sum + (e.amount || 0), 0) +
                         freelancerExpenses.reduce((sum: number, e: { amount: number }) => sum + (e.amount || 0), 0)

    const stats = {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      membersCount: membersResult.data?.length || 0,
      productsCount: productsResult.data?.length || 0,
      servicesCount: servicesResult.data?.length || 0,
      transactionsCount: transactions.length,
      freelancerClientsCount: freelancerClientsResult.data?.length || 0,
      freelancerProjectsCount: freelancerProjectsResult.data?.length || 0
    }

    return NextResponse.json({
      success: true,
      profile,
      stats,
      data: {
        members: membersResult.data || [],
        products: productsResult.data || [],
        services: servicesResult.data || [],
        transactions: transactions,
        subscriptionPlans: subscriptionPlansResult.data || [],
        subscriptionHistory: subscriptionHistoryResult.data || [],
        expenses: expenses,
        freelancerClients: freelancerClientsResult.data || [],
        freelancerProjects: freelancerProjectsResult.data || [],
        freelancerServices: freelancerServicesResult.data || [],
        freelancerPayments: freelancerPayments,
        freelancerExpenses: freelancerExpenses,
        freelancerReminders: freelancerRemindersResult.data || []
      }
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sanitizeString } from '@/lib/security'

export const dynamic = 'force-dynamic'

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
  
  if (profile?.role !== 'super_admin') {
    return { error: 'Forbidden - Super admin access required', status: 403 }
  }

  return { user, profile }
}

// PATCH - Update user (pause/unpause, subscription)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: targetUserId } = await params
    
    // Verify super admin
    const authResult = await verifySuperAdmin(supabase)
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    // Parse and validate request body
    const body = await request.json()
    const { action, ...data } = body

    if (!action || !targetUserId) {
      return NextResponse.json({ error: 'Missing action or user ID' }, { status: 400 })
    }

    // Validate target user exists
    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', targetUserId)
      .maybeSingle()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent modifying other super admins
    if (targetUser.role === 'super_admin' && targetUserId !== authResult.user.id) {
      return NextResponse.json({ error: 'Cannot modify another super admin' }, { status: 403 })
    }

    let updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    switch (action) {
      case 'pause':
        if (!data.pause_reason || typeof data.pause_reason !== 'string') {
          return NextResponse.json({ error: 'Pause reason is required' }, { status: 400 })
        }
        // Sanitize the pause reason to prevent XSS
        updateData.is_paused = true
        updateData.pause_reason = sanitizeString(data.pause_reason.trim().slice(0, 500))
        break

      case 'unpause':
        updateData.is_paused = false
        updateData.pause_reason = null
        break

      case 'set_subscription':
        if (typeof data.days !== 'number' || data.days < 0) {
          return NextResponse.json({ error: 'Invalid subscription days' }, { status: 400 })
        }
        const minutes = typeof data.minutes === 'number' ? data.minutes : 0
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + data.days)
        endDate.setMinutes(endDate.getMinutes() + minutes)
        
        updateData.subscription_status = 'active'
        updateData.subscription_end_date = endDate.toISOString()
        updateData.subscription_days = data.days
        break

      case 'cancel_subscription':
        updateData.subscription_status = 'cancelled'
        break

      case 'cleanup':
        // Clean up all user data from various tables
        // This keeps the user account but removes all their business data
        const tablesToClean = [
          'members',
          'products',
          'services',
          'subscription_plans',
          'subscription_history',
          'transactions',
          'freelancer_clients',
          'freelancer_projects',
          'freelancer_services',
          'freelancer_expenses',
          'freelancer_payments',
          'expenses'
        ]
        
        for (const table of tablesToClean) {
          try {
            await supabase.from(table).delete().eq('business_id', targetUserId)
          } catch {
            // Table might not exist, continue
          }
        }
        
        // Reset profile counters/stats if any
        updateData = {
          updated_at: new Date().toISOString()
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Perform update
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', targetUserId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({ success: true, profile: updated })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

// PATCH - Mark inquiry as read (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check if user is authenticated and is super_admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    // Check role
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const userRole = (profileData as { role?: string } | null)?.role || user.user_metadata?.role || 'user'

    if (userRole !== 'super_admin') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const body = await request.json()
    const { is_read } = body

    const serviceClient = createServiceClient()
    const { error } = await serviceClient
      .from('inquiries')
      .update({ is_read })
      .eq('id', id)

    if (error) {
      console.error('Error updating inquiry:', error)
      return NextResponse.json(
        { error: 'فشل في تحديث الاستفسار' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Inquiry PATCH error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// DELETE - Delete inquiry (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check if user is authenticated and is super_admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    // Check role
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const userRole = (profileData as { role?: string } | null)?.role || user.user_metadata?.role || 'user'

    if (userRole !== 'super_admin') {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }

    const serviceClient = createServiceClient()
    const { error } = await serviceClient
      .from('inquiries')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting inquiry:', error)
      return NextResponse.json(
        { error: 'فشل في حذف الاستفسار' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Inquiry DELETE error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, createClient } from '@/lib/supabase/server'

// POST - Save a new inquiry (public endpoint)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, message } = body

    // Validate required fields
    if (!name?.trim() || !phone?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'الاسم ورقم الهاتف والاستفسار مطلوبين' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('inquiries')
      .insert({
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        message: message.trim(),
        is_read: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving inquiry:', error)
      return NextResponse.json(
        { error: 'فشل في حفظ الاستفسار' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, inquiry: data })
  } catch (error) {
    console.error('Inquiry API error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// GET - Get all inquiries (admin only)
export async function GET() {
  try {
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

    // Fetch inquiries using service client to bypass RLS
    const serviceClient = createServiceClient()
    const { data: inquiries, error } = await serviceClient
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching inquiries:', error)
      return NextResponse.json(
        { error: 'فشل في جلب الاستفسارات' },
        { status: 500 }
      )
    }

    return NextResponse.json({ inquiries })
  } catch (error) {
    console.error('Inquiries GET error:', error)
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    )
  }
}

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Skip middleware entirely for static/non-protected routes
  if (
    pathname === '/paused' || 
    pathname === '/expired' || 
    pathname === '/login' || 
    pathname === '/register' ||
    pathname === '/' ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next')
  ) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // Only check auth for protected routes
  const protectedRoutes = ['/dashboard', '/admin', '/pos', '/superadmin']
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (!isProtected) {
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in -> login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Get profile with minimal fields
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_paused, subscription_status, subscription_end_date')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return supabaseResponse
  }

  const isSuperAdmin = profile.role === 'super_admin'
  
  // Super admin only accesses /superadmin
  if (isSuperAdmin) {
    if (!pathname.startsWith('/superadmin')) {
      return NextResponse.redirect(new URL('/superadmin', request.url))
    }
    return supabaseResponse
  }
  
  // Regular users can't access /superadmin
  if (pathname.startsWith('/superadmin')) {
    return NextResponse.redirect(new URL('/pos', request.url))
  }

  // Check pause status
  if (profile.is_paused) {
    return NextResponse.redirect(new URL('/paused', request.url))
  }
  
  // Check subscription expiry
  const statusExpired = profile.subscription_status === 'expired' || profile.subscription_status === 'cancelled'
  const dateExpired = profile.subscription_end_date && new Date(profile.subscription_end_date) < new Date()
  
  if (statusExpired || dateExpired) {
    return NextResponse.redirect(new URL('/expired', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

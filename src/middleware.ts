import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rate limiting for API routes (in-memory, resets on deploy)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 100 // requests per window

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false
  }
  
  record.count++
  return true
}

// Debug function to log auth related information
function logAuthDebug(msg: string, obj?: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Auth Debug] ${msg}`, obj || '')
  }
}

// Helper to create redirect with cookies
function createRedirectWithCookies(url: URL, response: NextResponse): NextResponse {
  const redirectResponse = NextResponse.redirect(url)
  response.cookies.getAll().forEach(cookie => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
  })
  return redirectResponse
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  
  logAuthDebug(`Middleware running for path: ${pathname}`)
  
  // Rate limit API routes
  if (pathname.startsWith('/api')) {
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
  }
  
  // Skip middleware entirely for static/non-protected routes
  if (
    pathname === '/paused' || 
    pathname === '/expired' || 
    pathname === '/login' || 
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/install' ||
    pathname === '/' ||
    pathname === '/landing' ||
    pathname.startsWith('/auth/callback') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname === '/sw.js' ||
    pathname === '/login-sw.js' ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next')
  ) {
    logAuthDebug(`Skipping middleware for non-protected path: ${pathname}`)
    return NextResponse.next()
  }

  // Create response object that will carry cookies through
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // First, update the request cookies (for this request)
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          
          // Create a new response with updated request
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          
          // Then, set the cookies on the response (for the browser)
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              // Ensure proper cookie settings for auth
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
            })
          })
        },
      },
    }
  )

  // Only check auth for protected routes
  const protectedRoutes = ['/dashboard', '/admin', '/pos', '/superadmin']
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (!isProtected) {
    logAuthDebug(`Path not protected: ${pathname}`)
    return response
  }
  
  logAuthDebug(`Checking auth for protected path: ${pathname}`)

  // IMPORTANT: Use getUser() instead of getSession() for secure server-side auth
  // getUser() sends a request to Supabase to validate the token
  // getSession() only reads from cookies without validation
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    logAuthDebug(`Auth error: ${error.message}`)
  }

  // Not logged in -> login
  if (!user) {
    logAuthDebug(`No user found, redirecting to login`)
    return createRedirectWithCookies(new URL('/login', request.url), response)
  }
  
  logAuthDebug(`User authenticated: ${user.id}`)

  // Get profile with minimal fields
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_paused, subscription_status, subscription_end_date')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    logAuthDebug(`Error fetching profile: ${profileError.message}`)
  }

  if (!profile) {
    logAuthDebug(`No profile found for user: ${user.id}`)
    return response
  }
  
  logAuthDebug(`User profile found: role=${profile.role}, paused=${profile.is_paused}, status=${profile.subscription_status}`)

  const isSuperAdmin = profile.role === 'super_admin'
  
  // Super admin only accesses /superadmin
  if (isSuperAdmin) {
    if (!pathname.startsWith('/superadmin')) {
      return createRedirectWithCookies(new URL('/superadmin', request.url), response)
    }
    return response
  }
  
  // Regular users can't access /superadmin
  if (pathname.startsWith('/superadmin')) {
    return createRedirectWithCookies(new URL('/pos', request.url), response)
  }

  // Check pause status
  if (profile.is_paused) {
    return createRedirectWithCookies(new URL('/paused', request.url), response)
  }
  
  // Check subscription expiry
  const statusExpired = profile.subscription_status === 'expired' || profile.subscription_status === 'cancelled'
  const dateExpired = profile.subscription_end_date && new Date(profile.subscription_end_date) < new Date()
  
  if (statusExpired || dateExpired) {
    return createRedirectWithCookies(new URL('/expired', request.url), response)
  }

  return response
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

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// SECURITY: Whitelist of allowed redirect paths to prevent open redirect attacks
const ALLOWED_REDIRECTS = ['/pos', '/dashboard', '/reset-password', '/login', '/superadmin']

function isAllowedRedirect(path: string): boolean {
  // Only allow paths that start with allowed prefixes (no external URLs)
  return ALLOWED_REDIRECTS.some(allowed => path === allowed || path.startsWith(allowed + '/'))
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/reset-password'
  const type = searchParams.get('type')
  
  // SECURITY: Validate and sanitize the redirect path
  // Prevent open redirect attacks by only allowing whitelisted internal paths
  const next = isAllowedRedirect(rawNext) ? rawNext : '/reset-password'

  if (code) {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                // IMPORTANT: httpOnly must be false for browser client to read
                cookieStore.set(name, value, {
                  ...options,
                  httpOnly: false,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax',
                  path: '/',
                })
              })
            } catch (error) {
              console.error('Error setting cookies in auth callback:', error)
            }
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // For password recovery, redirect to reset-password page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      // For other auth flows (signup confirmation, etc.)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/forgot-password?error=invalid_link`)
}

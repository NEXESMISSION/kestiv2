import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/reset-password'
  const type = searchParams.get('type')

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
                // Enhanced cookie options for better session persistence
                const enhancedOptions: CookieOptions = {
                  ...options,
                  httpOnly: true,
                  secure: process.env.NODE_ENV === 'production',
                  maxAge: 60 * 60 * 24 * 7, // 7 days
                  sameSite: 'lax',
                  path: '/',
                }
                cookieStore.set(name, value, enhancedOptions)
              })
            } catch (error) {
              console.error('Error setting cookies in auth callback:', error)
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          },
        },
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
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

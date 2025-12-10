import { createBrowserClient } from '@supabase/ssr'

// Note: For full type safety, run `supabase gen types typescript` to generate types
// Currently using untyped client for flexibility with new tables
export function createClient() {
  // Debug log for client creation
  const debugLog = (msg: string) => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      console.log(`[Supabase Client] ${msg}`)
    }
  }
  
  debugLog('Creating Supabase client')
  
  // First try to get an existing client from the global scope to avoid creating multiple clients
  if (typeof window !== 'undefined' && (window as any).__supabase) {
    debugLog('Using existing client from global scope')
    return (window as any).__supabase
  }

  // Create a new client with enhanced PWA settings
  debugLog('Creating new browser client')
  
  // Check if we have a session in localStorage (for recovery)
  let existingSession = null
  try {
    if (typeof window !== 'undefined') {
      const sessionStr = localStorage.getItem('sb-auth-token')
      if (sessionStr) {
        existingSession = JSON.parse(sessionStr)
        debugLog('Found existing session in localStorage')
      }
    }
  } catch (e) {
    console.error('Error parsing stored session:', e)
  }
  
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'kesti-auth-token',
        flowType: 'pkce',
        debug: process.env.NODE_ENV === 'development',
        // Keep session alive for 7 days
        sessionLifetime: 60 * 60 * 24 * 7
      },
      global: {
        headers: {
          'X-Client-Info': 'kestipro-app'
        }
      },
      // Add cache settings
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    }
  )

  // Store client in global scope to reuse it
  if (typeof window !== 'undefined') {
    (window as any).__supabase = client
    
    // Restore session if we found one in localStorage but auth state is empty
    if (existingSession) {
      client.auth.getSession().then(({ data }) => {
        if (!data.session) {
          debugLog('Attempting to restore session from localStorage')
          // Try to restore the session - this is a failsafe mechanism
          client.auth.setSession({
            access_token: existingSession.access_token,
            refresh_token: existingSession.refresh_token
          }).then(({ error }) => {
            if (error) {
              console.error('Failed to restore session:', error)
              // Clear invalid session
              localStorage.removeItem('sb-auth-token')
            } else {
              debugLog('Session restored successfully')
            }
          })
        }
      })
    }
  }

  return client
}

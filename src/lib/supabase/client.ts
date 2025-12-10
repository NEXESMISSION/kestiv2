import { createBrowserClient } from '@supabase/ssr'

// Note: For full type safety, run `supabase gen types typescript` to generate types
// Currently using untyped client for flexibility with new tables
export function createClient() {
  // First try to get an existing client from the global scope to avoid creating multiple clients
  if (typeof window !== 'undefined' && (window as any).__supabase) {
    return (window as any).__supabase
  }

  // Create a new client with enhanced PWA settings
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
  }

  return client
}

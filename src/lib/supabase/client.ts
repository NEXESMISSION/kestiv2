import { createBrowserClient } from '@supabase/ssr'

// Note: For full type safety, run `supabase gen types typescript` to generate types
// Currently using untyped client for flexibility with new tables
export function createClient() {
  // First try to get an existing client from the global scope to avoid creating multiple clients
  if (typeof window !== 'undefined' && (window as any).__supabase) {
    return (window as any).__supabase
  }

  // Create a new client - let @supabase/ssr handle cookies automatically
  // This is CRITICAL for SSR compatibility with middleware
  
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        // DO NOT override storage - let it use cookies for SSR compatibility
      },
      global: {
        headers: {
          'X-Client-Info': 'kestipro-app'
        }
      },
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

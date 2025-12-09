import { createBrowserClient } from '@supabase/ssr'

// Custom storage that persists session across browser/PWA with longer expiry
const customStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null
    const item = localStorage.getItem(key)
    return item
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(key, value)
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return
    localStorage.removeItem(key)
  }
}

// Note: For full type safety, run `supabase gen types typescript` to generate types
// Currently using untyped client for flexibility with new tables
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Store session in localStorage for PWA support and longer persistence
        storage: typeof window !== 'undefined' ? customStorage : undefined,
        storageKey: 'kesti-pro-auth',
        flowType: 'pkce'
      },
      // Global options for better session handling
      global: {
        headers: {
          'x-client-info': 'kesti-pro-pwa'
        }
      }
    }
  )
}

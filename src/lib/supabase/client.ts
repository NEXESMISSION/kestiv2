import { createBrowserClient, type CookieOptions } from '@supabase/ssr'

// Singleton pattern - create client once per browser session
let browserClient: ReturnType<typeof createBrowserClient> | null = null

// Type for cookie to set
type CookieToSet = { name: string; value: string; options?: CookieOptions }

// Helper to set cookie
function setCookie(name: string, value: string, options: { path?: string; maxAge?: number; domain?: string; secure?: boolean; sameSite?: string } = {}) {
  if (typeof document === 'undefined') return
  let cookieString = `${name}=${value}`
  if (options.path) cookieString += `; path=${options.path}`
  if (options.maxAge) cookieString += `; max-age=${options.maxAge}`
  if (options.domain) cookieString += `; domain=${options.domain}`
  if (options.secure) cookieString += `; secure`
  if (options.sameSite) cookieString += `; samesite=${options.sameSite}`
  document.cookie = cookieString
}

// Helper to delete cookie
function deleteCookie(name: string, options: { path?: string; domain?: string } = {}) {
  setCookie(name, '', { ...options, maxAge: 0 })
}

export function createClient() {
  // Return existing client if available
  if (browserClient) {
    return browserClient
  }

  // Create new client with explicit cookie handling
  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return []
          return document.cookie.split(';').map(cookie => {
            const [name, ...rest] = cookie.trim().split('=')
            return { name, value: rest.join('=') }
          }).filter(c => c.name && c.value)
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) => {
            const sameSite = typeof options?.sameSite === 'string' ? options.sameSite.toLowerCase() : 'lax'
            setCookie(name, value, {
              path: options?.path || '/',
              maxAge: options?.maxAge,
              domain: options?.domain,
              secure: options?.secure,
              sameSite
            })
          })
        }
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'X-Client-Info': 'kestipro-app'
        }
      },
      db: {
        schema: 'public'
      }
    }
  )

  return browserClient
}

// Call this on logout to reset the client
export function resetClient() {
  browserClient = null
  
  // Clear Supabase auth cookies
  if (typeof document !== 'undefined') {
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1]
    
    if (projectRef) {
      deleteCookie(`sb-${projectRef}-auth-token`, { path: '/' })
      deleteCookie(`sb-${projectRef}-auth-token-code-verifier`, { path: '/' })
    }
    
    // Clear any legacy auth cookies
    document.cookie.split(';').forEach(cookie => {
      const cookieName = cookie.trim().split('=')[0]
      if (cookieName.includes('auth-token')) {
        deleteCookie(cookieName, { path: '/' })
      }
    })
    
    delete (window as any).__supabase
  }
}

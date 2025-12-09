'use client'

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/pwa/registerSW'

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker on mount
    registerServiceWorker()

    // Clean up old caches on load
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          // Keep only current version cache
          if (name !== 'kesti-pro-v1') {
            caches.delete(name)
          }
        })
      })
    }
  }, [])

  return <>{children}</>
}

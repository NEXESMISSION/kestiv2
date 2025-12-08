'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Ultra-fast top progress bar for navigation
export function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Reset on route change complete
    setLoading(false)
    setProgress(100)
    const timer = setTimeout(() => setProgress(0), 200)
    return () => clearTimeout(timer)
  }, [pathname, searchParams])

  if (!loading && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-transparent">
      <div 
        className="h-full bg-primary-500 transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

// Minimal inline spinner - use inside buttons/cards
export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg 
      className={`animate-spin ${className}`} 
      width={size} 
      height={size} 
      viewBox="0 0 24 24"
      style={{ animationDuration: '0.5s' }}
    >
      <circle 
        className="opacity-25" 
        cx="12" cy="12" r="10" 
        stroke="currentColor" 
        strokeWidth="3" 
        fill="none" 
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" 
      />
    </svg>
  )
}

// Fast page loader - minimal, centered
export function FastPageLoader({ text }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Spinner size={28} className="mx-auto text-primary-600" />
        {text && <p className="mt-2 text-gray-400 text-xs">{text}</p>}
      </div>
    </div>
  )
}

// Skeleton primitives - fast shimmer
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div 
      className={`bg-gray-200 rounded ${className}`}
      style={{ 
        animation: 'shimmer 1.5s infinite',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
      }}
    />
  )
}

// Quick content skeleton for lists
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-3 border flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Stats skeleton
export function StatsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-3 border">
          <Skeleton className="h-3 w-12 mb-2" />
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  )
}

// Add shimmer animation to globals
export const shimmerStyles = `
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`

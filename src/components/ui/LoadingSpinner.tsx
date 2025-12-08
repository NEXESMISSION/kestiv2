'use client'

// Fast, minimal loading spinner
export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div className={`${sizes[size]} ${className}`}>
      <div className="w-full h-full border-2 border-gray-200 border-t-primary-600 rounded-full animate-spin" style={{ animationDuration: '0.5s' }} />
    </div>
  )
}

// Full page loading overlay
export function PageLoader({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 mx-auto mb-3">
          <div className="w-full h-full border-3 border-gray-200 border-t-primary-600 rounded-full animate-spin" style={{ animationDuration: '0.4s' }} />
        </div>
        {message && <p className="text-gray-500 text-sm">{message}</p>}
      </div>
    </div>
  )
}

// Skeleton loader - minimal
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-shimmer ${className}`} />
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-4 border">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-lg animate-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-2/3 animate-shimmer" />
          <div className="h-3 bg-gray-200 rounded w-1/3 animate-shimmer" />
        </div>
      </div>
    </div>
  )
}

// Grid skeleton
export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-3 border">
          <div className="w-full h-16 bg-gray-200 rounded-lg mb-2 animate-shimmer" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-1 animate-shimmer" />
          <div className="h-3 bg-gray-200 rounded w-1/2 animate-shimmer" />
        </div>
      ))}
    </div>
  )
}

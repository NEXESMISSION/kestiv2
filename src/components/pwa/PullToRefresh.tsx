'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw } from 'lucide-react'

interface PullToRefreshProps {
  onRefresh?: () => Promise<void> | void
  children: React.ReactNode
  disabled?: boolean
}

export default function PullToRefresh({ 
  onRefresh, 
  children, 
  disabled = false 
}: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)
  
  const PULL_THRESHOLD = 80 // Distance needed to trigger refresh
  const MAX_PULL = 120 // Maximum pull distance
  
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || refreshing) return
    
    // Only enable pull-to-refresh when at the top of the page
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    if (scrollTop > 5) return
    
    startY.current = e.touches[0].clientY
    setPulling(true)
  }, [disabled, refreshing])
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling || disabled || refreshing) return
    
    currentY.current = e.touches[0].clientY
    const distance = Math.max(0, currentY.current - startY.current)
    
    // Apply resistance to the pull (makes it feel more natural)
    const resistedDistance = Math.min(MAX_PULL, distance * 0.5)
    
    if (resistedDistance > 0) {
      setPullDistance(resistedDistance)
      // Prevent default scroll when pulling down
      if (window.scrollY === 0) {
        e.preventDefault()
      }
    }
  }, [pulling, disabled, refreshing])
  
  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return
    
    setPulling(false)
    
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true)
      setPullDistance(PULL_THRESHOLD) // Keep showing indicator while refreshing
      
      try {
        if (onRefresh) {
          await onRefresh()
        } else {
          // Default: reload the page
          window.location.reload()
        }
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        setRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pulling, pullDistance, refreshing, onRefresh])
  
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    // Add passive: false to allow preventDefault on touchmove
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])
  
  const progress = Math.min(1, pullDistance / PULL_THRESHOLD)
  const rotation = progress * 180
  
  return (
    <div ref={containerRef} className="relative min-h-screen">
      {/* Pull indicator */}
      <div 
        className="fixed left-0 right-0 flex justify-center z-50 pointer-events-none transition-opacity duration-200"
        style={{ 
          top: Math.max(0, pullDistance - 50),
          opacity: pullDistance > 10 ? 1 : 0,
        }}
      >
        <div 
          className={`w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center transition-transform ${
            refreshing ? 'animate-spin' : ''
          }`}
          style={{ 
            transform: refreshing ? undefined : `rotate(${rotation}deg)`,
          }}
        >
          <RefreshCw 
            className={`w-5 h-5 ${
              pullDistance >= PULL_THRESHOLD 
                ? 'text-primary-600' 
                : 'text-gray-400'
            }`} 
          />
        </div>
      </div>
      
      {/* Content with pull transform */}
      <div 
        style={{ 
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: pulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  )
}

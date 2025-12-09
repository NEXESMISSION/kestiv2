'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(true)

  useEffect(() => {
    // Check if this is a PWA standalone mode
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true

    // Only show splash for PWA or first load
    const hasShownSplash = sessionStorage.getItem('splashShown')

    if (!isPWA && hasShownSplash) {
      setIsVisible(false)
      return
    }

    // Hide splash after content loads (minimum 1.5s for animation)
    const minDisplayTime = 1500
    const startTime = Date.now()

    const handleLoad = () => {
      const elapsed = Date.now() - startTime
      const remainingTime = Math.max(0, minDisplayTime - elapsed)

      setTimeout(() => {
        setIsAnimating(false)
        setTimeout(() => {
          setIsVisible(false)
          sessionStorage.setItem('splashShown', 'true')
        }, 500) // Fade out duration
      }, remainingTime)
    }

    if (document.readyState === 'complete') {
      handleLoad()
    } else {
      window.addEventListener('load', handleLoad)
      // Fallback: hide after 3 seconds max
      const fallbackTimer = setTimeout(() => {
        setIsAnimating(false)
        setTimeout(() => setIsVisible(false), 500)
      }, 3000)

      return () => {
        window.removeEventListener('load', handleLoad)
        clearTimeout(fallbackTimer)
      }
    }
  }, [])

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 transition-opacity duration-500 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Animated Background Circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white/5 rounded-full animate-pulse delay-300" />
        <div className="absolute top-1/4 right-10 w-32 h-32 bg-white/10 rounded-full animate-bounce delay-500" style={{ animationDuration: '3s' }} />
      </div>

      {/* Logo Container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Logo */}
        <div className="relative">
          {/* Glow Effect */}
          <div className="absolute inset-0 blur-2xl bg-white/30 rounded-full animate-pulse" />
          
          {/* Logo with bounce and scale animation */}
          <div className="relative animate-bounce" style={{ animationDuration: '2s' }}>
            <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-3xl shadow-2xl flex items-center justify-center p-4 animate-pulse">
              <Image
                src="/kesti.png"
                alt="Kesti Pro"
                width={100}
                height={100}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </div>

          {/* Spinning Ring */}
          <div className="absolute -inset-4 border-4 border-white/20 border-t-white rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
        </div>

        {/* App Name */}
        <h1 className="mt-8 text-2xl sm:text-3xl font-bold text-white tracking-wide">
          Kesti Pro
        </h1>
        <p className="mt-2 text-white/80 text-sm sm:text-base">
          نظام إدارة الأعمال الذكي
        </p>

        {/* Loading Dots */}
        <div className="mt-8 flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

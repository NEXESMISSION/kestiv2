'use client'

import { useState, useEffect, useCallback } from 'react'
import { detectPlatform, isRunningAsApp, type PlatformInfo } from './platform'

// BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Extend Window interface
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

export interface UseInstallReturn {
  // State
  platform: PlatformInfo
  isInstallable: boolean
  isInstalled: boolean
  showSafariModal: boolean
  
  // Actions
  installApp: () => Promise<void>
  openSafariModal: () => void
  closeSafariModal: () => void
  redirectToSafari: () => void
  
  // Status
  installStatus: 'idle' | 'pending' | 'installed' | 'dismissed'
}

export function useInstall(): UseInstallReturn {
  const [platform, setPlatform] = useState<PlatformInfo>(() => detectPlatform())
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showSafariModal, setShowSafariModal] = useState(false)
  const [installStatus, setInstallStatus] = useState<'idle' | 'pending' | 'installed' | 'dismissed'>('idle')

  // Initialize platform detection
  useEffect(() => {
    const platformInfo = detectPlatform()
    setPlatform(platformInfo)
    setIsInstalled(isRunningAsApp())

    // Check URL for Safari redirect flag
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('install') === 'safari' && platformInfo.platform === 'ios-safari') {
      // Auto-open install modal when redirected from another browser
      setTimeout(() => setShowSafariModal(true), 500)
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Listen for install prompt event (Android/Desktop Chrome)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setInstallStatus('installed')
      // Store install state
      localStorage.setItem('kesti-pwa-installed', 'true')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Check if already installed
    if (localStorage.getItem('kesti-pwa-installed') === 'true') {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Determine if app is installable
  const isInstallable = !isInstalled && (
    // Android/Desktop with prompt available
    deferredPrompt !== null ||
    // iOS Safari (manual install)
    platform.platform === 'ios-safari' ||
    // iOS other browsers (redirect to Safari)
    platform.platform === 'ios-other'
  )

  // Native install for Android/Desktop
  const installNative = useCallback(async () => {
    if (!deferredPrompt) return

    setInstallStatus('pending')
    deferredPrompt.prompt()

    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallStatus('installed')
      setIsInstalled(true)
    } else {
      setInstallStatus('dismissed')
    }
    setDeferredPrompt(null)
  }, [deferredPrompt])

  // Main install action - handles all platforms
  const installApp = useCallback(async () => {
    switch (platform.platform) {
      case 'android':
      case 'desktop':
        if (deferredPrompt) {
          await installNative()
        } else {
          // Fallback: open Safari modal for instructions
          setShowSafariModal(true)
        }
        break

      case 'ios-safari':
        setShowSafariModal(true)
        break

      case 'ios-other':
        // Redirect to Safari
        redirectToSafari()
        break

      default:
        setShowSafariModal(true)
    }
  }, [platform.platform, deferredPrompt, installNative])

  // Open Safari modal manually
  const openSafariModal = useCallback(() => {
    setShowSafariModal(true)
  }, [])

  // Close Safari modal
  const closeSafariModal = useCallback(() => {
    setShowSafariModal(false)
  }, [])

  // Redirect to Safari with install flag
  const redirectToSafari = useCallback(() => {
    const currentUrl = window.location.origin + '/login?install=safari'
    // Use x-safari scheme to open in Safari
    window.location.href = `x-safari-${currentUrl}`
    // Fallback after delay
    setTimeout(() => {
      window.location.href = currentUrl
    }, 100)
  }, [])

  return {
    platform,
    isInstallable,
    isInstalled,
    showSafariModal,
    installApp,
    openSafariModal,
    closeSafariModal,
    redirectToSafari,
    installStatus
  }
}

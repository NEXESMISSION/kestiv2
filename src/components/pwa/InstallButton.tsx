'use client'

import { Download, Smartphone, ExternalLink } from 'lucide-react'
import { useInstall } from '@/lib/pwa/useInstall'
import SafariInstallModal from './SafariInstallModal'

interface InstallButtonProps {
  variant?: 'primary' | 'secondary' | 'minimal'
  className?: string
  showText?: boolean
}

export default function InstallButton({ 
  variant = 'primary', 
  className = '',
  showText = true 
}: InstallButtonProps) {
  const {
    platform,
    isInstallable,
    isInstalled,
    showSafariModal,
    installApp,
    closeSafariModal
  } = useInstall()

  // Don't render if already installed or in standalone mode
  if (isInstalled || platform.isStandalone) {
    return null
  }

  // Don't render if not installable (desktop without prompt)
  if (!isInstallable && platform.platform === 'desktop') {
    return null
  }

  // Get button text based on platform
  const getButtonText = () => {
    switch (platform.platform) {
      case 'android':
        return 'تثبيت التطبيق'
      case 'ios-safari':
        return 'تثبيت التطبيق'
      case 'ios-other':
        return 'فتح في Safari'
      case 'desktop':
        return 'تثبيت التطبيق'
      default:
        return 'تثبيت التطبيق'
    }
  }

  // Get icon based on platform
  const Icon = platform.platform === 'ios-other' ? ExternalLink : Download

  // Base styles
  const baseStyles = 'flex items-center justify-center gap-2 font-semibold rounded-xl transition-all active:scale-95'
  
  // Variant styles
  const variantStyles = {
    primary: 'px-6 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 hover:-translate-y-0.5',
    secondary: 'px-5 py-3 bg-white/10 backdrop-blur text-white border border-white/20 hover:bg-white/20',
    minimal: 'px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200'
  }

  return (
    <>
      <button
        onClick={installApp}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        aria-label={getButtonText()}
      >
        <Icon className="w-5 h-5" />
        {showText && <span>{getButtonText()}</span>}
        {platform.platform === 'android' && (
          <Smartphone className="w-4 h-4 opacity-70" />
        )}
      </button>

      {/* Safari Install Modal */}
      <SafariInstallModal 
        isOpen={showSafariModal} 
        onClose={closeSafariModal} 
      />
    </>
  )
}

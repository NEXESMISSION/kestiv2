// Platform detection utilities for PWA install

export interface PlatformInfo {
  isAndroid: boolean
  isIOS: boolean
  isIPhone: boolean
  isIPad: boolean
  isSafari: boolean
  isChrome: boolean
  isFirefox: boolean
  isBrave: boolean
  isStandalone: boolean
  supportsInstall: boolean
  platform: 'android' | 'ios-safari' | 'ios-other' | 'desktop' | 'unknown'
}

export function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined') {
    return {
      isAndroid: false,
      isIOS: false,
      isIPhone: false,
      isIPad: false,
      isSafari: false,
      isChrome: false,
      isFirefox: false,
      isBrave: false,
      isStandalone: false,
      supportsInstall: false,
      platform: 'unknown'
    }
  }

  const ua = navigator.userAgent.toLowerCase()
  const vendor = navigator.vendor?.toLowerCase() || ''

  // Detect iOS devices
  const isIOS = /iphone|ipad|ipod/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isIPhone = /iphone/.test(ua)
  const isIPad = /ipad/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  // Detect Android
  const isAndroid = /android/.test(ua)

  // Detect browsers on iOS (Safari is the only one that supports PWA install on iOS)
  // Safari: No Chrome or CriOS, no Firefox/FxiOS, and has Safari in UA
  const isCriOS = /crios/.test(ua) // Chrome on iOS
  const isFxiOS = /fxios/.test(ua) // Firefox on iOS
  const isEdgiOS = /edgios/.test(ua) // Edge on iOS
  const isSafari = isIOS && !isCriOS && !isFxiOS && !isEdgiOS && /safari/.test(ua)

  // Detect desktop browsers
  const isChrome = /chrome/.test(ua) && vendor.includes('google') && !isCriOS
  const isFirefox = /firefox/.test(ua) && !isFxiOS
  const isBrave = (navigator as unknown as { brave?: { isBrave?: () => Promise<boolean> } }).brave?.isBrave !== undefined

  // Detect standalone mode (already installed as PWA)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')

  // Determine if install is supported
  // Android: Native install prompt works
  // iOS Safari: Manual install via Share menu
  // iOS other browsers: Not supported, needs redirect to Safari
  // Desktop Chrome/Edge: Native install prompt works
  let supportsInstall = false
  let platform: PlatformInfo['platform'] = 'unknown'

  if (isAndroid) {
    supportsInstall = true
    platform = 'android'
  } else if (isIOS) {
    if (isSafari) {
      supportsInstall = true // Manual via Share menu
      platform = 'ios-safari'
    } else {
      supportsInstall = false // Chrome/Firefox on iOS can't install PWAs
      platform = 'ios-other'
    }
  } else {
    // Desktop
    supportsInstall = isChrome || /edg/.test(ua) // Chrome and Edge support install
    platform = 'desktop'
  }

  return {
    isAndroid,
    isIOS,
    isIPhone,
    isIPad,
    isSafari,
    isChrome,
    isFirefox,
    isBrave,
    isStandalone,
    supportsInstall,
    platform
  }
}

// Check if the app is running in standalone mode
export function isRunningAsApp(): boolean {
  if (typeof window === 'undefined') return false
  
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
}

// Get install instructions based on platform
export function getInstallInstructions(platform: PlatformInfo['platform']): string {
  switch (platform) {
    case 'ios-safari':
      return 'اضغط على زر المشاركة ثم "إضافة إلى الشاشة الرئيسية"'
    case 'ios-other':
      return 'افتح التطبيق في Safari لتثبيته'
    case 'android':
      return 'اضغط على "تثبيت التطبيق" لإضافته للشاشة الرئيسية'
    case 'desktop':
      return 'اضغط على أيقونة التثبيت في شريط العنوان'
    default:
      return 'قم بإضافة التطبيق للشاشة الرئيسية'
  }
}

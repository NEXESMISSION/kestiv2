/**
 * Security utilities for input sanitization and validation
 */

// Sanitize string input to prevent XSS
export function sanitizeString(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim()
}

// Sanitize for database - remove potential SQL injection characters
export function sanitizeForDB(input: string): string {
  return input
    .replace(/[\\$'"]/g, '')
    .trim()
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

// Validate phone number (international format)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[+]?[\d\s-]{7,20}$/
  return phoneRegex.test(phone)
}

// Validate PIN code
export function isValidPIN(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}

// Generate secure random string for tokens
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length]
  }
  return result
}

// Rate limiting helper (client-side)
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map()
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now()
    const record = this.attempts.get(key)
    
    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + this.windowMs })
      return true
    }
    
    if (record.count >= this.maxAttempts) {
      return false
    }
    
    record.count++
    return true
  }
  
  getRemainingTime(key: string): number {
    const record = this.attempts.get(key)
    if (!record) return 0
    return Math.max(0, Math.ceil((record.resetTime - Date.now()) / 1000))
  }
  
  reset(key: string): void {
    this.attempts.delete(key)
  }
}

// Mask sensitive data for logging
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@')
  if (!domain) return '***'
  const maskedName = name.length > 2 
    ? name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
    : '*'.repeat(name.length)
  return `${maskedName}@${domain}`
}

export function maskPhone(phone: string): string {
  if (phone.length < 4) return '***'
  return '*'.repeat(phone.length - 4) + phone.slice(-4)
}

// Check password strength
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  let score = 0
  
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  
  if (score <= 2) return 'weak'
  if (score <= 4) return 'medium'
  return 'strong'
}

// Session timeout configuration
export const SESSION_CONFIG = {
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  idleTimeout: 30 * 60, // 30 minutes of inactivity
  refreshThreshold: 24 * 60 * 60 // Refresh token if less than 24 hours remaining
}

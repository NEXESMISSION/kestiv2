'use client'

import { useState, useEffect, useCallback } from 'react'
import { Lock, Delete, X, AlertCircle, Timer } from 'lucide-react'

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 30 // seconds

interface PINModalProps {
  isOpen: boolean
  correctPin: string | null
  onSuccess: () => void
  onCancel?: () => void
}

export default function PINModal({
  isOpen,
  correctPin,
  onSuccess,
  onCancel
}: PINModalProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [lockoutRemaining, setLockoutRemaining] = useState(0)

  const pinLength = 6 // Always show 6 PIN dots
  const isLocked = lockedUntil !== null && Date.now() < lockedUntil

  // Load lockout state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('pin_lockout')
    if (stored) {
      const lockTime = parseInt(stored)
      if (Date.now() < lockTime) {
        setLockedUntil(lockTime)
      } else {
        localStorage.removeItem('pin_lockout')
        localStorage.removeItem('pin_attempts')
      }
    }
    const storedAttempts = localStorage.getItem('pin_attempts')
    if (storedAttempts) {
      setAttempts(parseInt(storedAttempts))
    }
  }, [isOpen])

  // Lockout countdown timer
  useEffect(() => {
    if (!lockedUntil) return
    
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockedUntil(null)
        setLockoutRemaining(0)
        setAttempts(0)
        localStorage.removeItem('pin_lockout')
        localStorage.removeItem('pin_attempts')
      } else {
        setLockoutRemaining(remaining)
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [lockedUntil])

  const handleNumberClick = useCallback((num: string) => {
    if (isLocked || pin.length >= 6) return
    setPin(prev => prev + num)
    setError(false)
  }, [pin, isLocked])

  const handleDelete = useCallback(() => {
    if (isLocked) return
    setPin(prev => prev.slice(0, -1))
    setError(false)
  }, [isLocked])

  const handleClear = useCallback(() => {
    if (isLocked) return
    setPin('')
    setError(false)
  }, [isLocked])

  // Manual PIN check function with lockout
  const handleSubmit = useCallback(() => {
    if (isLocked || pin.length < 4 || pin.length > 6) return
    
    if (pin === correctPin) {
      onSuccess()
      setPin('')
      setAttempts(0)
      localStorage.removeItem('pin_attempts')
      localStorage.removeItem('pin_lockout')
    } else {
      setError(true)
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      localStorage.setItem('pin_attempts', String(newAttempts))
      
      // Lock after MAX_ATTEMPTS
      if (newAttempts >= MAX_ATTEMPTS) {
        const lockTime = Date.now() + (LOCKOUT_DURATION * 1000)
        setLockedUntil(lockTime)
        localStorage.setItem('pin_lockout', String(lockTime))
      }
      
      setTimeout(() => setPin(''), 500)
    }
  }, [pin, correctPin, onSuccess, attempts, isLocked])

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleNumberClick(e.key)
      } else if (e.key === 'Backspace') {
        handleDelete()
      } else if (e.key === 'Escape' && onCancel) {
        onCancel()
      } else if (e.key === 'Enter') {
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleNumberClick, handleDelete, onCancel, handleSubmit])

  if (!isOpen) return null

  // If no PIN is set, auto-succeed
  if (!correctPin) {
    onSuccess()
    return null
  }

  return (
    <div className="fixed inset-0 bg-gray-900/95 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 text-center bg-gradient-to-br from-primary-600 to-primary-700">
          <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">أدخل رمز العرف</h2>
          <p className="text-primary-100 text-sm mt-1">للوصول إلى لوحة الإدارة</p>
        </div>

        {/* PIN Display */}
        <div className="p-6">
          <div className="flex justify-center gap-2 mb-6">
            {Array.from({ length: pinLength }).map((_, i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                  error 
                    ? 'border-red-500 bg-red-50' 
                    : pin.length > i 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-300'
                }`}
              >
                {pin.length > i && (
                  <div className={`w-2.5 h-2.5 rounded-full ${error ? 'bg-red-500' : 'bg-primary-600'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Lockout Message */}
          {isLocked && (
            <div className="flex items-center justify-center gap-2 bg-red-50 text-red-600 text-sm mb-4 p-3 rounded-xl">
              <Timer className="w-4 h-4" />
              <span>محاولات كثيرة! انتظر {lockoutRemaining} ثانية</span>
            </div>
          )}

          {/* Error Message */}
          {error && !isLocked && (
            <div className="flex items-center justify-center gap-2 text-red-600 text-sm mb-4">
              <AlertCircle className="w-4 h-4" />
              <span>رمز خاطئ ({MAX_ATTEMPTS - attempts} محاولات متبقية)</span>
            </div>
          )}

          {attempts >= 3 && !isLocked && (
            <div className="text-center text-sm text-gray-500 mb-4">
              نسيت الرمز؟ تواصل مع الدعم الفني
            </div>
          )}

          {/* Numpad - LTR for proper number order */}
          <div className={`grid grid-cols-3 gap-2 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`} dir="ltr">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleNumberClick(String(num))}
                disabled={isLocked}
                className="h-14 rounded-xl font-bold text-xl bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 transition-all disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              disabled={isLocked}
              className="h-14 rounded-xl font-bold text-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-all disabled:opacity-50"
            >
              <X className="w-5 h-5 mx-auto" />
            </button>
            <button
              onClick={() => handleNumberClick('0')}
              disabled={isLocked}
              className="h-14 rounded-xl font-bold text-xl bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 transition-all disabled:opacity-50"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              disabled={isLocked}
              className="h-14 rounded-xl font-bold text-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all disabled:opacity-50"
            >
              <Delete className="w-5 h-5 mx-auto" />
            </button>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={pin.length < 4 || isLocked}
            className={`w-full mt-4 py-3.5 rounded-xl font-bold text-lg transition-all ${
              pin.length >= 4 && !isLocked
                ? 'bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLocked ? `مقفل (${lockoutRemaining}s)` : 'تأكيد'}
          </button>
        </div>

        {/* Cancel Button (if allowed) */}
        {onCancel && (
          <div className="px-6 pb-6">
            <button
              onClick={onCancel}
              className="w-full py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              العودة
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

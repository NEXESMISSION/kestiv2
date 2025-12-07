'use client'

import { useState, useEffect, useCallback } from 'react'
import { Lock, Delete, X, AlertCircle } from 'lucide-react'

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

  const pinLength = correctPin?.length || 4

  const handleNumberClick = useCallback((num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num)
      setError(false)
    }
  }, [pin])

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1))
    setError(false)
  }, [])

  const handleClear = useCallback(() => {
    setPin('')
    setError(false)
  }, [])

  // Check PIN when matching length entered
  useEffect(() => {
    if (pin.length === pinLength && pin.length >= 4) {
      if (pin === correctPin) {
        onSuccess()
        setPin('')
        setAttempts(0)
      } else {
        setError(true)
        setAttempts(prev => prev + 1)
        setTimeout(() => {
          setPin('')
        }, 500)
      }
    }
  }, [pin, correctPin, pinLength, onSuccess])

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
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleNumberClick, handleDelete, onCancel])

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

          {/* Error Message */}
          {error && (
            <div className="flex items-center justify-center gap-2 text-red-600 text-sm mb-4">
              <AlertCircle className="w-4 h-4" />
              <span>رمز خاطئ، حاول مرة أخرى</span>
            </div>
          )}

          {attempts >= 3 && (
            <div className="text-center text-sm text-gray-500 mb-4">
              نسيت الرمز؟ تواصل مع الدعم الفني
            </div>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleNumberClick(String(num))}
                className="h-14 rounded-xl font-bold text-xl bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 transition-all"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="h-14 rounded-xl font-bold text-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-all"
            >
              <X className="w-5 h-5 mx-auto" />
            </button>
            <button
              onClick={() => handleNumberClick('0')}
              className="h-14 rounded-xl font-bold text-xl bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 transition-all"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="h-14 rounded-xl font-bold text-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all"
            >
              <Delete className="w-5 h-5 mx-auto" />
            </button>
          </div>
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

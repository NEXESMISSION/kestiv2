'use client'

import { X, Share, Plus, CheckCircle } from 'lucide-react'

interface SafariInstallModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SafariInstallModal({ isOpen, onClose }: SafariInstallModalProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-x-4 bottom-4 z-[9999] animate-slide-up">
        <div className="bg-white rounded-3xl shadow-2xl max-w-sm mx-auto overflow-hidden">
          {/* Header */}
          <div className="relative p-6 pb-4 text-center bg-gradient-to-b from-primary-50 to-white">
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
            
            {/* App Icon */}
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg overflow-hidden">
              <img src="/kesti.png" alt="Kesti Pro" className="w-full h-full object-cover" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-1">تثبيت Kesti Pro</h3>
            <p className="text-gray-500 text-sm">للوصول السريع من الشاشة الرئيسية</p>
          </div>

          {/* Instructions */}
          <div className="p-6 space-y-4">
            {/* Step 1 */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                <Share className="w-6 h-6 text-primary-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-sm font-bold flex items-center justify-center">1</span>
                  <span className="font-semibold text-gray-900">اضغط على</span>
                  <div className="inline-flex items-center px-2 py-1 bg-gray-100 rounded-lg">
                    <Share className="w-4 h-4 text-primary-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1 mr-8">زر المشاركة في الأسفل</p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-px h-4 bg-gray-200"></div>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Plus className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-600 text-white text-sm font-bold flex items-center justify-center">2</span>
                  <span className="font-semibold text-gray-900">إضافة إلى الشاشة الرئيسية</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 mr-8">ثم اضغط "إضافة" للتأكيد</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 pt-0">
            <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-xl text-green-700 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>ستبقى مسجل الدخول تلقائياً</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </>
  )
}

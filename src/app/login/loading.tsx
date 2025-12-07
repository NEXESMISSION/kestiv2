export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center" dir="rtl">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-white/30 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-white rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-white/80 text-sm">جاري التحميل...</p>
      </div>
    </div>
  )
}

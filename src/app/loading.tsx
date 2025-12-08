export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
      <div className="text-center">
        <div className="w-8 h-8 mx-auto border-3 border-gray-200 border-t-primary-600 rounded-full" style={{ animation: 'spin 0.4s linear infinite' }} />
        <p className="mt-2 text-gray-400 text-xs">جاري التحميل...</p>
      </div>
    </div>
  )
}

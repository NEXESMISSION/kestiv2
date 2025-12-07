export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-6xl mx-auto flex justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto p-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 border animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border p-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-full mb-4"></div>
          {[1,2,3,4].map(i => <div key={i} className="h-12 bg-gray-100 rounded mb-2"></div>)}
        </div>
      </div>
    </div>
  )
}

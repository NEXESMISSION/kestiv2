export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-6 w-28 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </header>
      <div className="p-4 space-y-4">
        <div className="h-24 bg-gradient-to-br from-red-200 to-red-300 rounded-2xl animate-pulse"></div>
        <div className="flex gap-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-10 w-20 bg-white rounded-xl animate-pulse"></div>
          ))}
        </div>
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* Header skeleton */}
      <header className="bg-white shadow-sm p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex gap-2">
            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </header>
      
      {/* Categories skeleton */}
      <div className="p-3">
        <div className="flex gap-2 overflow-hidden">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-10 w-24 bg-gray-200 rounded-xl animate-pulse flex-shrink-0"></div>
          ))}
        </div>
      </div>
      
      {/* Products grid skeleton */}
      <div className="p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[1,2,3,4,5,6,7,8,9,10].map(i => (
            <div key={i} className="bg-white rounded-xl p-3 animate-pulse">
              <div className="w-full h-20 bg-gray-200 rounded-lg mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

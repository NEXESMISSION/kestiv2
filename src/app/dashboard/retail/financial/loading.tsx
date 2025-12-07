export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow-sm p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </header>
      <div className="p-4 space-y-4">
        <div className="flex gap-2 bg-white p-1 rounded-xl">
          {[1,2,3].map(i => (
            <div key={i} className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-gradient-to-br from-green-200 to-green-300 rounded-2xl animate-pulse"></div>
          <div className="h-24 bg-gradient-to-br from-red-200 to-red-300 rounded-2xl animate-pulse"></div>
        </div>
        <div className="h-32 bg-gradient-to-br from-blue-200 to-blue-300 rounded-2xl animate-pulse"></div>
      </div>
    </div>
  )
}

// Ultra-minimal global loader - instant display
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )
}

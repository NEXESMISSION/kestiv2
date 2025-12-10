'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Home, Users, FolderKanban, LogOut, Calendar, History,
  Loader2, Camera, RefreshCw, Menu, X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, FreelancerClient, FreelancerProject, FreelancerExpense, FreelancerService, FreelancerPayment } from '@/types/database'

// Components
import HomeTab from './components/HomeTab'
import ProjectsTab from './components/ProjectsTab'
import ClientsTab from './components/ClientsTab'
import CalendarTab from './components/CalendarTab'
import HistoryTab from './components/HistoryTab'

interface FreelancerDashboardProps {
  userId: string
  profile: Profile
}

type TabType = 'home' | 'projects' | 'clients' | 'calendar' | 'history'

export default function FreelancerDashboard({ userId, profile }: FreelancerDashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Pull to refresh (mobile only)
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const PULL_THRESHOLD = 80
  
  // Data states
  const [clients, setClients] = useState<FreelancerClient[]>([])
  const [projects, setProjects] = useState<FreelancerProject[]>([])
  const [expenses, setExpenses] = useState<FreelancerExpense[]>([])
  const [payments, setPayments] = useState<FreelancerPayment[]>([])
  const [services, setServices] = useState<FreelancerService[]>([])
  
  // Stats
  const [stats, setStats] = useState({
    todayIncome: 0,
    todayExpenses: 0,
    monthIncome: 0,
    monthExpenses: 0,
    totalCredit: 0,
    activeProjects: 0
  })

  // Pull to refresh handlers (mobile)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return
    
    const currentY = e.touches[0].clientY
    const diff = currentY - startY.current
    
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, 120))
    }
  }, [isPulling, isRefreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return
    
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(60)
      await fetchData()
      setIsRefreshing(false)
    }
    
    setPullDistance(0)
    setIsPulling(false)
  }, [isPulling, pullDistance, isRefreshing])

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setSidebarOpen(false)
  }

  // Fetch all data
  const fetchData = async () => {
    if (!isRefreshing) setIsLoading(true)
    const supabase = createClient()
    
    try {
      // Fetch clients
      const { data: clientsData } = await supabase
        .from('freelancer_clients')
        .select('*')
        .eq('business_id', userId)
        .order('created_at', { ascending: false })
      
      // Fetch projects with client names
      const { data: projectsData } = await supabase
        .from('freelancer_projects')
        .select('*, freelancer_clients(name)')
        .eq('business_id', userId)
        .order('created_at', { ascending: false })
      
      // Fetch all expenses (for filtering)
      const { data: expensesData } = await supabase
        .from('freelancer_expenses')
        .select('*')
        .eq('business_id', userId)
        .order('date', { ascending: false })
      
      // Fetch services
      const { data: servicesData } = await supabase
        .from('freelancer_services')
        .select('*')
        .eq('business_id', userId)
        .eq('is_active', true)
        .order('name')
      
      // Fetch all payments (for filtering)
      const { data: paymentsData } = await supabase
        .from('freelancer_payments')
        .select('*')
        .eq('business_id', userId)
        .order('created_at', { ascending: false })
      
      // Process data
      const processedProjects = (projectsData || []).map((p: any) => ({
        ...p,
        client_name: (p.freelancer_clients as { name: string } | null)?.name || 'غير معروف'
      }))
      
      setClients(clientsData || [])
      setProjects(processedProjects)
      setExpenses(expensesData || [])
      setPayments(paymentsData || [])
      setServices(servicesData || [])
      
      // Calculate basic stats (filtered stats calculated in HomeTab)
      const today = new Date().toISOString().split('T')[0]
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const todayPayments = (paymentsData || []).filter((p: FreelancerPayment) => 
        p.created_at.startsWith(today)
      )
      const monthPayments = (paymentsData || []).filter((p: FreelancerPayment) => 
        new Date(p.created_at) >= startOfMonth
      )
      const todayExpensesList = (expensesData || []).filter((e: FreelancerExpense) => e.date === today)
      const monthExpensesList = (expensesData || []).filter((e: FreelancerExpense) => 
        new Date(e.date) >= startOfMonth
      )
      
      setStats({
        todayIncome: todayPayments.reduce((sum: number, p: FreelancerPayment) => sum + Number(p.amount), 0),
        todayExpenses: todayExpensesList.reduce((sum: number, e: FreelancerExpense) => sum + Number(e.amount), 0),
        monthIncome: monthPayments.reduce((sum: number, p: FreelancerPayment) => sum + Number(p.amount), 0),
        monthExpenses: monthExpensesList.reduce((sum: number, e: FreelancerExpense) => sum + Number(e.amount), 0),
        totalCredit: (clientsData || []).reduce((sum: number, c: FreelancerClient) => sum + Number(c.total_credit), 0),
        activeProjects: processedProjects.filter((p: FreelancerProject & {client_name: string}) => 
          p.status === 'in_progress' || p.status === 'pending'
        ).length
      })
      
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [userId])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const tabs = [
    { id: 'home' as TabType, label: 'الرئيسية', icon: Home },
    { id: 'projects' as TabType, label: 'المشاريع', icon: FolderKanban },
    { id: 'clients' as TabType, label: 'العملاء', icon: Users },
    { id: 'calendar' as TabType, label: 'التقويم', icon: Calendar },
    { id: 'history' as TabType, label: 'السجل', icon: History },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 bg-white border-l border-gray-200 fixed right-0 top-0 h-full z-40">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800">{profile.full_name}</h1>
              <p className="text-sm text-gray-500">لوحة المستقل</p>
            </div>
          </div>
        </div>
        
        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-200' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            )
          })}
        </nav>
        
        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-800 text-sm">{profile.full_name}</h1>
                  <p className="text-xs text-gray-500">مستقل</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <nav className="p-4 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-primary-500 text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </nav>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">تسجيل الخروج</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div 
        ref={containerRef}
        className="flex-1 lg:mr-64 xl:mr-72 overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull to Refresh Indicator (Mobile) */}
        <div 
          className="flex items-center justify-center overflow-hidden transition-all duration-200 lg:hidden"
          style={{ height: pullDistance }}
        >
          <div className={`flex items-center gap-2 text-primary-600 ${isRefreshing ? 'animate-pulse' : ''}`}>
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''} ${pullDistance >= PULL_THRESHOLD ? 'text-primary-600' : 'text-gray-400'}`} />
            <span className="text-sm font-medium">
              {isRefreshing ? 'جاري التحديث...' : pullDistance >= PULL_THRESHOLD ? 'أفلت للتحديث' : 'اسحب للتحديث'}
            </span>
          </div>
        </div>

        {/* Mobile Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30 lg:hidden">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="p-2 -mr-2 hover:bg-gray-100 rounded-lg">
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-gray-800">{profile.full_name}</h1>
                  <p className="text-xs text-gray-500">مستقل</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Tabs */}
        <nav className="bg-white border-b border-gray-200 sticky top-[60px] z-20 lg:hidden">
          <div className="px-2">
            <div className="flex items-center justify-around py-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
                      isActive 
                        ? 'text-primary-600 bg-primary-50' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </nav>

        {/* Desktop Header */}
        <header className="hidden lg:block bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h1>
                <p className="text-sm text-gray-500">إدارة أعمالك بسهولة</p>
              </div>
              <button
                onClick={fetchData}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">تحديث</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : (
            <>
              {activeTab === 'home' && (
                <HomeTab 
                  stats={stats}
                  projects={projects}
                  clients={clients}
                  services={services}
                  payments={payments}
                  expenses={expenses}
                  userId={userId}
                  onRefresh={fetchData}
                />
              )}
              {activeTab === 'projects' && (
                <ProjectsTab 
                  projects={projects}
                  clients={clients}
                  userId={userId}
                  onRefresh={fetchData}
                />
              )}
              {activeTab === 'clients' && (
                <ClientsTab 
                  clients={clients}
                  projects={projects}
                  userId={userId}
                  onRefresh={fetchData}
                />
              )}
              {activeTab === 'calendar' && (
                <CalendarTab 
                  userId={userId}
                  projects={projects}
                  clients={clients}
                  onRefresh={fetchData}
                />
              )}
              {activeTab === 'history' && (
                <HistoryTab 
                  payments={payments}
                  expenses={expenses}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

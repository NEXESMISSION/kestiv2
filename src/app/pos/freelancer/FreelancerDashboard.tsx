'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Home, Users, FolderKanban, LogOut, Calendar, History,
  Loader2, Camera, RefreshCw
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
  
  // Pull to refresh
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

  // Pull to refresh handlers
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
      const processedProjects = (projectsData || []).map(p => ({
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
      
      const todayPayments = (paymentsData || []).filter(p => 
        p.created_at.startsWith(today)
      )
      const monthPayments = (paymentsData || []).filter(p => 
        new Date(p.created_at) >= startOfMonth
      )
      const todayExpensesList = (expensesData || []).filter(e => e.date === today)
      const monthExpensesList = (expensesData || []).filter(e => 
        new Date(e.date) >= startOfMonth
      )
      
      setStats({
        todayIncome: todayPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        todayExpenses: todayExpensesList.reduce((sum, e) => sum + Number(e.amount), 0),
        monthIncome: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        monthExpenses: monthExpensesList.reduce((sum, e) => sum + Number(e.amount), 0),
        totalCredit: (clientsData || []).reduce((sum, c) => sum + Number(c.total_credit), 0),
        activeProjects: processedProjects.filter(p => 
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
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      <div 
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance }}
      >
        <div className={`flex items-center gap-2 text-primary-600 ${isRefreshing ? 'animate-pulse' : ''}`}>
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''} ${pullDistance >= PULL_THRESHOLD ? 'text-primary-600' : 'text-gray-400'}`} />
          <span className="text-sm font-medium">
            {isRefreshing ? 'جاري التحديث...' : pullDistance >= PULL_THRESHOLD ? 'أفلت للتحديث' : 'اسحب للتحديث'}
          </span>
        </div>
      </div>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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

      {/* Top Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200 sticky top-[60px] z-30">
        <div className="max-w-lg mx-auto px-2">
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

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-4">
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
  )
}

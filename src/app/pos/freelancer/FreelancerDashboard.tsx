'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Home, Users, FolderKanban, Plus, Minus, Settings, LogOut,
  TrendingUp, TrendingDown, Clock, Calendar, ChevronLeft,
  Loader2, DollarSign, Camera, Video, X, Check
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, FreelancerClient, FreelancerProject, FreelancerExpense, FreelancerService, ProjectStatus } from '@/types/database'

// Components
import HomeTab from './components/HomeTab'
import ProjectsTab from './components/ProjectsTab'
import ClientsTab from './components/ClientsTab'
import SettingsTab from './components/SettingsTab'
import CalendarTab from './components/CalendarTab'

interface FreelancerDashboardProps {
  userId: string
  profile: Profile
}

type TabType = 'home' | 'projects' | 'clients' | 'calendar' | 'settings'

export default function FreelancerDashboard({ userId, profile }: FreelancerDashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [isLoading, setIsLoading] = useState(true)
  
  // Data states
  const [clients, setClients] = useState<FreelancerClient[]>([])
  const [projects, setProjects] = useState<FreelancerProject[]>([])
  const [expenses, setExpenses] = useState<FreelancerExpense[]>([])
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

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true)
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
      
      // Fetch expenses for this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const { data: expensesData } = await supabase
        .from('freelancer_expenses')
        .select('*')
        .eq('business_id', userId)
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .order('date', { ascending: false })
      
      // Fetch services
      const { data: servicesData } = await supabase
        .from('freelancer_services')
        .select('*')
        .eq('business_id', userId)
        .eq('is_active', true)
        .order('name')
      
      // Fetch payments for stats
      const { data: paymentsData } = await supabase
        .from('freelancer_payments')
        .select('amount, created_at')
        .eq('business_id', userId)
        .gte('created_at', startOfMonth.toISOString())
      
      // Process data
      const processedProjects = (projectsData || []).map(p => ({
        ...p,
        client_name: (p.freelancer_clients as { name: string } | null)?.name || 'غير معروف'
      }))
      
      setClients(clientsData || [])
      setProjects(processedProjects)
      setExpenses(expensesData || [])
      setServices(servicesData || [])
      
      // Calculate stats
      const today = new Date().toISOString().split('T')[0]
      const todayPayments = (paymentsData || []).filter(p => 
        p.created_at.startsWith(today)
      )
      const todayExpensesList = (expensesData || []).filter(e => e.date === today)
      
      setStats({
        todayIncome: todayPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        todayExpenses: todayExpensesList.reduce((sum, e) => sum + Number(e.amount), 0),
        monthIncome: (paymentsData || []).reduce((sum, p) => sum + Number(p.amount), 0),
        monthExpenses: (expensesData || []).reduce((sum, e) => sum + Number(e.amount), 0),
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
    { id: 'settings' as TabType, label: 'الخدمات', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-20">
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
                userId={userId}
                onRefresh={fetchData}
              />
            )}
            {activeTab === 'projects' && (
              <ProjectsTab 
                projects={projects}
                clients={clients}
                services={services}
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
                onRefresh={fetchData}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsTab 
                services={services}
                userId={userId}
                onRefresh={fetchData}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-around py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                    isActive 
                      ? 'text-primary-600 bg-primary-50' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}

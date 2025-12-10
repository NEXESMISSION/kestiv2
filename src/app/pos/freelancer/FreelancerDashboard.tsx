'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, TrendingUp, TrendingDown, Users, 
  LogOut, Loader2, X, Check, Phone, Calendar as CalendarIcon,
  History, Settings, RefreshCw, Search, AlertCircle, Wallet,
  ChevronLeft, ChevronRight, Tag, Edit2, Trash2
} from 'lucide-react'
import { createClient, resetClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

interface FreelancerDashboardProps {
  userId: string
  profile: Profile
}

// Data types
interface Client {
  id: string
  name: string
  phone: string | null
  notes: string | null
  total_spent: number
  total_credit: number
  created_at: string
}

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  color: string
  is_active: boolean
}

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  description: string | null
  category_id: string | null
  category_name?: string
  client_id: string | null
  client_name?: string
  payment_method: 'cash' | 'credit'
  date: string
  created_at: string
}

interface CalendarEvent {
  id: string
  title: string
  date: string
  type: string
  is_done: boolean
  notes: string | null
}

const DEFAULT_INCOME_CATEGORIES = ['خدمات', 'استشارات', 'مشاريع', 'أخرى']
const DEFAULT_EXPENSE_CATEGORIES = ['نقل', 'معدات', 'طعام', 'اشتراكات', 'أخرى']
const CATEGORY_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export default function FreelancerDashboard({ userId, profile }: FreelancerDashboardProps) {
  const router = useRouter()
  const supabase = createClient()
  
  // UI State
  const [isLoading, setIsLoading] = useState(true)
  const [activeView, setActiveView] = useState<'home' | 'clients' | 'calendar' | 'history'>('home')
  
  // Modal states
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showDayModal, setShowDayModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Data states
  const [clients, setClients] = useState<Client[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([])
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  
  // Form states - Income
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeDescription, setIncomeDescription] = useState('')
  const [incomeClientId, setIncomeClientId] = useState('')
  const [incomePaymentMethod, setIncomePaymentMethod] = useState<'cash' | 'credit'>('cash')
  const [incomeCategoryId, setIncomeCategoryId] = useState('')
  
  // Form states - Expense
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseCategoryId, setExpenseCategoryId] = useState('')
  
  // Form states - Client
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  
  // Form states - Category
  const [categoryName, setCategoryName] = useState('')
  const [categoryType, setCategoryType] = useState<'income' | 'expense'>('income')
  const [categoryColor, setCategoryColor] = useState(CATEGORY_COLORS[0])
  
  // Form states - Event
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventNotes, setEventNotes] = useState('')
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  
  const [searchQuery, setSearchQuery] = useState('')
  
  // Stats
  const [stats, setStats] = useState({
    todayIncome: 0,
    todayExpense: 0,
    monthIncome: 0,
    monthExpense: 0,
    totalCredit: 0
  })

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Get clients
      const { data: clientsData } = await supabase
        .from('freelancer_clients')
        .select('*')
        .eq('business_id', userId)
        .order('name')
      setClients(clientsData || [])
      
      // Get categories
      const { data: categoriesData } = await supabase
        .from('freelancer_categories')
        .select('*')
        .eq('business_id', userId)
        .eq('is_active', true)
        .order('name')
      
      if (categoriesData && categoriesData.length > 0) {
        setIncomeCategories(categoriesData.filter((c: Category) => c.type === 'income'))
        setExpenseCategories(categoriesData.filter((c: Category) => c.type === 'expense'))
      }
      
      // Get payments (income)
      const { data: paymentsData } = await supabase
        .from('freelancer_payments')
        .select('*, freelancer_clients(name)')
        .eq('business_id', userId)
        .order('created_at', { ascending: false })
        .limit(200)
      
      // Get expenses
      const { data: expensesData } = await supabase
        .from('freelancer_expenses')
        .select('*')
        .eq('business_id', userId)
        .order('date', { ascending: false })
        .limit(200)
      
      // Get calendar events (reminders)
      const { data: eventsData } = await supabase
        .from('freelancer_reminders')
        .select('*')
        .eq('business_id', userId)
        .order('date')
      setCalendarEvents(eventsData || [])
      
      // Combine transactions
      const allTransactions: Transaction[] = [
        ...(paymentsData || []).map((p: any) => ({
          id: p.id,
          type: 'income' as const,
          amount: Number(p.amount),
          description: p.notes,
          category_id: p.category_id || null,
          category_name: p.category || null,
          client_id: p.client_id,
          client_name: p.freelancer_clients?.name,
          payment_method: p.payment_type === 'credit' ? 'credit' as const : 'cash' as const,
          date: p.created_at.split('T')[0],
          created_at: p.created_at
        })),
        ...(expensesData || []).map((e: any) => ({
          id: e.id,
          type: 'expense' as const,
          amount: Number(e.amount),
          description: e.description,
          category_id: e.category_id || null,
          category_name: e.category,
          client_id: null,
          payment_method: 'cash' as const,
          date: e.date,
          created_at: e.date + 'T12:00:00'
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setTransactions(allTransactions)
      
      // Calculate stats
      const today = new Date().toISOString().split('T')[0]
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      const todayIncome = (paymentsData || [])
        .filter((p: any) => p.created_at.startsWith(today))
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0)
      
      const todayExpense = (expensesData || [])
        .filter((e: any) => e.date === today)
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0)
      
      const monthIncome = (paymentsData || [])
        .filter((p: any) => new Date(p.created_at) >= startOfMonth)
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0)
      
      const monthExpense = (expensesData || [])
        .filter((e: any) => new Date(e.date) >= startOfMonth)
        .reduce((sum: number, e: any) => sum + Number(e.amount), 0)
      
      const totalCredit = (clientsData || [])
        .reduce((sum: number, c: Client) => sum + Number(c.total_credit || 0), 0)
      
      setStats({ todayIncome, todayExpense, monthIncome, monthExpense, totalCredit })
      
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handlers
  const handleLogout = async () => {
    await supabase.auth.signOut()
    resetClient() // Clear cached client for fresh session on next login
    window.location.href = '/login'
  }

  const handleAddIncome = async () => {
    if (!incomeAmount) return
    setIsSubmitting(true)
    
    try {
      const amount = parseFloat(incomeAmount)
      const categoryName = incomeCategories.find(c => c.id === incomeCategoryId)?.name || 'عام'
      
      // Record the payment
      const { data: insertData, error: insertError } = await supabase.from('freelancer_payments').insert({
        business_id: userId,
        client_id: incomeClientId || null,
        amount: amount,
        payment_type: incomePaymentMethod === 'credit' ? 'credit' : 'cash',
        category_id: incomeCategoryId || null,
        category: categoryName,
        notes: incomeDescription || null
      }).select()
      
      if (insertError) {
        console.error('Error inserting payment:', insertError)
        alert('خطأ في تسجيل الدخل')
        return
      }
      
      // If credit sale, update client's credit
      if (incomePaymentMethod === 'credit' && incomeClientId) {
        const client = clients.find(c => c.id === incomeClientId)
        if (client) {
          const newCredit = (client.total_credit || 0) + amount
          await supabase.from('freelancer_clients')
            .update({ 
              total_credit: newCredit,
              updated_at: new Date().toISOString()
            })
            .eq('id', incomeClientId)
        }
      }
      
      // If cash payment from a client, update their total_spent
      if (incomePaymentMethod === 'cash' && incomeClientId) {
        const client = clients.find(c => c.id === incomeClientId)
        if (client) {
          await supabase.from('freelancer_clients')
            .update({ 
              total_spent: (client.total_spent || 0) + amount,
              updated_at: new Date().toISOString()
            })
            .eq('id', incomeClientId)
        }
      }
      
      setShowIncomeModal(false)
      resetIncomeForm()
      fetchData()
    } catch (err) {
      console.error('Error in handleAddIncome:', err)
      alert('حدث خطأ في تسجيل الدخل')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddExpense = async () => {
    if (!expenseAmount || !expenseDescription) return
    setIsSubmitting(true)
    
    try {
      const categoryName = expenseCategories.find(c => c.id === expenseCategoryId)?.name || 'عام'
      
      const { error: expError } = await supabase.from('freelancer_expenses').insert({
        business_id: userId,
        amount: parseFloat(expenseAmount),
        category_id: expenseCategoryId || null,
        category: categoryName,
        description: expenseDescription,
        date: new Date().toISOString().split('T')[0]
      })
      
      if (expError) {
        console.error('Error inserting expense:', expError)
        alert('خطأ في تسجيل المصروف')
        return
      }
      
      setShowExpenseModal(false)
      resetExpenseForm()
      fetchData()
    } catch (err) {
      console.error('Error in handleAddExpense:', err)
      alert('حدث خطأ في تسجيل المصروف')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddClient = async () => {
    if (!clientName) return
    setIsSubmitting(true)
    
    try {
      const { data: clientData, error: clientError } = await supabase.from('freelancer_clients').insert({
        business_id: userId,
        name: clientName,
        phone: clientPhone || null,
        total_spent: 0,
        total_credit: 0
      }).select().single()
      
      if (clientError) {
        console.error('Error inserting client:', clientError)
        alert('خطأ في إضافة العميل')
        return
      }
      
      // Update local state immediately
      if (clientData) {
        setClients([...clients, clientData])
      }
      
      setShowClientModal(false)
      setClientName('')
      setClientPhone('')
    } catch (err) {
      console.error('Error in handleAddClient:', err)
      alert('حدث خطأ في إضافة العميل')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddCategory = async () => {
    if (!categoryName) return
    setIsSubmitting(true)
    
    try {
      const { data, error } = await supabase.from('freelancer_categories').insert({
        business_id: userId,
        name: categoryName,
        type: categoryType,
        color: categoryColor,
        is_active: true
      }).select().single()
      
      if (error) {
        console.error('Error adding category:', error)
        alert('خطأ في إضافة التصنيف')
        return
      }
      
      // Update local state immediately
      if (data) {
        if (categoryType === 'income') {
          setIncomeCategories([...incomeCategories, data])
        } else {
          setExpenseCategories([...expenseCategories, data])
        }
      }
      
      setShowCategoryModal(false)
      setCategoryName('')
      setCategoryType('income')
      setCategoryColor(CATEGORY_COLORS[0])
    } catch (err) {
      console.error('Category error:', err)
      alert('حدث خطأ في إضافة التصنيف')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddEvent = async () => {
    if (!eventTitle || !eventDate) return
    setIsSubmitting(true)
    
    try {
      await supabase.from('freelancer_reminders').insert({
        business_id: userId,
        title: eventTitle,
        date: eventDate,
        type: 'عام',
        is_done: false,
        notes: eventNotes || null
      })
      
      setShowEventModal(false)
      setEventTitle('')
      setEventDate('')
      setEventNotes('')
      fetchData()
    } catch {
      alert('حدث خطأ')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleEventDone = async (event: CalendarEvent) => {
    try {
      await supabase.from('freelancer_reminders')
        .update({ is_done: !event.is_done })
        .eq('id', event.id)
      fetchData()
    } catch {
      // Handle error
    }
  }

  const handlePayDebt = async (client: Client) => {
    const amount = prompt(`أدخل المبلغ المسدد (الدين الحالي: ${client.total_credit.toFixed(0)} DT)`)
    if (!amount) return
    
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('مبلغ غير صحيح')
      return
    }
    
    try {
      // Record the debt payment
      await supabase.from('freelancer_payments').insert({
        business_id: userId,
        client_id: client.id,
        amount: numAmount,
        payment_type: 'debt_payment',
        notes: 'سداد دين'
      })
      
      // Update client - reduce credit, increase total_spent
      const newCredit = Math.max(0, client.total_credit - numAmount)
      await supabase.from('freelancer_clients')
        .update({ 
          total_credit: newCredit,
          total_spent: (client.total_spent || 0) + numAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', client.id)
      
      fetchData()
    } catch {
      alert('حدث خطأ')
    }
  }

  const resetIncomeForm = () => {
    setIncomeAmount('')
    setIncomeDescription('')
    setIncomeClientId('')
    setIncomePaymentMethod('cash')
    setIncomeCategoryId('')
  }

  const resetExpenseForm = () => {
    setExpenseAmount('')
    setExpenseDescription('')
    setExpenseCategoryId('')
  }

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    
    const days: (number | null)[] = []
    for (let i = 0; i < startingDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  const formatDateStr = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const getEventsForDate = (dateStr: string) => {
    return calendarEvents.filter(e => e.date === dateStr)
  }

  const getTransactionsForDate = (dateStr: string) => {
    return transactions.filter(t => t.date === dateStr)
  }

  const handleDayClick = (day: number) => {
    const dateStr = formatDateStr(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    setSelectedDate(dateStr)
    setShowDayModal(true)
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []
  const selectedDateTransactions = selectedDate ? getTransactionsForDate(selectedDate) : []

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  )

  const filteredTransactions = transactions.filter(t => 
    t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-l fixed right-0 top-0 h-full z-40">
        <div className="p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              {profile.full_name.charAt(0)}
            </div>
            <div>
              <h1 className="font-bold text-gray-800">{profile.full_name}</h1>
              <p className="text-sm text-gray-500">إدارة الخدمات</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'home', label: 'الرئيسية', icon: Wallet },
            { id: 'clients', label: 'العملاء', icon: Users },
            { id: 'calendar', label: 'التقويم', icon: CalendarIcon },
            { id: 'history', label: 'السجل', icon: History },
          ].map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id
            return (
              <button
                key={item.id}
                onClick={() => { setActiveView(item.id as typeof activeView); setSearchQuery(''); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-primary-500 text-white shadow-lg' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}
        </nav>
        
        <div className="p-4 border-t space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">خروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:mr-64">
        {/* Mobile Header */}
        <header className="bg-white border-b sticky top-0 z-40 lg:hidden">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                  {profile.full_name.charAt(0)}
                </div>
                <div>
                  <h1 className="font-bold text-gray-800">{profile.full_name}</h1>
                  <p className="text-xs text-gray-500">خدمات</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={fetchData} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:block bg-white border-b sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {activeView === 'home' && 'الرئيسية'}
                  {activeView === 'clients' && 'العملاء'}
                  {activeView === 'calendar' && 'التقويم'}
                  {activeView === 'history' && 'سجل المعاملات'}
                </h1>
              </div>
              <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl">
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm">تحديث</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-4 lg:p-6 pb-24 lg:pb-6">
          {/* HOME VIEW */}
          {activeView === 'home' && (
            <div className="max-w-4xl mx-auto space-y-4 lg:space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-xs text-gray-500">دخل اليوم</span>
                  </div>
                  <p className="text-xl font-bold text-green-600">{stats.todayIncome.toFixed(0)} DT</p>
                </div>
                
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    </div>
                    <span className="text-xs text-gray-500">مصروف اليوم</span>
                  </div>
                  <p className="text-xl font-bold text-red-500">{stats.todayExpense.toFixed(0)} DT</p>
                </div>
                
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="text-xs text-gray-500">صافي الشهر</span>
                  </div>
                  <p className={`text-xl font-bold ${stats.monthIncome - stats.monthExpense >= 0 ? 'text-primary-600' : 'text-orange-600'}`}>
                    {(stats.monthIncome - stats.monthExpense).toFixed(0)} DT
                  </p>
                </div>
                
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="text-xs text-gray-500">ديون العملاء</span>
                  </div>
                  <p className="text-xl font-bold text-orange-600">{stats.totalCredit.toFixed(0)} DT</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm">
                <h2 className="text-sm font-medium text-gray-500 mb-4">إجراءات سريعة</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    onClick={() => setShowIncomeModal(true)}
                    className="flex flex-col items-center gap-2 p-4 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors"
                  >
                    <TrendingUp className="w-6 h-6" />
                    <span className="font-medium">+ دخل</span>
                  </button>
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="flex flex-col items-center gap-2 p-4 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                  >
                    <TrendingDown className="w-6 h-6" />
                    <span className="font-medium">+ مصروف</span>
                  </button>
                  <button
                    onClick={() => setShowClientModal(true)}
                    className="flex flex-col items-center gap-2 p-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors"
                  >
                    <Users className="w-6 h-6" />
                    <span className="font-medium">+ عميل</span>
                  </button>
                  <button
                    onClick={() => setShowCategoryModal(true)}
                    className="flex flex-col items-center gap-2 p-4 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors"
                  >
                    <Tag className="w-6 h-6" />
                    <span className="font-medium">+ تصنيف</span>
                  </button>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-gray-500">آخر المعاملات</h2>
                  <button onClick={() => setActiveView('history')} className="text-xs text-primary-600">
                    عرض الكل
                  </button>
                </div>
                <div className="space-y-2">
                  {transactions.slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                          {t.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{t.client_name || t.description || t.category_name || (t.type === 'income' ? 'دخل' : 'مصروف')}</p>
                          <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString('ar-TN')}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                          {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(0)} DT
                        </span>
                        {t.payment_method === 'credit' && (
                          <p className="text-xs text-orange-500">آجل</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <p className="text-center text-gray-400 py-8">لا توجد معاملات</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CLIENTS VIEW */}
          {activeView === 'clients' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث..."
                    className="w-full pr-9 pl-3 py-2.5 bg-white border rounded-xl text-sm"
                  />
                </div>
                <button
                  onClick={() => setShowClientModal(true)}
                  className="px-4 py-2.5 bg-primary-500 text-white rounded-xl flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">عميل جديد</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filteredClients.map(client => (
                  <div key={client.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-lg">
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">{client.name}</h3>
                          {client.phone && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {client.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div className="p-2 bg-green-50 rounded-lg text-center">
                        <p className="text-xs text-gray-500">مدفوع</p>
                        <p className="font-bold text-green-600">{(client.total_spent || 0).toFixed(0)} DT</p>
                      </div>
                      <div className={`p-2 rounded-lg text-center ${client.total_credit > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                        <p className="text-xs text-gray-500">دين</p>
                        <p className={`font-bold ${client.total_credit > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                          {(client.total_credit || 0).toFixed(0)} DT
                        </p>
                      </div>
                    </div>
                    {client.total_credit > 0 && (
                      <button
                        onClick={() => handlePayDebt(client)}
                        className="w-full mt-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
                      >
                        تسجيل سداد
                      </button>
                    )}
                  </div>
                ))}
                {filteredClients.length === 0 && (
                  <div className="col-span-full bg-white rounded-xl p-8 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">لا يوجد عملاء</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CALENDAR VIEW */}
          {activeView === 'calendar' && (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Calendar Header */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <h2 className="text-lg font-bold text-gray-800">
                    {currentMonth.toLocaleDateString('ar-TN', { month: 'long', year: 'numeric' })}
                  </h2>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Days Header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(currentMonth).map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} className="aspect-square" />
                    }
                    
                    const dateStr = formatDateStr(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                    const dayEvents = getEventsForDate(dateStr)
                    const dayTransactions = getTransactionsForDate(dateStr)
                    const isToday = dateStr === new Date().toISOString().split('T')[0]
                    const hasContent = dayEvents.length > 0 || dayTransactions.length > 0
                    
                    return (
                      <button
                        key={day}
                        onClick={() => handleDayClick(day)}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-colors ${
                          isToday ? 'bg-primary-500 text-white' : 
                          hasContent ? 'bg-primary-50 hover:bg-primary-100' : 
                          'hover:bg-gray-100'
                        }`}
                      >
                        <span className={`text-sm font-medium ${isToday ? 'text-white' : 'text-gray-800'}`}>{day}</span>
                        {hasContent && (
                          <div className="flex gap-0.5 mt-0.5">
                            {dayEvents.length > 0 && <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-blue-500'}`} />}
                            {dayTransactions.filter(t => t.type === 'income').length > 0 && <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-green-200' : 'bg-green-500'}`} />}
                            {dayTransactions.filter(t => t.type === 'expense').length > 0 && <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-red-200' : 'bg-red-500'}`} />}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
              
              {/* Add Event Button */}
              <button
                onClick={() => { setEventDate(new Date().toISOString().split('T')[0]); setShowEventModal(true); }}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                إضافة حدث
              </button>
              
              {/* Upcoming Events */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-medium text-gray-700 mb-3">الأحداث القادمة</h3>
                <div className="space-y-2">
                  {calendarEvents
                    .filter(e => new Date(e.date) >= new Date(new Date().toISOString().split('T')[0]))
                    .slice(0, 5)
                    .map(event => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={event.is_done}
                            onChange={() => handleToggleEventDone(event)}
                            className="w-5 h-5 rounded border-gray-300"
                          />
                          <div>
                            <p className={`font-medium ${event.is_done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{event.title}</p>
                            <p className="text-xs text-gray-500">{new Date(event.date).toLocaleDateString('ar-TN')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  {calendarEvents.filter(e => new Date(e.date) >= new Date(new Date().toISOString().split('T')[0])).length === 0 && (
                    <p className="text-center text-gray-400 py-4">لا توجد أحداث قادمة</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* HISTORY VIEW */}
          {activeView === 'history' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في السجل..."
                  className="w-full pr-9 pl-3 py-2.5 bg-white border rounded-xl text-sm"
                />
              </div>

              <div className="bg-white rounded-xl shadow-sm divide-y">
                {filteredTransactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                        {t.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{t.client_name || t.description || t.category_name || (t.type === 'income' ? 'دخل' : 'مصروف')}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{new Date(t.created_at).toLocaleDateString('ar-TN')}</span>
                          {t.category_name && <span className="px-1.5 py-0.5 bg-gray-100 rounded">{t.category_name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className={`font-bold text-lg ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(0)} DT
                      </span>
                      {t.payment_method === 'credit' && (
                        <p className="text-xs text-orange-500">آجل</p>
                      )}
                    </div>
                  </div>
                ))}
                {filteredTransactions.length === 0 && (
                  <div className="p-8 text-center">
                    <History className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">لا توجد معاملات</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-40 lg:hidden">
          <div className="flex items-center justify-around py-2">
            {[
              { id: 'home', label: 'الرئيسية', icon: Wallet },
              { id: 'clients', label: 'العملاء', icon: Users },
              { id: 'calendar', label: 'التقويم', icon: CalendarIcon },
              { id: 'history', label: 'السجل', icon: History },
            ].map((item) => {
              const Icon = item.icon
              const isActive = activeView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveView(item.id as typeof activeView); setSearchQuery(''); }}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-400'}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      {/* MODALS */}
      
      {/* Income Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowIncomeModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-5 text-white rounded-t-2xl sticky top-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">تسجيل دخل</h3>
                <button onClick={() => setShowIncomeModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (DT) *</label>
                <input
                  type="number"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  className="input-field text-2xl text-center font-bold"
                  placeholder="0"
                  autoFocus
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">التصنيف</label>
                  <button
                    type="button"
                    onClick={() => { setCategoryType('income'); setShowCategoryModal(true); }}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    إضافة
                  </button>
                </div>
                <select
                  value={incomeCategoryId}
                  onChange={(e) => setIncomeCategoryId(e.target.value)}
                  className="input-field"
                >
                  <option value="">بدون تصنيف</option>
                  {incomeCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {incomeCategories.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">لا توجد تصنيفات. أضف تصنيف جديد ↑</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العميل (اختياري)</label>
                <select
                  value={incomeClientId}
                  onChange={(e) => setIncomeClientId(e.target.value)}
                  className="input-field"
                >
                  <option value="">بدون عميل</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">طريقة الدفع</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIncomePaymentMethod('cash')}
                    className={`py-3 rounded-xl font-medium transition-colors ${incomePaymentMethod === 'cash' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    💵 نقداً
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!incomeClientId) {
                        alert('يجب اختيار عميل أولاً لتسجيل دين')
                        return
                      }
                      setIncomePaymentMethod('credit')
                    }}
                    className={`py-3 rounded-xl font-medium transition-colors ${incomePaymentMethod === 'credit' ? 'bg-orange-500 text-white' : !incomeClientId ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-700'}`}
                  >
                    📝 آجل
                  </button>
                </div>
                {!incomeClientId && incomePaymentMethod !== 'credit' && (
                  <p className="text-xs text-gray-500 mt-2">💡 اختر عميل أعلاه لتفعيل خيار الدين</p>
                )}
                {incomePaymentMethod === 'credit' && (
                  <p className="text-xs text-orange-600 mt-2">⚠️ سيتم إضافة المبلغ كدين على العميل</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وصف (اختياري)</label>
                <input
                  type="text"
                  value={incomeDescription}
                  onChange={(e) => setIncomeDescription(e.target.value)}
                  className="input-field"
                  placeholder="مثال: تصوير، تصميم..."
                />
              </div>
              
              <button
                onClick={handleAddIncome}
                disabled={!incomeAmount || isSubmitting}
                className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowExpenseModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">تسجيل مصروف</h3>
                <button onClick={() => setShowExpenseModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (DT) *</label>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="input-field text-2xl text-center font-bold"
                  placeholder="0"
                  autoFocus
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">التصنيف</label>
                  <button
                    type="button"
                    onClick={() => { setCategoryType('expense'); setShowCategoryModal(true); }}
                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    إضافة
                  </button>
                </div>
                <select
                  value={expenseCategoryId}
                  onChange={(e) => setExpenseCategoryId(e.target.value)}
                  className="input-field"
                >
                  <option value="">بدون تصنيف</option>
                  {expenseCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {expenseCategories.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">لا توجد تصنيفات. أضف تصنيف جديد ↑</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف *</label>
                <input
                  type="text"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="input-field"
                  placeholder="مثال: تاكسي، معدات..."
                />
              </div>
              
              <button
                onClick={handleAddExpense}
                disabled={!expenseAmount || !expenseDescription || isSubmitting}
                className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowClientModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">عميل جديد</h3>
                <button onClick={() => setShowClientModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="input-field"
                  placeholder="اسم العميل"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف (اختياري)</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="input-field"
                  placeholder="00000000"
                  dir="ltr"
                />
              </div>
              
              <button
                onClick={handleAddClient}
                disabled={!clientName || isSubmitting}
                className="w-full py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                إضافة العميل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCategoryModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">تصنيف جديد</h3>
                <button onClick={() => setShowCategoryModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم التصنيف *</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="input-field"
                  placeholder="مثال: تصوير، تصميم..."
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع التصنيف</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategoryType('income')}
                    className={`py-3 rounded-xl font-medium transition-colors ${categoryType === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    دخل
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryType('expense')}
                    className={`py-3 rounded-xl font-medium transition-colors ${categoryType === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    مصروف
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اللون</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCategoryColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${categoryColor === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleAddCategory}
                disabled={!categoryName || isSubmitting}
                className="w-full py-4 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                إضافة التصنيف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowEventModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">حدث جديد</h3>
                <button onClick={() => setShowEventModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان *</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="input-field"
                  placeholder="مثال: اجتماع، موعد تسليم..."
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ *</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  className="input-field min-h-[80px]"
                  placeholder="اختياري"
                />
              </div>
              
              <button
                onClick={handleAddEvent}
                disabled={!eventTitle || !eventDate || isSubmitting}
                className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                إضافة الحدث
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Details Modal */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDayModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white rounded-t-2xl sticky top-0">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  {new Date(selectedDate).toLocaleDateString('ar-TN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <button onClick={() => setShowDayModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Events */}
              {selectedDateEvents.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">الأحداث</h4>
                  <div className="space-y-2">
                    {selectedDateEvents.map(event => (
                      <div key={event.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <input
                          type="checkbox"
                          checked={event.is_done}
                          onChange={() => handleToggleEventDone(event)}
                          className="w-5 h-5 rounded"
                        />
                        <div className="flex-1">
                          <p className={`font-medium ${event.is_done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{event.title}</p>
                          {event.notes && <p className="text-xs text-gray-500">{event.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Transactions */}
              {selectedDateTransactions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">المعاملات</h4>
                  <div className="space-y-2">
                    {selectedDateTransactions.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                            {t.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{t.client_name || t.description || (t.type === 'income' ? 'دخل' : 'مصروف')}</p>
                            {t.category_name && <p className="text-xs text-gray-500">{t.category_name}</p>}
                          </div>
                        </div>
                        <span className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                          {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(0)} DT
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedDateEvents.length === 0 && selectedDateTransactions.length === 0 && (
                <p className="text-center text-gray-400 py-8">لا يوجد شيء في هذا اليوم</p>
              )}
              
              {/* Add buttons */}
              <div className="grid grid-cols-2 gap-2 pt-4 border-t">
                <button
                  onClick={() => { setEventDate(selectedDate); setShowDayModal(false); setShowEventModal(true); }}
                  className="py-3 bg-blue-500 text-white rounded-xl font-medium"
                >
                  + حدث
                </button>
                <button
                  onClick={() => { setShowDayModal(false); setShowIncomeModal(true); }}
                  className="py-3 bg-green-500 text-white rounded-xl font-medium"
                >
                  + دخل
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

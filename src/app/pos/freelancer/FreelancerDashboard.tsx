'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, TrendingUp, TrendingDown, Users, Briefcase,
  LogOut, Loader2, X, Check, Phone, Calendar,
  DollarSign, CreditCard, History, Settings, RefreshCw,
  ChevronDown, Search, Clock, AlertCircle, Wallet
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'
import PINModal from '@/components/shared/PINModal'

interface FreelancerDashboardProps {
  userId: string
  profile: Profile
}

// Simple data types
interface Client {
  id: string
  name: string
  phone: string | null
  notes: string | null
  total_spent: number
  total_credit: number
  created_at: string
}

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  description: string | null
  client_id: string | null
  client_name?: string
  payment_method: 'cash' | 'credit'
  created_at: string
}

export default function FreelancerDashboard({ userId, profile }: FreelancerDashboardProps) {
  const router = useRouter()
  const supabase = createClient()
  
  // UI State
  const [isLoading, setIsLoading] = useState(true)
  const [activeView, setActiveView] = useState<'home' | 'clients' | 'history'>('home')
  const [showPinModal, setShowPinModal] = useState(false)
  
  // Modal states
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Data states
  const [clients, setClients] = useState<Client[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [userPin, setUserPin] = useState<string | null>(null)
  
  // Form states
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeDescription, setIncomeDescription] = useState('')
  const [incomeClientId, setIncomeClientId] = useState('')
  const [incomePaymentMethod, setIncomePaymentMethod] = useState<'cash' | 'credit'>('cash')
  
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDescription, setExpenseDescription] = useState('')
  
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  
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
      // Get user PIN
      const { data: profileData } = await supabase
        .from('profiles')
        .select('pin_code')
        .eq('id', userId)
        .single()
      
      if (profileData) setUserPin(profileData.pin_code)
      
      // Get clients
      const { data: clientsData } = await supabase
        .from('freelancer_clients')
        .select('*')
        .eq('business_id', userId)
        .order('name')
      
      // Get transactions (payments + expenses combined)
      const { data: paymentsData } = await supabase
        .from('freelancer_payments')
        .select('*, freelancer_clients(name)')
        .eq('business_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)
      
      const { data: expensesData } = await supabase
        .from('freelancer_expenses')
        .select('*')
        .eq('business_id', userId)
        .order('date', { ascending: false })
        .limit(100)
      
      setClients(clientsData || [])
      
      // Combine transactions
      const allTransactions: Transaction[] = [
        ...(paymentsData || []).map((p: any) => ({
          id: p.id,
          type: 'income' as const,
          amount: Number(p.amount),
          description: p.notes,
          client_id: p.client_id,
          client_name: p.freelancer_clients?.name,
          payment_method: 'cash' as const,
          created_at: p.created_at
        })),
        ...(expensesData || []).map((e: any) => ({
          id: e.id,
          type: 'expense' as const,
          amount: Number(e.amount),
          description: e.description,
          client_id: null,
          payment_method: 'cash' as const,
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
        .reduce((sum: number, c: Client) => sum + Number(c.total_credit), 0)
      
      setStats({ todayIncome, todayExpense, monthIncome, monthExpense, totalCredit })
      
    } catch (error) {
      // Handle error silently
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
    router.push('/login')
  }

  const handleAddIncome = async () => {
    if (!incomeAmount) return
    setIsSubmitting(true)
    
    try {
      await supabase.from('freelancer_payments').insert({
        business_id: userId,
        client_id: incomeClientId || null,
        amount: parseFloat(incomeAmount),
        payment_type: incomePaymentMethod === 'credit' ? 'credit' : 'cash',
        notes: incomeDescription || null
      })
      
      // If credit, update client's credit
      if (incomePaymentMethod === 'credit' && incomeClientId) {
        const client = clients.find(c => c.id === incomeClientId)
        if (client) {
          await supabase.from('freelancer_clients')
            .update({ total_credit: client.total_credit + parseFloat(incomeAmount) })
            .eq('id', incomeClientId)
        }
      }
      
      setShowIncomeModal(false)
      setIncomeAmount('')
      setIncomeDescription('')
      setIncomeClientId('')
      setIncomePaymentMethod('cash')
      fetchData()
    } catch {
      alert('حدث خطأ')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddExpense = async () => {
    if (!expenseAmount || !expenseDescription) return
    setIsSubmitting(true)
    
    try {
      await supabase.from('freelancer_expenses').insert({
        business_id: userId,
        amount: parseFloat(expenseAmount),
        category: 'عام',
        description: expenseDescription,
        date: new Date().toISOString().split('T')[0]
      })
      
      setShowExpenseModal(false)
      setExpenseAmount('')
      setExpenseDescription('')
      fetchData()
    } catch {
      alert('حدث خطأ')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddClient = async () => {
    if (!clientName) return
    setIsSubmitting(true)
    
    try {
      await supabase.from('freelancer_clients').insert({
        business_id: userId,
        name: clientName,
        phone: clientPhone || null
      })
      
      setShowClientModal(false)
      setClientName('')
      setClientPhone('')
      fetchData()
    } catch {
      alert('حدث خطأ')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePayDebt = async (client: Client) => {
    const amount = prompt(`أدخل المبلغ المسدد (الدين الحالي: ${client.total_credit} DT)`)
    if (!amount) return
    
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('مبلغ غير صحيح')
      return
    }
    
    try {
      // Record the payment
      await supabase.from('freelancer_payments').insert({
        business_id: userId,
        client_id: client.id,
        amount: numAmount,
        payment_type: 'debt_payment',
        notes: 'سداد دين'
      })
      
      // Update client credit
      await supabase.from('freelancer_clients')
        .update({ total_credit: Math.max(0, client.total_credit - numAmount) })
        .eq('id', client.id)
      
      fetchData()
    } catch {
      alert('حدث خطأ')
    }
  }

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  )

  const filteredTransactions = transactions.filter(t => 
    t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3">
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
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchData}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowPinModal(true)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-4 pb-24">
        {/* View: Home */}
        {activeView === 'home' && (
          <div className="space-y-4">
            {/* Today's Summary */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="text-sm font-medium text-gray-500 mb-3">اليوم</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-green-600">{stats.todayIncome.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">دخل</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <TrendingDown className="w-5 h-5 text-red-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-red-500">{stats.todayExpense.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">مصروف</p>
                </div>
              </div>
            </div>

            {/* Month Summary */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="text-sm font-medium text-gray-500 mb-3">هذا الشهر</h2>
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-green-600">{stats.monthIncome.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">دخل</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-lg font-bold text-red-500">{stats.monthExpense.toFixed(0)}</p>
                  <p className="text-xs text-gray-500">مصروف</p>
                </div>
                <div className="text-center flex-1">
                  <p className={`text-lg font-bold ${stats.monthIncome - stats.monthExpense >= 0 ? 'text-primary-600' : 'text-orange-600'}`}>
                    {(stats.monthIncome - stats.monthExpense).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500">صافي</p>
                </div>
              </div>
            </div>

            {/* Credit Alert */}
            {stats.totalCredit > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-orange-800">ديون مستحقة</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.totalCredit.toFixed(0)} DT</p>
                  </div>
                  <button 
                    onClick={() => setActiveView('clients')}
                    className="px-3 py-2 bg-orange-500 text-white text-sm rounded-lg"
                  >
                    عرض
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="text-sm font-medium text-gray-500 mb-3">إجراءات سريعة</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowIncomeModal(true)}
                  className="flex items-center justify-center gap-2 p-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>+ دخل</span>
                </button>
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="flex items-center justify-center gap-2 p-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>+ مصروف</span>
                </button>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-500">آخر المعاملات</h2>
                <button 
                  onClick={() => setActiveView('history')}
                  className="text-xs text-primary-600"
                >
                  عرض الكل
                </button>
              </div>
              <div className="space-y-2">
                {transactions.slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                        {t.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.client_name || t.description || (t.type === 'income' ? 'دخل' : 'مصروف')}</p>
                        <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString('ar-TN')}</p>
                      </div>
                    </div>
                    <span className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                      {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(0)}
                    </span>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="text-center text-gray-400 py-4">لا توجد معاملات</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View: Clients */}
        {activeView === 'clients' && (
          <div className="space-y-4">
            {/* Search & Add */}
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
                className="px-4 py-2.5 bg-primary-500 text-white rounded-xl"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Clients List */}
            <div className="space-y-2">
              {filteredClients.map(client => (
                <div key={client.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-800">{client.name}</h3>
                        {client.phone && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    {client.total_credit > 0 && (
                      <button
                        onClick={() => handlePayDebt(client)}
                        className="px-3 py-1.5 bg-orange-100 text-orange-700 text-sm rounded-lg font-medium"
                      >
                        دين: {client.total_credit.toFixed(0)} DT
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredClients.length === 0 && (
                <div className="bg-white rounded-xl p-8 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">لا يوجد عملاء</p>
                  <button
                    onClick={() => setShowClientModal(true)}
                    className="mt-3 text-primary-600 font-medium"
                  >
                    + إضافة عميل
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* View: History */}
        {activeView === 'history' && (
          <div className="space-y-4">
            {/* Search */}
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

            {/* Transactions List */}
            <div className="bg-white rounded-xl shadow-sm divide-y">
              {filteredTransactions.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                      {t.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{t.client_name || t.description || (t.type === 'income' ? 'دخل' : 'مصروف')}</p>
                      <p className="text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString('ar-TN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <span className={`font-bold text-lg ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'}{t.amount.toFixed(0)}
                  </span>
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

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-40">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center justify-around py-2">
            <button
              onClick={() => { setActiveView('home'); setSearchQuery(''); }}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${activeView === 'home' ? 'text-primary-600 bg-primary-50' : 'text-gray-400'}`}
            >
              <Wallet className="w-5 h-5" />
              <span className="text-xs font-medium">الرئيسية</span>
            </button>
            <button
              onClick={() => { setActiveView('clients'); setSearchQuery(''); }}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${activeView === 'clients' ? 'text-primary-600 bg-primary-50' : 'text-gray-400'}`}
            >
              <Users className="w-5 h-5" />
              <span className="text-xs font-medium">العملاء</span>
            </button>
            <button
              onClick={() => { setActiveView('history'); setSearchQuery(''); }}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${activeView === 'history' ? 'text-primary-600 bg-primary-50' : 'text-gray-400'}`}
            >
              <History className="w-5 h-5" />
              <span className="text-xs font-medium">السجل</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Income Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowIncomeModal(false)}>
          <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">تسجيل دخل</h3>
                <button onClick={() => setShowIncomeModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Amount */}
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
              
              {/* Client (Optional) */}
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
              
              {/* Payment Method */}
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
                    onClick={() => setIncomePaymentMethod('credit')}
                    disabled={!incomeClientId}
                    className={`py-3 rounded-xl font-medium transition-colors ${incomePaymentMethod === 'credit' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'} disabled:opacity-50`}
                  >
                    📝 آجل
                  </button>
                </div>
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وصف (اختياري)</label>
                <input
                  type="text"
                  value={incomeDescription}
                  onChange={(e) => setIncomeDescription(e.target.value)}
                  className="input-field"
                  placeholder="مثال: تصوير، تصميم، استشارة..."
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowExpenseModal(false)}>
          <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">تسجيل مصروف</h3>
                <button onClick={() => setShowExpenseModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Amount */}
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
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف *</label>
                <input
                  type="text"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="input-field"
                  placeholder="مثال: تاكسي، معدات، طعام..."
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowClientModal(false)}>
          <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl" onClick={e => e.stopPropagation()}>
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

      {/* PIN Modal */}
      <PINModal 
        isOpen={showPinModal} 
        correctPin={userPin} 
        onSuccess={() => { setShowPinModal(false); router.push('/dashboard') }} 
        onCancel={() => setShowPinModal(false)} 
      />
    </div>
  )
}

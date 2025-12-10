'use client'

import { useState } from 'react'
import { 
  Plus, TrendingUp, TrendingDown, Clock, Calendar, 
  AlertCircle, ChevronLeft, X, Loader2, Check
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { FreelancerProject, FreelancerClient, FreelancerService, FreelancerPayment, FreelancerExpense } from '@/types/database'

type FinancePeriod = 'today' | 'week' | 'month' | 'all'

interface HomeTabProps {
  stats: {
    todayIncome: number
    todayExpenses: number
    monthIncome: number
    monthExpenses: number
    totalCredit: number
    activeProjects: number
  }
  projects: FreelancerProject[]
  clients: FreelancerClient[]
  services: FreelancerService[]
  payments: FreelancerPayment[]
  expenses: FreelancerExpense[]
  userId: string
  onRefresh: () => void
}


export default function HomeTab({ stats, projects, clients, services, payments, expenses, userId, onRefresh }: HomeTabProps) {
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [financePeriod, setFinancePeriod] = useState<FinancePeriod>('month')

  // Calculate filtered stats based on period
  const getFilteredStats = () => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    // Start of week (Sunday)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    // Start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    let filteredPayments = payments
    let filteredExpenses = expenses
    
    switch (financePeriod) {
      case 'today':
        filteredPayments = payments.filter(p => p.created_at.startsWith(today))
        filteredExpenses = expenses.filter(e => e.date === today)
        break
      case 'week':
        filteredPayments = payments.filter(p => new Date(p.created_at) >= startOfWeek)
        filteredExpenses = expenses.filter(e => new Date(e.date) >= startOfWeek)
        break
      case 'month':
        filteredPayments = payments.filter(p => new Date(p.created_at) >= startOfMonth)
        filteredExpenses = expenses.filter(e => new Date(e.date) >= startOfMonth)
        break
      case 'all':
        // Use all data
        break
    }
    
    const income = filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    const expensesTotal = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
    
    return {
      income,
      expenses: expensesTotal,
      profit: income - expensesTotal
    }
  }
  
  const filteredStats = getFilteredStats()
  
  const periodLabels: Record<FinancePeriod, string> = {
    today: 'اليوم',
    week: 'هذا الأسبوع',
    month: 'هذا الشهر',
    all: 'الكل'
  }
  
  // Income form
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeClientId, setIncomeClientId] = useState('')
  const [incomeProjectId, setIncomeProjectId] = useState('')
  const [incomeType, setIncomeType] = useState<'full' | 'partial' | 'deposit'>('partial')
  const [incomeNotes, setIncomeNotes] = useState('')
  
  // Expense form
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDescription, setExpenseDescription] = useState('')
  
  // Project form
  const [projectTitle, setProjectTitle] = useState('')
  const [projectClientId, setProjectClientId] = useState('')
  const [projectServiceId, setProjectServiceId] = useState('')
  const [projectPrice, setProjectPrice] = useState('')
  const [projectDeposit, setProjectDeposit] = useState('')
  const [projectDeadline, setProjectDeadline] = useState('')
  const [projectNotes, setProjectNotes] = useState('')

  const upcomingProjects = projects
    .filter(p => p.deadline && new Date(p.deadline) > new Date() && p.status !== 'completed')
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 3)

  const clientsWithDebt = clients.filter(c => c.total_credit > 0)

  const handleAddIncome = async () => {
    if (!incomeAmount) return
    setIsSubmitting(true)
    
    try {
      const supabase = createClient()
      await supabase.from('freelancer_payments').insert({
        business_id: userId,
        client_id: incomeClientId || null,
        project_id: incomeProjectId || null,
        amount: parseFloat(incomeAmount),
        payment_type: incomeClientId ? incomeType : 'general',
        notes: incomeNotes || null
      })
      
      setShowIncomeModal(false)
      resetIncomeForm()
      onRefresh()
    } catch (error) {
      console.error('Error adding income:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddExpense = async () => {
    if (!expenseAmount) return
    setIsSubmitting(true)
    
    try {
      const supabase = createClient()
      await supabase.from('freelancer_expenses').insert({
        business_id: userId,
        amount: parseFloat(expenseAmount),
        category: 'عام',
        description: expenseDescription || null,
        date: new Date().toISOString().split('T')[0]
      })
      
      setShowExpenseModal(false)
      resetExpenseForm()
      onRefresh()
    } catch (error) {
      console.error('Error adding expense:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddProject = async () => {
    if (!projectTitle || !projectClientId || !projectPrice) return
    setIsSubmitting(true)
    
    try {
      const supabase = createClient()
      const deposit = parseFloat(projectDeposit) || 0
      
      await supabase.from('freelancer_projects').insert({
        business_id: userId,
        client_id: projectClientId,
        service_id: projectServiceId || null,
        title: projectTitle,
        total_price: parseFloat(projectPrice),
        deposit: deposit,
        paid_amount: deposit,
        status: 'pending',
        deadline: projectDeadline || null,
        notes: projectNotes || null
      })
      
      // If deposit was paid, also record the payment
      if (deposit > 0) {
        await supabase.from('freelancer_payments').insert({
          business_id: userId,
          client_id: projectClientId,
          amount: deposit,
          payment_type: 'deposit',
          notes: `عربون مشروع: ${projectTitle}`
        })
      }
      
      setShowProjectModal(false)
      resetProjectForm()
      onRefresh()
    } catch (error) {
      console.error('Error adding project:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetIncomeForm = () => {
    setIncomeAmount('')
    setIncomeClientId('')
    setIncomeProjectId('')
    setIncomeType('partial')
    setIncomeNotes('')
  }

  const resetExpenseForm = () => {
    setExpenseAmount('')
    setExpenseDescription('')
  }

  const resetProjectForm = () => {
    setProjectTitle('')
    setProjectClientId('')
    setProjectServiceId('')
    setProjectPrice('')
    setProjectDeposit('')
    setProjectDeadline('')
    setProjectNotes('')
  }

  const handleServiceSelect = (serviceId: string) => {
    setProjectServiceId(serviceId)
    const service = services.find(s => s.id === serviceId)
    if (service) {
      setProjectPrice(service.price.toString())
      if (!projectTitle) {
        setProjectTitle(service.name)
      }
    }
  }

  const clientProjects = incomeClientId 
    ? projects.filter(p => p.client_id === incomeClientId && p.status !== 'completed')
    : []

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Finance Stats with Filter */}
      <div className="card !p-4 lg:!p-6">
        {/* Period Filter */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          {(['today', 'week', 'month', 'all'] as FinancePeriod[]).map(period => (
            <button
              key={period}
              onClick={() => setFinancePeriod(period)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                financePeriod === period
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {periodLabels[period]}
            </button>
          ))}
        </div>
        
        {/* Filtered Stats */}
        <div className="grid grid-cols-3 gap-3 lg:gap-6 text-center">
          <div className="p-3 lg:p-5 bg-green-50 rounded-xl">
            <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-green-600 mx-auto mb-1 lg:mb-2" />
            <p className="text-lg lg:text-2xl font-bold text-green-600">{filteredStats.income.toFixed(0)}</p>
            <p className="text-xs lg:text-sm text-gray-500">الدخل</p>
          </div>
          <div className="p-3 lg:p-5 bg-red-50 rounded-xl">
            <TrendingDown className="w-5 h-5 lg:w-6 lg:h-6 text-red-500 mx-auto mb-1 lg:mb-2" />
            <p className="text-lg lg:text-2xl font-bold text-red-500">{filteredStats.expenses.toFixed(0)}</p>
            <p className="text-xs lg:text-sm text-gray-500">المصاريف</p>
          </div>
          <div className={`p-3 lg:p-5 rounded-xl ${filteredStats.profit >= 0 ? 'bg-primary-50' : 'bg-orange-50'}`}>
            <span className={`text-sm lg:text-base font-bold mx-auto mb-1 lg:mb-2 ${filteredStats.profit >= 0 ? 'text-primary-600' : 'text-orange-600'}`}>DT</span>
            <p className={`text-lg lg:text-2xl font-bold ${filteredStats.profit >= 0 ? 'text-primary-600' : 'text-orange-600'}`}>
              {filteredStats.profit.toFixed(0)}
            </p>
            <p className="text-xs lg:text-sm text-gray-500">الربح</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <button
          onClick={() => setShowProjectModal(true)}
          className="card !p-4 lg:!p-6 flex flex-col items-center gap-2 hover:bg-primary-50 transition-colors"
        >
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
            <Plus className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <span className="text-xs lg:text-sm font-medium text-gray-700">مشروع</span>
        </button>
        <button
          onClick={() => setShowIncomeModal(true)}
          className="card !p-4 lg:!p-6 flex flex-col items-center gap-2 hover:bg-green-50 transition-colors"
        >
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
            <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <span className="text-xs lg:text-sm font-medium text-gray-700">دخل</span>
        </button>
        <button
          onClick={() => setShowExpenseModal(true)}
          className="card !p-4 lg:!p-6 flex flex-col items-center gap-2 hover:bg-red-50 transition-colors"
        >
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <TrendingDown className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <span className="text-xs lg:text-sm font-medium text-gray-700">مصروف</span>
        </button>
      </div>

      {/* Overview Grid - Desktop 2 columns, Mobile 1 column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Active Projects Count */}
        <div className="card !p-4 lg:!p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 lg:w-6 lg:h-6" />
            </div>
            <div>
              <p className="font-medium text-gray-800 lg:text-lg">مشاريع قيد العمل</p>
              <p className="text-sm lg:text-base text-gray-500">{stats.activeProjects} مشروع</p>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </div>

        {/* Credit Alert */}
        {stats.totalCredit > 0 && (
          <div className="card !p-4 lg:!p-5 bg-orange-50 border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 lg:w-5 lg:h-5 text-orange-500" />
              <h3 className="text-sm lg:text-base font-medium text-orange-700">ديون مستحقة</h3>
            </div>
            <p className="text-lg lg:text-2xl font-bold text-orange-600 mb-2">{stats.totalCredit.toFixed(0)} DT</p>
            <div className="text-xs lg:text-sm text-orange-600">
              {clientsWithDebt.slice(0, 3).map(c => c.name).join('، ')}
              {clientsWithDebt.length > 3 && ` +${clientsWithDebt.length - 3}`}
            </div>
          </div>
        )}
      </div>

      {/* Upcoming Deadlines */}
      {upcomingProjects.length > 0 && (
        <div className="card !p-4 lg:!p-6">
          <div className="flex items-center gap-2 mb-3 lg:mb-4">
            <Calendar className="w-4 h-4 lg:w-5 lg:h-5 text-primary-500" />
            <h3 className="text-sm lg:text-base font-medium text-gray-700">مواعيد قادمة</h3>
          </div>
          <div className="space-y-2 lg:space-y-3">
            {upcomingProjects.map(project => (
              <div key={project.id} className="flex items-center justify-between p-2 lg:p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm lg:text-base font-medium text-gray-800">{project.title}</p>
                  <p className="text-xs lg:text-sm text-gray-500">{project.client_name}</p>
                </div>
                <span className="text-xs lg:text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                  {new Date(project.deadline!).toLocaleDateString('ar-TN', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Income Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowIncomeModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-green-500 to-green-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">تسجيل دخل</h3>
                <button onClick={() => setShowIncomeModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العميل (اختياري)</label>
                <select
                  value={incomeClientId}
                  onChange={(e) => { setIncomeClientId(e.target.value); setIncomeProjectId(''); }}
                  className="input-field"
                >
                  <option value="">دخل عام (بدون عميل)</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              {clientProjects.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المشروع (اختياري)</label>
                  <select
                    value={incomeProjectId}
                    onChange={(e) => setIncomeProjectId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">بدون مشروع</option>
                    {clientProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.title} - باقي {p.remaining} DT</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (DT) *</label>
                <input
                  type="number"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  className="input-field text-lg"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع الدفع</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'deposit', label: 'عربون' },
                    { id: 'partial', label: 'جزئي' },
                    { id: 'full', label: 'كامل' },
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setIncomeType(type.id as 'full' | 'partial' | 'deposit')}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        incomeType === type.id 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <input
                  type="text"
                  value={incomeNotes}
                  onChange={(e) => setIncomeNotes(e.target.value)}
                  className="input-field"
                  placeholder="اختياري"
                />
              </div>
              
              <button
                onClick={handleAddIncome}
                disabled={!incomeAmount || isSubmitting}
                className="w-full btn-primary bg-green-500 hover:bg-green-600 flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowExpenseModal(false)}>
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
                  className="input-field text-lg"
                  placeholder="0.00"
                />
              </div>
              
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
                className="w-full btn-primary bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowProjectModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">مشروع جديد</h3>
                <button onClick={() => setShowProjectModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العميل *</label>
                <select
                  value={projectClientId}
                  onChange={(e) => setProjectClientId(e.target.value)}
                  className="input-field"
                >
                  <option value="">اختر العميل</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              {services.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الخدمة</label>
                  <div className="flex flex-wrap gap-2">
                    {services.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleServiceSelect(s.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          projectServiceId === s.id 
                            ? 'bg-primary-500 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {s.name} - {s.price} DT
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان المشروع *</label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  className="input-field"
                  placeholder="مثال: تصوير حفل زفاف"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">السعر الكامل *</label>
                  <input
                    type="number"
                    value={projectPrice}
                    onChange={(e) => setProjectPrice(e.target.value)}
                    className="input-field"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العربون</label>
                  <input
                    type="number"
                    value={projectDeposit}
                    onChange={(e) => setProjectDeposit(e.target.value)}
                    className="input-field"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">موعد التسليم</label>
                <input
                  type="date"
                  value={projectDeadline}
                  onChange={(e) => setProjectDeadline(e.target.value)}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={projectNotes}
                  onChange={(e) => setProjectNotes(e.target.value)}
                  className="input-field min-h-[80px]"
                  placeholder="اختياري"
                />
              </div>
              
              <button
                onClick={handleAddProject}
                disabled={!projectTitle || !projectClientId || !projectPrice || isSubmitting}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                إنشاء المشروع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

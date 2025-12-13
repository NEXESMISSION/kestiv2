'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Transaction, Expense, Member } from '@/types/database'
import { 
  ArrowLeft, TrendingUp, RefreshCw, Package, 
  Receipt, BarChart3, Users, CreditCard, Calendar,
  ArrowUpRight, ArrowDownRight, ChevronDown, ChevronUp,
  TrendingDown, Wallet, PiggyBank, ShoppingCart
} from 'lucide-react'

type PeriodType = 'today' | 'week' | 'month' | 'all' | 'custom'

export default function FinancialPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodType>('week')
  const [showDebtDetails, setShowDebtDetails] = useState(false)
  const [chartView, setChartView] = useState<'week' | 'month' | 'year'>('week')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    
    const [txRes, expRes, memRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('business_id', user.id).order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').eq('business_id', user.id).order('date', { ascending: false }),
      supabase.from('members').select('*').eq('business_id', user.id)
    ])
    
    if (txRes.data) setTransactions(txRes.data)
    if (expRes.data) setExpenses(expRes.data)
    if (memRes.data) setMembers(memRes.data)
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  // Date calculations
  const today = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }, [])
  const weekAgo = useMemo(() => new Date(today.getTime() - 7 * 86400000), [today])
  const monthAgo = useMemo(() => new Date(today.getTime() - 30 * 86400000), [today])

  const startDate = useMemo(() => {
    if (period === 'today') return today
    if (period === 'week') return weekAgo
    if (period === 'month') return monthAgo
    return new Date(0) // 'all'
  }, [period, today, weekAgo, monthAgo])

  // Filter transactions by period (excluding debt payments from revenue)
  const periodTransactions = useMemo(() => 
    transactions.filter(tx => new Date(tx.created_at) >= startDate && tx.payment_method !== 'debt'),
    [transactions, startDate]
  )

  // Calculate totals
  const revenue = periodTransactions
    .filter(tx => tx.type === 'subscription' || tx.type === 'retail')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const periodExpenses = useMemo(() => 
    expenses.filter(exp => new Date(exp.date) >= startDate),
    [expenses, startDate]
  )

  const expenseTotal = periodExpenses.reduce((sum, exp) => sum + exp.amount, 0)

  // Cost of goods (from retail transactions with cost tracking)
  const costOfGoods = periodTransactions
    .filter(tx => tx.type === 'retail')
    .reduce((sum, tx) => {
      const items = tx.items || []
      return sum + items.reduce((itemSum: number, item: any) => itemSum + ((item.cost || 0) * (item.quantity || 1)), 0)
    }, 0)

  const grossProfit = revenue - costOfGoods
  const netProfit = grossProfit - expenseTotal
  const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100) : 0
  const salesCount = periodTransactions.length

  // Total debt from members
  const totalDebt = members.reduce((sum, m) => sum + (m.debt || 0), 0)
  const debtMembers = members.filter(m => m.debt > 0)

  // Chart data - last 7 days
  const chartData = useMemo(() => {
    const days = []
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 86400000)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dayEnd = new Date(dayStart.getTime() + 86400000)
      
      const dayRevenue = transactions
        .filter(tx => {
          const txDate = new Date(tx.created_at)
          return txDate >= dayStart && txDate < dayEnd && tx.payment_method !== 'debt'
        })
        .reduce((sum, tx) => sum + tx.amount, 0)
      
      const dayExpense = expenses
        .filter(exp => {
          const expDate = new Date(exp.date)
          return expDate >= dayStart && expDate < dayEnd
        })
        .reduce((sum, exp) => sum + exp.amount, 0)
      
      days.push({
        name: dayNames[date.getDay()],
        revenue: dayRevenue,
        expense: dayExpense
      })
    }
    return days
  }, [transactions, expenses, today])

  // Calculate chart max for scaling
  const chartMax = Math.max(...chartData.map(d => Math.max(d.revenue, d.expense)), 1)

  // Period comparisons
  const todayRevenue = transactions
    .filter(tx => new Date(tx.created_at) >= today && tx.payment_method !== 'debt')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const last7DaysRevenue = transactions
    .filter(tx => new Date(tx.created_at) >= weekAgo && tx.payment_method !== 'debt')
    .reduce((sum, tx) => sum + tx.amount, 0)

  const last30DaysRevenue = transactions
    .filter(tx => new Date(tx.created_at) >= monthAgo && tx.payment_method !== 'debt')
    .reduce((sum, tx) => sum + tx.amount, 0)

  // Chart stats
  const totalChartRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0)
  const avgChartRevenue = totalChartRevenue / 7
  const maxChartRevenue = Math.max(...chartData.map(d => d.revenue))
  const minChartRevenue = Math.min(...chartData.map(d => d.revenue))
  const totalChartExpense = chartData.reduce((sum, d) => sum + d.expense, 0)

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Simple Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">التقارير المالية</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4 pb-20">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          </div>
        ) : (
        <>
        {/* Period Filter */}
        <div className="flex gap-2">
          {[
            { k: 'today', l: 'اليوم' },
            { k: 'week', l: 'الأسبوع' },
            { k: 'month', l: 'الشهر' },
            { k: 'all', l: 'الكل' }
          ].map(p => (
            <button
              key={p.k}
              onClick={() => setPeriod(p.k as PeriodType)}
              className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                period === p.k 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white border text-gray-600'
              }`}
            >
              {p.l}
            </button>
          ))}
        </div>

        {/* Net Profit - Main Card */}
        <div className={`rounded-xl p-5 text-white text-center ${netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
          <div className="text-sm opacity-90 mb-1">صافي الربح</div>
          <div className="text-4xl font-bold">{netProfit.toFixed(3)} DT</div>
        </div>

        {/* Stats Grid - Simplified */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 border text-center">
            <div className="text-2xl font-bold text-green-600">{revenue.toFixed(0)}</div>
            <div className="text-xs text-gray-500">الإيرادات</div>
          </div>
          <div className="bg-white rounded-xl p-4 border text-center">
            <div className="text-2xl font-bold text-red-500">{expenseTotal.toFixed(0)}</div>
            <div className="text-xs text-gray-500">المصروفات</div>
          </div>
          <div className="bg-white rounded-xl p-4 border text-center">
            <div className="text-2xl font-bold text-blue-600">{salesCount}</div>
            <div className="text-xs text-gray-500">عدد المبيعات</div>
          </div>
          <div className="bg-white rounded-xl p-4 border text-center">
            <div className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {profitMargin.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">هامش الربح</div>
          </div>
        </div>

        {/* Debt Section */}
        <div className="bg-white rounded-xl p-4 border">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">إجمالي الديون</span>
            <span className="text-xl font-bold text-orange-600">{totalDebt.toFixed(3)} DT</span>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              <span className="font-bold text-gray-900">إحصائيات الإيرادات</span>
            </div>
            <span className="text-xs text-gray-500">تتبع المبيعات</span>
          </div>

          {/* Chart Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-gray-50 rounded-xl p-2 text-center">
              <div className="text-xs text-gray-500">الإجمالي</div>
              <div className="font-bold text-gray-900">{totalChartRevenue >= 1000 ? `${(totalChartRevenue/1000).toFixed(1)}k` : totalChartRevenue.toFixed(0)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-2 text-center">
              <div className="text-xs text-gray-500">المتوسط</div>
              <div className="font-bold text-gray-900">{avgChartRevenue.toFixed(0)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-2 text-center">
              <div className="text-xs text-gray-500">الأعلى</div>
              <div className="font-bold text-green-600">{maxChartRevenue.toFixed(0)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-2 text-center">
              <div className="text-xs text-gray-500">الأدنى</div>
              <div className="font-bold text-gray-600">{minChartRevenue.toFixed(0)}</div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-3 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600">الإيرادات</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-400 rounded"></div>
              <span className="text-gray-600">المصروفات</span>
            </div>
          </div>

          {/* Chart */}
          <div className="h-48 flex items-end gap-2">
            {chartData.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-0.5 items-end h-36">
                  {/* Revenue Bar */}
                  <div 
                    className="flex-1 bg-gradient-to-t from-green-500 to-green-400 rounded-t-md transition-all hover:from-green-600 hover:to-green-500"
                    style={{ height: `${(day.revenue / chartMax) * 100}%`, minHeight: day.revenue > 0 ? '4px' : '0' }}
                    title={`إيرادات: ${day.revenue.toFixed(3)}`}
                  ></div>
                  {/* Expense Bar */}
                  <div 
                    className="flex-1 bg-gradient-to-t from-red-400 to-red-300 rounded-t-md transition-all hover:from-red-500 hover:to-red-400"
                    style={{ height: `${(day.expense / chartMax) * 100}%`, minHeight: day.expense > 0 ? '4px' : '0' }}
                    title={`مصروفات: ${day.expense.toFixed(3)}`}
                  ></div>
                </div>
                <div className="text-[10px] text-gray-500 truncate w-full text-center">{day.name}</div>
              </div>
            ))}
          </div>

          {/* Chart Totals */}
          <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="text-sm">
              <span className="text-gray-500">إجمالي الإيرادات</span>
              <span className="font-bold text-green-600 mr-2">{totalChartRevenue.toFixed(2)} د.ت</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">إجمالي المصروفات</span>
              <span className="font-bold text-red-500 mr-2">{totalChartExpense.toFixed(2)} د.ت</span>
            </div>
          </div>
        </div>

        {/* Debt Section */}
        {totalDebt > 0 && (
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">البيع بالآجل (الديون)</div>
                  <div className="text-xs text-gray-500">هذه المبالغ غير محسوبة في الأرباح أعلاه</div>
                </div>
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-orange-600">{totalDebt.toFixed(3)}</div>
                <div className="text-xs text-gray-500">{debtMembers.length} عميل</div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowDebtDetails(!showDebtDetails)}
              className="w-full mt-3 py-2 bg-orange-100 hover:bg-orange-200 rounded-xl text-orange-700 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {showDebtDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              عرض التفاصيل
            </button>

            {showDebtDetails && debtMembers.length > 0 && (
              <div className="mt-3 space-y-2">
                {debtMembers.map(m => (
                  <div key={m.id} className="bg-white rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">{m.name}</div>
                      <div className="text-xs text-gray-500">{m.phone}</div>
                    </div>
                    <div className="text-lg font-bold text-orange-600">{m.debt.toFixed(3)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Period Comparison */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-primary-600" />
            <span className="font-bold text-gray-900">مقارنة الفترات</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-600">اليوم</span>
              <span className="font-bold text-gray-900">{todayRevenue.toFixed(2)} دينار</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-600">آخر 7 أيام</span>
              <span className="font-bold text-gray-900">{last7DaysRevenue.toFixed(2)} دينار</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-600">آخر 30 يوم</span>
              <span className="font-bold text-gray-900">{last30DaysRevenue.toFixed(2)} دينار</span>
            </div>
          </div>
        </div>
        </>
        )}
      </main>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Transaction, Expense, RetailCustomer, Product } from '@/types/database'
import { 
  ArrowLeft, TrendingUp, RefreshCw, Package, 
  Receipt, BarChart3, CreditCard, Calendar,
  ArrowUpRight, ChevronDown, ChevronUp,
  ShoppingCart, PiggyBank
} from 'lucide-react'

type PeriodType = 'today' | 'week' | 'month' | 'all'

export default function RetailFinancialPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [customers, setCustomers] = useState<RetailCustomer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodType>('week')
  const [showDebtDetails, setShowDebtDetails] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    
    const [txRes, expRes, custRes, prodRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('business_id', user.id).in('type', ['sale', 'retail']).order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').eq('business_id', user.id).order('date', { ascending: false }),
      supabase.from('retail_customers').select('*').eq('business_id', user.id),
      supabase.from('products').select('*').eq('business_id', user.id)
    ])
    
    if (txRes.data) setTransactions(txRes.data)
    if (expRes.data) setExpenses(expRes.data)
    if (custRes.data) setCustomers(custRes.data)
    if (prodRes.data) setProducts(prodRes.data)
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  // Date calculations
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 86400000)
  const monthAgo = new Date(today.getTime() - 30 * 86400000)

  const getStartDate = (p: PeriodType) => {
    if (p === 'today') return today
    if (p === 'week') return weekAgo
    if (p === 'month') return monthAgo
    return new Date(0) // 'all'
  }

  const startDate = getStartDate(period)

  // Filter transactions by period (excluding debt payments from revenue)
  const periodTransactions = useMemo(() => 
    transactions.filter(tx => new Date(tx.created_at) >= startDate && tx.payment_method !== 'debt'),
    [transactions, startDate]
  )

  // Calculate totals
  const revenue = periodTransactions.reduce((sum, tx) => sum + tx.amount, 0)

  const periodExpenses = useMemo(() => 
    expenses.filter(exp => new Date(exp.date) >= startDate),
    [expenses, startDate]
  )

  const expenseTotal = periodExpenses.reduce((sum, exp) => sum + exp.amount, 0)

  // Estimate cost of goods sold based on product cost prices
  const costOfGoods = periodTransactions.reduce((sum, tx) => {
    // If transaction has items with cost tracking
    const items = tx.items || []
    const cost = items.reduce((itemSum: number, item: any) => {
      const product = products.find(p => p.id === item.product_id)
      return itemSum + ((product?.cost || product?.cost_price || 0) * (item.quantity || 1))
    }, 0)
    return sum + cost
  }, 0)

  const grossProfit = revenue - costOfGoods
  const netProfit = grossProfit - expenseTotal
  const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100) : 0
  const salesCount = periodTransactions.length

  // Total debt from customers
  const debtCustomers = customers.filter(c => c.total_debt > 0)
  const totalDebt = debtCustomers.reduce((sum, c) => sum + c.total_debt, 0)

  // Chart data - last 7 days
  const chartData = useMemo(() => {
    const days = []
    const dayNames = ['Ø§Ù„Ø£Ø­Ø¯', 'Ø§Ù„Ø¥Ø«Ù†ÙŠÙ†', 'Ø§Ù„Ø«Ù„Ø§Ø«Ø§Ø¡', 'Ø§Ù„Ø£Ø±Ø¨Ø¹Ø§Ø¡', 'Ø§Ù„Ø®Ù…ÙŠØ³', 'Ø§Ù„Ø¬Ù…Ø¹Ø©', 'Ø§Ù„Ø³Ø¨Øª']
    
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

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
      <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard/retail" className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              Ù„ÙˆØ­Ø© Ø§Ù„Ù…Ø§Ù„ÙŠØ©
            </h1>
            <p className="text-xs text-gray-500">Ø¹Ø±Ø¶ ÙˆØªØ­Ù„ÙŠÙ„ Ø§Ù„Ø£Ø¯Ø§Ø¡ Ø§Ù„Ù…Ø§Ù„ÙŠ Ù„Ù…Ø­Ù„Ùƒ</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 pb-20">
        {/* Period Tabs */}
        <div className="flex gap-1 bg-white p-1.5 rounded-2xl shadow-sm overflow-x-auto">
          {[
            { k: 'today', l: 'Ø§Ù„ÙŠÙˆÙ…' },
            { k: 'week', l: 'Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹' },
            { k: 'month', l: 'Ø§Ù„Ø´Ù‡Ø±' },
            { k: 'all', l: 'Ø§Ù„ÙƒÙ„' }
          ].map(p => (
            <button
              key={p.k}
              onClick={() => setPeriod(p.k as PeriodType)}
              className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                period === p.k 
                  ? 'bg-primary-600 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p.l}
            </button>
          ))}
        </div>

        {/* Net Profit Card - Hero */}
        <div className={`rounded-3xl p-6 text-white shadow-lg ${netProfit >= 0 ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <PiggyBank className="w-6 h-6" />
            </div>
            <span className="font-medium opacity-90">ØµØ§ÙÙŠ Ø§Ù„Ø±Ø¨Ø­</span>
          </div>
          <div className="text-4xl font-bold mb-2">{netProfit.toFixed(3)} <span className="text-lg font-normal opacity-80">Ø¯.Øª</span></div>
          <div className="text-sm opacity-80 flex items-center gap-1">
            <span>= Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª - ØªÙƒÙ„ÙØ© Ø§Ù„Ø¨Ø¶Ø§Ø¹Ø© - Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</span>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Revenue */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{revenue.toFixed(3)}</div>
            <div className="text-xs text-gray-500 mt-1">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª</div>
          </div>

          {/* Cost of Goods */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm text-gray-600">ØªÙƒÙ„ÙØ© Ø§Ù„Ø¨Ø¶Ø§Ø¹Ø©</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{costOfGoods.toFixed(3)}</div>
            <div className="text-xs text-gray-500 mt-1">Ø³Ø¹Ø± Ø´Ø±Ø§Ø¡ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª</div>
          </div>

          {/* Expenses */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-4 h-4 text-red-600" />
              </div>
              <span className="text-sm text-gray-600">Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{expenseTotal.toFixed(3)}</div>
            <div className="text-xs text-gray-500 mt-1">Ø¥ÙŠØ¬Ø§Ø±ØŒ ÙƒÙ‡Ø±Ø¨Ø§Ø¡ØŒ Ø±ÙˆØ§ØªØ¨...</div>
          </div>

          {/* Gross Profit */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-sm text-gray-600">Ø§Ù„Ø±Ø¨Ø­ Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{grossProfit.toFixed(3)}</div>
            <div className="text-xs text-gray-500 mt-1">Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª - ØªÙƒÙ„ÙØ© Ø§Ù„Ø¨Ø¶Ø§Ø¹Ø©</div>
          </div>
        </div>

        {/* Sales Stats Row */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{salesCount}</div>
            <div className="text-xs text-gray-500">Ø¹Ù…Ù„ÙŠØ© Ø¨ÙŠØ¹</div>
          </div>
          <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitMargin.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Ù‡Ø§Ù…Ø´ Ø§Ù„Ø±Ø¨Ø­</div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              <span className="font-bold text-gray-900">Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª</span>
            </div>
            <span className="text-xs text-gray-500">Ø¢Ø®Ø± 7 Ø£ÙŠØ§Ù…</span>
          </div>

          {/* Chart Stats */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-gray-50 rounded-xl p-2 text-center">
              <div className="text-xs text-gray-500">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</div>
              <div className="font-bold text-gray-900">{totalChartRevenue >= 1000 ? `${(totalChartRevenue/1000).toFixed(1)}k` : totalChartRevenue.toFixed(0)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-2 text-center">
              <div className="text-xs text-gray-500">Ø§Ù„Ù…ØªÙˆØ³Ø·</div>
              <div className="font-bold text-gray-900">{avgChartRevenue.toFixed(0)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-2 text-center">
              <div className="text-xs text-gray-500">Ø§Ù„Ø£Ø¹Ù„Ù‰</div>
              <div className="font-bold text-green-600">{maxChartRevenue.toFixed(0)}</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-2 text-center">
              <div className="text-xs text-gray-500">Ø§Ù„Ø£Ø¯Ù†Ù‰</div>
              <div className="font-bold text-gray-600">{minChartRevenue.toFixed(0)}</div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-3 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600">Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-400 rounded"></div>
              <span className="text-gray-600">Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</span>
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
                    title={`Ù…Ø¨ÙŠØ¹Ø§Øª: ${day.revenue.toFixed(3)}`}
                  ></div>
                  {/* Expense Bar */}
                  <div 
                    className="flex-1 bg-gradient-to-t from-red-400 to-red-300 rounded-t-md transition-all hover:from-red-500 hover:to-red-400"
                    style={{ height: `${(day.expense / chartMax) * 100}%`, minHeight: day.expense > 0 ? '4px' : '0' }}
                    title={`Ù…ØµØ±ÙˆÙØ§Øª: ${day.expense.toFixed(3)}`}
                  ></div>
                </div>
                <div className="text-[10px] text-gray-500 truncate w-full text-center">{day.name}</div>
              </div>
            ))}
          </div>

          {/* Chart Totals */}
          <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
            <div className="text-sm">
              <span className="text-gray-500">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª</span>
              <span className="font-bold text-green-600 mr-2">{totalChartRevenue.toFixed(2)} Ø¯.Øª</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</span>
              <span className="font-bold text-red-500 mr-2">{totalChartExpense.toFixed(2)} Ø¯.Øª</span>
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
                  <div className="font-bold text-gray-900">Ø§Ù„Ø¨ÙŠØ¹ Ø¨Ø§Ù„Ø¢Ø¬Ù„ (Ø§Ù„Ø¯ÙŠÙˆÙ†)</div>
                  <div className="text-xs text-gray-500">Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¨Ø§Ù„Øº ØºÙŠØ± Ù…Ø­Ø³ÙˆØ¨Ø© ÙÙŠ Ø§Ù„Ø£Ø±Ø¨Ø§Ø­ Ø£Ø¹Ù„Ø§Ù‡</div>
                </div>
              </div>
              <div className="text-left">
                <div className="text-2xl font-bold text-orange-600">{totalDebt.toFixed(3)}</div>
                <div className="text-xs text-gray-500">{debtCustomers.length} Ø¹Ù…ÙŠÙ„</div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowDebtDetails(!showDebtDetails)}
              className="w-full mt-3 py-2 bg-orange-100 hover:bg-orange-200 rounded-xl text-orange-700 font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {showDebtDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Ø¹Ø±Ø¶ Ø§Ù„ØªÙØ§ØµÙŠÙ„
            </button>

            {showDebtDetails && debtCustomers.length > 0 && (
              <div className="mt-3 space-y-2">
                {debtCustomers.map(c => (
                  <div key={c.id} className="bg-white rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.phone}</div>
                    </div>
                    <div className="text-lg font-bold text-orange-600">{c.total_debt.toFixed(3)}</div>
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
            <span className="font-bold text-gray-900">Ù…Ù‚Ø§Ø±Ù†Ø© Ø§Ù„ÙØªØ±Ø§Øª</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Ø§Ù„ÙŠÙˆÙ…</span>
              <span className="font-bold text-gray-900">{todayRevenue.toFixed(2)} Ø¯ÙŠÙ†Ø§Ø±</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Ø¢Ø®Ø± 7 Ø£ÙŠØ§Ù…</span>
              <span className="font-bold text-gray-900">{last7DaysRevenue.toFixed(2)} Ø¯ÙŠÙ†Ø§Ø±</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-600">Ø¢Ø®Ø± 30 ÙŠÙˆÙ…</span>
              <span className="font-bold text-gray-900">{last30DaysRevenue.toFixed(2)} Ø¯ÙŠÙ†Ø§Ø±</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}


'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Transaction, Expense, RetailCustomer } from '@/types/database'
import { ArrowLeft, TrendingUp, RefreshCw } from 'lucide-react'

export default function FinancialPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [customers, setCustomers] = useState<RetailCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    
    const [txRes, expRes, custRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('business_id', user.id).in('type', ['sale', 'retail']),
      supabase.from('expenses').select('*').eq('business_id', user.id),
      supabase.from('retail_customers').select('*').eq('business_id', user.id).gt('total_debt', 0)
    ])
    
    if (txRes.data) setTransactions(txRes.data)
    if (expRes.data) setExpenses(expRes.data)
    if (custRes.data) setCustomers(custRes.data)
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  // Date calculations
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 86400000)
  const monthAgo = new Date(today.getTime() - 30 * 86400000)

  const startDate = period === 'today' ? today : period === 'week' ? weekAgo : monthAgo

  // Calculate totals
  const sales = transactions
    .filter(tx => new Date(tx.created_at) >= startDate)
    .reduce((sum, tx) => sum + tx.amount, 0)

  const expenseTotal = expenses
    .filter(exp => new Date(exp.date) >= startDate)
    .reduce((sum, exp) => sum + exp.amount, 0)

  const profit = sales - expenseTotal
  const totalDebt = customers.reduce((sum, c) => sum + c.total_debt, 0)

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
          <h1 className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            المالية
          </h1>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Period Tabs */}
        <div className="flex gap-2 bg-white p-1 rounded-xl">
          {[
            { k: 'today', l: 'اليوم' },
            { k: 'week', l: 'الأسبوع' },
            { k: 'month', l: 'الشهر' }
          ].map(p => (
            <button
              key={p.k}
              onClick={() => setPeriod(p.k as any)}
              className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                period === p.k ? 'bg-primary-600 text-white' : 'text-gray-600'
              }`}
            >
              {p.l}
            </button>
          ))}
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-500 rounded-2xl p-4 text-white">
            <div className="text-sm opacity-90">المبيعات</div>
            <div className="text-2xl font-bold mt-1">{sales.toFixed(3)}</div>
          </div>
          <div className="bg-red-500 rounded-2xl p-4 text-white">
            <div className="text-sm opacity-90">المصروفات</div>
            <div className="text-2xl font-bold mt-1">{expenseTotal.toFixed(3)}</div>
          </div>
        </div>

        {/* Profit Card */}
        <div className={`rounded-2xl p-5 text-white ${profit >= 0 ? 'bg-blue-600' : 'bg-red-600'}`}>
          <div className="text-center">
            <div className="text-sm opacity-90">صافي الربح</div>
            <div className="text-4xl font-bold mt-2">{profit.toFixed(3)}</div>
            <div className="text-sm opacity-80 mt-1">DT</div>
          </div>
        </div>

        {/* Debt */}
        {totalDebt > 0 && (
          <div className="bg-orange-500 rounded-2xl p-4 text-white flex justify-between items-center">
            <div>
              <div className="text-sm opacity-90">الديون</div>
              <div className="text-xs opacity-70">{customers.length} عميل</div>
            </div>
            <div className="text-2xl font-bold">{totalDebt.toFixed(3)}</div>
          </div>
        )}
      </main>
    </div>
  )
}

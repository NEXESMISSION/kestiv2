'use client'

import { useState, useMemo } from 'react'
import { 
  TrendingUp, TrendingDown, Calendar, Search, Filter,
  ChevronDown, ChevronUp, Trash2, Edit3, X, Loader2, Check, AlertTriangle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { FreelancerPayment, FreelancerExpense } from '@/types/database'

type HistoryPeriod = 'today' | 'week' | 'month' | 'all'
type HistoryType = 'all' | 'income' | 'expense'

interface HistoryTabProps {
  payments: FreelancerPayment[]
  expenses: FreelancerExpense[]
  userId: string
  onRefresh: () => void
}

interface HistoryItem {
  id: string
  type: 'income' | 'expense'
  amount: number
  description: string
  date: Date
  dateStr: string
}

export default function HistoryTab({ payments, expenses, userId, onRefresh }: HistoryTabProps) {
  const [period, setPeriod] = useState<HistoryPeriod>('month')
  const [typeFilter, setTypeFilter] = useState<HistoryType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Edit/Delete state
  const [editingItem, setEditingItem] = useState<HistoryItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<HistoryItem | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Combine and sort history items
  const historyItems = useMemo(() => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Convert payments to history items
    let items: HistoryItem[] = payments.map(p => ({
      id: p.id,
      type: 'income' as const,
      amount: Number(p.amount),
      description: p.notes || (p.payment_type === 'deposit' ? 'عربون' : p.payment_type === 'full' ? 'دفعة كاملة' : 'دفعة جزئية'),
      date: new Date(p.created_at),
      dateStr: p.created_at.split('T')[0]
    }))

    // Add expenses
    items = items.concat(expenses.map(e => ({
      id: e.id,
      type: 'expense' as const,
      amount: Number(e.amount),
      description: e.description || e.category || 'مصروف',
      date: new Date(e.date),
      dateStr: e.date
    })))

    // Filter by period
    switch (period) {
      case 'today':
        items = items.filter(i => i.dateStr === today)
        break
      case 'week':
        items = items.filter(i => i.date >= startOfWeek)
        break
      case 'month':
        items = items.filter(i => i.date >= startOfMonth)
        break
    }

    // Filter by type
    if (typeFilter !== 'all') {
      items = items.filter(i => i.type === typeFilter)
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      items = items.filter(i => i.description.toLowerCase().includes(query))
    }

    // Sort by date (newest first)
    items.sort((a, b) => b.date.getTime() - a.date.getTime())

    return items
  }, [payments, expenses, period, typeFilter, searchQuery])

  // Calculate totals
  const totals = useMemo(() => {
    const income = historyItems.filter(i => i.type === 'income').reduce((sum, i) => sum + i.amount, 0)
    const expense = historyItems.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0)
    return { income, expense, net: income - expense }
  }, [historyItems])

  // Group by date
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: HistoryItem[] } = {}
    historyItems.forEach(item => {
      const key = item.dateStr
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })
    return groups
  }, [historyItems])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    
    if (dateStr === today) return 'اليوم'
    if (dateStr === yesterday) return 'أمس'
    return date.toLocaleDateString('ar-TN', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const periodLabels: Record<HistoryPeriod, string> = {
    today: 'اليوم',
    week: 'الأسبوع',
    month: 'الشهر',
    all: 'الكل'
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card !p-3 text-center">
          <TrendingUp className="w-4 h-4 text-green-500 mx-auto mb-1" />
          <p className="text-sm font-bold text-green-600">{totals.income.toFixed(0)}</p>
          <p className="text-[10px] text-gray-500">دخل</p>
        </div>
        <div className="card !p-3 text-center">
          <TrendingDown className="w-4 h-4 text-red-500 mx-auto mb-1" />
          <p className="text-sm font-bold text-red-500">{totals.expense.toFixed(0)}</p>
          <p className="text-[10px] text-gray-500">مصاريف</p>
        </div>
        <div className="card !p-3 text-center">
          <Calendar className="w-4 h-4 text-primary-500 mx-auto mb-1" />
          <p className={`text-sm font-bold ${totals.net >= 0 ? 'text-primary-600' : 'text-orange-600'}`}>
            {totals.net.toFixed(0)}
          </p>
          <p className="text-[10px] text-gray-500">صافي</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card !p-3">
        {/* Period Filter */}
        <div className="flex items-center gap-2 mb-3">
          {(['today', 'week', 'month', 'all'] as HistoryPeriod[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>

        {/* Toggle More Filters */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-center gap-1 text-xs text-gray-500 py-1"
        >
          <Filter className="w-3 h-3" />
          فلاتر إضافية
          {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
            {/* Type Filter */}
            <div className="flex gap-2">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'income', label: 'دخل' },
                { id: 'expense', label: 'مصاريف' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTypeFilter(t.id as HistoryType)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    typeFilter === t.id
                      ? t.id === 'income' ? 'bg-green-500 text-white' 
                        : t.id === 'expense' ? 'bg-red-500 text-white'
                        : 'bg-gray-700 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pr-9 pl-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                placeholder="بحث..."
              />
            </div>
          </div>
        )}
      </div>

      {/* History List */}
      <div className="space-y-3">
        {Object.keys(groupedItems).length === 0 ? (
          <div className="card !p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">لا توجد سجلات</p>
          </div>
        ) : (
          Object.entries(groupedItems).map(([dateStr, items]) => (
            <div key={dateStr}>
              {/* Date Header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-500 font-medium">{formatDate(dateStr)}</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              {/* Items */}
              <div className="space-y-2">
                {items.map(item => (
                  <div 
                    key={item.id} 
                    className={`card !p-3 flex items-center justify-between border-r-4 ${
                      item.type === 'income' ? 'border-r-green-500' : 'border-r-red-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {item.type === 'income' 
                          ? <TrendingUp className="w-4 h-4 text-green-600" />
                          : <TrendingDown className="w-4 h-4 text-red-500" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.description}</p>
                        <p className="text-xs text-gray-400">
                          {item.date.toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`font-bold ${item.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                        {item.type === 'income' ? '+' : '-'}{item.amount.toFixed(0)} DT
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingItem(item)
                          setEditAmount(item.amount.toString())
                          setEditDescription(item.description)
                        }}
                        className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingItem(item)
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setEditingItem(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className={`p-5 text-white rounded-t-2xl ${editingItem.type === 'income' ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">تعديل {editingItem.type === 'income' ? 'الدخل' : 'المصروف'}</h3>
                <button onClick={() => setEditingItem(null)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (DT)</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="input-field text-lg"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="input-field"
                  placeholder="وصف العملية"
                />
              </div>
              <button
                onClick={async () => {
                  if (!editAmount) return
                  setIsSubmitting(true)
                  try {
                    const supabase = createClient()
                    if (editingItem.type === 'income') {
                      await supabase.from('freelancer_payments')
                        .update({ amount: parseFloat(editAmount), notes: editDescription })
                        .eq('id', editingItem.id)
                    } else {
                      await supabase.from('freelancer_expenses')
                        .update({ amount: parseFloat(editAmount), description: editDescription })
                        .eq('id', editingItem.id)
                    }
                    setEditingItem(null)
                    onRefresh()
                  } catch (error) {
                    console.error('Error updating:', error)
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
                disabled={!editAmount || isSubmitting}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeletingItem(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-lg font-bold">حذف العملية</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                <p className="text-red-700 font-medium mb-1">هل أنت متأكد من حذف هذه العملية؟</p>
                <p className="text-red-600 text-sm">{deletingItem.description}</p>
                <p className="text-red-600 font-bold text-lg mt-2">
                  {deletingItem.type === 'income' ? '+' : '-'}{deletingItem.amount.toFixed(0)} DT
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingItem(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={async () => {
                    setIsSubmitting(true)
                    try {
                      const supabase = createClient()
                      if (deletingItem.type === 'income') {
                        await supabase.from('freelancer_payments').delete().eq('id', deletingItem.id)
                      } else {
                        await supabase.from('freelancer_expenses').delete().eq('id', deletingItem.id)
                      }
                      setDeletingItem(null)
                      onRefresh()
                    } catch (error) {
                      console.error('Error deleting:', error)
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  حذف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

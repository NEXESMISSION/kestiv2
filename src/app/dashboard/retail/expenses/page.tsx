'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Expense } from '@/types/database'
import { 
  ArrowLeft, Receipt, Plus, Edit2, Trash2, X, Check, RefreshCw, Calendar
} from 'lucide-react'

const EXPENSE_CATEGORIES = [
  'Ø¥ÙŠØ¬Ø§Ø±',
  'Ø±ÙˆØ§ØªØ¨',
  'ÙƒÙ‡Ø±Ø¨Ø§Ø¡',
  'Ù…Ø§Ø¡',
  'Ù…Ø´ØªØ±ÙŠØ§Øª',
  'ØµÙŠØ§Ù†Ø©',
  'Ù†Ù‚Ù„',
  'Ø£Ø®Ø±Ù‰'
]

export default function ExpensesPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'today' | 'week' | 'month' | 'all'>('month')
  
  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [formAmount, setFormAmount] = useState('')
  const [formCategory, setFormCategory] = useState(EXPENSE_CATEGORIES[0])
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formNotes, setFormNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('business_id', user.id)
      .order('date', { ascending: false })
    
    if (data) setExpenses(data)
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  // Filter expenses by date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)
  const monthAgo = new Date(today.getTime() - 30 * 86400000)

  const filteredExpenses = expenses.filter(e => {
    const date = new Date(e.date)
    if (filter === 'today') return date >= today
    if (filter === 'week') return date >= weekAgo
    if (filter === 'month') return date >= monthAgo
    return true
  })

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)

  const openModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense)
      setFormAmount(expense.amount.toString())
      setFormCategory(expense.category)
      setFormDate(expense.date)
      setFormNotes(expense.notes || '')
    } else {
      setEditingExpense(null)
      setFormAmount('')
      setFormCategory(EXPENSE_CATEGORIES[0])
      setFormDate(new Date().toISOString().split('T')[0])
      setFormNotes('')
    }
    setShowModal(true)
  }

  const saveExpense = async () => {
    if (!formAmount || parseFloat(formAmount) <= 0) return
    setProcessing(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const expenseData = {
        amount: parseFloat(formAmount),
        category: formCategory,
        date: formDate,
        notes: formNotes.trim() || null
      }
      
      if (editingExpense) {
        await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)
      } else {
        await supabase
          .from('expenses')
          .insert({ ...expenseData, business_id: user.id })
      }
      
      setShowModal(false)
      fetchData()
    } catch (error) {
      console.error('Save error:', error)
      alert('Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ Ø§Ù„Ø­ÙØ¸')
    } finally {
      setProcessing(false)
    }
  }

  const deleteExpense = async (id: string) => {
    if (!confirm('Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ù…ØµØ±ÙˆÙØŸ')) return
    
    await supabase.from('expenses').delete().eq('id', id)
    fetchData()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
      <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard/retail" className="p-2 hover:bg-gray-100 rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-600" />
                Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª
              </h1>
            </div>
            <button
              onClick={() => openModal()}
              className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Total Card */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 text-white">
          <div className="text-sm opacity-90">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª</div>
          <div className="text-3xl font-bold mt-1">{totalFiltered.toFixed(3)} DT</div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto">
          {[
            { k: 'today', l: 'Ø§Ù„ÙŠÙˆÙ…' },
            { k: 'week', l: 'Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹' },
            { k: 'month', l: 'Ø§Ù„Ø´Ù‡Ø±' },
            { k: 'all', l: 'Ø§Ù„ÙƒÙ„' }
          ].map(f => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k as any)}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap text-sm ${
                filter === f.k 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-white border text-gray-600'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>

        {/* Expenses List */}
        <div className="space-y-2">
          {filteredExpenses.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…ØµØ±ÙˆÙØ§Øª</p>
            </div>
          ) : (
            filteredExpenses.map(expense => (
              <div key={expense.id} className="bg-white rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                        {expense.category}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(expense.date).toLocaleDateString('ar-TN')}
                      </span>
                    </div>
                    {expense.notes && (
                      <p className="text-sm text-gray-600 mt-1">{expense.notes}</p>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-bold text-red-600">{expense.amount.toFixed(3)}</div>
                    <div className="flex gap-1 mt-1">
                      <button 
                        onClick={() => openModal(expense)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </button>
                      <button 
                        onClick={() => deleteExpense(expense.id)}
                        className="p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">
                {editingExpense ? 'ØªØ¹Ø¯ÙŠÙ„ Ù…ØµØ±ÙˆÙ' : 'Ù…ØµØ±ÙˆÙ Ø¬Ø¯ÙŠØ¯'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ø§Ù„Ù…Ø¨Ù„Øº *</label>
                <input
                  type="number"
                  step="0.001"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl text-lg font-bold text-center"
                  placeholder="0.000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ø§Ù„ØªØµÙ†ÙŠÙ</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ø§Ù„ØªØ§Ø±ÙŠØ®</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ù…Ù„Ø§Ø­Ø¸Ø§Øª</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl"
                  placeholder="Ø§Ø®ØªÙŠØ§Ø±ÙŠ"
                />
              </div>
              
              <button
                onClick={saveExpense}
                disabled={!formAmount || parseFloat(formAmount) <= 0 || processing}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-xl font-bold flex items-center justify-center gap-2"
              >
                {processing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Ø­ÙØ¸
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


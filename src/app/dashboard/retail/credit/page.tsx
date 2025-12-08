'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { RetailCustomer } from '@/types/database'
import { 
  ArrowLeft, CreditCard, User, Search, DollarSign, Check, X, RefreshCw
} from 'lucide-react'

export default function CreditPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [customers, setCustomers] = useState<RetailCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // Payment modal
  const [payingCustomer, setPayingCustomer] = useState<RetailCustomer | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full')
  const [processing, setProcessing] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    
    const { data } = await supabase
      .from('retail_customers')
      .select('*')
      .eq('business_id', user.id)
      .gt('total_debt', 0)
      .order('total_debt', { ascending: false })
    
    if (data) setCustomers(data)
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  const totalDebt = customers.reduce((sum, c) => sum + c.total_debt, 0)

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  )

  const openPayment = (customer: RetailCustomer, type: 'full' | 'partial') => {
    setPayingCustomer(customer)
    setPaymentType(type)
    setPaymentAmount(type === 'full' ? customer.total_debt.toString() : '')
  }

  const processPayment = async () => {
    if (!payingCustomer || !paymentAmount) return
    setProcessing(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const amount = parseFloat(paymentAmount)
      if (isNaN(amount) || amount <= 0) {
        alert('Ø§Ù„Ù…Ø¨Ù„Øº ØºÙŠØ± ØµØ­ÙŠØ­')
        return
      }
      
      const newDebt = Math.max(0, payingCustomer.total_debt - amount)
      
      // Create payment transaction
      await supabase.from('transactions').insert({
        business_id: user.id,
        customer_id: payingCustomer.id,
        type: 'debt_payment',
        payment_method: 'cash',
        amount: amount,
        notes: `ØªØ³Ø¯ÙŠØ¯ Ø¯ÙŠÙ† - ${payingCustomer.name}`
      })
      
      // Try to log in debt_payments table
      try {
        await supabase.from('debt_payments').insert({
          business_id: user.id,
          customer_id: payingCustomer.id,
          amount: amount,
          payment_type: paymentType,
          notes: paymentType === 'full' ? 'ØªØ³Ø¯ÙŠØ¯ ÙƒØ§Ù…Ù„' : 'ØªØ³Ø¯ÙŠØ¯ Ø¬Ø²Ø¦ÙŠ'
        })
      } catch (e) {
        console.log('debt_payments table may not exist')
      }
      
      // Update customer debt
      await supabase
        .from('retail_customers')
        .update({ total_debt: newDebt })
        .eq('id', payingCustomer.id)
      
      setPayingCustomer(null)
      setPaymentAmount('')
      fetchData()
    } catch (error) {
      console.error('Payment error:', error)
      alert('Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«Ù†Ø§Ø¡ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯ÙØ¹')
    } finally {
      setProcessing(false)
    }
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
          <div className="flex items-center gap-3">
            <Link href="/dashboard/retail" className="p-2 hover:bg-gray-100 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <h1 className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-orange-600" />
                Ø§Ù„Ø¢Ø¬Ù„ (Ø§Ù„Ø¯ÙŠÙˆÙ†)
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Total Debt Card */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 text-white">
          <div className="text-sm opacity-90">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¯ÙŠÙˆÙ†</div>
          <div className="text-3xl font-bold mt-1">{totalDebt.toFixed(3)} DT</div>
          <div className="text-sm opacity-80 mt-2">{customers.length} Ø¹Ù…ÙŠÙ„</div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ø¨Ø­Ø« Ø¹Ù† Ø¹Ù…ÙŠÙ„..."
            className="w-full pr-10 pl-4 py-3 bg-white border rounded-xl"
          />
        </div>

        {/* Customers List */}
        <div className="space-y-3">
          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¯ÙŠÙˆÙ† Ù…Ø³ØªØ­Ù‚Ø©</p>
            </div>
          ) : (
            filteredCustomers.map(customer => (
              <div key={customer.id} className="bg-white rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-bold">{customer.name}</div>
                      {customer.phone && <div className="text-sm text-gray-500">{customer.phone}</div>}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-xl font-bold text-orange-600">{customer.total_debt.toFixed(3)}</div>
                    <div className="text-xs text-gray-500">DT</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openPayment(customer, 'full')}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    ØªØ³Ø¯ÙŠØ¯ ÙƒØ§Ù…Ù„
                  </button>
                  <button
                    onClick={() => openPayment(customer, 'partial')}
                    className="flex-1 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <DollarSign className="w-4 h-4" />
                    ØªØ³Ø¯ÙŠØ¯ Ø¬Ø²Ø¦ÙŠ
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Payment Modal */}
      {payingCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">
                {paymentType === 'full' ? 'ØªØ³Ø¯ÙŠØ¯ ÙƒØ§Ù…Ù„' : 'ØªØ³Ø¯ÙŠØ¯ Ø¬Ø²Ø¦ÙŠ'}
              </h3>
              <button onClick={() => setPayingCustomer(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-sm text-gray-500">Ø§Ù„Ø¹Ù…ÙŠÙ„</div>
                <div className="font-bold">{payingCustomer.name}</div>
                <div className="text-sm text-orange-600 mt-1">Ø§Ù„Ø¯ÙŠÙ†: {payingCustomer.total_debt.toFixed(3)} DT</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ø§Ù„Ù…Ø¨Ù„Øº</label>
                <input
                  type="number"
                  step="0.001"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl text-lg font-bold text-center"
                  placeholder="0.000"
                  max={payingCustomer.total_debt}
                />
              </div>
              
              <button
                onClick={processPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || processing}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl font-bold flex items-center justify-center gap-2"
              >
                {processing ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    ØªØ£ÙƒÙŠØ¯ Ø§Ù„Ø¯ÙØ¹
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


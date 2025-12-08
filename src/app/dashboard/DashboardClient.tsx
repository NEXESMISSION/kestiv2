'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, Package, CreditCard, Settings, ShoppingBag, Sparkles, Calendar, Zap, Phone, Search, Plus, Edit2, Trash2, ToggleRight, ToggleLeft, History, ArrowLeft, RefreshCw, User, X, Receipt, BarChart3, Download, Minus, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { Member, Service, SubscriptionPlan, Transaction, Profile, SubscriptionHistory, Product } from '@/types/database'
import CustomerModal from '@/components/subscription/CustomerModal'
import NewMemberModal from '@/components/subscription/NewMemberModal'

interface Props {
  user: { id: string; email: string; user_metadata: Record<string, unknown> }
  profile: Profile | null
}

type Tab = 'members' | 'plans' | 'services' | 'products' | 'history'

interface CartItem {
  product: Product
  quantity: number
}

const planTypeConfig = {
  subscription: { label: 'اشتراك', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
  package: { label: 'باقة', icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
  single: { label: 'حصة واحدة', icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50' }
}

function getPlanType(m: Member) {
  if (!m.plan_id) return null
  if (m.plan_type) return m.plan_type
  if (m.sessions_total === 1) return 'single'
  if (m.sessions_total > 1) return 'package'
  return 'subscription'
}

function getMemberStatus(m: Member) {
  if (!m.plan_id) return 'no_plan'
  if (m.is_frozen) return 'frozen'
  const pt = getPlanType(m)
  // Single sessions are auto-used on purchase, so they're always 'single_used'
  if (pt === 'single') return 'single_used'
  if (pt === 'package') return (m.sessions_total - m.sessions_used) <= 0 ? 'expired' : 'active'
  // For subscription type - if no expires_at, it's unlimited/active
  if (!m.expires_at) return 'active'
  const days = Math.ceil((new Date(m.expires_at).getTime() - Date.now()) / 86400000)
  if (days <= 0) return 'expired'
  if (days <= 7) return 'expiring_soon'
  return 'active'
}

// Status labels - single sessions are auto-used
const statusLabelsExtended: Record<string, { label: string; color: string }> = {
  active: { label: 'نشط', color: 'bg-green-100 text-green-700' },
  expiring_soon: { label: 'ينتهي قريباً', color: 'bg-yellow-100 text-yellow-700' },
  expired: { label: 'منتهي', color: 'bg-red-100 text-red-700' },
  frozen: { label: '❄️ مجمد', color: 'bg-blue-100 text-blue-700' },
  single_used: { label: '⚡ حصة واحدة', color: 'bg-orange-100 text-orange-700' },
  no_plan: { label: 'بدون خطة', color: 'bg-gray-100 text-gray-500' }
}

const statusLabels: Record<string, string> = {
  active: 'نشط', expiring_soon: 'ينتهي قريباً', expired: 'منتهي', frozen: '❄️ مجمد',
  single_used: '⚡ حصة واحدة', no_plan: 'بدون خطة'
}

export default function DashboardClient({ user, profile }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('members')
  const [members, setMembers] = useState<Member[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [history, setHistory] = useState<SubscriptionHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [showNewMember, setShowNewMember] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  
  // Cart state for quick sales
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [m, p, s, t, h, prod] = await Promise.all([
      supabase.from('members').select('*').eq('business_id', user.id).order('name'),
      supabase.from('subscription_plans').select('*').eq('business_id', user.id).order('name'),
      supabase.from('services').select('*').eq('business_id', user.id).order('name'),
      supabase.from('transactions').select('*').eq('business_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('subscription_history').select('*').eq('business_id', user.id).order('created_at', { ascending: false }).limit(100),
      supabase.from('products').select('*').eq('business_id', user.id).order('name')
    ])
    if (m.data) setMembers(m.data)
    if (p.data) setPlans(p.data)
    if (s.data) setServices(s.data)
    if (t.data) setTransactions(t.data)
    if (h.data) setHistory(h.data)
    if (prod.data) setProducts(prod.data)
    setLoading(false)
  }, [supabase, user.id])
  
  // Cart functions
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }
  
  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta
        return newQty > 0 ? { ...item, quantity: newQty } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }
  
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }
  
  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  
  const completeSale = async (paymentMethod: 'cash' | 'debt') => {
    if (cart.length === 0) return
    const items = cart.map(item => ({
      product_id: item.product.id, name: item.product.name, quantity: item.quantity,
      price: item.product.price, total_price: item.product.price * item.quantity
    }))
    await supabase.from('transactions').insert({
      business_id: user.id, type: 'retail', payment_method: paymentMethod,
      amount: cartTotal, items, notes: `بيع منتجات - ${cart.length} منتج`
    })
    for (const item of cart) {
      if (item.product.stock !== null) {
        await supabase.from('products').update({ stock: Math.max(0, item.product.stock - item.quantity) }).eq('id', item.product.id)
      }
    }
    setCart([])
    setShowCart(false)
    fetchData()
  }

  useEffect(() => { fetchData() }, [fetchData])

  const filteredMembers = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search))

  // Stats
  const activeCount = members.filter(m => ['active', 'single_available', 'expiring_soon'].includes(getMemberStatus(m))).length
  const expiredCount = members.filter(m => ['expired', 'single_used'].includes(getMemberStatus(m))).length
  const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/pos" className="flex items-center gap-2 px-3 py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg font-medium">
                <ArrowLeft className="w-4 h-4" />
                <span>العودة للبيع</span>
              </Link>
              <h1 className="text-xl font-bold">لوحة التحكم</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/settings" className="p-2 hover:bg-gray-100 rounded-lg"><Settings className="w-5 h-5" /></Link>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-3 sm:p-4 text-white">
            <div className="text-xs sm:text-sm opacity-90 mb-1">العملاء النشطين</div>
            <div className="text-2xl sm:text-3xl font-bold">{activeCount}</div>
            <div className="text-xs opacity-80">عميل</div>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-3 sm:p-4 text-white">
            <div className="text-xs sm:text-sm opacity-90 mb-1">المنتهية صلاحيتهم</div>
            <div className="text-2xl sm:text-3xl font-bold">{expiredCount}</div>
            <div className="text-xs opacity-80">عميل</div>
          </div>
        </div>
        
        {/* Quick Links */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Link
            href="/dashboard/credit"
            prefetch={true}
            className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-3 sm:p-4 text-white text-right hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2" />
            <div className="font-bold text-sm sm:text-base">الآجل</div>
            <div className="text-xs sm:text-sm opacity-80 hidden sm:block">إدارة الديون</div>
          </Link>
          <Link
            href="/dashboard/expenses"
            prefetch={true}
            className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-3 sm:p-4 text-white text-right hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <Receipt className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2" />
            <div className="font-bold text-sm sm:text-base">المصروفات</div>
            <div className="text-xs sm:text-sm opacity-80 hidden sm:block">تسجيل المصاريف</div>
          </Link>
          <Link
            href="/dashboard/financial"
            prefetch={true}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-3 sm:p-4 text-white text-right hover:shadow-lg transition-all hover:-translate-y-1"
          >
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2" />
            <div className="font-bold text-sm sm:text-base">المالية</div>
            <div className="text-xs sm:text-sm opacity-80 hidden sm:block">التقارير والأرباح</div>
          </Link>
        </div>
      </div>

      {/* Tabs - Grid visible on all sizes */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-5 gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { k: 'members', l: 'العملاء', i: Users }, 
            { k: 'plans', l: 'الخطط', i: Package }, 
            { k: 'services', l: 'خدمات', i: Sparkles }, 
            { k: 'products', l: 'منتجات', i: ShoppingBag }, 
            { k: 'history', l: 'السجل', i: History }
          ].map(t => (
            <button 
              key={t.k} 
              onClick={() => setTab(t.k as Tab)} 
              className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1 sm:px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${tab === t.k ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <t.i className="w-4 h-4" />
              <span className="truncate">{t.l}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-4">
        {/* MEMBERS TAB */}
        {tab === 'members' && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="w-full pr-10 pl-4 py-2.5 bg-white border rounded-xl" />
              </div>
              <button 
                onClick={() => setShowNewMember(true)} 
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium"
              >
                <Plus className="w-5 h-5" />
                إضافة عميل
              </button>
            </div>
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">العميل</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الخطة</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الحالة</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredMembers.map(m => {
                    const pt = getPlanType(m)
                    const st = getMemberStatus(m)
                    const cfg = pt ? planTypeConfig[pt] : null
                    
                    // Calculate days remaining
                    const daysRemaining = m.expires_at 
                      ? Math.max(0, Math.ceil((new Date(m.expires_at).getTime() - Date.now()) / 86400000))
                      : null
                    
                    // Get detail text based on plan type
                    const getDetailText = () => {
                      if (!pt) return '-'
                      if (pt === 'single') return m.sessions_used >= 1 ? '✓ مستخدمة' : '⚡ متاحة'
                      if (pt === 'package') return `${m.sessions_total - m.sessions_used}/${m.sessions_total} حصة`
                      // Subscription type
                      if (!m.expires_at) return '∞ غير محدود'
                      if (daysRemaining === 0) return '⚠️ منتهي'
                      if (daysRemaining && daysRemaining <= 7) return `⚠️ ${daysRemaining} يوم`
                      return `${daysRemaining} يوم`
                    }
                    
                    return (
                      <tr key={m.id} onClick={() => setSelectedMember(m)} className="hover:bg-gray-50 cursor-pointer">
                        <td className="px-4 py-3">
                          <div className="font-medium">{m.name}</div>
                          <div className="text-sm text-gray-500" dir="ltr">{m.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          {cfg ? <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>{m.plan_name}</span> : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${st === 'active' ? 'bg-green-100 text-green-700' : st === 'expiring_soon' ? 'bg-yellow-100 text-yellow-700' : st === 'expired' ? 'bg-red-100 text-red-700' : st === 'frozen' ? 'bg-blue-100 text-blue-700' : st === 'single_used' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                            {statusLabels[st]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                          {getDetailText()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredMembers.length === 0 && <div className="p-8 text-center text-gray-400">لا يوجد عملاء</div>}
            </div>
          </div>
        )}

        {/* PLANS TAB */}
        {tab === 'plans' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => { setEditingPlan(null); setShowPlanModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium">
                <Plus className="w-5 h-5" />خطة جديدة
              </button>
            </div>
            <div className="grid gap-4">
              {plans.map(p => {
                const type = p.plan_type || (p.duration_days === 0 ? (p.sessions === 1 ? 'single' : 'package') : 'subscription')
                const cfg = planTypeConfig[type]
                return (
                  <div key={p.id} className={`bg-white rounded-xl border p-4 ${!p.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cfg.bg}`}><cfg.icon className={`w-5 h-5 ${cfg.color}`} /></div>
                        <div>
                          <div className="font-bold">{p.name}</div>
                          <div className="text-sm text-gray-500">{cfg.label} - {p.duration_days > 0 ? (p.duration_days >= 1 ? `${Math.floor(p.duration_days)} يوم${p.duration_days % 1 > 0 ? ` و ${Math.round((p.duration_days % 1) * 1440)} دقيقة` : ''}` : `${Math.round(p.duration_days * 1440)} دقيقة`) : `${p.sessions} حصة`}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary-600">{p.price.toFixed(3)} DT</span>
                        <button onClick={() => { setEditingPlan(p); setShowPlanModal(true) }} className="p-2 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={async () => { await supabase.from('subscription_plans').update({ is_active: !p.is_active }).eq('id', p.id); fetchData() }} className={`p-2 rounded-lg ${p.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                          {p.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {plans.length === 0 && <div className="bg-white rounded-xl border p-8 text-center text-gray-400">لا توجد خطط</div>}
            </div>
          </div>
        )}

        {/* SERVICES TAB */}
        {tab === 'services' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => { setEditingService(null); setShowServiceModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium">
                <Plus className="w-5 h-5" />خدمة جديدة
              </button>
            </div>
            <div className="grid gap-4">
              {services.map(s => (
                <div key={s.id} className={`bg-white rounded-xl border p-4 ${!s.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center"><Sparkles className="w-5 h-5 text-indigo-600" /></div>
                      <div>
                        <div className="font-bold">{s.name}</div>
                        {s.description && <div className="text-sm text-gray-500">{s.description}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-indigo-600">{s.price.toFixed(3)} DT</span>
                      <button onClick={() => { setEditingService(s); setShowServiceModal(true) }} className="p-2 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={async () => { await supabase.from('services').update({ is_active: !s.is_active }).eq('id', s.id); fetchData() }} className={`p-2 rounded-lg ${s.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                        {s.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {services.length === 0 && <div className="bg-white rounded-xl border p-8 text-center text-gray-400">لا توجد خدمات</div>}
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {tab === 'products' && (
          <div className="space-y-4">
            {/* Header with Add button and Cart */}
            <div className="flex items-center justify-between">
              <button onClick={() => { setEditingProduct(null); setShowProductModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium">
                <Plus className="w-5 h-5" />إضافة منتج
              </button>
              {cartCount > 0 && (
                <button onClick={() => setShowCart(true)} className="relative flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium">
                  <ShoppingCart className="w-5 h-5" />
                  السلة ({cartCount})
                  <span className="font-bold">{cartTotal.toFixed(3)} DT</span>
                </button>
              )}
            </div>

            {/* Products Grid with Cart functionality */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map(product => {
                const inCart = cart.find(item => item.product.id === product.id)
                return (
                  <div key={product.id} className={`bg-white rounded-2xl border-2 p-3 transition-all ${inCart ? 'border-green-500 bg-green-50' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-blue-50 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-primary-600" />
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingProduct(product); setShowProductModal(true) }} className="p-1.5 hover:bg-gray-100 rounded-lg">
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                        <button onClick={async () => { await supabase.from('products').update({ is_active: !product.is_active }).eq('id', product.id); fetchData() }} 
                          className={`p-1.5 rounded-lg ${product.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}>
                          {product.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900 truncate text-sm mb-1">{product.name}</h3>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-primary-600">{product.price.toFixed(3)}</span>
                      {product.stock !== null && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${product.stock <= 0 ? 'bg-red-100 text-red-600' : product.stock <= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {product.stock <= 0 ? 'نفذ' : `${product.stock}`}
                        </span>
                      )}
                    </div>
                    {/* Add to cart / Quantity controls */}
                    {inCart ? (
                      <div className="flex items-center justify-between bg-green-100 rounded-lg p-1">
                        <button onClick={() => updateCartQuantity(product.id, -1)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-bold text-green-700">{inCart.quantity}</span>
                        <button onClick={() => addToCart(product)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(product)} className="w-full py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg font-medium text-sm flex items-center justify-center gap-1">
                        <Plus className="w-4 h-4" />إضافة للسلة
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {products.length === 0 && (
              <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>لا توجد منتجات</p>
                <button onClick={() => { setEditingProduct(null); setShowProductModal(true) }} className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-xl font-medium">
                  إضافة منتج
                </button>
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div className="space-y-2">
            {history.length > 0 && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => {
                    // Type translations
                    const typeLabels: Record<string, string> = {
                      'subscription': 'اشتراك جديد',
                      'plan_change': 'شراء خطة',
                      'session_add': 'إضافة حصة',
                      'session_use': 'استخدام حصة',
                      'service': 'خدمة',
                      'freeze': 'تجميد',
                      'unfreeze': 'إلغاء تجميد',
                      'cancellation': 'إلغاء'
                    }
                    const paymentLabels: Record<string, string> = {
                      'cash': 'نقداً',
                      'debt': 'آجل',
                      'card': 'بطاقة'
                    }
                    const headers = ['التاريخ', 'الوقت', 'النوع', 'الخطة/الخدمة', 'المبلغ (د.ت)', 'طريقة الدفع']
                    const rows = history.map(h => [
                      new Date(h.created_at).toLocaleDateString('ar-TN'),
                      new Date(h.created_at).toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' }),
                      typeLabels[h.type] || h.type,
                      h.new_plan_name || h.plan_name || '-',
                      h.amount > 0 ? h.amount.toFixed(3) : '-',
                      (h.payment_method ? paymentLabels[h.payment_method] : null) || h.payment_method || '-'
                    ])
                    // Calculate total
                    const total = history.reduce((sum, h) => sum + (h.amount || 0), 0)
                    rows.push(['', '', '', 'المجموع', total.toFixed(3), ''])
                    const csv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n')
                    const blob = new Blob(['\ufeff' + csv], { type: 'text/tab-separated-values;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `سجل-الاشتراكات-${new Date().toLocaleDateString('ar-TN').replace(/\//g, '-')}.xls`
                    a.click()
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium text-sm"
                >
                  <Download className="w-4 h-4" />
                  تحميل Excel
                </button>
              </div>
            )}
            {history.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400">لا يوجد سجل</div>
            ) : (
              history.map(h => {
                // Determine label and style
                const getConfig = () => {
                  if (h.type === 'subscription') {
                    if (h.plan_name?.includes('حصة') || h.sessions_after === 1) {
                      return { icon: '⚡', label: 'شراء حصة واحدة', bg: 'bg-orange-50', text: 'text-orange-700' }
                    }
                    return { icon: '📋', label: 'اشتراك جديد', bg: 'bg-blue-50', text: 'text-blue-700' }
                  }
                  if (h.type === 'plan_change') {
                    if (h.amount > 0) {
                      return { icon: '🆕', label: 'اشتراك جديد (مدفوع)', bg: 'bg-blue-50', text: 'text-blue-700' }
                    }
                    return { icon: '🔄', label: 'تغيير الخطة', bg: 'bg-gray-50', text: 'text-gray-600' }
                  }
                  if (h.type === 'session_add') {
                    if (h.amount > 0) {
                      return { icon: '➕', label: 'إضافة حصة (مدفوعة)', bg: 'bg-indigo-50', text: 'text-indigo-700' }
                    }
                    return { icon: '➕', label: 'إضافة حصة (مجانية)', bg: 'bg-gray-50', text: 'text-gray-600' }
                  }
                  if (h.type === 'session_use') return { icon: '✅', label: 'استخدام حصة', bg: 'bg-green-50', text: 'text-green-700' }
                  if (h.type === 'service') return { icon: '✨', label: 'خدمة', bg: 'bg-amber-50', text: 'text-amber-700' }
                  if (h.type === 'freeze') return { icon: '❄️', label: 'تجميد', bg: 'bg-cyan-50', text: 'text-cyan-700' }
                  if (h.type === 'unfreeze') return { icon: '▶️', label: 'إلغاء تجميد', bg: 'bg-teal-50', text: 'text-teal-700' }
                  if (h.type === 'cancellation') return { icon: '❌', label: 'إلغاء', bg: 'bg-red-50', text: 'text-red-700' }
                  return { icon: '📝', label: h.type, bg: 'bg-gray-50', text: 'text-gray-700' }
                }
                const cfg = getConfig()
                const displayName = h.new_plan_name || h.plan_name || ''
                
                return (
                  <div key={h.id} className={`p-3 rounded-xl ${cfg.bg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-bold ${cfg.text}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(h.created_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700">
                          {displayName && <span className="font-medium">{displayName}</span>}
                          {h.sessions_added > 0 && <span className="text-indigo-600 font-medium"> +{h.sessions_added} حصة</span>}
                        </div>
                      </div>
                      <div className="text-left">
                        {h.amount > 0 ? (
                          <span className="font-bold text-green-600">{h.amount.toFixed(3)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </main>

      {/* Customer Modal */}
      {selectedMember && <CustomerModal member={selectedMember} plans={plans} services={services} onClose={() => setSelectedMember(null)} onUpdate={fetchData} />}

      {/* Plan Modal */}
      {showPlanModal && <PlanModal plan={editingPlan} onClose={() => setShowPlanModal(false)} onSave={async (data) => {
        if (editingPlan) {
          await supabase.from('subscription_plans').update(data).eq('id', editingPlan.id)
        } else {
          await supabase.from('subscription_plans').insert({ ...data, business_id: user.id })
        }
        setShowPlanModal(false)
        fetchData()
      }} />}

      {/* Service Modal */}
      {showServiceModal && <ServiceModal service={editingService} onClose={() => setShowServiceModal(false)} onSave={async (data) => {
        if (editingService) {
          await supabase.from('services').update(data).eq('id', editingService.id)
        } else {
          await supabase.from('services').insert({ ...data, business_id: user.id })
        }
        setShowServiceModal(false)
        fetchData()
      }} />}

      {/* Product Modal */}
      {showProductModal && <ProductModal product={editingProduct} onClose={() => setShowProductModal(false)} onSave={async (data) => {
        if (editingProduct) {
          await supabase.from('products').update(data).eq('id', editingProduct.id)
        } else {
          await supabase.from('products').insert({ ...data, business_id: user.id })
        }
        setShowProductModal(false)
        setEditingProduct(null)
        fetchData()
      }} />}

      {/* Cart Modal */}
      {showCart && <CartModal cart={cart} cartTotal={cartTotal} onClose={() => setShowCart(false)} onUpdateQuantity={updateCartQuantity} onRemove={removeFromCart} onCompleteSale={completeSale} />}

      {/* New Member Modal */}
      <NewMemberModal
        plans={plans}
        isOpen={showNewMember}
        onClose={() => setShowNewMember(false)}
        onAddPlans={() => { setShowNewMember(false); setTab('plans'); setShowPlanModal(true) }}
        onSubmit={async (data) => {
          let memberData: any = { business_id: user.id, name: data.name, phone: data.phone, email: data.email || null, notes: data.notes || null }
          const plan = data.plan_id ? plans.find(p => p.id === data.plan_id) : null
          if (plan) {
            const pt = plan.plan_type || (plan.duration_days === 0 ? (plan.sessions === 1 ? 'single' : 'package') : 'subscription')
            const expiresMs = plan.duration_days > 0 ? plan.duration_days * 86400000 : null
            memberData = { 
              ...memberData, 
              plan_id: plan.id, 
              plan_name: plan.name, 
              plan_type: pt, 
              plan_start_at: new Date().toISOString(), 
              expires_at: expiresMs ? new Date(Date.now() + expiresMs).toISOString() : null, 
              sessions_total: plan.duration_days > 0 ? 0 : plan.sessions, 
              // Auto-use single sessions on purchase
              sessions_used: pt === 'single' ? 1 : 0, 
              debt: data.paymentMethod === 'debt' ? plan.price : 0 
            }
          }
          const { data: newMember } = await supabase.from('members').insert(memberData).select().single()
          
          if (newMember && plan) {
            await supabase.from('subscription_history').insert({
              business_id: user.id,
              member_id: newMember.id,
              plan_id: plan.id,
              plan_name: plan.name,
              type: 'subscription',
              amount: plan.price,
              payment_method: data.paymentMethod,
              sessions_after: plan.duration_days > 0 ? 0 : plan.sessions
            })
            await supabase.from('transactions').insert({ 
              business_id: user.id, 
              member_id: newMember.id, 
              type: 'subscription', 
              payment_method: data.paymentMethod, 
              amount: plan.price, 
              notes: `اشتراك جديد: ${plan.name}` 
            })
          }
          
          setShowNewMember(false)
          fetchData()
        }}
      />
    </div>
  )
}

// Plan Modal
function PlanModal({ plan, onClose, onSave }: { plan: SubscriptionPlan | null; onClose: () => void; onSave: (data: any) => void }) {
  const [name, setName] = useState(plan?.name || '')
  const [type, setType] = useState<'subscription' | 'package' | 'single'>(plan?.plan_type || 'subscription')
  const [daysInput, setDaysInput] = useState(Math.floor(plan?.duration_days || 30))
  const [minsInput, setMinsInput] = useState(Math.round(((plan?.duration_days || 0) % 1) * 1440))
  const [sessions, setSessions] = useState(plan?.sessions || 5)
  const [price, setPrice] = useState(plan?.price || 0)

  const totalDays = daysInput + minsInput / 1440

  const save = () => {
    if (!name) return
    onSave({
      name, price, plan_type: type,
      duration_days: type === 'subscription' ? totalDays : 0,
      sessions: type === 'subscription' ? 0 : type === 'package' ? sessions : 1,
      is_active: true
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between"><h3 className="text-lg font-bold">{plan ? 'تعديل الخطة' : 'خطة جديدة'}</h3><button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
        <div className="p-4 space-y-4">
          {/* Type */}
          <div className="grid grid-cols-3 gap-2">
            {[{ k: 'subscription', l: 'اشتراك', i: Calendar, c: 'blue' }, { k: 'package', l: 'باقة', i: Package, c: 'purple' }, { k: 'single', l: 'حصة واحدة', i: Zap, c: 'orange' }].map(t => (
              <button key={t.k} onClick={() => setType(t.k as any)} className={`p-3 rounded-xl border-2 text-center ${type === t.k ? `border-${t.c}-500 bg-${t.c}-50` : 'border-gray-200'}`}>
                <t.i className={`w-6 h-6 mx-auto mb-1 ${type === t.k ? `text-${t.c}-600` : 'text-gray-400'}`} />
                <div className="text-sm font-medium">{t.l}</div>
              </button>
            ))}
          </div>
          {/* Name */}
          <div><label className="block text-sm font-medium mb-1">اسم الخطة</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl" /></div>
          {/* Duration/Sessions */}
          {type === 'subscription' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">المدة</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">أيام</label>
                  <input type="number" value={daysInput} onChange={e => setDaysInput(+e.target.value || 0)} min="0" className="w-full px-4 py-2 border rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">دقائق</label>
                  <input type="number" value={minsInput} onChange={e => setMinsInput(+e.target.value || 0)} min="0" max="1440" className="w-full px-4 py-2 border rounded-xl" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setDaysInput(0); setMinsInput(1); }} className={`px-3 py-1 rounded-lg text-xs ${minsInput === 1 && daysInput === 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>1 دقيقة ⚡</button>
                {[7, 30, 90, 365].map(d => (
                  <button key={d} type="button" onClick={() => { setDaysInput(d); setMinsInput(0); }} className={`px-3 py-1 rounded-lg text-xs ${daysInput === d && minsInput === 0 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>
                    {d === 7 ? 'أسبوع' : d === 30 ? 'شهر' : d === 90 ? '3 شهور' : 'سنة'}
                  </button>
                ))}
              </div>
            </div>
          )}
          {type === 'package' && <div><label className="block text-sm font-medium mb-1">عدد الحصص</label><input type="number" value={sessions} onChange={e => setSessions(+e.target.value)} min="2" className="w-full px-4 py-2.5 border rounded-xl" /></div>}
          {type === 'single' && <div className="p-3 bg-orange-50 rounded-xl text-sm text-orange-700">حصة واحدة فقط - للزيارات المؤقتة</div>}
          {/* Price */}
          <div><label className="block text-sm font-medium mb-1">السعر (DT)</label><input type="number" value={price} onChange={e => setPrice(+e.target.value)} min="0" step="0.001" className="w-full px-4 py-2.5 border rounded-xl" /></div>
        </div>
        <div className="p-4 border-t flex gap-3">
          <button onClick={save} disabled={!name} className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-xl font-bold">حفظ</button>
          <button onClick={onClose} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl">إلغاء</button>
        </div>
      </div>
    </div>
  )
}

// Service Modal
function ServiceModal({ service, onClose, onSave }: { service: Service | null; onClose: () => void; onSave: (data: any) => void }) {
  const [name, setName] = useState(service?.name || '')
  const [description, setDescription] = useState(service?.description || '')
  const [price, setPrice] = useState(service?.price || 0)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between"><h3 className="text-lg font-bold">{service ? 'تعديل الخدمة' : 'خدمة جديدة'}</h3><button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
        <div className="p-4 space-y-4">
          <div><label className="block text-sm font-medium mb-1">اسم الخدمة</label><input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl" /></div>
          <div><label className="block text-sm font-medium mb-1">الوصف (اختياري)</label><textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl resize-none" rows={2} /></div>
          <div><label className="block text-sm font-medium mb-1">السعر (DT)</label><input type="number" value={price} onChange={e => setPrice(+e.target.value)} min="0" step="0.001" className="w-full px-4 py-2.5 border rounded-xl" /></div>
        </div>
        <div className="p-4 border-t flex gap-3">
          <button onClick={() => name && onSave({ name, description: description || null, price, is_active: true })} disabled={!name} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl font-bold">حفظ</button>
          <button onClick={onClose} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl">إلغاء</button>
        </div>
      </div>
    </div>
  )
}

// Product Modal
function ProductModal({ product, onClose, onSave }: { product: Product | null; onClose: () => void; onSave: (data: any) => void }) {
  const [name, setName] = useState(product?.name || '')
  const [price, setPrice] = useState(product?.price || 0)
  const [cost, setCost] = useState(product?.cost || 0)
  const [stock, setStock] = useState(product?.stock ?? 0)
  const [trackStock, setTrackStock] = useState(product?.track_stock ?? true)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between">
          <h3 className="text-lg font-bold">{product ? 'تعديل المنتج' : 'منتج جديد'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم المنتج</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl" placeholder="مثال: قهوة" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">سعر البيع (DT)</label>
              <input type="number" value={price} onChange={e => setPrice(+e.target.value)} min="0" step="0.001" className="w-full px-4 py-2.5 border rounded-xl" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">التكلفة (DT)</label>
              <input type="number" value={cost} onChange={e => setCost(+e.target.value)} min="0" step="0.001" className="w-full px-4 py-2.5 border rounded-xl" />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="font-medium">تتبع المخزون</span>
            <button onClick={() => setTrackStock(!trackStock)} className={`p-1 rounded-lg ${trackStock ? 'text-green-600' : 'text-gray-400'}`}>
              {trackStock ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>
          {trackStock && (
            <div>
              <label className="block text-sm font-medium mb-1">الكمية في المخزون</label>
              <input type="number" value={stock} onChange={e => setStock(+e.target.value)} min="0" className="w-full px-4 py-2.5 border rounded-xl" />
            </div>
          )}
        </div>
        <div className="p-4 border-t flex gap-3">
          <button onClick={() => name && onSave({ name, price, cost, stock: trackStock ? stock : null, track_stock: trackStock, is_active: true })} disabled={!name} className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-xl font-bold">حفظ</button>
          <button onClick={onClose} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl">إلغاء</button>
        </div>
      </div>
    </div>
  )
}

// Cart Modal
function CartModal({ cart, cartTotal, onClose, onUpdateQuantity, onRemove, onCompleteSale }: { 
  cart: CartItem[]; cartTotal: number; onClose: () => void; 
  onUpdateQuantity: (id: string, delta: number) => void; onRemove: (id: string) => void;
  onCompleteSale: (method: 'cash' | 'debt') => void 
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" dir="rtl" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            السلة ({cart.length})
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShoppingCart className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p>السلة فارغة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1">
                    <h3 className="font-medium">{item.product.name}</h3>
                    <p className="text-sm text-primary-600 font-bold">{item.product.price.toFixed(3)} د.ت</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onUpdateQuantity(item.product.id, -1)} className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button onClick={() => onUpdateQuantity(item.product.id, 1)} className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => onRemove(item.product.id)} className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {cart.length > 0 && (
          <div className="p-4 border-t space-y-3">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>المجموع:</span>
              <span className="text-primary-600">{cartTotal.toFixed(3)} د.ت</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onCompleteSale('cash')} className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold">💵 نقداً</button>
              <button onClick={() => onCompleteSale('debt')} className="py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold">📝 آجل</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

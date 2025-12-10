'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, resetClient } from '@/lib/supabase/client'
import { Member, SubscriptionPlan, SubscriptionHistory, Service, Product } from '@/types/database'
import { 
  Search, Users, Zap, Package, Calendar, Snowflake, X,
  Phone, RefreshCw, Plus, LayoutDashboard, UserPlus, LogOut,
  Clock, CheckCircle, XCircle, Play, History,
  ArrowLeftRight, Sparkles, User, ShoppingCart, Minus, Trash2
} from 'lucide-react'
import PINModal from '@/components/shared/PINModal'
import WelcomePopup from '@/components/shared/WelcomePopup'
import CustomerModal from '@/components/subscription/CustomerModal'
import NewMemberModal from '@/components/subscription/NewMemberModal'

interface CartItem {
  product: Product
  quantity: number
}

type FilterType = 'all' | 'active' | 'expiring' | 'expired' | 'single' | 'package' | 'frozen'

// Status config
const statusConfig = {
  active: { label: 'نشط', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  expiring_soon: { label: 'ينتهي قريباً', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  expired: { label: 'منتهي', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  frozen: { label: '❄️ مجمد', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  single_available: { label: '⚡ متاحة', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  single_used: { label: '⚡ تم استخدامها', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  no_plan: { label: 'بدون خطة', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' }
}

const planTypeConfig = {
  subscription: { label: 'اشتراك', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
  package: { label: 'باقة حصص', icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
  single: { label: 'حصة واحدة', icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50' }
}

// Utility functions
function getPlanType(member: Member): 'subscription' | 'package' | 'single' | null {
  if (!member.plan_id) return null
  if (member.plan_type) return member.plan_type
  if (member.sessions_total === 1) return 'single'
  if (member.sessions_total > 1) return 'package'
  return 'subscription'
}

function getMemberStatus(member: Member) {
  if (!member.plan_id) return 'no_plan'
  if (member.is_frozen) return 'frozen'
  const planType = getPlanType(member)
  // Single sessions are auto-used on purchase
  if (planType === 'single') return 'single_used'
  if (planType === 'package') return (member.sessions_total - member.sessions_used) <= 0 ? 'expired' : 'active'
  if (!member.expires_at) return 'active'
  const daysLeft = Math.ceil((new Date(member.expires_at).getTime() - Date.now()) / 86400000)
  if (daysLeft <= 0) return 'expired'
  if (daysLeft <= 7) return 'expiring_soon'
  return 'active'
}

function formatDate(date: string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('ar-TN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getDaysLeft(date: string | null): number {
  if (!date) return 0
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000))
}

export default function SubscriptionPOSPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [members, setMembers] = useState<Member[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [userPin, setUserPin] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [showPinModal, setShowPinModal] = useState(false)
  const [showNewMemberModal, setShowNewMemberModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [pinDestination, setPinDestination] = useState<string | null>(null)
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showProducts, setShowProducts] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  
  // Credit (آجل) state for product sales
  const [showDebtMemberSelect, setShowDebtMemberSelect] = useState(false)
  const [debtMemberSearch, setDebtMemberSearch] = useState('')
  const [selectedDebtMember, setSelectedDebtMember] = useState<Member | null>(null)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    
    // Fetch all data in parallel for speed
    const [profileRes, m, p, s, prod] = await Promise.all([
      supabase.from('profiles').select('pin_code').eq('id', user.id).single(),
      supabase.from('members').select('*').eq('business_id', user.id).order('name'),
      supabase.from('subscription_plans').select('*').eq('business_id', user.id).eq('is_active', true),
      supabase.from('services').select('*').eq('business_id', user.id).eq('is_active', true),
      supabase.from('products').select('*').eq('business_id', user.id).eq('is_active', true)
    ])
    
    if (profileRes.data) setUserPin(profileRes.data.pin_code)
    if (m.data) setMembers(m.data)
    if (p.data) setPlans(p.data)
    if (s.data) setServices(s.data)
    if (prod.data) setProducts(prod.data)
    setLoading(false)
  }, [supabase, router])

  // Cart functions
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta
        return newQty > 0 ? { ...item, quantity: newQty } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const completePurchase = async (paymentMethod: 'cash' | 'debt') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || cart.length === 0) return
    
    // For debt sales, require member selection
    if (paymentMethod === 'debt' && !selectedDebtMember) {
      setShowDebtMemberSelect(true)
      return
    }

    const items = cart.map(item => ({
      product_id: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
      total_price: item.product.price * item.quantity
    }))

    await supabase.from('transactions').insert({
      business_id: user.id,
      member_id: paymentMethod === 'debt' && selectedDebtMember ? selectedDebtMember.id : null,
      type: 'retail',
      payment_method: paymentMethod,
      amount: cartTotal,
      items,
      notes: paymentMethod === 'debt' && selectedDebtMember 
        ? `بيع آجل - ${selectedDebtMember.name} - ${cart.length} منتج` 
        : `بيع منتجات - ${cart.length} منتج`
    })

    // If debt sale, update member debt
    if (paymentMethod === 'debt' && selectedDebtMember) {
      await supabase.from('members').update({ 
        debt: (selectedDebtMember.debt || 0) + cartTotal 
      }).eq('id', selectedDebtMember.id)
    }

    // Update stock
    for (const item of cart) {
      if (item.product.stock !== null) {
        await supabase.from('products').update({ 
          stock: Math.max(0, item.product.stock - item.quantity) 
        }).eq('id', item.product.id)
      }
    }

    setCart([])
    setShowCart(false)
    setSelectedDebtMember(null)
    setShowDebtMemberSelect(false)
    fetchData()
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.barcode && p.barcode.includes(productSearch))
  )

  useEffect(() => { fetchData() }, [fetchData])

  const filteredMembers = members.filter(member => {
    const match = member.name.toLowerCase().includes(searchQuery.toLowerCase()) || member.phone.includes(searchQuery)
    if (!match) return false
    const status = getMemberStatus(member)
    const planType = getPlanType(member)
    if (filter === 'active') return status === 'active'
    if (filter === 'expiring') return status === 'expiring_soon'
    if (filter === 'expired') return status === 'expired'
    if (filter === 'frozen') return status === 'frozen'
    if (filter === 'single') return planType === 'single'
    if (filter === 'package') return planType === 'package'
    return true
  })

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">نقطة البيع</h1>
            <div className="flex items-center gap-2">
              {/* Cart Button */}
              <button 
                onClick={() => setShowProducts(true)} 
                className="relative flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="hidden sm:inline">المنتجات</span>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
              <button onClick={() => setShowNewMemberModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium">
                <UserPlus className="w-5 h-5" /><span className="hidden sm:inline">عميل جديد</span>
              </button>
              <button onClick={() => setShowPinModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium">
                <LayoutDashboard className="w-5 h-5" /><span className="hidden sm:inline">لوحة التحكم</span>
              </button>
              <button onClick={async () => { 
                await supabase.auth.signOut()
                resetClient()
                window.location.href = '/login'
              }} className="p-2 text-gray-500 hover:text-red-600 rounded-lg">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="mt-3 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." className="w-full pr-10 pl-4 py-2.5 bg-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
            {[{ key: 'all', label: 'الكل' }, { key: 'active', label: 'نشط' }, { key: 'expiring', label: 'ينتهي قريباً' }, { key: 'expired', label: 'منتهي' }, { key: 'single', label: 'حصة واحدة' }, { key: 'package', label: 'باقة' }, { key: 'frozen', label: 'مجمد' }].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key as FilterType)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${filter === f.key ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{f.label}</button>
            ))}
          </div>
        </div>
      </header>

      {/* Members Grid */}
      <main className="max-w-7xl mx-auto p-4">
        <div className="mb-4 text-sm text-gray-500">{loading ? '' : `${filteredMembers.length} عميل`}</div>
        {loading ? (
          /* Skeleton loader while fetching */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white rounded-2xl border-2 border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-100 rounded w-2/3 mb-1.5" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-700">لا يوجد عملاء</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMembers.map(member => {
              const status = getMemberStatus(member)
              const planType = getPlanType(member)
              const sCfg = statusConfig[status as keyof typeof statusConfig]
              const pCfg = planType ? planTypeConfig[planType] : null
              const Icon = pCfg?.icon || User
              return (
                <div key={member.id} onClick={() => setSelectedMember(member)} className={`bg-white rounded-2xl border-2 p-4 cursor-pointer hover:shadow-lg transition-all ${sCfg.border}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${pCfg?.bg || 'bg-gray-100'}`}>
                        <Icon className={`w-5 h-5 ${pCfg?.color || 'text-gray-500'}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{member.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-gray-500"><Phone className="w-3 h-3" /><span dir="ltr">{member.phone}</span></div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                  </div>
                  {planType && (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">الخطة:</span><span className="font-medium">{member.plan_name}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">البدء:</span><span>{formatDate(member.plan_start_at)}</span></div>
                      {planType === 'subscription' && <>
                        <div className="flex justify-between"><span className="text-gray-500">الانتهاء:</span><span>{formatDate(member.expires_at)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">متبقي:</span><span className="font-bold">{getDaysLeft(member.expires_at)} يوم</span></div>
                      </>}
                      {planType === 'package' && <div className="flex justify-between"><span className="text-gray-500">الحصص:</span><span className="font-bold">{member.sessions_total - member.sessions_used} / {member.sessions_total}</span></div>}
                    </div>
                  )}
                  {!planType && <div className="text-sm text-gray-400 text-center py-2">بدون خطة</div>}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Customer Modal */}
      {selectedMember && (
        <CustomerModal
          member={selectedMember}
          plans={plans}
          services={services}
          onClose={() => setSelectedMember(null)}
          onUpdate={fetchData}
        />
      )}

      {/* New Member Modal */}
      {showNewMemberModal && (
        <NewMemberModal
          plans={plans}
          isOpen={true}
          onClose={() => setShowNewMemberModal(false)}
          onAddPlans={() => { setShowNewMemberModal(false); setPinDestination('/dashboard'); setShowPinModal(true) }}
          onSubmit={async (data) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            
            // Properly typed member data
            type NewMemberData = {
              business_id: string
              name: string
              phone: string
              email: string | null
              notes: string | null
              plan_id?: string
              plan_name?: string
              plan_type?: 'subscription' | 'package' | 'single'
              plan_start_at?: string
              expires_at?: string | null
              sessions_total?: number
              sessions_used?: number
              debt?: number
            }
            
            let memberData: NewMemberData = { 
              business_id: user.id, 
              name: data.name, 
              phone: data.phone, 
              email: data.email || null, 
              notes: data.notes || null 
            }
            
            const plan = data.plan_id ? plans.find(p => p.id === data.plan_id) : null
            if (plan) {
              const pt = plan.plan_type || (plan.duration_days === 0 ? (plan.sessions === 1 ? 'single' : 'package') : 'subscription')
              // If duration_days < 1, treat as fraction of a day (e.g., 0.0007 = ~1 minute)
              const expiresMs = plan.duration_days > 0 ? plan.duration_days * 86400000 : null
              memberData = { 
                ...memberData, 
                plan_id: plan.id, 
                plan_name: plan.name, 
                plan_type: pt as 'subscription' | 'package' | 'single', 
                plan_start_at: new Date().toISOString(), 
                expires_at: expiresMs ? new Date(Date.now() + expiresMs).toISOString() : null, 
                sessions_total: plan.duration_days > 0 ? 0 : plan.sessions, 
                sessions_used: pt === 'single' ? 1 : 0, 
                debt: data.paymentMethod === 'debt' ? plan.price : 0 
              }
            }
            const { data: newMember } = await supabase.from('members').insert(memberData).select().single()
            
            // Create history entry with actual price
            if (newMember && plan) {
              await supabase.from('subscription_history').insert({
                business_id: user.id,
                member_id: newMember.id,
                plan_id: plan.id,
                plan_name: plan.name,
                type: 'subscription',
                amount: plan.price,
                payment_method: data.paymentMethod,
                sessions_before: 0,
                sessions_after: plan.duration_days > 0 ? 0 : plan.sessions
              })
              await supabase.from('transactions').insert({ business_id: user.id, member_id: newMember.id, type: 'subscription', payment_method: data.paymentMethod, amount: plan.price, notes: `اشتراك جديد: ${plan.name}` })
            }
            setShowNewMemberModal(false)
            fetchData()
          }}
        />
      )}

      {/* Products + Cart Modal - Combined */}
      {showProducts && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowProducts(false)}>
          <div className="bg-white w-full sm:max-w-4xl sm:rounded-2xl max-h-[95vh] flex flex-col sm:flex-row" onClick={e => e.stopPropagation()}>
            {/* Products Section */}
            <div className="flex-1 flex flex-col min-h-0 border-l">
              {/* Header */}
              <div className="p-3 border-b flex items-center justify-between">
                <h2 className="text-lg font-bold">المنتجات</h2>
                <button onClick={() => setShowProducts(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Search */}
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="بحث..." className="w-full pr-9 pl-3 py-2 bg-gray-100 rounded-lg text-sm" />
                </div>
              </div>
              
              {/* Products Grid */}
              <div className="flex-1 overflow-y-auto p-3">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">لا توجد منتجات</p>
                    <button onClick={() => { setPinDestination('/dashboard/products'); setShowPinModal(true); setShowProducts(false) }} className="mt-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm">إضافة منتجات</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {filteredProducts.map(product => {
                      const inCart = cart.find(item => item.product.id === product.id)
                      return (
                        <button key={product.id} onClick={() => addToCart(product)} className={`p-2 rounded-xl border-2 text-right transition-all ${inCart ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                          <h3 className="font-medium text-sm truncate">{product.name}</h3>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-primary-600 font-bold text-sm">{product.price.toFixed(3)}</span>
                            {inCart && <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">{inCart.quantity}</span>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Cart Section - Always Visible */}
            <div className="w-full sm:w-72 bg-gray-50 flex flex-col border-t sm:border-t-0">
              <div className="p-3 border-b bg-white flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2"><ShoppingCart className="w-4 h-4" />السلة ({cartCount})</h3>
                {cart.length > 0 && <button onClick={() => setCart([])} className="text-red-500 text-xs">مسح</button>}
              </div>
              <div className="flex-1 overflow-y-auto p-2 max-h-[200px] sm:max-h-none">
                {cart.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">السلة فارغة</div>
                ) : (
                  <div className="space-y-2">
                    {cart.map(item => (
                      <div key={item.product.id} className="bg-white rounded-lg p-2 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{item.product.name}</div>
                          <div className="text-xs text-primary-600 font-bold">{(item.product.price * item.quantity).toFixed(3)} د.ت</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQuantity(item.product.id, -1)} className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                          <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                          <button onClick={() => addToCart(item.product)} className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                          <button onClick={() => removeFromCart(item.product.id)} className="w-6 h-6 bg-red-100 text-red-600 rounded flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {cart.length > 0 && (
                <div className="p-3 border-t bg-white space-y-2">
                  <div className="flex justify-between font-bold"><span>المجموع:</span><span className="text-primary-600">{cartTotal.toFixed(3)} د.ت</span></div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => completePurchase('cash')} className="py-2.5 bg-green-600 text-white rounded-lg font-bold text-sm">💵 نقداً</button>
                    <button onClick={() => completePurchase('debt')} className="py-2.5 bg-orange-500 text-white rounded-lg font-bold text-sm">📝 آجل</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal - Keep for mobile standalone access */}
      {showCart && !showProducts && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowCart(false)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5" />السلة</h2>
              <button onClick={() => setShowCart(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">السلة فارغة</p>
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
                        <button 
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => removeFromCart(item.product.id)}
                          className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t space-y-3">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>المجموع:</span>
                  <span className="text-primary-600">{cartTotal.toFixed(3)} د.ت</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => completePurchase('cash')}
                    className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold"
                  >
                    💵 نقداً
                  </button>
                  <button 
                    onClick={() => completePurchase('debt')}
                    className="py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold"
                  >
                    📝 آجل
                  </button>
                </div>
                <button 
                  onClick={() => { setShowCart(false); setShowProducts(true) }}
                  className="w-full py-2 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  متابعة التسوق
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Member Selection Modal for Debt Sales */}
      {showDebtMemberSelect && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold text-lg">اختر العميل للبيع الآجل</h3>
              <button onClick={() => setShowDebtMemberSelect(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={debtMemberSearch}
                  onChange={(e) => setDebtMemberSearch(e.target.value)}
                  placeholder="بحث عن عميل..."
                  className="w-full pr-10 pl-4 py-2.5 border rounded-xl"
                />
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {members.filter(m => 
                  m.name.toLowerCase().includes(debtMemberSearch.toLowerCase()) ||
                  m.phone.includes(debtMemberSearch)
                ).map(member => (
                  <button
                    key={member.id}
                    onClick={() => {
                      setSelectedDebtMember(member)
                      setShowDebtMemberSelect(false)
                      completePurchase('debt')
                    }}
                    className="w-full p-3 bg-gray-50 hover:bg-primary-50 border hover:border-primary-300 rounded-xl text-right flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.phone}</div>
                    </div>
                    {member.debt > 0 && (
                      <div className="text-orange-600 text-sm font-medium">
                        دين: {member.debt.toFixed(3)} DT
                      </div>
                    )}
                  </button>
                ))}
                {members.filter(m => 
                  m.name.toLowerCase().includes(debtMemberSearch.toLowerCase()) ||
                  m.phone.includes(debtMemberSearch)
                ).length === 0 && (
                  <div className="text-center text-gray-400 py-8">لا يوجد عملاء</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <PINModal isOpen={showPinModal} correctPin={userPin} onSuccess={() => { setShowPinModal(false); router.push(pinDestination || '/dashboard'); setPinDestination(null) }} onCancel={() => { setShowPinModal(false); setPinDestination(null) }} />
      <WelcomePopup trialDays={15} />
    </div>
  )
}

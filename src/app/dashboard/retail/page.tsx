'use client'

import Image from 'next/image'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Product, Category, Transaction, TransactionItem } from '@/types/database'
import { 
  Package, Tags, Warehouse, History, ArrowLeft, Plus, Edit2, Trash2, Minus,
  Search, RefreshCw, TrendingUp, ShoppingBag, AlertTriangle,
  ToggleLeft, ToggleRight, X, Save, CreditCard, Receipt, BarChart3, Settings, Download, Calendar, Camera
} from 'lucide-react'
import { Profile } from '@/types/database'

type Tab = 'products' | 'history'

type TransactionWithItems = Transaction & { items?: TransactionItem[] }

export default function RetailDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [tab, setTab] = useState<Tab>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // Modals
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  
  // Stock adjust modal
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [stockAmount, setStockAmount] = useState('')
  
  // History filter
  const [historyFilter, setHistoryFilter] = useState<'today' | 'week' | 'month' | 'all'>('today')
  
  // Profile for subscription status
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string>('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)
    
    // Fetch profile for subscription status
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    if (profileData) setProfile(profileData)
    
    // Fetch products - use only columns that exist in DB
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, business_id, name, price, cost, stock, reorder_level, category_id, category, description, image_url, track_stock, is_active, created_at, updated_at')
      .eq('business_id', user.id)
      .order('name')
    
    if (productsError) {
      console.error('Products error:', productsError)
    } else if (productsData) {
      // Add default for barcode (not in DB)
      const normalizedProducts = productsData.map((p: any) => ({
        ...p,
        barcode: null
      }))
      setProducts(normalizedProducts as Product[])
    }
    
    // Try fetch categories (table might not exist)
    try {
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', user.id)
        .order('sort_order')
      if (categoriesData) setCategories(categoriesData)
    } catch (e) {
      console.log('Categories table not ready')
    }
    
    // Fetch transactions
    const { data: txData } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', user.id)
      .eq('type', 'sale')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (txData) {
      // Try to get items for each transaction
      const txWithItems = await Promise.all(txData.map(async (tx: Transaction) => {
        try {
          const { data: items } = await supabase
            .from('transaction_items')
            .select('*')
            .eq('transaction_id', tx.id)
          return { ...tx, items: items || [] }
        } catch {
          return { ...tx, items: [] }
        }
      }))
      setTransactions(txWithItems)
    }
    
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  // Stats calculations
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)
  const monthAgo = new Date(today.getTime() - 30 * 86400000)

  const todaySales = transactions.filter((t: TransactionWithItems) => new Date(t.created_at) >= today).reduce((sum, t: TransactionWithItems) => sum + t.amount, 0)
  const weekSales = transactions.filter((t: TransactionWithItems) => new Date(t.created_at) >= weekAgo).reduce((sum, t: TransactionWithItems) => sum + t.amount, 0)
  const monthSales = transactions.filter((t: TransactionWithItems) => new Date(t.created_at) >= monthAgo).reduce((sum, t: TransactionWithItems) => sum + t.amount, 0)
  
  const lowStockProducts = products.filter((p: Product) => p.track_stock && (p.stock ?? 0) <= p.reorder_level)

  // Filter transactions by date
  const filteredTransactions = transactions.filter((t: TransactionWithItems) => {
    const date = new Date(t.created_at)
    if (historyFilter === 'today') return date >= today
    if (historyFilter === 'week') return date >= weekAgo
    if (historyFilter === 'month') return date >= monthAgo
    return true
  })

  // Filter products by search
  const filteredProducts = products.filter((p: Product) => 
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  // Fast loading spinner
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
      <div className="text-center">
        <div className="w-8 h-8 mx-auto border-3 border-gray-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="mt-2 text-gray-500 text-sm">جاري التحميل...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Simple Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/pos/retail" className="flex items-center gap-2 text-primary-600 font-medium">
            <ArrowLeft className="w-5 h-5" />
            <span>العودة للبيع</span>
          </Link>
          <h1 className="text-lg font-bold text-gray-800">لوحة التحكم</h1>
          <Link href="/dashboard/settings" className="p-2 hover:bg-gray-100 rounded-full">
            <Settings className="w-5 h-5 text-gray-600" />
          </Link>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl p-4 border text-center">
            <div className="text-2xl font-bold text-green-600">{todaySales.toFixed(0)}</div>
            <div className="text-xs text-gray-500">مبيعات اليوم</div>
          </div>
          <div className="bg-white rounded-xl p-4 border text-center">
            <div className="text-2xl font-bold text-blue-600">{weekSales.toFixed(0)}</div>
            <div className="text-xs text-gray-500">هذا الأسبوع</div>
          </div>
          <div className="bg-white rounded-xl p-4 border text-center">
            <div className="text-2xl font-bold text-purple-600">{products.length}</div>
            <div className="text-xs text-gray-500">المنتجات</div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Link href="/dashboard/retail/credit" className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 font-medium">
            <CreditCard className="w-5 h-5" />
            <span>الآجل</span>
          </Link>
          <Link href="/dashboard/retail/expenses" className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-medium">
            <Receipt className="w-5 h-5" />
            <span>المصروفات</span>
          </Link>
          <Link href="/dashboard/retail/financial" className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-medium">
            <BarChart3 className="w-5 h-5" />
            <span>التقارير</span>
          </Link>
        </div>

        {/* Low Stock Alert - Compact */}
        {lowStockProducts.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 text-yellow-700 font-medium text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{lowStockProducts.length} منتجات منخفضة المخزون</span>
            </div>
          </div>
        )}
      </div>

      {/* Simple Tabs */}
      <div className="max-w-5xl mx-auto px-4 mb-4">
        <div className="flex gap-2">
          {[
            { k: 'products', l: 'المنتجات', i: Package },
            { k: 'history', l: 'المبيعات', i: History }
          ].map(t => (
            <button 
              key={t.k} 
              onClick={() => setTab(t.k as Tab)} 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
                tab === t.k 
                  ? 'bg-primary-600 text-white shadow-md' 
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              <t.i className="w-4 h-4" />
              <span>{t.l}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 pb-8">
        {/* PRODUCTS TAB */}
        {tab === 'products' && (
          <div className="space-y-4">
            {/* Categories Section */}
            <div className="bg-white rounded-xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold flex items-center gap-2"><Tags className="w-5 h-5" />الأصناف</h3>
                <button onClick={() => { setEditingCategory(null); setShowCategoryModal(true) }} className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
                  <Plus className="w-4 h-4" />إضافة صنف
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map(c => (
                  <div 
                    key={c.id} 
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border flex-shrink-0 group"
                    style={{ backgroundColor: c.color + '15', borderColor: c.color + '40' }}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }}></div>
                    <span className="font-medium text-sm">{c.name}</span>
                    <span className="text-xs text-gray-500">({products.filter(p => p.category_id === c.id).length})</span>
                    <button 
                      onClick={() => { setEditingCategory(c); setShowCategoryModal(true) }}
                      className="p-1 hover:bg-white/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {categories.length === 0 && <span className="text-gray-400 text-sm">لا توجد أصناف</span>}
              </div>
            </div>

            {/* Products Actions */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث عن منتج..." className="w-full pr-10 pl-4 py-2.5 bg-white border rounded-xl" />
              </div>
              <button onClick={() => { setEditingProduct(null); setShowProductModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium">
                <Plus className="w-5 h-5" />منتج جديد
              </button>
            </div>

            {/* Mobile: Card Layout */}
            <div className="sm:hidden space-y-2">
              {filteredProducts.map(p => (
                <div key={p.id} className="bg-white rounded-xl border p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {p.image_url ? (
                        <div className="relative w-12 h-12">
                          <Image src={p.image_url} alt={p.name} fill className="rounded-lg object-cover" sizes="48px" />
                        </div>
                      ) : (
                        <Package className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold truncate">{p.name}</div>
                        <span className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.is_active ? 'نشط' : 'غير نشط'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{categories.find(c => c.id === p.category_id)?.name || 'بدون صنف'}</div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-primary-600">{p.price.toFixed(3)} DT</span>
                        {p.track_stock && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${(p.stock ?? 0) <= 0 ? 'bg-red-100 text-red-700' : (p.stock ?? 0) <= p.reorder_level ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                            مخزون: {p.stock ?? 0}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                    <button onClick={() => { setStockProduct(p); setShowStockModal(true) }} className="flex-1 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg font-medium">مخزون</button>
                    <button onClick={() => { setEditingProduct(p); setShowProductModal(true) }} className="flex-1 py-1.5 text-xs bg-gray-50 text-gray-600 rounded-lg font-medium">تعديل</button>
                    <button 
                      onClick={async () => { await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id); fetchData() }} 
                      className={`flex-1 py-1.5 text-xs rounded-lg font-medium ${p.is_active ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}
                    >
                      {p.is_active ? 'إيقاف' : 'تفعيل'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden sm:block bg-white rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">المنتج</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الصنف</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">السعر</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">المخزون</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الحالة</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProducts.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            {p.image_url ? (
                              <div className="relative w-10 h-10">
                                <Image src={p.image_url} alt={p.name} fill className="rounded-lg object-cover" sizes="40px" />
                              </div>
                            ) : (
                              <Package className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{p.name}</div>
                            {p.description && <div className="text-xs text-gray-500 truncate max-w-48">{p.description}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{categories.find(c => c.id === p.category_id)?.name || '-'}</td>
                      <td className="px-4 py-3 font-medium">{p.price.toFixed(3)} DT</td>
                      <td className="px-4 py-3">
                        {p.track_stock ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${(p.stock ?? 0) <= 0 ? 'bg-red-100 text-red-700' : (p.stock ?? 0) <= p.reorder_level ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                            {p.stock ?? 0}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.is_active ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => { setStockProduct(p); setShowStockModal(true) }} 
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg"
                            title="تعديل المخزون"
                          >
                            <Warehouse className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setEditingProduct(p); setShowProductModal(true) }} className="p-2 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                          <button 
                            onClick={async () => { await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id); fetchData() }} 
                            className={`p-2 rounded-lg ${p.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                          >
                            {p.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProducts.length === 0 && <div className="p-8 text-center text-gray-400">لا توجد منتجات</div>}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-2">
              {[
                { k: 'today', l: 'اليوم' },
                { k: 'week', l: 'الأسبوع' },
                { k: 'month', l: 'الشهر' },
                { k: 'all', l: 'الكل' }
              ].map(f => (
                <button 
                  key={f.k}
                  onClick={() => setHistoryFilter(f.k as any)}
                  className={`px-4 py-2 rounded-xl font-medium ${historyFilter === f.k ? 'bg-primary-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
                >
                  {f.l}
                </button>
              ))}
              </div>
              {filteredTransactions.length > 0 && (
                <button
                  onClick={() => {
                    const paymentLabels: Record<string, string> = {
                      'cash': 'نقداً',
                      'debt': 'آجل',
                      'card': 'بطاقة'
                    }
                    const headers = ['التاريخ', 'الوقت', 'المبلغ (د.ت)', 'عدد المنتجات', 'المنتجات', 'طريقة الدفع']
                    const rows = filteredTransactions.map(t => [
                      new Date(t.created_at).toLocaleDateString('ar-TN'),
                      new Date(t.created_at).toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' }),
                      t.amount?.toFixed(3) || '0',
                      t.items?.length || 0,
                      t.items?.map(item => `${item.name} (${item.quantity})`).join(' - ') || '-',
                      paymentLabels[t.payment_method] || t.payment_method || 'نقداً'
                    ])
                    // Calculate total
                    const total = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
                    rows.push(['', '', total.toFixed(3), '', 'المجموع', ''])
                    const csv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n')
                    const blob = new Blob(['\ufeff' + csv], { type: 'text/tab-separated-values;charset=utf-8;' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `سجل-المبيعات-${new Date().toLocaleDateString('ar-TN').replace(/\//g, '-')}.xls`
                    a.click()
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium text-sm"
                >
                  <Download className="w-4 h-4" />
                  تحميل Excel
                </button>
              )}
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="divide-y">
                {filteredTransactions.map(t => (
                  <div key={t.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{new Date(t.created_at).toLocaleDateString('ar-TN')}</div>
                        <div className="text-sm text-gray-500">{new Date(t.created_at).toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                      <div className="text-lg font-bold text-green-600">{t.amount.toFixed(3)} DT</div>
                    </div>
                    {t.items && t.items.length > 0 && (
                      <div className="mt-2 pt-2 border-t text-sm text-gray-600">
                        {t.items.map((item, i) => (
                          <div key={i} className="flex justify-between py-1">
                            <span>{item.name} × {item.quantity}</span>
                            <span>{item.total_price.toFixed(3)} DT</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {filteredTransactions.length === 0 && <div className="p-8 text-center text-gray-400">لا توجد مبيعات</div>}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Product Modal */}
      {showProductModal && (
        <ProductModal 
          product={editingProduct}
          categories={categories}
          userId={userId}
          onClose={() => setShowProductModal(false)}
          onSave={async (data) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            
            // Only use columns that exist in DB
            const productData: Record<string, any> = {
              name: data.name,
              price: data.price,
              cost: data.cost || 0,
              track_stock: data.track_stock ?? false,
              stock: data.track_stock ? (data.stock || 0) : null,
              reorder_level: data.track_stock ? (data.reorder_level || 5) : null,
              is_active: data.is_active ?? true,
              image_url: data.image_url || null
            }
            
            // Add category_id if provided
            if (data.category_id) {
              productData.category_id = data.category_id
            }
            
            try {
              if (editingProduct) {
                const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id)
                if (error) throw error
              } else {
                const { error } = await supabase.from('products').insert({ ...productData, business_id: user.id })
                if (error) throw error
              }
              setShowProductModal(false)
              fetchData()
            } catch (err: any) {
              console.error('Product save error:', err)
              alert('خطأ: ' + (err.message || 'فشل حفظ المنتج'))
            }
          }}
        />
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => setShowCategoryModal(false)}
          onSave={async (data) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            try {
              if (editingCategory) {
                const { error } = await supabase.from('categories').update(data).eq('id', editingCategory.id)
                if (error) throw error
              } else {
                const { error } = await supabase.from('categories').insert({ ...data, business_id: user.id, sort_order: categories.length })
                if (error) throw error
              }
              setShowCategoryModal(false)
              fetchData()
            } catch (err: any) {
              console.error('Category save error:', err)
              alert('خطأ: جدول الأصناف غير موجود. يرجى تشغيل retail-tables.sql في Supabase')
            }
          }}
        />
      )}

      {/* Stock Adjust Modal */}
      {showStockModal && stockProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">تعديل المخزون</h3>
              <button onClick={() => { setShowStockModal(false); setStockProduct(null); setStockAmount('') }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="text-center">
                <div className="text-lg font-bold">{stockProduct.name}</div>
                <div className="text-3xl font-bold text-primary-600 my-3">{stockProduct.stock}</div>
                <div className="text-sm text-gray-500">المخزون الحالي</div>
              </div>
              
              <div className="flex items-center gap-2 justify-center">
                <button 
                  onClick={async () => {
                    await supabase.from('products').update({ stock: Math.max(0, (stockProduct.stock ?? 0) - 1) }).eq('id', stockProduct.id)
                    setStockProduct({ ...stockProduct, stock: Math.max(0, (stockProduct.stock ?? 0) - 1) })
                    fetchData()
                  }}
                  className="w-12 h-12 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl flex items-center justify-center text-xl font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  value={stockAmount}
                  onChange={(e) => setStockAmount(e.target.value)}
                  className="w-20 h-12 text-center text-xl font-bold border rounded-xl"
                  placeholder="0"
                />
                <button 
                  onClick={async () => {
                    await supabase.from('products').update({ stock: (stockProduct.stock ?? 0) + 1 }).eq('id', stockProduct.id)
                    setStockProduct({ ...stockProduct, stock: (stockProduct.stock ?? 0) + 1 })
                    fetchData()
                  }}
                  className="w-12 h-12 bg-green-100 hover:bg-green-200 text-green-600 rounded-xl flex items-center justify-center text-xl font-bold"
                >
                  +
                </button>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 25, 50].map(n => (
                  <button
                    key={n}
                    onClick={async () => {
                      await supabase.from('products').update({ stock: (stockProduct.stock ?? 0) + n }).eq('id', stockProduct.id)
                      setStockProduct({ ...stockProduct, stock: (stockProduct.stock ?? 0) + n })
                      fetchData()
                    }}
                    className="py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg font-medium"
                  >
                    +{n}
                  </button>
                ))}
              </div>
              
              <button
                onClick={async () => {
                  if (stockAmount) {
                    const newStock = parseInt(stockAmount)
                    if (!isNaN(newStock) && newStock >= 0) {
                      await supabase.from('products').update({ stock: newStock }).eq('id', stockProduct.id)
                      fetchData()
                    }
                  }
                  setShowStockModal(false)
                  setStockProduct(null)
                  setStockAmount('')
                }}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Product Modal Component
function ProductModal({ product, categories, onClose, onSave, userId }: { 
  product: Product | null
  categories: Category[]
  onClose: () => void
  onSave: (data: Partial<Product>) => void
  userId: string
}) {
  const [name, setName] = useState(product?.name || '')
  const [price, setPrice] = useState(product?.price?.toString() || '')
  const [cost, setCost] = useState(product?.cost?.toString() || '0')
  const [categoryId, setCategoryId] = useState(product?.category_id || '')
  const [description, setDescription] = useState(product?.description || '')
  const [trackStock, setTrackStock] = useState(product?.track_stock ?? false)
  const [stock, setStock] = useState(product?.stock?.toString() || '0')
  const [reorderLevel, setReorderLevel] = useState(product?.reorder_level?.toString() || '5')
  const [isActive, setIsActive] = useState(product?.is_active ?? true)
  const [imageUrl, setImageUrl] = useState(product?.image_url || '')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const supabaseClient = createClient()

  // Compress image before upload
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      img.onload = () => {
        let { width, height } = img
        const maxWidth = 800
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Compression failed')), 'image/jpeg', 0.7)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار صورة فقط')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('حجم الصورة يجب أن يكون أقل من 5MB')
      return
    }

    setUploading(true)
    try {
      // Compress image if larger than 200KB
      let fileToUpload: Blob | File = file
      if (file.size > 200 * 1024) {
        try {
          fileToUpload = await compressImage(file)
          console.log(`Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(fileToUpload.size / 1024).toFixed(0)}KB`)
        } catch {
          fileToUpload = file
        }
      }

      const fileName = `${userId}/products/${Date.now()}.jpg`

      // Delete old image if exists
      if (imageUrl) {
        const oldPath = imageUrl.split('/products/')[1]
        if (oldPath) await supabaseClient.storage.from('products').remove([oldPath])
      }

      const { error } = await supabaseClient.storage.from('products').upload(fileName, fileToUpload, { 
        cacheControl: '31536000', 
        contentType: 'image/jpeg',
        upsert: true 
      })
      if (error) throw error

      const { data: { publicUrl } } = supabaseClient.storage.from('products').getPublicUrl(fileName)
      setImageUrl(publicUrl)
    } catch (err) {
      console.error('Upload error:', err)
      alert('فشل رفع الصورة. تأكد من إعداد Storage في Supabase')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = () => {
    if (!name.trim() || !price) return
    onSave({
      name: name.trim(),
      price: parseFloat(price),
      cost: parseFloat(cost) || 0,
      category_id: categoryId || null,
      description: description.trim() || null,
      image_url: imageUrl || null,
      track_stock: trackStock,
      stock: trackStock ? parseInt(stock) || 0 : undefined,
      reorder_level: trackStock ? parseInt(reorderLevel) || 5 : undefined,
      is_active: isActive
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-lg font-bold">{product ? 'تعديل منتج' : 'منتج جديد'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          {/* Image Upload */}
          <div className="flex items-center gap-4">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <div 
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary-400 cursor-pointer bg-gray-50 flex items-center justify-center overflow-hidden relative group"
            >
              {uploading ? (
                <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
              ) : imageUrl ? (
                <>
                  <Image src={imageUrl} alt="صورة المنتج" fill className="object-cover" sizes="80px" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <Camera className="w-6 h-6 text-gray-400 mx-auto" />
                  <span className="text-xs text-gray-400">صورة</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="اسم المنتج" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سعر البيع *</label>
              <input type="number" step="0.001" value={price} onChange={e => setPrice(e.target.value)} onFocus={e => e.target.select()} className="w-full px-4 py-2 border rounded-xl" placeholder="0.000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سعر التكلفة</label>
              <input type="number" step="0.001" value={cost} onChange={e => setCost(e.target.value)} onFocus={e => e.target.select()} className="w-full px-4 py-2 border rounded-xl" placeholder="0.000" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الصنف</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-4 py-2 border rounded-xl">
              <option value="">اختر صنف</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 border rounded-xl resize-none" rows={2} placeholder="وصف اختياري" />
          </div>
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={trackStock} 
              onChange={(e) => {
                console.log('Track stock changed to:', e.target.checked)
                setTrackStock(e.target.checked)
              }}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
            />
            <span className="font-medium">تتبع المخزون</span>
          </label>
          {trackStock && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الكمية الحالية</label>
                <input type="number" value={stock} onChange={e => setStock(e.target.value)} onFocus={e => e.target.select()} className="w-full px-4 py-2 border rounded-xl" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">حد إعادة الطلب</label>
                <input type="number" value={reorderLevel} onChange={e => setReorderLevel(e.target.value)} onFocus={e => e.target.select()} className="w-full px-4 py-2 border rounded-xl" placeholder="5" />
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex gap-3">
          <button onClick={handleSave} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2">
            <Save className="w-5 h-5" />حفظ
          </button>
          <button onClick={onClose} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium">إلغاء</button>
        </div>
      </div>
    </div>
  )
}

// Category Modal Component
function CategoryModal({ category, onClose, onSave }: { 
  category: Category | null
  onClose: () => void
  onSave: (data: Partial<Category>) => void 
}) {
  const [name, setName] = useState(category?.name || '')
  const [color, setColor] = useState(category?.color || '#6366f1')

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899']

  const handleSave = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), color, is_active: true })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">{category ? 'تعديل صنف' : 'صنف جديد'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الصنف *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 border rounded-xl" placeholder="مثال: مشروبات" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">اللون</label>
            <div className="flex gap-2 flex-wrap">
              {colors.map(c => (
                <button 
                  key={c} 
                  onClick={() => setColor(c)} 
                  className={`w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="p-4 border-t flex gap-3">
          <button onClick={handleSave} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold">حفظ</button>
          <button onClick={onClose} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium">إلغاء</button>
        </div>
      </div>
    </div>
  )
}

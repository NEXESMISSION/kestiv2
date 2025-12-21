'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient, resetClient } from '@/lib/supabase/client'
import { Product, Category, RetailCustomer } from '@/types/database'
import { 
  Search, ShoppingCart, Plus, Minus, Trash2, Package,
  LayoutDashboard, LogOut, RefreshCw, X, Check, AlertTriangle,
  ChevronLeft, ChevronRight, User, CreditCard
} from 'lucide-react'
import PINModal from '@/components/shared/PINModal'
import WelcomePopup from '@/components/shared/WelcomePopup'
import { PullToRefresh } from '@/components/pwa'

type CartItem = {
  product: Product
  quantity: number
}

export default function RetailPOSPage() {
  const router = useRouter()
  const supabase = createClient()
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [customers, setCustomers] = useState<RetailCustomer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [userPin, setUserPin] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showPinModal, setShowPinModal] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  
  // Credit (آجل) state
  const [isCredit, setIsCredit] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<RetailCustomer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  
  // Low stock modal
  const [showLowStock, setShowLowStock] = useState(false)
  
  // Mobile cart popup
  const [showMobileCart, setShowMobileCart] = useState(false)
  
  // PIN navigation destination
  const [pinDestination, setPinDestination] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    
    // Fetch all data in parallel for speed
    const [profileRes, productsRes, categoriesRes, customersRes] = await Promise.all([
      supabase.from('profiles').select('pin_code').eq('id', user.id).single(),
      supabase.from('products')
        .select('id, business_id, name, price, cost, stock, reorder_level, category_id, category, description, image_url, track_stock, is_active')
        .eq('business_id', user.id)
        .eq('is_active', true)
        .order('name'),
      supabase.from('categories').select('*').eq('business_id', user.id).eq('is_active', true).order('sort_order'),
      supabase.from('retail_customers').select('*').eq('business_id', user.id).eq('is_active', true).order('name')
    ])
    
    if (profileRes.data) setUserPin(profileRes.data.pin_code)
    if (productsRes.data) {
      const normalizedProducts = productsRes.data.map((p: any) => ({ ...p, barcode: null }))
      setProducts(normalizedProducts as Product[])
    }
    if (categoriesRes.data) setCategories(categoriesRes.data)
    if (customersRes.data) setCustomers(customersRes.data)
    
    setLoading(false)
  }, [supabase, router])
  
  // Low stock products count
  const lowStockProducts = products.filter(p => p.track_stock && (p.stock ?? 0) <= p.reorder_level)
  
  // Category scroll
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 150
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }
  
  // Filtered customers for search
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  )

  useEffect(() => { fetchData() }, [fetchData])

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchCategory = !selectedCategory || product.category_id === selectedCategory
    return matchSearch && matchCategory
  })

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

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta
          return newQty > 0 ? { ...item, quantity: newQty } : item
        }
        return item
      }).filter(item => item.quantity > 0)
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const clearCart = () => setCart([])

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)

  // Create new customer
  const createNewCustomer = async () => {
    if (!newCustomerName.trim()) return
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    try {
      const { data: newCust, error } = await supabase
        .from('retail_customers')
        .insert({
          business_id: user.id,
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim() || null,
          total_debt: 0
        })
        .select()
        .single()
      
      if (error) throw error
      if (newCust) {
        setCustomers(prev => [...prev, newCust])
        setSelectedCustomer(newCust)
        setShowNewCustomer(false)
        setNewCustomerName('')
        setNewCustomerPhone('')
      }
    } catch (e: any) {
      alert('خطأ: ' + (e.message || 'فشل إنشاء العميل'))
    }
  }

  // Complete purchase
  const completePurchase = async () => {
    if (cart.length === 0) return
    if (isCredit && !selectedCustomer) {
      alert('الرجاء اختيار عميل للبيع الآجل')
      return
    }
    setProcessing(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Build notes with item details
      const itemDetails = cart.map(item => `${item.product.name} ×${item.quantity}`).join(', ')

      // Create transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          business_id: user.id,
          customer_id: isCredit && selectedCustomer ? selectedCustomer.id : null,
          type: 'sale',
          payment_method: isCredit ? 'debt' : 'cash',
          amount: cartTotal,
          notes: itemDetails
        })
        .select()
        .single()

      if (txError) throw txError

      // Try to create transaction items (table might not exist)
      try {
        const items = cart.map(item => ({
          transaction_id: transaction.id,
          product_id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity
        }))
        await supabase.from('transaction_items').insert(items)
      } catch (e) {
        console.log('transaction_items table may not exist - items stored in notes')
      }

      // Deduct stock for products with track_stock enabled
      for (const item of cart) {
        if (item.product.track_stock) {
          const newStock = Math.max(0, (item.product.stock || 0) - item.quantity)
          await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.product.id)
        }
      }
      
      // If credit sale, update customer debt
      if (isCredit && selectedCustomer) {
        await supabase
          .from('retail_customers')
          .update({ total_debt: selectedCustomer.total_debt + cartTotal })
          .eq('id', selectedCustomer.id)
      }

      // Show success and clear cart
      setShowSuccess(true)
      setCart([])
      setIsCredit(false)
      setSelectedCustomer(null)
      setTimeout(() => setShowSuccess(false), 800)
      
      // Refresh products to get updated stock
      fetchData()
    } catch (error) {
      console.error('Purchase error:', error)
      alert('حدث خطأ أثناء إتمام الشراء')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <PullToRefresh onRefresh={fetchData}>
    <div className="min-h-screen bg-gray-100 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
              <span className="hidden sm:inline">نقطة البيع</span>
              <span className="sm:hidden">البيع</span>
            </h1>
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Alert Icon */}
              <button 
                onClick={() => {/* Add alert action here */}}
                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                title="تنبيهات"
              >
                <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              {/* Low Stock Alert */}
              {lowStockProducts.length > 0 && (
                <button 
                  onClick={() => setShowLowStock(true)}
                  className="relative p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {lowStockProducts.length}
                  </span>
                </button>
              )}
              <button 
                onClick={() => setShowPinModal(true)} 
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium text-sm sm:text-base"
              >
                <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">لوحة التحكم</span>
              </button>
              <button 
                onClick={async () => { 
                  await supabase.auth.signOut()
                  resetClient()
                  window.location.href = '/login'
                }} 
                className="p-2 text-gray-500 hover:text-red-600 rounded-lg"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search & Categories */}
          <div className="p-2 sm:p-4 bg-white border-b space-y-2 sm:space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="بحث عن منتج..." 
                className="w-full pr-10 pl-4 py-2 sm:py-2.5 bg-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 text-sm sm:text-base" 
              />
            </div>
            {/* Categories with scroll arrows */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => scrollCategories('right')}
                className="hidden sm:flex flex-shrink-0 w-8 h-8 items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div 
                ref={categoryScrollRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth flex-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <button 
                  onClick={() => setSelectedCategory(null)} 
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${!selectedCategory ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  الكل
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.id} 
                    onClick={() => setSelectedCategory(cat.id)} 
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0 ${selectedCategory === cat.id ? 'text-white' : ''}`}
                    style={selectedCategory === cat.id ? { backgroundColor: cat.color } : { backgroundColor: cat.color + '20', color: cat.color }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => scrollCategories('left')}
                className="hidden sm:flex flex-shrink-0 w-8 h-8 items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Products Grid - Grouped by Category */}
          <div className="flex-1 overflow-auto p-2 sm:p-4">
            {loading ? (
              /* Skeleton loader while fetching */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-3 border-2 border-gray-100">
                    <div className="h-16 sm:h-20 bg-gray-100 rounded-xl mb-2" />
                    <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                    <div className="h-5 bg-gray-100 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Package className="w-12 h-12 sm:w-16 sm:h-16 mb-2 sm:mb-4" />
                <p className="text-sm sm:text-base mb-4">لا توجد منتجات بعد</p>
                <button
                  onClick={() => { setPinDestination('/dashboard/retail'); setShowPinModal(true) }}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  إضافة منتجات
                </button>
              </div>
            ) : selectedCategory || searchQuery ? (
              /* Grid View when category selected or searching */
              filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Package className="w-12 h-12 mb-2" />
                  <p>لا توجد منتجات</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
                  {filteredProducts.map(product => {
                    const inCart = cart.find(item => item.product.id === product.id)
                    const lowStock = product.track_stock && product.stock !== null && product.stock <= product.reorder_level
                    const outOfStock = product.track_stock && product.stock !== null && product.stock <= 0
                    return (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className={`bg-white rounded-2xl p-3 text-right transition-all hover:shadow-lg border-2 relative ${
                          inCart ? 'border-primary-500 bg-primary-50' : 'border-gray-100'
                        }`}
                      >
                        <div className={`h-16 sm:h-20 rounded-xl mb-2 flex items-center justify-center ${
                          product.image_url ? '' : 'bg-gradient-to-br from-primary-100 to-blue-50'
                        }`}>
                          {product.image_url ? (
                            <div className="relative h-full w-full">
                              <Image src={product.image_url} alt={product.name} fill className="object-cover rounded-xl" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw" />
                            </div>
                          ) : (
                            <Package className="w-8 h-8 text-primary-400" />
                          )}
                        </div>
                        <h3 className="font-bold text-gray-900 truncate text-sm">{product.name}</h3>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-base font-bold text-primary-600">{product.price.toFixed(3)}</span>
                          {product.track_stock && product.stock !== null && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              outOfStock ? 'bg-red-100 text-red-600' : lowStock ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                            }`}>{outOfStock ? 'نفذ' : product.stock}</span>
                          )}
                        </div>
                        {inCart && (
                          <div className="absolute top-2 left-2 w-6 h-6 bg-primary-600 text-white text-sm font-bold rounded-full flex items-center justify-center">
                            {inCart.quantity}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            ) : (
              /* Grouped by Category View */
              <div className="space-y-6">
                {/* Products without category */}
                {(() => {
                  const uncategorizedProducts = products.filter(p => !p.category_id)
                  if (uncategorizedProducts.length === 0) return null
                  return (
                    <div>
                      <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        عام
                      </h3>
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                        {uncategorizedProducts.map(product => {
                          const inCart = cart.find(item => item.product.id === product.id)
                          const outOfStock = product.track_stock && product.stock !== null && product.stock <= 0
                          return (
                            <button
                              key={product.id}
                              onClick={() => addToCart(product)}
                              className={`flex-shrink-0 w-32 sm:w-40 bg-white rounded-2xl p-3 text-right transition-all hover:shadow-lg border-2 relative ${
                                inCart ? 'border-primary-500 bg-primary-50' : 'border-gray-100'
                              }`}
                            >
                              <div className={`h-16 rounded-xl mb-2 flex items-center justify-center ${
                                product.image_url ? '' : 'bg-gradient-to-br from-gray-100 to-gray-50'
                              }`}>
                                {product.image_url ? (
                                  <div className="relative h-full w-full">
                                    <Image src={product.image_url} alt={product.name} fill className="object-cover rounded-xl" sizes="160px" />
                                  </div>
                                ) : (
                                  <Package className="w-8 h-8 text-gray-400" />
                                )}
                              </div>
                              <h3 className="font-bold text-gray-900 truncate text-sm">{product.name}</h3>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-base font-bold text-primary-600">{product.price.toFixed(3)}</span>
                                {outOfStock && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">نفذ</span>}
                              </div>
                              {inCart && (
                                <div className="absolute top-2 left-2 w-6 h-6 bg-primary-600 text-white text-sm font-bold rounded-full flex items-center justify-center">
                                  {inCart.quantity}
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
                
                {/* Products by category */}
                {categories.map(category => {
                  const categoryProducts = products.filter(p => p.category_id === category.id)
                  if (categoryProducts.length === 0) return null
                  return (
                    <div key={category.id}>
                      <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }}></div>
                        {category.name}
                        <span className="text-sm font-normal text-gray-400">({categoryProducts.length})</span>
                      </h3>
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                        {categoryProducts.map(product => {
                          const inCart = cart.find(item => item.product.id === product.id)
                          const lowStock = product.track_stock && product.stock !== null && product.stock <= product.reorder_level
                          const outOfStock = product.track_stock && product.stock !== null && product.stock <= 0
                          return (
                            <button
                              key={product.id}
                              onClick={() => addToCart(product)}
                              className={`flex-shrink-0 w-32 sm:w-40 bg-white rounded-2xl p-3 text-right transition-all hover:shadow-lg border-2 relative ${
                                inCart ? 'border-primary-500 bg-primary-50' : 'border-gray-100'
                              }`}
                            >
                              <div className={`h-16 rounded-xl mb-2 flex items-center justify-center`} style={{ backgroundColor: category.color + '20' }}>
                                {product.image_url ? (
                                  <div className="relative h-full w-full">
                                    <Image src={product.image_url} alt={product.name} fill className="object-cover rounded-xl" sizes="160px" />
                                  </div>
                                ) : (
                                  <Package className="w-8 h-8" style={{ color: category.color }} />
                                )}
                              </div>
                              <h3 className="font-bold text-gray-900 truncate text-sm">{product.name}</h3>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-base font-bold text-primary-600">{product.price.toFixed(3)}</span>
                                {product.track_stock && product.stock !== null && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    outOfStock ? 'bg-red-100 text-red-600' : lowStock ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                                  }`}>{outOfStock ? 'نفذ' : product.stock}</span>
                                )}
                              </div>
                              {inCart && (
                                <div className="absolute top-2 left-2 w-6 h-6 bg-primary-600 text-white text-sm font-bold rounded-full flex items-center justify-center">
                                  {inCart.quantity}
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className="hidden sm:flex w-72 lg:w-80 bg-white shadow-xl flex-col border-r">
          <div className="p-3 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                السلة
              </h2>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-red-500 hover:text-red-600 text-xs">
                  مسح
                </button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-auto p-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <ShoppingCart className="w-10 h-10 mb-2" />
                <p className="text-xs">السلة فارغة</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.product.id} className="bg-gray-50 rounded-lg p-2">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-gray-900 text-sm truncate flex-1">{item.product.name}</h4>
                      <button 
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-red-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-6 h-6 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-primary-600 text-sm">{(item.product.price * item.quantity).toFixed(3)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Credit Toggle */}
          <div className="p-2 border-t">
            <button
              onClick={() => setIsCredit(!isCredit)}
              className={`w-full p-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium ${
                isCredit ? 'bg-orange-100 text-orange-700 border-2 border-orange-400' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              آجل (دين)
            </button>
            
            {/* Customer Selection */}
            {isCredit && (
              <div className="mt-2 space-y-2">
                {selectedCustomer ? (
                  <div className="p-2 bg-orange-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium">{selectedCustomer.name}</span>
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="ابحث عن عميل..."
                      className="w-full px-2 py-1.5 text-sm border rounded-lg"
                    />
                    {customerSearch && filteredCustomers.length > 0 && (
                      <div className="max-h-24 overflow-auto border rounded-lg">
                        {filteredCustomers.slice(0, 5).map(c => (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedCustomer(c); setCustomerSearch('') }}
                            className="w-full p-2 text-right text-sm hover:bg-gray-50 border-b last:border-b-0"
                          >
                            {c.name} {c.phone && <span className="text-gray-400">({c.phone})</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => setShowNewCustomer(true)}
                      className="w-full p-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      عميل جديد
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Cart Footer */}
          <div className="p-3 border-t bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <span className="text-gray-600 text-sm">المجموع</span>
              <span className="text-xl font-bold text-primary-600">{cartTotal.toFixed(3)} DT</span>
            </div>
            <button
              onClick={completePurchase}
              disabled={cart.length === 0 || processing || (isCredit && !selectedCustomer)}
              className={`w-full py-3 ${isCredit ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} disabled:bg-gray-300 text-white rounded-xl font-bold flex items-center justify-center gap-2`}
            >
              {processing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  {isCredit ? 'بيع آجل' : 'إتمام الشراء'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Cart Floating Button */}
        <div className="sm:hidden fixed bottom-4 left-4 z-40">
          <button
            onClick={() => setShowMobileCart(true)}
            className="relative w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center"
          >
            <ShoppingCart className="w-6 h-6" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>

        {/* Mobile Cart Popup */}
        {showMobileCart && (
          <div className="sm:hidden fixed inset-0 bg-black/50 z-50" dir="rtl">
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] flex flex-col animate-slide-up">
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  السلة ({cart.length})
                </h2>
                <div className="flex items-center gap-2">
                  {cart.length > 0 && (
                    <button onClick={clearCart} className="text-red-500 text-sm font-medium">
                      مسح الكل
                    </button>
                  )}
                  <button onClick={() => setShowMobileCart(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-auto p-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <ShoppingCart className="w-16 h-16 mb-3" />
                    <p>السلة فارغة</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.product.id} className="bg-gray-50 rounded-xl p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                          <button onClick={() => removeFromCart(item.product.id)} className="p-1 text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-bold">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="w-8 h-8 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="font-bold text-primary-600">{(item.product.price * item.quantity).toFixed(3)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Credit Toggle */}
              {cart.length > 0 && (
                <div className="p-3 border-t">
                  <button
                    onClick={() => setIsCredit(!isCredit)}
                    className={`w-full p-3 rounded-xl flex items-center justify-center gap-2 font-medium ${
                      isCredit ? 'bg-orange-100 text-orange-700 border-2 border-orange-400' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    آجل (دين)
                  </button>
                  
                  {isCredit && (
                    <div className="mt-3 space-y-2">
                      {selectedCustomer ? (
                        <div className="p-3 bg-orange-50 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-orange-600" />
                            <span className="font-medium">{selectedCustomer.name}</span>
                          </div>
                          <button onClick={() => setSelectedCustomer(null)} className="text-gray-400">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            placeholder="ابحث عن عميل..."
                            className="w-full px-3 py-2 border rounded-xl"
                          />
                          {customerSearch && filteredCustomers.length > 0 && (
                            <div className="max-h-32 overflow-auto border rounded-xl">
                              {filteredCustomers.slice(0, 5).map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => { setSelectedCustomer(c); setCustomerSearch('') }}
                                  className="w-full p-3 text-right hover:bg-gray-50 border-b last:border-b-0"
                                >
                                  {c.name} {c.phone && <span className="text-gray-400">({c.phone})</span>}
                                </button>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => setShowNewCustomer(true)}
                            className="w-full p-3 bg-gray-100 rounded-xl flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            عميل جديد
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">المجموع</span>
                  <span className="text-2xl font-bold text-primary-600">{cartTotal.toFixed(3)} DT</span>
                </div>
                <button
                  onClick={() => { completePurchase(); setShowMobileCart(false) }}
                  disabled={cart.length === 0 || processing || (isCredit && !selectedCustomer)}
                  className={`w-full py-4 ${isCredit ? 'bg-orange-600' : 'bg-green-600'} disabled:bg-gray-300 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2`}
                >
                  {processing ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      {isCredit ? 'بيع آجل' : 'إتمام الشراء'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span className="font-bold">تم الشراء بنجاح!</span>
          </div>
        </div>
      )}

      {/* PIN Modal */}
      <PINModal 
        isOpen={showPinModal} 
        correctPin={userPin} 
        onSuccess={() => { setShowPinModal(false); router.push(pinDestination || '/dashboard/retail'); setPinDestination(null) }} 
        onCancel={() => { setShowPinModal(false); setPinDestination(null) }} 
      />
      
      {/* Welcome Popup */}
      <WelcomePopup trialDays={15} />

      {/* Low Stock Modal - View Only */}
      {showLowStock && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[70vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                منخفض المخزون ({lowStockProducts.length})
              </h3>
              <button onClick={() => setShowLowStock(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                  <div className="font-medium">{p.name}</div>
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                    (p.stock ?? 0) <= 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {p.stock ?? 0}
                  </div>
                </div>
              ))}
              {lowStockProducts.length === 0 && (
                <div className="text-center text-gray-400 py-8">لا توجد منتجات منخفضة</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {showNewCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">عميل جديد</h3>
              <button onClick={() => setShowNewCustomer(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
                <input 
                  type="text" 
                  value={newCustomerName} 
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl" 
                  placeholder="اسم العميل" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                <input 
                  type="tel" 
                  value={newCustomerPhone} 
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl" 
                  placeholder="اختياري" 
                />
              </div>
              <button
                onClick={createNewCustomer}
                disabled={!newCustomerName.trim()}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-xl font-bold"
              >
                إضافة العميل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  )
}

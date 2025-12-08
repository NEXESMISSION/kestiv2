'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Plus, Edit2, Trash2, Save, X,
  RefreshCw, Package, DollarSign, ToggleLeft, ToggleRight, AlertTriangle
} from 'lucide-react'
import { Product } from '@/types/database'

interface ProductFormData {
  name: string
  price: number
  cost: number
  stock: number
  reorder_level: number
  is_active: boolean
}

const defaultFormData: ProductFormData = {
  name: '',
  price: 0,
  cost: 0,
  stock: 0,
  reorder_level: 5,
  is_active: true
}

export default function ProductsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData)
  const [saving, setSaving] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUserId(user.id)

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', user.id)
      .order('name', { ascending: true })

    if (data) setProducts(data)
    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const openCreateModal = () => {
    setEditingProduct(null)
    setFormData(defaultFormData)
    setIsModalOpen(true)
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      price: product.price,
      cost: product.cost,
      stock: product.stock ?? 0,
      reorder_level: product.reorder_level,
      is_active: product.is_active
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProduct(null)
    setFormData(defaultFormData)
  }

  const handleSave = async () => {
    if (!userId || !formData.name || formData.price < 0) return

    setSaving(true)
    try {
      if (editingProduct) {
        await supabase
          .from('products')
          .update({
            name: formData.name,
            price: formData.price,
            cost: formData.cost,
            stock: formData.stock,
            reorder_level: formData.reorder_level,
            is_active: formData.is_active
          })
          .eq('id', editingProduct.id)
      } else {
        await supabase
          .from('products')
          .insert({
            business_id: userId,
            name: formData.name,
            price: formData.price,
            cost: formData.cost,
            stock: formData.stock,
            reorder_level: formData.reorder_level,
            is_active: formData.is_active
          })
      }

      closeModal()
      fetchProducts()
    } catch (error) {
      console.error('Error saving product:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (productId: string) => {
    try {
      await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      setDeleteConfirm(null)
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const toggleProductStatus = async (product: Product) => {
    try {
      await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id)

      fetchProducts()
    } catch (error) {
      console.error('Error toggling product status:', error)
    }
  }

  const updateStock = async (product: Product, change: number) => {
    const newStock = Math.max(0, (product.stock ?? 0) + change)
    try {
      await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', product.id)

      fetchProducts()
    } catch (error) {
      console.error('Error updating stock:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-2" />
          <p className="text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">المنتجات</h1>
                <p className="text-sm text-gray-500">إدارة منتجات المتجر والمخزون</p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              منتج جديد
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {products.length === 0 ? (
          <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد منتجات</h3>
            <p className="text-gray-500 mb-6">ابدأ بإضافة أول منتج للمتجر</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              إضافة منتج
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map(product => (
              <div
                key={product.id}
                className={`bg-white rounded-xl border shadow-sm p-4 ${!product.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {product.is_active ? 'نشط' : 'معطل'}
                      </span>
                      {(product.stock ?? 0) <= product.reorder_level && product.is_active && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          مخزون منخفض
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2 text-primary-600 font-bold">
                        <DollarSign className="w-4 h-4" />
                        <span>{product.price.toFixed(3)} DT</span>
                      </div>
                      <div className="text-gray-500">
                        تكلفة: {product.cost.toFixed(3)} DT
                      </div>
                      <div className="text-gray-500">
                        ربح: {(product.price - product.cost).toFixed(3)} DT
                      </div>
                    </div>
                  </div>

                  {/* Stock Control */}
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                    <button
                      onClick={() => updateStock(product, -1)}
                      className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 hover:bg-red-200 rounded-lg font-bold transition-colors"
                    >
                      -
                    </button>
                    <div className="w-16 text-center">
                      <div className={`text-xl font-bold ${(product.stock ?? 0) <= product.reorder_level ? 'text-orange-600' : 'text-gray-900'}`}>
                        {product.stock ?? 0}
                      </div>
                      <div className="text-xs text-gray-500">المخزون</div>
                    </div>
                    <button
                      onClick={() => updateStock(product, 1)}
                      className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-600 hover:bg-green-200 rounded-lg font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleProductStatus(product)}
                      className={`p-2 rounded-lg transition-colors ${
                        product.is_active 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {product.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(product.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {deleteConfirm === product.id && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm mb-3">هل أنت متأكد من حذف هذا المنتج؟</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        نعم، احذف
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingProduct ? 'تعديل المنتج' : 'منتج جديد'}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم المنتج *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: مشروب طاقة"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    سعر البيع (DT) *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => e.target.select()}
                    min="0"
                    step="0.001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    التكلفة (DT)
                  </label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => e.target.select()}
                    min="0"
                    step="0.001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {formData.price > 0 && formData.cost > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="text-sm text-green-700">
                    هامش الربح: <span className="font-bold">{(formData.price - formData.cost).toFixed(3)} DT</span>
                    {' '}({((formData.price - formData.cost) / formData.price * 100).toFixed(1)}%)
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المخزون الحالي
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    onFocus={(e) => e.target.select()}
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    حد إعادة الطلب
                  </label>
                  <input
                    type="number"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })}
                    onFocus={(e) => e.target.select()}
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="font-medium text-gray-900">تفعيل المنتج</div>
                  <div className="text-sm text-gray-500">المنتجات المفعلة تظهر في نقطة البيع</div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`p-1 rounded-full transition-colors ${
                    formData.is_active ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    formData.is_active ? 'translate-x-0' : 'translate-x-6'
                  }`} />
                </button>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !formData.name}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors"
              >
                {saving ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
              </button>
              <button
                onClick={closeModal}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

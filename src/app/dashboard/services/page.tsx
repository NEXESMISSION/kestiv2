'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Plus, Edit2, Trash2, Save, X,
  RefreshCw, Scissors, ToggleLeft, ToggleRight
} from 'lucide-react'
import { Service } from '@/types/database'

interface ServiceFormData {
  name: string
  price: number
  description: string
  is_active: boolean
}

const defaultFormData: ServiceFormData = {
  name: '',
  price: 0,
  description: '',
  is_active: true
}

export default function ServicesPage() {
  const router = useRouter()
  const supabase = createClient()

  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState<ServiceFormData>(defaultFormData)
  const [saving, setSaving] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchServices = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUserId(user.id)

    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', user.id)
      .order('name', { ascending: true })

    if (data) setServices(data)
    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  const openCreateModal = () => {
    setEditingService(null)
    setFormData(defaultFormData)
    setIsModalOpen(true)
  }

  const openEditModal = (service: Service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      price: service.price,
      description: service.description || '',
      is_active: service.is_active
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingService(null)
    setFormData(defaultFormData)
  }

  const handleSave = async () => {
    if (!userId || !formData.name || formData.price < 0) return

    setSaving(true)
    try {
      if (editingService) {
        await supabase
          .from('services')
          .update({
            name: formData.name,
            price: formData.price,
            description: formData.description || null,
            is_active: formData.is_active
          })
          .eq('id', editingService.id)
      } else {
        await supabase
          .from('services')
          .insert({
            business_id: userId,
            name: formData.name,
            price: formData.price,
            description: formData.description || null,
            is_active: formData.is_active
          })
      }

      closeModal()
      fetchServices()
    } catch (error) {
      console.error('Error saving service:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (serviceId: string) => {
    try {
      await supabase
        .from('services')
        .delete()
        .eq('id', serviceId)

      setDeleteConfirm(null)
      fetchServices()
    } catch (error) {
      console.error('Error deleting service:', error)
    }
  }

  const toggleServiceStatus = async (service: Service) => {
    try {
      await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id)

      fetchServices()
    } catch (error) {
      console.error('Error toggling service status:', error)
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
                <h1 className="text-xl font-bold text-gray-900">الخدمات</h1>
                <p className="text-sm text-gray-500">إدارة الخدمات الإضافية</p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              خدمة جديدة
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {services.length === 0 ? (
          <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Scissors className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد خدمات</h3>
            <p className="text-gray-500 mb-6">ابدأ بإضافة أول خدمة (مثل: حصة تدريب، جلسة تدليك)</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              إضافة خدمة
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map(service => (
              <div
                key={service.id}
                className={`bg-white rounded-xl border shadow-sm p-6 ${!service.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{service.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        service.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {service.is_active ? 'نشط' : 'معطل'}
                      </span>
                    </div>
                    
                    {service.description && (
                      <p className="text-gray-500 text-sm mb-3">{service.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-primary-600 font-bold">
                      <span className="text-xs font-bold">DT</span>
                      <span>{service.price.toFixed(3)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleServiceStatus(service)}
                      className={`p-2 rounded-lg transition-colors ${
                        service.is_active 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {service.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                    <button
                      onClick={() => openEditModal(service)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(service.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {deleteConfirm === service.id && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm mb-3">هل أنت متأكد من حذف هذه الخدمة؟</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(service.id)}
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
                  {editingService ? 'تعديل الخدمة' : 'خدمة جديدة'}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم الخدمة *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: حصة تدريب شخصي"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  السعر *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => e.target.select()}
                    min="0"
                    step="0.001"
                    dir="ltr"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-left"
                    placeholder="0.000"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">د.ت</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">أدخل السعر بالدينار (مثال: 25 = خمسة وعشرون دينار)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوصف (اختياري)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف مختصر للخدمة..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="font-medium text-gray-900">تفعيل الخدمة</div>
                  <div className="text-sm text-gray-500">الخدمات المفعلة تظهر في نقطة البيع</div>
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
                {editingService ? 'حفظ التعديلات' : 'إضافة الخدمة'}
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

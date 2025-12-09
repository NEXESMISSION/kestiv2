'use client'

import { useState } from 'react'
import { 
  Plus, Settings, Trash2, X, Loader2, Check, DollarSign, Edit3
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { FreelancerService } from '@/types/database'

interface SettingsTabProps {
  services: FreelancerService[]
  userId: string
  onRefresh: () => void
}

export default function SettingsTab({ services, userId, onRefresh }: SettingsTabProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingService, setEditingService] = useState<FreelancerService | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form
  const [serviceName, setServiceName] = useState('')
  const [servicePrice, setServicePrice] = useState('')
  const [serviceDescription, setServiceDescription] = useState('')

  const handleAddService = async () => {
    if (!serviceName || !servicePrice) return
    setIsSubmitting(true)
    
    try {
      const supabase = createClient()
      await supabase.from('freelancer_services').insert({
        business_id: userId,
        name: serviceName,
        price: parseFloat(servicePrice),
        description: serviceDescription || null
      })
      
      setShowAddModal(false)
      resetForm()
      onRefresh()
    } catch (error) {
      console.error('Error adding service:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateService = async () => {
    if (!editingService || !serviceName || !servicePrice) return
    setIsSubmitting(true)
    
    try {
      const supabase = createClient()
      await supabase.from('freelancer_services')
        .update({
          name: serviceName,
          price: parseFloat(servicePrice),
          description: serviceDescription || null
        })
        .eq('id', editingService.id)
      
      setEditingService(null)
      resetForm()
      onRefresh()
    } catch (error) {
      console.error('Error updating service:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('هل تريد حذف هذه الخدمة؟')) return
    
    try {
      const supabase = createClient()
      await supabase.from('freelancer_services')
        .update({ is_active: false })
        .eq('id', serviceId)
      onRefresh()
    } catch (error) {
      console.error('Error deleting service:', error)
    }
  }

  const openEditModal = (service: FreelancerService) => {
    setEditingService(service)
    setServiceName(service.name)
    setServicePrice(service.price.toString())
    setServiceDescription(service.description || '')
  }

  const resetForm = () => {
    setServiceName('')
    setServicePrice('')
    setServiceDescription('')
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingService(null)
    resetForm()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-500" />
          الخدمات
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl flex items-center gap-2 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          إضافة خدمة
        </button>
      </div>

      <p className="text-sm text-gray-500">
        أضف خدماتك المعتادة مع أسعارها لتسهيل إنشاء المشاريع
      </p>

      {/* Services List */}
      {services.length === 0 ? (
        <div className="card !p-8 text-center">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">لا توجد خدمات</p>
          <p className="text-sm text-gray-400">أضف خدماتك لتسهيل إنشاء المشاريع</p>
        </div>
      ) : (
        <div className="space-y-2">
          {services.map(service => (
            <div key={service.id} className="card !p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">{service.name}</h3>
                {service.description && (
                  <p className="text-sm text-gray-500">{service.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-primary-600">{service.price} DT</span>
                <button
                  onClick={() => openEditModal(service)}
                  className="p-2 text-gray-400 hover:text-primary-500 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteService(service.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preset suggestions */}
      <div className="card !p-4 bg-primary-50 border-primary-200">
        <h4 className="text-sm font-medium text-primary-700 mb-2">أمثلة على الخدمات:</h4>
        <div className="flex flex-wrap gap-2">
          {[
            { name: 'تصوير زفاف', price: 1200 },
            { name: 'فيديو ريلز', price: 50 },
            { name: 'مونتاج', price: 30 },
            { name: 'تصوير منتجات', price: 100 },
            { name: 'جلسة تصوير', price: 150 },
          ].map(preset => (
            <button
              key={preset.name}
              onClick={() => {
                setServiceName(preset.name)
                setServicePrice(preset.price.toString())
                setShowAddModal(true)
              }}
              className="px-3 py-1.5 bg-white text-primary-600 text-sm rounded-full hover:bg-primary-100 transition-colors"
            >
              {preset.name} - {preset.price} DT
            </button>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingService) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50" onClick={closeModal}>
          <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  {editingService ? 'تعديل الخدمة' : 'خدمة جديدة'}
                </h3>
                <button onClick={closeModal} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الخدمة *</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="input-field"
                  placeholder="مثال: تصوير زفاف"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">السعر (DT) *</label>
                <input
                  type="number"
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  className="input-field text-lg"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وصف</label>
                <input
                  type="text"
                  value={serviceDescription}
                  onChange={(e) => setServiceDescription(e.target.value)}
                  className="input-field"
                  placeholder="اختياري"
                />
              </div>
              
              <button
                onClick={editingService ? handleUpdateService : handleAddService}
                disabled={!serviceName || !servicePrice || isSubmitting}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {editingService ? 'حفظ التعديلات' : 'إضافة الخدمة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

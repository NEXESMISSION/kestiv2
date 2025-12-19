'use client'

import { useState } from 'react'
import { 
  Plus, User, Phone, FolderKanban, X, Loader2, 
  Check, ChevronLeft, AlertCircle, Search, Edit3, Trash2, AlertTriangle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { FreelancerClient, FreelancerProject } from '@/types/database'

interface ClientsTabProps {
  clients: FreelancerClient[]
  projects: FreelancerProject[]
  userId: string
  onRefresh: () => void
}

export default function ClientsTab({ clients, projects, userId, onRefresh }: ClientsTabProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<FreelancerClient | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Add client form
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientNotes, setClientNotes] = useState('')
  
  // Payment form
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  
  // Edit/Delete state
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  )

  const handleAddClient = async () => {
    if (!clientName) return
    setIsSubmitting(true)
    
    try {
      const supabase = createClient()
      await supabase.from('freelancer_clients').insert({
        business_id: userId,
        name: clientName,
        phone: clientPhone || null,
        notes: clientNotes || null
      })
      
      setShowAddModal(false)
      setClientName('')
      setClientPhone('')
      setClientNotes('')
      onRefresh()
    } catch (error) {
      console.error('Error adding client:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRecordPayment = async () => {
    if (!selectedClient || !paymentAmount) return
    setIsSubmitting(true)
    
    try {
      const supabase = createClient()
      await supabase.from('freelancer_payments').insert({
        business_id: userId,
        client_id: selectedClient.id,
        amount: parseFloat(paymentAmount),
        payment_type: 'partial',
        notes: paymentNotes || 'سداد دين'
      })
      
      // Update client credit
      await supabase.from('freelancer_clients')
        .update({ 
          total_credit: Math.max(0, selectedClient.total_credit - parseFloat(paymentAmount)),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedClient.id)
      
      setShowPaymentModal(false)
      setSelectedClient(null)
      setPaymentAmount('')
      setPaymentNotes('')
      onRefresh()
    } catch (error) {
      console.error('Error recording payment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getClientProjects = (clientId: string) => {
    return projects.filter(p => p.client_id === clientId)
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Search & Add */}
      <div className="flex gap-3 lg:gap-4">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن عميل..."
            className="input-field !pr-10"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Clients List */}
      {filteredClients.length === 0 ? (
        <div className="card !p-8 lg:!p-12 text-center">
          <User className="w-12 h-12 lg:w-16 lg:h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 lg:text-lg">لا يوجد عملاء</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-primary-600 hover:text-primary-700 font-medium lg:text-lg"
          >
            + إضافة عميل جديد
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
          {filteredClients.map(client => {
            const clientProjects = getClientProjects(client.id)
            
            return (
              <div 
                key={client.id} 
                className="card !p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setSelectedClient(client)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-lg">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{client.name}</h3>
                      {client.phone && (
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {client.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">المشاريع</p>
                    <p className="font-bold text-gray-800">{client.projects_count}</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600">المدفوع</p>
                    <p className="font-bold text-green-600">{client.total_spent.toFixed(0)}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${client.total_credit > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                    <p className={`text-xs ${client.total_credit > 0 ? 'text-orange-600' : 'text-gray-500'}`}>الدين</p>
                    <p className={`font-bold ${client.total_credit > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
                      {client.total_credit.toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">عميل جديد</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="input-field"
                  placeholder="اسم العميل"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="input-field"
                  placeholder="اختياري"
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  className="input-field min-h-[80px]"
                  placeholder="اختياري"
                />
              </div>
              
              <button
                onClick={handleAddClient}
                disabled={!clientName || isSubmitting}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                إضافة العميل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Detail Modal */}
      {selectedClient && !showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedClient(null)}>
          <div className="w-full max-w-md bg-white rounded-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
                <span className="text-sm opacity-80">تفاصيل العميل</span>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-3">
                  {selectedClient.name.charAt(0)}
                </div>
                <h3 className="text-xl font-bold">{selectedClient.name}</h3>
                {selectedClient.phone && (
                  <p className="text-white/80 text-sm">{selectedClient.phone}</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="p-4 grid grid-cols-3 gap-2 text-center border-b">
              <div>
                <p className="text-lg font-bold text-gray-800">{selectedClient.projects_count}</p>
                <p className="text-xs text-gray-500">مشاريع</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{selectedClient.total_spent.toFixed(0)} DT</p>
                <p className="text-xs text-gray-500">مدفوع</p>
              </div>
              <div>
                <p className={`text-lg font-bold ${selectedClient.total_credit > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
                  {selectedClient.total_credit.toFixed(0)} DT
                </p>
                <p className="text-xs text-gray-500">دين</p>
              </div>
            </div>

            {/* Actions */}
            {selectedClient.total_credit > 0 && (
              <div className="p-4 border-b">
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors"
                >
                  <span className="text-sm font-bold">DT</span>
                  تسجيل سداد دين
                </button>
              </div>
            )}

            {/* Projects */}
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <FolderKanban className="w-4 h-4" />
                المشاريع
              </h4>
              {getClientProjects(selectedClient.id).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">لا توجد مشاريع</p>
              ) : (
                <div className="space-y-2">
                  {getClientProjects(selectedClient.id).map(project => (
                    <div key={project.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-gray-800">{project.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          project.status === 'completed' ? 'bg-green-100 text-green-700' :
                          project.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {project.status === 'completed' ? 'مكتمل' :
                           project.status === 'in_progress' ? 'قيد العمل' :
                           project.status === 'delivered' ? 'تم التسليم' : 'قيد الانتظار'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>الإجمالي: {project.total_price} DT</span>
                        <span>المتبقي: {project.remaining} DT</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {selectedClient.notes && (
              <div className="p-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">ملاحظات</h4>
                <p className="text-sm text-gray-600">{selectedClient.notes}</p>
              </div>
            )}
            
            {/* Edit/Delete Actions */}
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => {
                  setEditName(selectedClient.name)
                  setEditPhone(selectedClient.phone || '')
                  setEditNotes(selectedClient.notes || '')
                  setShowEditModal(true)
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-50 hover:bg-primary-100 text-primary-600 font-medium rounded-xl transition-colors"
              >
                <Edit3 className="w-5 h-5" />
                تعديل
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPaymentModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">سداد دين</h3>
                  <p className="text-sm text-white/80">{selectedClient.name}</p>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-orange-50 rounded-lg text-center">
                <p className="text-sm text-orange-600">الدين الحالي</p>
                <p className="text-2xl font-bold text-orange-600">{selectedClient.total_credit.toFixed(0)} DT</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (د.ت)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="input-field text-lg pr-12"
                    max={selectedClient.total_credit}
                    placeholder="0"
                    dir="ltr"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">د.ت</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="input-field"
                  placeholder="اختياري"
                />
              </div>
              
              <button
                onClick={handleRecordPayment}
                disabled={!paymentAmount || isSubmitting}
                className="w-full btn-primary bg-green-500 hover:bg-green-600 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                تأكيد السداد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowEditModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">تعديل العميل</h3>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input-field"
                  placeholder="اسم العميل"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="input-field"
                  placeholder="اختياري"
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="input-field min-h-[80px]"
                  placeholder="اختياري"
                />
              </div>
              
              <button
                onClick={async () => {
                  if (!editName) return
                  setIsSubmitting(true)
                  try {
                    const supabase = createClient()
                    await supabase.from('freelancer_clients')
                      .update({ 
                        name: editName, 
                        phone: editPhone || null, 
                        notes: editNotes || null,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', selectedClient.id)
                    
                    setShowEditModal(false)
                    setSelectedClient(null)
                    onRefresh()
                  } catch (error) {
                    console.error('Error updating client:', error)
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
                disabled={!editName || isSubmitting}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Client Confirmation Modal */}
      {showDeleteModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDeleteModal(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-lg font-bold">حذف العميل</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                <p className="text-red-700 font-medium mb-2">هل أنت متأكد من حذف هذا العميل؟</p>
                <p className="text-red-600 font-bold text-lg">{selectedClient.name}</p>
                {selectedClient.projects_count > 0 && (
                  <p className="text-red-500 text-sm mt-2">
                    ⚠️ سيتم حذف {selectedClient.projects_count} مشروع مرتبط
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={async () => {
                    setIsSubmitting(true)
                    try {
                      const supabase = createClient()
                      // Delete related data first
                      await supabase.from('freelancer_payments').delete().eq('client_id', selectedClient.id)
                      await supabase.from('freelancer_projects').delete().eq('client_id', selectedClient.id)
                      await supabase.from('freelancer_clients').delete().eq('id', selectedClient.id)
                      
                      setShowDeleteModal(false)
                      setSelectedClient(null)
                      onRefresh()
                    } catch (error) {
                      console.error('Error deleting client:', error)
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

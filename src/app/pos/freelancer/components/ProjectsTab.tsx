'use client'

import { useState } from 'react'
import { 
  Plus, Clock, CheckCircle, AlertCircle, Video, X, Loader2, 
  Check, Edit3, ChevronDown, Calendar
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { FreelancerProject, FreelancerClient, ProjectStatus } from '@/types/database'

interface ProjectsTabProps {
  projects: FreelancerProject[]
  clients: FreelancerClient[]
  userId: string
  onRefresh: () => void
}

const STATUS_CONFIG = {
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  in_progress: { label: 'قيد العمل', color: 'bg-blue-100 text-blue-700', icon: Video },
  delivered: { label: 'تم التسليم', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
  completed: { label: 'مكتمل', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'ملغي', color: 'bg-gray-100 text-gray-500', icon: AlertCircle },
}

export default function ProjectsTab({ projects, clients, userId, onRefresh }: ProjectsTabProps) {
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('all')
  const [selectedProject, setSelectedProject] = useState<FreelancerProject | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Payment form
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentType, setPaymentType] = useState<'partial' | 'full'>('partial')
  const [paymentNotes, setPaymentNotes] = useState('')
  
  // New project form
  const [projectTitle, setProjectTitle] = useState('')
  const [projectClientId, setProjectClientId] = useState('')
  const [projectPrice, setProjectPrice] = useState('')
  const [projectDeposit, setProjectDeposit] = useState('')
  const [projectDeadline, setProjectDeadline] = useState('')
  const [projectNotes, setProjectNotes] = useState('')

  const filteredProjects = filter === 'all' 
    ? projects 
    : projects.filter(p => p.status === filter)

  const handleRecordPayment = async () => {
    if (!selectedProject || !paymentAmount) return
    setIsSubmitting(true)
    
    try {
      const supabase = createClient()
      const amount = parseFloat(paymentAmount)
      
      await supabase.from('freelancer_payments').insert({
        business_id: userId,
        client_id: selectedProject.client_id,
        project_id: selectedProject.id,
        amount: amount,
        payment_type: paymentType,
        notes: paymentNotes || null
      })
      
      // Check if project is fully paid
      const newPaidAmount = selectedProject.paid_amount + amount
      if (newPaidAmount >= selectedProject.total_price) {
        await supabase.from('freelancer_projects')
          .update({ status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', selectedProject.id)
      }
      
      setShowPaymentModal(false)
      setSelectedProject(null)
      setPaymentAmount('')
      setPaymentNotes('')
      onRefresh()
    } catch (error) {
      console.error('Error recording payment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!selectedProject) return
    setIsSubmitting(true)
    
    try {
      const supabase = createClient()
      await supabase.from('freelancer_projects')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', selectedProject.id)
      
      setShowStatusModal(false)
      setSelectedProject(null)
      onRefresh()
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openPaymentModal = (project: FreelancerProject) => {
    setSelectedProject(project)
    setPaymentAmount(project.remaining.toString())
    setShowPaymentModal(true)
  }

  const openStatusModal = (project: FreelancerProject) => {
    setSelectedProject(project)
    setShowStatusModal(true)
  }

  const handleAddProject = async () => {
    if (!projectTitle || !projectClientId || !projectPrice) return
    setIsSubmitting(true)
    
    try {
      const supabase = createClient()
      const deposit = parseFloat(projectDeposit) || 0
      
      await supabase.from('freelancer_projects').insert({
        business_id: userId,
        client_id: projectClientId,
        title: projectTitle,
        total_price: parseFloat(projectPrice),
        deposit: deposit,
        paid_amount: deposit,
        status: 'pending',
        deadline: projectDeadline || null,
        notes: projectNotes || null
      })
      
      // Record deposit as payment if exists
      if (deposit > 0) {
        await supabase.from('freelancer_payments').insert({
          business_id: userId,
          client_id: projectClientId,
          amount: deposit,
          payment_type: 'deposit',
          notes: `عربون: ${projectTitle}`
        })
      }
      
      setShowAddModal(false)
      resetProjectForm()
      onRefresh()
    } catch (error) {
      console.error('Error adding project:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetProjectForm = () => {
    setProjectTitle('')
    setProjectClientId('')
    setProjectPrice('')
    setProjectDeposit('')
    setProjectDeadline('')
    setProjectNotes('')
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Add Project Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full card !p-4 lg:!p-5 flex items-center justify-center gap-2 text-primary-600 hover:bg-primary-50 transition-colors border-2 border-dashed border-primary-200"
      >
        <Plus className="w-5 h-5 lg:w-6 lg:h-6" />
        <span className="font-medium lg:text-lg">مشروع جديد</span>
      </button>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'all' ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          الكل ({projects.length})
        </button>
        {(['in_progress', 'pending', 'delivered', 'completed'] as ProjectStatus[]).map(status => {
          const count = projects.filter(p => p.status === status).length
          const config = STATUS_CONFIG[status]
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === status ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {config.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <div className="card !p-8 lg:!p-12 text-center">
          <Video className="w-12 h-12 lg:w-16 lg:h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 lg:text-lg">لا توجد مشاريع</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
          {filteredProjects.map(project => {
            const statusConfig = STATUS_CONFIG[project.status]
            const StatusIcon = statusConfig.icon
            const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== 'completed'
            
            return (
              <div key={project.id} className="card !p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Video className="w-4 h-4 text-primary-500" />
                      <h3 className="font-bold text-gray-800">{project.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500">{project.client_name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                  </span>
                </div>
                
                {/* Price Info */}
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">الإجمالي</p>
                    <p className="font-bold text-gray-800">{project.total_price} DT</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600">مدفوع</p>
                    <p className="font-bold text-green-600">{project.paid_amount} DT</p>
                  </div>
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <p className="text-xs text-orange-600">متبقي</p>
                    <p className="font-bold text-orange-600">{project.remaining} DT</p>
                  </div>
                </div>
                
                {/* Deadline */}
                {project.deadline && (
                  <div className={`flex items-center gap-2 text-xs mb-2 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                    <Calendar className="w-3 h-3" />
                    <span>
                      {isOverdue ? 'متأخر - ' : 'التسليم: '}
                      {new Date(project.deadline).toLocaleDateString('ar-TN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {project.notes && (
                  <p className="text-xs text-gray-400 mb-3 line-clamp-2">{project.notes}</p>
                )}
                
                {/* Actions */}
                <div className="flex gap-2">
                  {project.remaining > 0 && (
                    <button
                      onClick={() => openPaymentModal(project)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <span className="text-xs font-bold">DT</span>
                      تسجيل دفعة
                    </button>
                  )}
                  <button
                    onClick={() => openStatusModal(project)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    تغيير الحالة
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPaymentModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">تسجيل دفعة</h3>
                  <p className="text-sm text-white/80">{selectedProject.title}</p>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-500">المتبقي</p>
                <p className="text-2xl font-bold text-orange-600">{selectedProject.remaining} DT</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (DT)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="input-field text-lg"
                  max={selectedProject.remaining}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع الدفع</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setPaymentType('partial'); }}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      paymentType === 'partial' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    جزئي
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPaymentType('full'); setPaymentAmount(selectedProject.remaining.toString()); }}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      paymentType === 'full' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    كامل
                  </button>
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
                تأكيد الدفعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowStatusModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">تغيير الحالة</h3>
                  <p className="text-sm text-white/80">{selectedProject.title}</p>
                </div>
                <button onClick={() => setShowStatusModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-2">
              {(['pending', 'in_progress', 'delivered', 'completed', 'cancelled'] as ProjectStatus[]).map(status => {
                const config = STATUS_CONFIG[status]
                const Icon = config.icon
                const isActive = selectedProject.status === status
                
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={isSubmitting || isActive}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      isActive 
                        ? 'bg-primary-50 border-2 border-primary-500' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-gray-800">{config.label}</span>
                    {isActive && <Check className="w-5 h-5 text-primary-500 mr-auto" />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">مشروع جديد</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {clients.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-2">أضف عميل أولاً</p>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-primary-600 font-medium"
                  >
                    إغلاق
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">العميل *</label>
                    <select
                      value={projectClientId}
                      onChange={(e) => setProjectClientId(e.target.value)}
                      className="input-field"
                    >
                      <option value="">اختر العميل</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">عنوان المشروع *</label>
                    <input
                      type="text"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      className="input-field"
                      placeholder="مثال: تصميم شعار، موقع ويب..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">السعر *</label>
                      <input
                        type="number"
                        value={projectPrice}
                        onChange={(e) => setProjectPrice(e.target.value)}
                        className="input-field"
                        placeholder="0 DT"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">العربون</label>
                      <input
                        type="number"
                        value={projectDeposit}
                        onChange={(e) => setProjectDeposit(e.target.value)}
                        className="input-field"
                        placeholder="0 DT"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">موعد التسليم</label>
                    <input
                      type="date"
                      value={projectDeadline}
                      onChange={(e) => setProjectDeadline(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                    <textarea
                      value={projectNotes}
                      onChange={(e) => setProjectNotes(e.target.value)}
                      className="input-field min-h-[60px]"
                      placeholder="اختياري"
                    />
                  </div>
                  
                  <button
                    onClick={handleAddProject}
                    disabled={!projectTitle || !projectClientId || !projectPrice || isSubmitting}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    إنشاء المشروع
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

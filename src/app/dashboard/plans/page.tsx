'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Plus, Edit2, Trash2, Save, X,
  RefreshCw, Calendar, DollarSign, ToggleLeft, ToggleRight,
  Package, Zap, Users
} from 'lucide-react'
import { SubscriptionPlan, PlanType } from '@/types/database'

interface PlanFormData {
  name: string
  plan_type: PlanType
  duration_days: number
  sessions: number
  price: number
  is_active: boolean
}

const defaultFormData: PlanFormData = {
  name: '',
  plan_type: 'single',
  duration_days: 30,
  sessions: 5,
  price: 0,
  is_active: true
}

export default function PlansPage() {
  const router = useRouter()
  const supabase = createClient()

  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [formData, setFormData] = useState<PlanFormData>(defaultFormData)
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchPlans = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUserId(user.id)

    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('business_id', user.id)
      .order('duration_days', { ascending: true })

    if (data) setPlans(data)
    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const openCreateModal = () => {
    setEditingPlan(null)
    setFormData(defaultFormData)
    setIsModalOpen(true)
  }

  const openEditModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan)
    // Determine plan_type from existing data for backwards compatibility
    let planType: PlanType = plan.plan_type || 'subscription'
    if (!plan.plan_type) {
      if (plan.duration_days === 0 && plan.sessions === 1) {
        planType = 'single'
      } else if (plan.duration_days === 0 && plan.sessions > 1) {
        planType = 'package'
      }
    }
    setFormData({
      name: plan.name,
      plan_type: planType,
      duration_days: plan.duration_days || 30,
      sessions: plan.sessions || 5,
      price: plan.price,
      is_active: plan.is_active
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingPlan(null)
    setFormData(defaultFormData)
  }

  const handleSave = async () => {
    if (!userId || !formData.name || formData.price < 0) return
    
    // Validate based on plan type
    if (formData.plan_type === 'subscription' && formData.duration_days <= 0) return
    if (formData.plan_type === 'package' && formData.sessions < 2) return

    setSaving(true)
    try {
      // Calculate duration_days and sessions based on plan_type
      let duration_days = formData.duration_days
      let sessions = 0
      
      if (formData.plan_type === 'single') {
        duration_days = 0
        sessions = 1
      } else if (formData.plan_type === 'package') {
        duration_days = 0
        sessions = formData.sessions
      } else {
        // subscription - time based
        sessions = 0
      }

      const planData = {
        name: formData.name,
        plan_type: formData.plan_type,
        duration_days,
        sessions,
        price: formData.price,
        is_active: formData.is_active
      }

      if (editingPlan) {
        await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', editingPlan.id)
      } else {
        await supabase
          .from('subscription_plans')
          .insert({
            ...planData,
            business_id: userId,
          })
      }

      closeModal()
      fetchPlans()
    } catch (error) {
      console.error('Error saving plan:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (planId: string) => {
    try {
      await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId)

      setDeleteConfirm(null)
      fetchPlans()
    } catch (error) {
      console.error('Error deleting plan:', error)
    }
  }

  const togglePlanStatus = async (plan: SubscriptionPlan) => {
    try {
      await supabase
        .from('subscription_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id)

      fetchPlans()
    } catch (error) {
      console.error('Error toggling plan status:', error)
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
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">خطط الاشتراك</h1>
                <p className="text-sm text-gray-500">إدارة خطط الاشتراك الخاصة بك</p>
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              خطة جديدة
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-4xl mx-auto">
        {plans.length === 0 ? (
          <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-primary-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد خطط اشتراك</h3>
            <p className="text-gray-500 mb-6">ابدأ بإنشاء أول خطة اشتراك لعملائك</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              إنشاء خطة اشتراك
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`bg-white rounded-xl border shadow-sm p-6 ${!plan.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {plan.is_active ? 'نشط' : 'معطل'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm mt-2">
                      {/* Plan Type Badge */}
                      {(() => {
                        const planType = plan.plan_type || (plan.duration_days === 0 ? (plan.sessions === 1 ? 'single' : 'package') : 'subscription')
                        if (planType === 'single') {
                          return (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full">
                              <Zap className="w-3.5 h-3.5" />
                              <span className="font-medium">حصة واحدة</span>
                            </div>
                          )
                        } else if (planType === 'package') {
                          return (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full">
                              <Package className="w-3.5 h-3.5" />
                              <span className="font-medium">{plan.sessions} حصص</span>
                            </div>
                          )
                        } else {
                          return (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="font-medium">{plan.duration_days === -1 ? 'غير محدود' : plan.duration_days >= 1 ? `${Math.floor(plan.duration_days)} يوم${plan.duration_days % 1 > 0 ? ` و ${Math.round((plan.duration_days % 1) * 1440)} د` : ''}` : `${Math.round(plan.duration_days * 1440)} دقيقة`}</span>
                            </div>
                          )
                        }
                      })()}
                      <div className="flex items-center gap-2 text-primary-600 font-bold">
                        <DollarSign className="w-4 h-4" />
                        <span>{plan.price.toFixed(3)} DT</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePlanStatus(plan)}
                      className={`p-2 rounded-lg transition-colors ${
                        plan.is_active 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={plan.is_active ? 'إيقاف' : 'تفعيل'}
                    >
                      {plan.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                    <button
                      onClick={() => openEditModal(plan)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title="تعديل"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(plan.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {deleteConfirm === plan.id && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm mb-3">هل أنت متأكد من حذف هذه الخطة؟ لا يمكن التراجع عن هذا الإجراء.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(plan.id)}
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
                  {editingPlan ? 'تعديل الخطة' : 'خطة جديدة'}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Plan Type Selection - Visual Cards */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  نوع الخطة *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Subscription */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, plan_type: 'subscription', duration_days: 30 })}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      formData.plan_type === 'subscription'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Calendar className={`w-8 h-8 mx-auto mb-2 ${formData.plan_type === 'subscription' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className={`font-bold text-sm ${formData.plan_type === 'subscription' ? 'text-blue-700' : 'text-gray-700'}`}>اشتراك</div>
                    <div className="text-xs text-gray-500 mt-1">بالأيام</div>
                  </button>
                  
                  {/* Package */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, plan_type: 'package', sessions: 5 })}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      formData.plan_type === 'package'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Package className={`w-8 h-8 mx-auto mb-2 ${formData.plan_type === 'package' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <div className={`font-bold text-sm ${formData.plan_type === 'package' ? 'text-purple-700' : 'text-gray-700'}`}>باقة حصص</div>
                    <div className="text-xs text-gray-500 mt-1">عدة حصص</div>
                  </button>
                  
                  {/* Single Session */}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, plan_type: 'single' })}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      formData.plan_type === 'single'
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Zap className={`w-8 h-8 mx-auto mb-2 ${formData.plan_type === 'single' ? 'text-orange-600' : 'text-gray-400'}`} />
                    <div className={`font-bold text-sm ${formData.plan_type === 'single' ? 'text-orange-700' : 'text-gray-700'}`}>حصة واحدة</div>
                    <div className="text-xs text-gray-500 mt-1">مرة واحدة</div>
                  </button>
                </div>
              </div>

              {/* Plan Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم الخطة *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={formData.plan_type === 'single' ? 'مثال: حصة تجريبية' : formData.plan_type === 'package' ? 'مثال: باقة 10 حصص' : 'مثال: اشتراك شهري'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Duration - Only for subscription type */}
              {formData.plan_type === 'subscription' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    المدة *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">أيام</label>
                      <input
                        type="number"
                        value={Math.floor(formData.duration_days)}
                        onChange={(e) => {
                          const days = parseInt(e.target.value) || 0
                          const mins = Math.round((formData.duration_days % 1) * 1440)
                          setFormData({ ...formData, duration_days: days + mins / 1440 })
                        }}
                        onFocus={(e) => e.target.select()}
                        min="0"
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">دقائق</label>
                      <input
                        type="number"
                        value={Math.round((formData.duration_days % 1) * 1440)}
                        onChange={(e) => {
                          const mins = parseInt(e.target.value) || 0
                          const days = Math.floor(formData.duration_days)
                          setFormData({ ...formData, duration_days: days + mins / 1440 })
                        }}
                        onFocus={(e) => e.target.select()}
                        min="0"
                        max="1440"
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, duration_days: 1/1440 })}
                      className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                        formData.duration_days < 0.01
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      1 دقيقة ⚡
                    </button>
                    {[7, 30, 90, 365].map(days => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setFormData({ ...formData, duration_days: days })}
                        className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                          formData.duration_days === days
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {days === 7 ? 'أسبوع' : days === 30 ? 'شهر' : days === 90 ? '3 شهور' : 'سنة'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sessions - Only for package type */}
              {formData.plan_type === 'package' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    عدد الحصص *
                  </label>
                  <input
                    type="number"
                    value={formData.sessions}
                    onChange={(e) => setFormData({ ...formData, sessions: parseInt(e.target.value) || 2 })}
                    onFocus={(e) => e.target.select()}
                    min="2"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <div className="mt-2 flex gap-2">
                    {[5, 10, 20, 30].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setFormData({ ...formData, sessions: num })}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                          formData.sessions === num
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {num} حصص
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Single Session Info */}
              {formData.plan_type === 'single' && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                  <div className="flex items-center gap-2 text-orange-700 mb-1">
                    <Zap className="w-5 h-5" />
                    <span className="font-medium">حصة واحدة فقط</span>
                  </div>
                  <p className="text-sm text-orange-600">
                    هذه الخطة تمنح العميل حصة واحدة فقط. مثالية للتجربة أو الزيارة المؤقتة.
                  </p>
                </div>
              )}

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  السعر (DT) *
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

              {/* Active Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="font-medium text-gray-900">تفعيل الخطة</div>
                  <div className="text-sm text-gray-500">الخطط المفعلة تظهر في نقطة البيع</div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    formData.is_active ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                    formData.is_active ? 'right-0.5' : 'right-6'
                  }`} />
                </button>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !formData.name || (formData.plan_type === 'subscription' && formData.duration_days <= 0) || (formData.plan_type === 'package' && formData.sessions < 2)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors"
              >
                {saving ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {editingPlan ? 'حفظ التعديلات' : 'إنشاء الخطة'}
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

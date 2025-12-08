'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Member, SubscriptionPlan, SubscriptionHistory, Service } from '@/types/database'
import { X, Phone, Calendar, Package, Zap, User, Play, History, CheckCircle, Plus, RefreshCw, ArrowLeftRight, Sparkles, Snowflake, XCircle } from 'lucide-react'

const planTypeConfig = {
  subscription: { label: 'اشتراك', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
  package: { label: 'باقة حصص', icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
  single: { label: 'حصة واحدة', icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50' }
}

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
  const pt = getPlanType(member)
  if (pt === 'single') return member.sessions_used >= 1 ? 'single_used' : 'single_available'
  if (pt === 'package') return (member.sessions_total - member.sessions_used) <= 0 ? 'expired' : 'active'
  if (!member.expires_at) return 'active'
  const days = Math.ceil((new Date(member.expires_at).getTime() - Date.now()) / 86400000)
  if (days <= 0) return 'expired'
  if (days <= 7) return 'expiring_soon'
  return 'active'
}

function formatDate(d: string | null) { return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-' }
function getDaysLeft(d: string | null) { return d ? Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)) : 0 }

interface Props {
  member: Member
  plans: SubscriptionPlan[]
  services: Service[]
  onClose: () => void
  onUpdate: () => void
}

export default function CustomerModal({ member, plans, services, onClose, onUpdate }: Props) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'info' | 'actions' | 'history'>('info')
  const [history, setHistory] = useState<SubscriptionHistory[]>([])
  const [processing, setProcessing] = useState(false)
  const [showChangePlan, setShowChangePlan] = useState(false)
  const [showAddService, setShowAddService] = useState(false)
  const [showFreeze, setShowFreeze] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')
  const [freezeReason, setFreezeReason] = useState('')
  const [currentMember, setCurrentMember] = useState(member)

  const planType = getPlanType(currentMember)
  const status = getMemberStatus(currentMember)
  const pCfg = planType ? planTypeConfig[planType] : null
  const Icon = pCfg?.icon || User

  useEffect(() => {
    supabase.from('subscription_history').select('*').eq('member_id', member.id).order('created_at', { ascending: false }).limit(50).then(({ data }) => { if (data) setHistory(data) })
  }, [member.id, supabase])

  const refreshMember = async () => {
    const { data } = await supabase.from('members').select('*').eq('id', member.id).single()
    if (data) setCurrentMember(data)
    const { data: h } = await supabase.from('subscription_history').select('*').eq('member_id', member.id).order('created_at', { ascending: false }).limit(50)
    if (h) setHistory(h)
    onUpdate()
  }

  const useSession = async () => {
    setProcessing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    // Get the plan price to calculate per-session value
    let sessionPrice = 0
    if (currentMember.plan_id) {
      const currentPlan = plans.find(p => p.id === currentMember.plan_id)
      if (currentPlan && currentPlan.sessions > 0) {
        sessionPrice = currentPlan.price / currentPlan.sessions
      }
    }
    
    await supabase.from('members').update({ sessions_used: currentMember.sessions_used + 1 }).eq('id', currentMember.id)
    await supabase.from('subscription_history').insert({ 
      business_id: user.id, 
      member_id: currentMember.id, 
      plan_id: currentMember.plan_id,
      plan_name: currentMember.plan_name, 
      type: 'session_use', 
      amount: sessionPrice,
      sessions_before: currentMember.sessions_used, 
      sessions_after: currentMember.sessions_used + 1 
    })
    await refreshMember()
    setProcessing(false)
  }

  const addSession = async (count = 1) => {
    setProcessing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('members').update({ sessions_total: currentMember.sessions_total + count }).eq('id', currentMember.id)
    await supabase.from('subscription_history').insert({ business_id: user.id, member_id: currentMember.id, plan_name: currentMember.plan_name, type: 'session_add', sessions_added: count, sessions_before: currentMember.sessions_total, sessions_after: currentMember.sessions_total + count })
    await refreshMember()
    setProcessing(false)
  }

  const changePlan = async (paymentMethod: 'cash' | 'debt') => {
    if (!selectedPlan) return
    setProcessing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const plan = plans.find(p => p.id === selectedPlan)
    if (!plan) return
    const pt = plan.plan_type || (plan.duration_days === 0 ? (plan.sessions === 1 ? 'single' : 'package') : 'subscription')
    const expiresAt = plan.duration_days > 0 ? new Date(Date.now() + plan.duration_days * 86400000).toISOString() : null
    const sessionsTotal = plan.duration_days > 0 ? 0 : plan.sessions || 1

    await supabase.from('members').update({
      plan_id: plan.id, plan_name: plan.name, plan_type: pt, plan_start_at: new Date().toISOString(),
      expires_at: expiresAt, sessions_total: sessionsTotal, sessions_used: 0,
      debt: paymentMethod === 'debt' ? (currentMember.debt || 0) + plan.price : currentMember.debt
    }).eq('id', currentMember.id)

    await supabase.from('subscription_history').insert({
      business_id: user.id, member_id: currentMember.id, plan_id: plan.id, plan_name: plan.name, type: 'plan_change',
      old_plan_id: currentMember.plan_id, old_plan_name: currentMember.plan_name, new_plan_id: plan.id, new_plan_name: plan.name,
      amount: plan.price, payment_method: paymentMethod
    })

    await supabase.from('transactions').insert({ business_id: user.id, member_id: currentMember.id, type: 'subscription', payment_method: paymentMethod, amount: plan.price, notes: `${currentMember.plan_name || 'جديد'} → ${plan.name}` })

    setShowChangePlan(false)
    setSelectedPlan('')
    await refreshMember()
    setProcessing(false)
  }

  const addService = async (serviceId: string) => {
    setProcessing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const service = services.find(s => s.id === serviceId)
    if (!service) return
    await supabase.from('subscription_history').insert({ business_id: user.id, member_id: currentMember.id, plan_name: service.name, type: 'service', amount: service.price, payment_method: 'cash', notes: `خدمة: ${service.name}` })
    await supabase.from('transactions').insert({ business_id: user.id, member_id: currentMember.id, type: 'service', payment_method: 'cash', amount: service.price, notes: service.name })
    setShowAddService(false)
    await refreshMember()
    setProcessing(false)
  }

  const freeze = async () => {
    setProcessing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('members').update({ is_frozen: true, frozen_at: new Date().toISOString() }).eq('id', currentMember.id)
    await supabase.from('subscription_history').insert({ business_id: user.id, member_id: currentMember.id, plan_name: currentMember.plan_name, type: 'freeze', notes: freezeReason || 'تجميد' })
    setShowFreeze(false)
    setFreezeReason('')
    await refreshMember()
    setProcessing(false)
  }

  const unfreeze = async () => {
    setProcessing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    let newExpiry = currentMember.expires_at
    if (currentMember.frozen_at && currentMember.expires_at) {
      const frozenDays = Math.ceil((Date.now() - new Date(currentMember.frozen_at).getTime()) / 86400000)
      newExpiry = new Date(new Date(currentMember.expires_at).getTime() + frozenDays * 86400000).toISOString()
    }
    await supabase.from('members').update({ is_frozen: false, frozen_at: null, expires_at: newExpiry }).eq('id', currentMember.id)
    await supabase.from('subscription_history').insert({ business_id: user.id, member_id: currentMember.id, plan_name: currentMember.plan_name, type: 'unfreeze', notes: 'إلغاء التجميد' })
    await refreshMember()
    setProcessing(false)
  }

  const cancelSubscription = async () => {
    if (!confirm('هل أنت متأكد من إلغاء الاشتراك؟')) return
    setProcessing(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('members').update({ plan_id: null, plan_name: null, plan_type: null, expires_at: null, sessions_total: 0, sessions_used: 0 }).eq('id', currentMember.id)
    await supabase.from('subscription_history').insert({ business_id: user.id, member_id: currentMember.id, plan_name: currentMember.plan_name, type: 'cancellation', notes: 'إلغاء الاشتراك' })
    await refreshMember()
    setProcessing(false)
    onClose()
  }

  const needsRenew = status === 'expired' || status === 'single_used'
  const canUseSession = (planType === 'single' && status === 'single_available') || (planType === 'package' && (currentMember.sessions_total - currentMember.sessions_used) > 0)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${pCfg?.bg || 'bg-gray-100'}`}>
              <Icon className={`w-6 h-6 ${pCfg?.color || 'text-gray-500'}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold">{currentMember.name}</h2>
              <div className="text-sm text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /><span dir="ltr">{currentMember.phone}</span></div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {/* Status */}
        <div className={`px-4 py-2 text-center font-medium ${status === 'active' ? 'bg-green-100 text-green-700' : status === 'expiring_soon' ? 'bg-yellow-100 text-yellow-700' : status === 'expired' ? 'bg-red-100 text-red-700' : status === 'frozen' ? 'bg-blue-100 text-blue-700' : status === 'single_available' ? 'bg-orange-100 text-orange-700' : status === 'single_used' ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-500'}`}>
          {status === 'active' ? 'نشط' : status === 'expiring_soon' ? 'ينتهي قريباً' : status === 'expired' ? 'منتهي' : status === 'frozen' ? '❄️ مجمد' : status === 'single_available' ? '⚡ حصة واحدة - متاحة' : status === 'single_used' ? '⚡ تم استخدامها' : 'بدون خطة'}
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[{ k: 'info', l: 'المعلومات', i: User }, { k: 'actions', l: 'الإجراءات', i: Play }, { k: 'history', l: 'السجل', i: History }].map(t => (
            <button key={t.k} onClick={() => setActiveTab(t.k as any)} className={`flex-1 flex items-center justify-center gap-2 py-3 font-medium ${activeTab === t.k ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}>
              <t.i className="w-4 h-4" />{t.l}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'info' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl"><div className="text-xs text-gray-500">نوع الخطة</div><div className={`font-bold ${pCfg?.color || 'text-gray-600'}`}>{pCfg?.label || 'بدون'}</div></div>
                <div className="p-3 bg-gray-50 rounded-xl"><div className="text-xs text-gray-500">اسم الخطة</div><div className="font-bold">{currentMember.plan_name || '-'}</div></div>
                <div className="p-3 bg-gray-50 rounded-xl"><div className="text-xs text-gray-500">تاريخ البدء</div><div className="font-bold">{formatDate(currentMember.plan_start_at)}</div></div>
                {planType === 'subscription' && (
                  currentMember.expires_at ? (
                    <>
                      <div className="p-3 bg-gray-50 rounded-xl"><div className="text-xs text-gray-500">تاريخ الانتهاء</div><div className="font-bold">{formatDate(currentMember.expires_at)}</div></div>
                      <div className={`p-3 rounded-xl col-span-2 ${getDaysLeft(currentMember.expires_at) <= 7 ? 'bg-yellow-50' : 'bg-blue-50'}`}>
                        <div className={`text-xs ${getDaysLeft(currentMember.expires_at) <= 7 ? 'text-yellow-600' : 'text-blue-600'}`}>الأيام المتبقية</div>
                        <div className={`text-2xl font-bold ${getDaysLeft(currentMember.expires_at) <= 7 ? 'text-yellow-600' : 'text-blue-600'}`}>
                          {getDaysLeft(currentMember.expires_at) <= 0 ? '⚠️ منتهي' : `${getDaysLeft(currentMember.expires_at)} يوم`}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-green-50 rounded-xl col-span-2">
                      <div className="text-xs text-green-600">نوع الاشتراك</div>
                      <div className="text-2xl font-bold text-green-600">∞ غير محدود</div>
                    </div>
                  )
                )}
                {planType === 'package' && <div className="p-3 bg-purple-50 rounded-xl col-span-2"><div className="text-xs text-purple-600">الحصص المتبقية</div><div className="text-2xl font-bold text-purple-600">{currentMember.sessions_total - currentMember.sessions_used} / {currentMember.sessions_total}</div></div>}
                {planType === 'single' && <div className={`p-3 rounded-xl col-span-2 ${currentMember.sessions_used >= 1 ? 'bg-gray-100' : 'bg-orange-50'}`}><div className={`text-xs ${currentMember.sessions_used >= 1 ? 'text-gray-500' : 'text-orange-600'}`}>حالة الحصة</div><div className={`text-xl font-bold ${currentMember.sessions_used >= 1 ? 'text-gray-600' : 'text-orange-600'}`}>{currentMember.sessions_used >= 1 ? '⚡ تم استخدامها' : '⚡ متاحة'}</div></div>}
              </div>
              {currentMember.debt > 0 && <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex justify-between"><span className="text-red-700">الدين</span><span className="font-bold text-red-600">{currentMember.debt.toFixed(3)} DT</span></div>}
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-3">
              {canUseSession && <button onClick={useSession} disabled={processing} className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5" />استخدام حصة</button>}
              {(planType === 'single' || planType === 'package') && <button onClick={() => addSession(1)} disabled={processing} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Plus className="w-5 h-5" />إضافة حصة واحدة</button>}
              {needsRenew && <button onClick={() => setShowChangePlan(true)} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"><RefreshCw className="w-5 h-5" />تجديد الاشتراك</button>}
              <button onClick={() => setShowChangePlan(true)} className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"><ArrowLeftRight className="w-5 h-5" />تغيير الخطة</button>
              <button onClick={() => setShowAddService(true)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Sparkles className="w-5 h-5" />إضافة خدمة</button>
              {planType === 'subscription' && (currentMember.is_frozen ? <button onClick={unfreeze} disabled={processing} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Play className="w-5 h-5" />إلغاء التجميد</button> : <button onClick={() => setShowFreeze(true)} className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Snowflake className="w-5 h-5" />تجميد الاشتراك</button>)}
              {planType && status !== 'expired' && status !== 'single_used' && <button onClick={cancelSubscription} disabled={processing} className="w-full py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold flex items-center justify-center gap-2"><XCircle className="w-5 h-5" />إلغاء الاشتراك</button>}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2">
              {history.length === 0 ? <div className="text-center py-8 text-gray-400">لا يوجد سجل</div> : history.map(h => {
                // Determine the label based on type and context
                const getLabel = () => {
                  if (h.type === 'subscription') {
                    // Check if single session purchase
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
                const cfg = getLabel()
                
                // Get display name - prefer new_plan_name for changes, otherwise plan_name
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
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t"><button onClick={onClose} className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold">إغلاق</button></div>
      </div>

      {/* Change Plan Sub-Modal */}
      {showChangePlan && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between"><h3 className="text-lg font-bold">تغيير الخطة</h3><button onClick={() => setShowChangePlan(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {['single', 'package', 'subscription'].map(type => {
                const tPlans = plans.filter(p => (p.plan_type || (p.duration_days === 0 ? (p.sessions === 1 ? 'single' : 'package') : 'subscription')) === type)
                if (!tPlans.length) return null
                const cfg = planTypeConfig[type as keyof typeof planTypeConfig]
                return (
                  <div key={type} className={`p-4 rounded-xl ${cfg.bg}`}>
                    <div className="flex items-center gap-2 mb-3"><cfg.icon className={`w-5 h-5 ${cfg.color}`} /><span className={`font-bold ${cfg.color}`}>{cfg.label}</span></div>
                    <div className="space-y-2">{tPlans.map(p => (
                      <label key={p.id} className={`flex justify-between p-3 bg-white rounded-xl cursor-pointer border-2 ${selectedPlan === p.id ? 'border-primary-500' : 'border-transparent'}`}>
                        <div className="flex items-center gap-2"><input type="radio" checked={selectedPlan === p.id} onChange={() => setSelectedPlan(p.id)} className="w-4 h-4" /><div><div className="font-medium">{p.name}</div><div className="text-xs text-gray-500">{p.duration_days > 0 ? (p.duration_days >= 1 ? `${Math.floor(p.duration_days)} يوم${p.duration_days % 1 > 0 ? ` و ${Math.round((p.duration_days % 1) * 1440)} دقيقة` : ''}` : `${Math.round(p.duration_days * 1440)} دقيقة`) : `${p.sessions} حصة`}</div></div></div>
                        <span className="font-bold">{p.price.toFixed(3)} DT</span>
                      </label>
                    ))}</div>
                  </div>
                )
              })}
            </div>
            <div className="p-4 border-t flex gap-3">
              <button onClick={() => changePlan('cash')} disabled={!selectedPlan || processing} className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl font-bold">نقداً</button>
              <button onClick={() => changePlan('debt')} disabled={!selectedPlan || processing} className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-xl font-bold">دين</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Service Sub-Modal */}
      {showAddService && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between"><h3 className="text-lg font-bold">إضافة خدمة</h3><button onClick={() => setShowAddService(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="p-4 space-y-2 max-h-80 overflow-auto">
              {services.length === 0 ? <div className="text-center py-8 text-gray-400">لا توجد خدمات</div> : services.map(s => (
                <button key={s.id} onClick={() => addService(s.id)} disabled={processing} className="w-full flex justify-between p-4 bg-gray-50 hover:bg-indigo-50 rounded-xl">
                  <div className="flex items-center gap-3"><Sparkles className="w-5 h-5 text-indigo-500" /><span className="font-medium">{s.name}</span></div>
                  <span className="font-bold text-indigo-600">{s.price.toFixed(3)} DT</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Freeze Sub-Modal */}
      {showFreeze && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b flex justify-between"><h3 className="text-lg font-bold">تجميد الاشتراك</h3><button onClick={() => setShowFreeze(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button></div>
            <div className="p-4"><label className="block text-sm font-medium text-gray-700 mb-2">السبب (اختياري)</label><textarea value={freezeReason} onChange={e => setFreezeReason(e.target.value)} placeholder="سفر، مرض..." className="w-full px-4 py-3 border rounded-xl resize-none" rows={3} /></div>
            <div className="p-4 border-t flex gap-3">
              <button onClick={freeze} disabled={processing} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"><Snowflake className="w-5 h-5 inline ml-2" />تجميد</button>
              <button onClick={() => setShowFreeze(false)} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

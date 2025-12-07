'use client'

import { useState } from 'react'
import { X, User, Phone, Mail, FileText, Zap, Package, Calendar } from 'lucide-react'
import { SubscriptionPlan } from '@/types/database'

const planTypeConfig = {
  subscription: { label: 'اشتراك', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
  package: { label: 'باقة حصص', icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
  single: { label: 'حصة واحدة', icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50' }
}

function getPlanType(plan: SubscriptionPlan) {
  if (plan.plan_type) return plan.plan_type
  if (plan.duration_days === 0 && plan.sessions === 1) return 'single'
  if (plan.duration_days === 0 && plan.sessions > 1) return 'package'
  return 'subscription'
}

interface Props {
  plans: SubscriptionPlan[]
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { name: string; phone: string; email?: string; plan_id?: string; notes?: string; paymentMethod: 'cash' | 'debt' }) => void
}

export default function NewMemberModal({ plans, isOpen, onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [planId, setPlanId] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!isOpen) return null

  const selectedPlan = plans.find(p => p.id === planId)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'الاسم مطلوب'
    if (!phone.trim()) errs.phone = 'رقم الهاتف مطلوب'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const submit = (method: 'cash' | 'debt') => {
    if (!validate()) return
    onSubmit({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined, plan_id: planId || undefined, notes: notes.trim() || undefined, paymentMethod: method })
    setName(''); setPhone(''); setEmail(''); setPlanId(''); setNotes(''); setErrors({})
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[500px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col max-h-[90vh]" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2"><User className="w-5 h-5" />عميل جديد</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><User className="w-4 h-4 inline ml-1" />الاسم *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="اسم العميل" className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`} />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><Phone className="w-4 h-4 inline ml-1" />الهاتف *</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="55123456" dir="ltr" className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`} />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><Mail className="w-4 h-4 inline ml-1" />البريد (اختياري)</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" dir="ltr" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500" />
          </div>

          {/* Plan Selection - Optional */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الخطة (اختياري - يمكن الإضافة لاحقاً)</label>
            <div className="space-y-2 max-h-48 overflow-auto">
              {/* No Plan */}
              <label className={`flex items-center p-3 rounded-xl border-2 cursor-pointer ${!planId ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="plan" checked={!planId} onChange={() => setPlanId('')} className="w-4 h-4 ml-2" />
                <span className="text-gray-600">بدون خطة (جهة اتصال فقط)</span>
              </label>

              {/* Plans grouped by type */}
              {plans.filter(p => p.is_active).map(plan => {
                const type = getPlanType(plan)
                const cfg = planTypeConfig[type]
                return (
                  <label key={plan.id} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer ${planId === plan.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="plan" checked={planId === plan.id} onChange={() => setPlanId(plan.id)} className="w-4 h-4" />
                      <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                      <div>
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-xs text-gray-500">{cfg.label} - {plan.duration_days > 0 ? `${plan.duration_days} يوم` : `${plan.sessions} حصة`}</div>
                      </div>
                    </div>
                    <span className="font-bold text-primary-600">{plan.price.toFixed(3)} DT</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1"><FileText className="w-4 h-4 inline ml-1" />ملاحظات (اختياري)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="أي ملاحظات..." rows={2} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          {selectedPlan && (
            <div className="flex justify-between mb-3 p-3 bg-white rounded-xl border">
              <span className="text-gray-600">المبلغ:</span>
              <span className="text-xl font-bold text-primary-600">{selectedPlan.price.toFixed(3)} DT</span>
            </div>
          )}
          
          {planId ? (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => submit('cash')} className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold">تسجيل + نقداً</button>
              <button onClick={() => submit('debt')} className="py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold">تسجيل + دين</button>
            </div>
          ) : (
            <button onClick={() => submit('cash')} className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold">تسجيل العميل</button>
          )}
        </div>
      </div>
    </>
  )
}

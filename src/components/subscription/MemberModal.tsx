'use client'

import { useState } from 'react'
import { X, RefreshCw, Snowflake, History, Phone, Zap, Package, Clock, Play, ArrowLeftRight, CreditCard, AlertCircle } from 'lucide-react'
import { Member, SubscriptionPlan, Transaction, PlanType } from '@/types/database'
import { getMemberPlanType, getMemberStatus, getSessionsRemaining, isSingleSessionUsed } from '@/lib/utils/member'

// Helper to determine plan type from plan data
function getPlanType(plan: SubscriptionPlan): PlanType {
  if (plan.plan_type) return plan.plan_type
  if (plan.duration_days === 0 && plan.sessions === 1) return 'single'
  if (plan.duration_days === 0 && plan.sessions > 1) return 'package'
  return 'subscription'
}

interface MemberModalProps {
  member: Member
  plans: SubscriptionPlan[]
  transactions: Transaction[]
  isOpen: boolean
  onClose: () => void
  onRenew: (planId: string, paymentMethod: 'cash' | 'debt') => void
  onFreeze: (member: Member, reason: string) => void
  onUnfreeze: (member: Member) => void
  onPayDebt: (amount: number) => void
}

export default function MemberModal({
  member,
  plans,
  transactions,
  isOpen,
  onClose,
  onRenew,
  onFreeze,
  onUnfreeze,
  onPayDebt
}: MemberModalProps) {
  const [activeTab, setActiveTab] = useState<'renew' | 'change' | 'history'>('renew')
  const [selectedPlan, setSelectedPlan] = useState<string>(member.plan_id || '')
  const [debtAmount, setDebtAmount] = useState(member.debt.toString())
  const [freezeDays, setFreezeDays] = useState(7)
  
  const planType = getMemberPlanType(member)
  const status = getMemberStatus(member)
  const isFrozen = status === 'frozen'

  if (!isOpen) return null

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-TN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-TN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'subscription': return 'اشتراك'
      case 'retail': return 'مشتريات'
      case 'service': return 'خدمة'
      case 'debt_payment': return 'سداد دين'
      default: return type
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[600px] sm:max-h-[80vh] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">
              {member.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{member.name}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Phone className="w-3.5 h-3.5" />
                <span dir="ltr">{member.phone}</span>
                <span className="text-gray-300">|</span>
                <span>{member.member_code}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Status Banner - Clean & Simple */}
        <div className="px-4 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Plan Type Icon */}
              {planType === 'single' && <Zap className="w-5 h-5 text-orange-500" />}
              {planType === 'package' && <Package className="w-5 h-5 text-purple-500" />}
              {planType === 'subscription' && <Clock className="w-5 h-5 text-blue-500" />}
              
              <div>
                <div className="font-medium text-gray-900">{member.plan_name}</div>
                <div className="text-sm text-gray-500">
                  {planType === 'single' && (isSingleSessionUsed(member) ? 'مستخدمة' : 'متاحة')}
                  {planType === 'package' && `${getSessionsRemaining(member)} حصة متبقية`}
                  {planType === 'subscription' && member.expires_at && `ينتهي: ${formatDate(member.expires_at)}`}
                </div>
              </div>
            </div>
            
            {/* Status Badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              isFrozen ? 'bg-blue-100 text-blue-700' :
              status === 'expired' ? 'bg-red-100 text-red-700' :
              status === 'expiring_soon' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {isFrozen ? '❄️ مجمد' : 
               status === 'expired' ? 'منتهي' : 
               status === 'expiring_soon' ? 'ينتهي قريباً' : 'نشط'}
            </span>
          </div>
        </div>

        {/* Simple Tabs - Only 3: Renew, Change Plan, History */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('renew')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'renew' 
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            تجديد
          </button>
          <button
            onClick={() => setActiveTab('change')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'change' 
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            تغيير الخطة
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'history' 
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-4 h-4" />
            السجل
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'renew' && (
            <div className="space-y-4">
              {/* Quick Renew */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  تجديد سريع - {member.plan_name}
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => onRenew(member.plan_id || '', 'cash')}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
                  >
                    تجديد نقداً
                  </button>
                  <button
                    onClick={() => onRenew(member.plan_id || '', 'debt')}
                    className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors"
                  >
                    تجديد + دين
                  </button>
                </div>
              </div>

              {/* Change Plan - Grouped by Type */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <h3 className="font-bold text-gray-800 mb-3">تغيير الخطة / شراء جديد</h3>
                
                {(() => {
                  const activePlans = plans.filter(p => p.is_active)
                  const subscriptions = activePlans.filter(p => getPlanType(p) === 'subscription')
                  const packages = activePlans.filter(p => getPlanType(p) === 'package')
                  const singles = activePlans.filter(p => getPlanType(p) === 'single')
                  
                  return (
                    <div className="space-y-4 mb-4 max-h-64 overflow-y-auto">
                      {/* Single Sessions */}
                      {singles.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Zap className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-bold text-orange-700">حصة واحدة</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {singles.map(plan => (
                              <label 
                                key={plan.id}
                                className={`flex flex-col items-center p-2 rounded-lg border-2 cursor-pointer transition-all text-center ${
                                  selectedPlan === plan.id 
                                    ? 'border-orange-500 bg-orange-50' 
                                    : 'border-gray-200 hover:border-orange-300'
                                }`}
                              >
                                <input type="radio" name="plan" value={plan.id} checked={selectedPlan === plan.id} onChange={(e) => setSelectedPlan(e.target.value)} className="sr-only" />
                                <div className="font-medium text-sm">{plan.name}</div>
                                <div className="font-bold text-orange-600">{plan.price.toFixed(3)} DT</div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Package Sessions */}
                      {packages.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-4 h-4 text-purple-500" />
                            <span className="text-xs font-bold text-purple-700">باقات حصص</span>
                          </div>
                          <div className="space-y-1">
                            {packages.map(plan => (
                              <label 
                                key={plan.id}
                                className={`flex items-center justify-between p-2 rounded-lg border-2 cursor-pointer transition-all ${
                                  selectedPlan === plan.id 
                                    ? 'border-purple-500 bg-purple-50' 
                                    : 'border-gray-200 hover:border-purple-300'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input type="radio" name="plan" value={plan.id} checked={selectedPlan === plan.id} onChange={(e) => setSelectedPlan(e.target.value)} className="w-3 h-3 text-purple-600" />
                                  <div>
                                    <div className="font-medium text-sm">{plan.name}</div>
                                    <div className="text-xs text-purple-600">{plan.sessions} حصص</div>
                                  </div>
                                </div>
                                <div className="font-bold text-purple-600 text-sm">{plan.price.toFixed(3)} DT</div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Time-based Subscriptions */}
                      {subscriptions.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-bold text-blue-700">اشتراكات</span>
                          </div>
                          <div className="space-y-1">
                            {subscriptions.map(plan => (
                              <label 
                                key={plan.id}
                                className={`flex items-center justify-between p-2 rounded-lg border-2 cursor-pointer transition-all ${
                                  selectedPlan === plan.id 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-gray-200 hover:border-blue-300'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input type="radio" name="plan" value={plan.id} checked={selectedPlan === plan.id} onChange={(e) => setSelectedPlan(e.target.value)} className="w-3 h-3 text-blue-600" />
                                  <div>
                                    <div className="font-medium text-sm">{plan.name}</div>
                                    <div className="text-xs text-blue-600">
                                      {plan.duration_days === -1 ? 'غير محدود' : `${plan.duration_days} يوم`}
                                    </div>
                                  </div>
                                </div>
                                <div className="font-bold text-blue-600 text-sm">{plan.price.toFixed(3)} DT</div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}
                
                <div className="flex gap-3">
                  <button
                    onClick={() => onRenew(selectedPlan, 'cash')}
                    disabled={!selectedPlan}
                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    تجديد نقداً
                  </button>
                  <button
                    onClick={() => onRenew(selectedPlan, 'debt')}
                    disabled={!selectedPlan}
                    className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                  >
                    إضافة للدين
                  </button>
                </div>
              </div>

              {/* Pay Debt */}
              {member.debt > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    سداد الدين ({member.debt.toFixed(3)} DT)
                  </h3>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={debtAmount}
                      onChange={(e) => setDebtAmount(e.target.value)}
                      step="0.001"
                      min="0"
                      max={member.debt}
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={() => onPayDebt(parseFloat(debtAmount) || 0)}
                      className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                    >
                      سداد
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'change' && (
            <div className="space-y-4">
              {/* Plan Selection - Grouped by Type */}
              {(() => {
                const activePlans = plans.filter(p => p.is_active)
                const subscriptions = activePlans.filter(p => getPlanType(p) === 'subscription')
                const packages = activePlans.filter(p => getPlanType(p) === 'package')
                const singles = activePlans.filter(p => getPlanType(p) === 'single')
                
                return (
                  <div className="space-y-4">
                    {/* Singles */}
                    {singles.length > 0 && (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="w-4 h-4 text-orange-500" />
                          <span className="font-bold text-orange-700">حصة واحدة</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {singles.map(plan => (
                            <label key={plan.id} className={`flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer ${selectedPlan === plan.id ? 'border-orange-500 bg-orange-100' : 'border-orange-200'}`}>
                              <input type="radio" name="changePlan" value={plan.id} checked={selectedPlan === plan.id} onChange={() => setSelectedPlan(plan.id)} className="sr-only" />
                              <span className="font-medium text-sm">{plan.name}</span>
                              <span className="font-bold text-orange-600">{plan.price.toFixed(3)} DT</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Packages */}
                    {packages.length > 0 && (
                      <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <Package className="w-4 h-4 text-purple-500" />
                          <span className="font-bold text-purple-700">باقات حصص</span>
                        </div>
                        <div className="space-y-2">
                          {packages.map(plan => (
                            <label key={plan.id} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer ${selectedPlan === plan.id ? 'border-purple-500 bg-purple-100' : 'border-purple-200'}`}>
                              <div className="flex items-center gap-2">
                                <input type="radio" name="changePlan" value={plan.id} checked={selectedPlan === plan.id} onChange={() => setSelectedPlan(plan.id)} className="w-4 h-4" />
                                <div>
                                  <div className="font-medium">{plan.name}</div>
                                  <div className="text-xs text-purple-600">{plan.sessions} حصص</div>
                                </div>
                              </div>
                              <span className="font-bold text-purple-600">{plan.price.toFixed(3)} DT</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Subscriptions */}
                    {subscriptions.length > 0 && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span className="font-bold text-blue-700">اشتراكات</span>
                        </div>
                        <div className="space-y-2">
                          {subscriptions.map(plan => (
                            <label key={plan.id} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer ${selectedPlan === plan.id ? 'border-blue-500 bg-blue-100' : 'border-blue-200'}`}>
                              <div className="flex items-center gap-2">
                                <input type="radio" name="changePlan" value={plan.id} checked={selectedPlan === plan.id} onChange={() => setSelectedPlan(plan.id)} className="w-4 h-4" />
                                <div>
                                  <div className="font-medium">{plan.name}</div>
                                  <div className="text-xs text-blue-600">{plan.duration_days} يوم</div>
                                </div>
                              </div>
                              <span className="font-bold text-blue-600">{plan.price.toFixed(3)} DT</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
              
              {/* Confirm Button */}
              <div className="flex gap-3">
                <button
                  onClick={() => onRenew(selectedPlan, 'cash')}
                  disabled={!selectedPlan}
                  className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-xl font-bold transition-colors"
                >
                  تأكيد نقداً
                </button>
                <button
                  onClick={() => onRenew(selectedPlan, 'debt')}
                  disabled={!selectedPlan}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-xl font-bold transition-colors"
                >
                  إضافة للدين
                </button>
              </div>
              
              {/* Freeze Section */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <Snowflake className="w-4 h-4" />
                  {isFrozen ? 'إلغاء التجميد' : 'تجميد العضوية'}
                </h4>
                {isFrozen ? (
                  <button
                    onClick={() => onUnfreeze(member)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
                  >
                    <Play className="w-4 h-4 inline ml-2" />
                    إلغاء التجميد
                  </button>
                ) : (
                  <button
                    onClick={() => onFreeze(member, `تجميد لمدة ${freezeDays} يوم`)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
                  >
                    <Snowflake className="w-4 h-4 inline ml-2" />
                    تجميد العضوية
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  لا توجد عمليات سابقة لهذا العضو
                </div>
              ) : (
                transactions.map(tx => (
                  <div 
                    key={tx.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {getTransactionTypeLabel(tx.type)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDateTime(tx.created_at)}
                      </div>
                    </div>
                    <div className={`font-bold ${
                      tx.type === 'debt_payment' ? 'text-green-600' : 'text-primary-600'
                    }`}>
                      {tx.type === 'debt_payment' ? '-' : '+'}{tx.amount.toFixed(3)} DT
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

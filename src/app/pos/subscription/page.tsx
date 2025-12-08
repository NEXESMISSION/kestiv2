'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Member, SubscriptionPlan, SubscriptionHistory, Service } from '@/types/database'
import { 
  Search, Users, Zap, Package, Calendar, Snowflake, X,
  Phone, RefreshCw, Plus, LayoutDashboard, UserPlus, LogOut,
  Clock, CheckCircle, XCircle, Play, History,
  ArrowLeftRight, Sparkles, User
} from 'lucide-react'
import PINModal from '@/components/shared/PINModal'
import CustomerModal from '@/components/subscription/CustomerModal'
import NewMemberModal from '@/components/subscription/NewMemberModal'

type FilterType = 'all' | 'active' | 'expiring' | 'expired' | 'single' | 'package' | 'frozen'

// Status config
const statusConfig = {
  active: { label: 'نشط', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  expiring_soon: { label: 'ينتهي قريباً', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  expired: { label: 'منتهي', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  frozen: { label: '❄️ مجمد', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  single_available: { label: '⚡ متاحة', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  single_used: { label: '⚡ تم استخدامها', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  no_plan: { label: 'بدون خطة', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' }
}

const planTypeConfig = {
  subscription: { label: 'اشتراك', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
  package: { label: 'باقة حصص', icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
  single: { label: 'حصة واحدة', icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50' }
}

// Utility functions
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
  const planType = getPlanType(member)
  // Single sessions are auto-used on purchase
  if (planType === 'single') return 'single_used'
  if (planType === 'package') return (member.sessions_total - member.sessions_used) <= 0 ? 'expired' : 'active'
  if (!member.expires_at) return 'active'
  const daysLeft = Math.ceil((new Date(member.expires_at).getTime() - Date.now()) / 86400000)
  if (daysLeft <= 0) return 'expired'
  if (daysLeft <= 7) return 'expiring_soon'
  return 'active'
}

function formatDate(date: string | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('ar-TN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function getDaysLeft(date: string | null): number {
  if (!date) return 0
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000))
}

export default function SubscriptionPOSPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [members, setMembers] = useState<Member[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [userPin, setUserPin] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [showPinModal, setShowPinModal] = useState(false)
  const [showNewMemberModal, setShowNewMemberModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    
    // Fetch all data in parallel for speed
    const [profileRes, m, p, s] = await Promise.all([
      supabase.from('profiles').select('pin_code').eq('id', user.id).single(),
      supabase.from('members').select('*').eq('business_id', user.id).order('name'),
      supabase.from('subscription_plans').select('*').eq('business_id', user.id).eq('is_active', true),
      supabase.from('services').select('*').eq('business_id', user.id).eq('is_active', true)
    ])
    
    if (profileRes.data) setUserPin(profileRes.data.pin_code)
    if (m.data) setMembers(m.data)
    if (p.data) setPlans(p.data)
    if (s.data) setServices(s.data)
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredMembers = members.filter(member => {
    const match = member.name.toLowerCase().includes(searchQuery.toLowerCase()) || member.phone.includes(searchQuery)
    if (!match) return false
    const status = getMemberStatus(member)
    const planType = getPlanType(member)
    if (filter === 'active') return status === 'active'
    if (filter === 'expiring') return status === 'expiring_soon'
    if (filter === 'expired') return status === 'expired'
    if (filter === 'frozen') return status === 'frozen'
    if (filter === 'single') return planType === 'single'
    if (filter === 'package') return planType === 'package'
    return true
  })

  // Show skeleton while loading instead of blank spinner
  if (loading) return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="h-10 w-24 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">نقطة البيع</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowNewMemberModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium">
                <UserPlus className="w-5 h-5" /><span className="hidden sm:inline">عميل جديد</span>
              </button>
              <button onClick={() => setShowPinModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium">
                <LayoutDashboard className="w-5 h-5" /><span className="hidden sm:inline">لوحة التحكم</span>
              </button>
              <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} className="p-2 text-gray-500 hover:text-red-600 rounded-lg">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="mt-3 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." className="w-full pr-10 pl-4 py-2.5 bg-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
            {[{ key: 'all', label: 'الكل' }, { key: 'active', label: 'نشط' }, { key: 'expiring', label: 'ينتهي قريباً' }, { key: 'expired', label: 'منتهي' }, { key: 'single', label: 'حصة واحدة' }, { key: 'package', label: 'باقة' }, { key: 'frozen', label: 'مجمد' }].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key as FilterType)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${filter === f.key ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{f.label}</button>
            ))}
          </div>
        </div>
      </header>

      {/* Members Grid */}
      <main className="max-w-7xl mx-auto p-4">
        <div className="mb-4 text-sm text-gray-500">{filteredMembers.length} عميل</div>
        {filteredMembers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-700">لا يوجد عملاء</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMembers.map(member => {
              const status = getMemberStatus(member)
              const planType = getPlanType(member)
              const sCfg = statusConfig[status as keyof typeof statusConfig]
              const pCfg = planType ? planTypeConfig[planType] : null
              const Icon = pCfg?.icon || User
              return (
                <div key={member.id} onClick={() => setSelectedMember(member)} className={`bg-white rounded-2xl border-2 p-4 cursor-pointer hover:shadow-lg transition-all ${sCfg.border}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${pCfg?.bg || 'bg-gray-100'}`}>
                        <Icon className={`w-5 h-5 ${pCfg?.color || 'text-gray-500'}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{member.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-gray-500"><Phone className="w-3 h-3" /><span dir="ltr">{member.phone}</span></div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${sCfg.bg} ${sCfg.text}`}>{sCfg.label}</span>
                  </div>
                  {planType && (
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">الخطة:</span><span className="font-medium">{member.plan_name}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">البدء:</span><span>{formatDate(member.plan_start_at)}</span></div>
                      {planType === 'subscription' && <>
                        <div className="flex justify-between"><span className="text-gray-500">الانتهاء:</span><span>{formatDate(member.expires_at)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">متبقي:</span><span className="font-bold">{getDaysLeft(member.expires_at)} يوم</span></div>
                      </>}
                      {planType === 'package' && <div className="flex justify-between"><span className="text-gray-500">الحصص:</span><span className="font-bold">{member.sessions_total - member.sessions_used} / {member.sessions_total}</span></div>}
                    </div>
                  )}
                  {!planType && <div className="text-sm text-gray-400 text-center py-2">بدون خطة</div>}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Customer Modal */}
      {selectedMember && (
        <CustomerModal
          member={selectedMember}
          plans={plans}
          services={services}
          onClose={() => setSelectedMember(null)}
          onUpdate={fetchData}
        />
      )}

      {/* New Member Modal */}
      {showNewMemberModal && (
        <NewMemberModal
          plans={plans}
          isOpen={true}
          onClose={() => setShowNewMemberModal(false)}
          onSubmit={async (data) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            let memberData: any = { business_id: user.id, name: data.name, phone: data.phone, email: data.email || null, notes: data.notes || null }
            const plan = data.plan_id ? plans.find(p => p.id === data.plan_id) : null
            if (plan) {
              const pt = plan.plan_type || (plan.duration_days === 0 ? (plan.sessions === 1 ? 'single' : 'package') : 'subscription')
              // If duration_days < 1, treat as fraction of a day (e.g., 0.0007 = ~1 minute)
              const expiresMs = plan.duration_days > 0 ? plan.duration_days * 86400000 : null
              memberData = { ...memberData, plan_id: plan.id, plan_name: plan.name, plan_type: pt, plan_start_at: new Date().toISOString(), expires_at: expiresMs ? new Date(Date.now() + expiresMs).toISOString() : null, sessions_total: plan.duration_days > 0 ? 0 : plan.sessions, sessions_used: pt === 'single' ? 1 : 0, debt: data.paymentMethod === 'debt' ? plan.price : 0 }
            }
            const { data: newMember } = await supabase.from('members').insert(memberData).select().single()
            
            // Create history entry with actual price
            if (newMember && plan) {
              await supabase.from('subscription_history').insert({
                business_id: user.id,
                member_id: newMember.id,
                plan_id: plan.id,
                plan_name: plan.name,
                type: 'subscription',
                amount: plan.price,
                payment_method: data.paymentMethod,
                sessions_before: 0,
                sessions_after: plan.duration_days > 0 ? 0 : plan.sessions
              })
              await supabase.from('transactions').insert({ business_id: user.id, member_id: newMember.id, type: 'subscription', payment_method: data.paymentMethod, amount: plan.price, notes: `اشتراك جديد: ${plan.name}` })
            }
            setShowNewMemberModal(false)
            fetchData()
          }}
        />
      )}

      <PINModal isOpen={showPinModal} correctPin={userPin} onSuccess={() => { setShowPinModal(false); window.location.href = '/dashboard' }} onCancel={() => setShowPinModal(false)} />
    </div>
  )
}

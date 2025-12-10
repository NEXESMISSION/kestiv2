'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, User, Lock, Tag, Plus, Trash2, Loader2, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CATEGORY_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  color: string
}

export default function FreelancerSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  
  // Profile settings
  const [fullName, setFullName] = useState('')
  const [pinCode, setPinCode] = useState('')
  
  // Categories
  const [categories, setCategories] = useState<Category[]>([])
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('income')
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0])
  
  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)
      
      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, pin_code')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setFullName(profile.full_name || '')
        setPinCode(profile.pin_code || '')
      }
      
      // Load categories
      const { data: cats } = await supabase
        .from('freelancer_categories')
        .select('*')
        .eq('business_id', user.id)
        .eq('is_active', true)
        .order('name')
      
      setCategories(cats || [])
      setIsLoading(false)
    }
    
    loadData()
  }, [supabase, router])
  
  const handleSaveProfile = async () => {
    if (!userId) return
    setIsSaving(true)
    
    try {
      await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          pin_code: pinCode || null
        })
        .eq('id', userId)
      
      alert('تم الحفظ بنجاح')
    } catch {
      alert('حدث خطأ')
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleAddCategory = async () => {
    if (!userId || !newCategoryName) return
    setIsSaving(true)
    
    try {
      const { data, error } = await supabase
        .from('freelancer_categories')
        .insert({
          business_id: userId,
          name: newCategoryName,
          type: newCategoryType,
          color: newCategoryColor,
          is_active: true
        })
        .select()
        .single()
      
      if (error) throw error
      
      if (data) {
        setCategories([...categories, data])
      }
      
      setNewCategoryName('')
      setShowAddCategory(false)
    } catch (err: any) {
      console.error('Error adding category:', err)
      alert('حدث خطأ في إضافة التصنيف. تأكد من تشغيل migration-update-2024.sql')
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('هل تريد حذف هذا التصنيف؟')) return
    
    try {
      await supabase
        .from('freelancer_categories')
        .update({ is_active: false })
        .eq('id', id)
      
      setCategories(categories.filter(c => c.id !== id))
    } catch {
      alert('حدث خطأ')
    }
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/pos/freelancer')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">الإعدادات</h1>
        </div>
      </header>
      
      <main className="max-w-2xl mx-auto p-4 space-y-6 pb-20">
        {/* Profile Settings */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-500" />
            الملف الشخصي
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                رمز PIN (للوصول للإعدادات)
              </label>
              <input
                type="password"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="اتركه فارغاً لإلغاء الحماية"
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500"
                maxLength={6}
              />
            </div>
            
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              حفظ التغييرات
            </button>
          </div>
        </div>
        
        {/* Categories */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Tag className="w-5 h-5 text-purple-500" />
              التصنيفات
            </h2>
            <button
              onClick={() => setShowAddCategory(true)}
              className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              إضافة
            </button>
          </div>
          
          {/* Add Category Form */}
          {showAddCategory && (
            <div className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="space-y-3">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="اسم التصنيف"
                  className="w-full px-4 py-2.5 border rounded-xl"
                  autoFocus
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCategoryType('income')}
                    className={`py-2 rounded-lg font-medium ${newCategoryType === 'income' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
                  >
                    دخل
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCategoryType('expense')}
                    className={`py-2 rounded-lg font-medium ${newCategoryType === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-100'}`}
                  >
                    مصروف
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategoryColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${newCategoryColor === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCategory}
                    disabled={!newCategoryName || isSaving}
                    className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-lg font-medium"
                  >
                    إضافة
                  </button>
                  <button
                    onClick={() => { setShowAddCategory(false); setNewCategoryName(''); }}
                    className="px-4 py-2 bg-gray-200 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Income Categories */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-green-700 mb-2">تصنيفات الدخل</h3>
            <div className="space-y-2">
              {categories.filter(c => c.type === 'income').map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {categories.filter(c => c.type === 'income').length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">لا توجد تصنيفات</p>
              )}
            </div>
          </div>
          
          {/* Expense Categories */}
          <div>
            <h3 className="text-sm font-bold text-red-700 mb-2">تصنيفات المصروفات</h3>
            <div className="space-y-2">
              {categories.filter(c => c.type === 'expense').map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {categories.filter(c => c.type === 'expense').length === 0 && (
                <p className="text-sm text-gray-400 text-center py-2">لا توجد تصنيفات</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

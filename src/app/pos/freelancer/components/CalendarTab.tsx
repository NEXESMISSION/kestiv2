'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, Calendar, Video, Edit3, Truck, Users, Star,
  X, Loader2, Check, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { FreelancerReminder, FreelancerProject } from '@/types/database'

interface CalendarTabProps {
  userId: string
  projects: FreelancerProject[]
  onRefresh: () => void
}

type ReminderType = 'shoot' | 'edit' | 'delivery' | 'meeting' | 'other'

const REMINDER_TYPES: { id: ReminderType; label: string; icon: typeof Video; color: string }[] = [
  { id: 'shoot', label: 'تصوير', icon: Video, color: 'bg-blue-500' },
  { id: 'edit', label: 'مونتاج', icon: Edit3, color: 'bg-purple-500' },
  { id: 'delivery', label: 'تسليم', icon: Truck, color: 'bg-green-500' },
  { id: 'meeting', label: 'اجتماع', icon: Users, color: 'bg-orange-500' },
  { id: 'other', label: 'أخرى', icon: Star, color: 'bg-gray-500' },
]

export default function CalendarTab({ userId, projects, onRefresh }: CalendarTabProps) {
  const [reminders, setReminders] = useState<FreelancerReminder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  
  // Form
  const [eventTitle, setEventTitle] = useState('')
  const [eventType, setEventType] = useState<ReminderType>('other')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [eventNotes, setEventNotes] = useState('')
  const [eventProjectId, setEventProjectId] = useState('')

  const fetchReminders = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('freelancer_reminders')
        .select('*')
        .eq('business_id', userId)
        .order('date', { ascending: true })
      
      setReminders(data || [])
    } catch (error) {
      console.error('Error fetching reminders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReminders()
  }, [userId])

  const handleAddEvent = async () => {
    if (!eventTitle || !eventDate) return
    setIsSubmitting(true)
    
    try {
      const supabase = createClient()
      const dateTime = eventTime 
        ? `${eventDate}T${eventTime}:00` 
        : `${eventDate}T09:00:00`
      
      await supabase.from('freelancer_reminders').insert({
        business_id: userId,
        project_id: eventProjectId || null,
        title: eventTitle,
        type: eventType,
        date: dateTime,
        notes: eventNotes || null
      })
      
      setShowAddModal(false)
      resetForm()
      fetchReminders()
    } catch (error) {
      console.error('Error adding event:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleDone = async (reminder: FreelancerReminder) => {
    try {
      const supabase = createClient()
      await supabase.from('freelancer_reminders')
        .update({ is_done: !reminder.is_done })
        .eq('id', reminder.id)
      fetchReminders()
    } catch (error) {
      console.error('Error toggling reminder:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا الحدث؟')) return
    
    try {
      const supabase = createClient()
      await supabase.from('freelancer_reminders').delete().eq('id', id)
      fetchReminders()
    } catch (error) {
      console.error('Error deleting reminder:', error)
    }
  }

  const resetForm = () => {
    setEventTitle('')
    setEventType('other')
    setEventDate('')
    setEventTime('')
    setEventNotes('')
    setEventProjectId('')
  }

  // Group reminders by date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const upcomingReminders = reminders.filter(r => {
    const reminderDate = new Date(r.date)
    reminderDate.setHours(0, 0, 0, 0)
    return reminderDate >= today && !r.is_done
  })

  const pastReminders = reminders.filter(r => {
    const reminderDate = new Date(r.date)
    reminderDate.setHours(0, 0, 0, 0)
    return reminderDate < today || r.is_done
  })

  // Get calendar days for the selected month
  const getCalendarDays = () => {
    const year = selectedMonth.getFullYear()
    const month = selectedMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: Date[] = []
    
    // Add padding for days before the first day of month
    const startPadding = firstDay.getDay()
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push(d)
    }
    
    // Add all days in the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  const getRemindersForDate = (date: Date) => {
    return reminders.filter(r => {
      const rDate = new Date(r.date)
      return rDate.getDate() === date.getDate() &&
             rDate.getMonth() === date.getMonth() &&
             rDate.getFullYear() === date.getFullYear()
    })
  }

  const calendarDays = getCalendarDays()
  const monthNames = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  const dayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']

  const changeMonth = (delta: number) => {
    const newMonth = new Date(selectedMonth)
    newMonth.setMonth(newMonth.getMonth() + delta)
    setSelectedMonth(newMonth)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-500" />
          التقويم
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl flex items-center gap-2 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          إضافة حدث
        </button>
      </div>

      {/* Mini Calendar */}
      <div className="card !p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <h3 className="font-bold text-gray-800">
            {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
          </h3>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs text-gray-500 font-medium py-1">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const isCurrentMonth = day.getMonth() === selectedMonth.getMonth()
            const isToday = day.toDateString() === new Date().toDateString()
            const dayReminders = getRemindersForDate(day)
            
            return (
              <div
                key={index}
                className={`relative p-2 text-center rounded-lg text-sm ${
                  !isCurrentMonth ? 'text-gray-300' :
                  isToday ? 'bg-primary-500 text-white font-bold' :
                  'text-gray-700'
                }`}
              >
                {day.getDate()}
                {dayReminders.length > 0 && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dayReminders.slice(0, 3).map((r, i) => {
                      const typeConfig = REMINDER_TYPES.find(t => t.id === r.type)
                      return (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${typeConfig?.color || 'bg-gray-400'}`}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming Events */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">الأحداث القادمة</h3>
        {upcomingReminders.length === 0 ? (
          <div className="card !p-6 text-center">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">لا توجد أحداث قادمة</p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingReminders.map(reminder => {
              const typeConfig = REMINDER_TYPES.find(t => t.id === reminder.type)
              const Icon = typeConfig?.icon || Star
              const reminderDate = new Date(reminder.date)
              const isToday = reminderDate.toDateString() === new Date().toDateString()
              
              return (
                <div 
                  key={reminder.id} 
                  className={`card !p-3 flex items-center gap-3 ${isToday ? 'border-primary-300 bg-primary-50' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${typeConfig?.color || 'bg-gray-500'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{reminder.title}</p>
                    <p className="text-xs text-gray-500">
                      {isToday ? 'اليوم' : reminderDate.toLocaleDateString('ar-TN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' - '}
                      {reminderDate.toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleDone(reminder)}
                      className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(reminder.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Past/Done Events */}
      {pastReminders.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3">منتهية</h3>
          <div className="space-y-2 opacity-60">
            {pastReminders.slice(0, 5).map(reminder => {
              const typeConfig = REMINDER_TYPES.find(t => t.id === reminder.type)
              const reminderDate = new Date(reminder.date)
              
              return (
                <div key={reminder.id} className="card !p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-500`}>
                    {reminder.is_done ? <Check className="w-4 h-4" /> : typeConfig ? <typeConfig.icon className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-gray-600 truncate ${reminder.is_done ? 'line-through' : ''}`}>
                      {reminder.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {reminderDate.toLocaleDateString('ar-TN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-primary-500 to-primary-600 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">إضافة حدث</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان *</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="input-field"
                  placeholder="مثال: تصوير زفاف أحمد"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">النوع</label>
                <div className="flex flex-wrap gap-2">
                  {REMINDER_TYPES.map(type => {
                    const Icon = type.icon
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setEventType(type.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          eventType === type.id 
                            ? `${type.color} text-white` 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {type.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ *</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الوقت</label>
                  <input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              
              {projects.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ربط بمشروع (اختياري)</label>
                  <select
                    value={eventProjectId}
                    onChange={(e) => setEventProjectId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">بدون مشروع</option>
                    {projects.filter(p => p.status !== 'completed').map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  className="input-field min-h-[80px]"
                  placeholder="اختياري"
                />
              </div>
              
              <button
                onClick={handleAddEvent}
                disabled={!eventTitle || !eventDate || isSubmitting}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                إضافة الحدث
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

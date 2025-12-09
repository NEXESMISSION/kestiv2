'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, Calendar, Star, Tag,
  X, Loader2, Check, ChevronLeft, ChevronRight, Trash2, Settings
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { FreelancerReminder, FreelancerProject, FreelancerClient, FreelancerEventType } from '@/types/database'

// Color options for event types
const COLOR_OPTIONS = [
  { id: 'blue', bg: 'bg-blue-500', text: 'أزرق' },
  { id: 'green', bg: 'bg-green-500', text: 'أخضر' },
  { id: 'red', bg: 'bg-red-500', text: 'أحمر' },
  { id: 'orange', bg: 'bg-orange-500', text: 'برتقالي' },
  { id: 'purple', bg: 'bg-purple-500', text: 'بنفسجي' },
  { id: 'pink', bg: 'bg-pink-500', text: 'وردي' },
  { id: 'yellow', bg: 'bg-yellow-500', text: 'أصفر' },
  { id: 'gray', bg: 'bg-gray-500', text: 'رمادي' },
]

interface CalendarTabProps {
  userId: string
  projects: FreelancerProject[]
  clients: FreelancerClient[]
  onRefresh: () => void
}

const getColorClass = (color: string) => {
  return COLOR_OPTIONS.find(c => c.id === color)?.bg || 'bg-gray-500'
}

export default function CalendarTab({ userId, projects, clients, onRefresh }: CalendarTabProps) {
  const [reminders, setReminders] = useState<FreelancerReminder[]>([])
  const [eventTypes, setEventTypes] = useState<FreelancerEventType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  // Event Form
  const [eventTitle, setEventTitle] = useState('')
  const [eventTypeId, setEventTypeId] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [eventNotes, setEventNotes] = useState('')
  const [eventClientId, setEventClientId] = useState('')
  const [eventProjectId, setEventProjectId] = useState('')
  
  // New Type Form
  const [newTypeName, setNewTypeName] = useState('')
  const [newTypeColor, setNewTypeColor] = useState('blue')

  // Filter projects by selected client
  const filteredProjects = eventClientId 
    ? projects.filter(p => p.client_id === eventClientId && p.status !== 'completed')
    : projects.filter(p => p.status !== 'completed')

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      
      // Fetch event types
      const { data: typesData } = await supabase
        .from('freelancer_event_types')
        .select('*')
        .eq('business_id', userId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      
      setEventTypes(typesData || [])
      
      // Fetch reminders
      const { data: remindersData } = await supabase
        .from('freelancer_reminders')
        .select('*')
        .eq('business_id', userId)
        .order('date', { ascending: true })
      
      setReminders(remindersData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
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
        client_id: eventClientId || null,
        project_id: eventProjectId || null,
        type_id: eventTypeId || null,
        title: eventTitle,
        type: 'other', // Legacy field
        date: dateTime,
        notes: eventNotes || null
      })
      
      setShowAddModal(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error adding event:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddEventType = async () => {
    if (!newTypeName.trim()) return
    setIsSubmitting(true)
    
    try {
      const supabase = createClient()
      await supabase.from('freelancer_event_types').insert({
        business_id: userId,
        name: newTypeName.trim(),
        color: newTypeColor,
        sort_order: eventTypes.length
      })
      
      setNewTypeName('')
      setNewTypeColor('blue')
      fetchData()
    } catch (error) {
      console.error('Error adding event type:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteEventType = async (id: string) => {
    if (!confirm('هل تريد حذف هذا النوع؟')) return
    
    try {
      const supabase = createClient()
      await supabase.from('freelancer_event_types').delete().eq('id', id)
      fetchData()
    } catch (error) {
      console.error('Error deleting event type:', error)
    }
  }

  const handleToggleDone = async (reminder: FreelancerReminder) => {
    try {
      const supabase = createClient()
      await supabase.from('freelancer_reminders')
        .update({ is_done: !reminder.is_done })
        .eq('id', reminder.id)
      fetchData()
    } catch (error) {
      console.error('Error toggling reminder:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا الحدث؟')) return
    
    try {
      const supabase = createClient()
      await supabase.from('freelancer_reminders').delete().eq('id', id)
      fetchData()
    } catch (error) {
      console.error('Error deleting reminder:', error)
    }
  }

  const resetForm = () => {
    setEventTitle('')
    setEventTypeId('')
    setEventDate('')
    setEventTime('')
    setEventNotes('')
    setEventClientId('')
    setEventProjectId('')
  }

  const getEventTypeForReminder = (reminder: FreelancerReminder) => {
    if (reminder.type_id) {
      return eventTypes.find(t => t.id === reminder.type_id)
    }
    return null
  }

  const handleClientChange = (clientId: string) => {
    setEventClientId(clientId)
    setEventProjectId('') // Reset project when client changes
  }

  // Get reminders for a specific date
  const getRemindersForDate = (date: Date) => {
    return reminders.filter(r => {
      const rDate = new Date(r.date)
      return rDate.getDate() === date.getDate() &&
             rDate.getMonth() === date.getMonth() &&
             rDate.getFullYear() === date.getFullYear()
    })
  }

  // Group reminders by date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Get reminders for selected date
  const selectedDateReminders = selectedDate 
    ? getRemindersForDate(selectedDate)
    : []

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

  const handleDayClick = (day: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return
    if (selectedDate && day.toDateString() === selectedDate.toDateString()) {
      setSelectedDate(null) // Deselect if clicking same day
    } else {
      setSelectedDate(day)
    }
  }

  const formatSelectedDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }
    return date.toLocaleDateString('ar-TN', options)
  }

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
            const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString()
            const dayReminders = getRemindersForDate(day)
            
            return (
              <button
                key={index}
                onClick={() => handleDayClick(day, isCurrentMonth)}
                disabled={!isCurrentMonth}
                className={`relative p-2 text-center rounded-lg text-sm transition-all ${
                  !isCurrentMonth ? 'text-gray-300 cursor-default' :
                  isSelected ? 'bg-primary-600 text-white font-bold ring-2 ring-primary-300' :
                  isToday ? 'bg-primary-500 text-white font-bold' :
                  dayReminders.length > 0 ? 'text-gray-700 hover:bg-primary-50' :
                  'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {day.getDate()}
                {dayReminders.length > 0 && (
                  <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dayReminders.slice(0, 3).map((r, i) => {
                      const eventType = getEventTypeForReminder(r)
                      return (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${eventType ? getColorClass(eventType.color) : 'bg-gray-400'}`}
                        />
                      )
                    })}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Day Events */}
      {selectedDate && (
        <div className="card !p-4 border-primary-200 bg-primary-50/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-primary-700">
              {formatSelectedDate(selectedDate)}
            </h3>
            <button 
              onClick={() => setSelectedDate(null)}
              className="text-xs text-primary-600 hover:text-primary-800"
            >
              إغلاق
            </button>
          </div>
          {selectedDateReminders.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">لا توجد أحداث في هذا اليوم</p>
          ) : (
            <div className="space-y-2">
              {selectedDateReminders.map(reminder => {
                const eventType = getEventTypeForReminder(reminder)
                const reminderDate = new Date(reminder.date)
                
                return (
                  <div key={reminder.id} className="flex items-center gap-3 p-2 bg-white rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${eventType ? getColorClass(eventType.color) : 'bg-gray-500'}`}>
                      <Tag className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-gray-800 text-sm truncate ${reminder.is_done ? 'line-through opacity-50' : ''}`}>
                        {reminder.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {reminderDate.toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleDone(reminder)}
                        className={`p-1.5 rounded-lg transition-colors ${reminder.is_done ? 'text-green-500 bg-green-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(reminder.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
      )}

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
              const eventType = getEventTypeForReminder(reminder)
              const reminderDate = new Date(reminder.date)
              const isToday = reminderDate.toDateString() === new Date().toDateString()
              
              return (
                <div 
                  key={reminder.id} 
                  className={`card !p-3 flex items-center gap-3 ${isToday ? 'border-primary-300 bg-primary-50' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${eventType ? getColorClass(eventType.color) : 'bg-gray-500'}`}>
                    <Tag className="w-5 h-5" />
                  </div>
                  {eventType && (
                    <span className="text-xs text-gray-400">{eventType.name}</span>
                  )}
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
              const reminderDate = new Date(reminder.date)
              
              return (
                <div key={reminder.id} className="card !p-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-500`}>
                    {reminder.is_done ? <Check className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
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
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">النوع (اختياري)</label>
                  <button
                    type="button"
                    onClick={() => setShowTypeModal(true)}
                    className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1"
                  >
                    <Settings className="w-3 h-3" />
                    إدارة الأنواع
                  </button>
                </div>
                {eventTypes.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2 bg-gray-50 rounded-lg">
                    لا توجد أنواع - أضف أنواع الأحداث من "إدارة الأنواع"
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEventTypeId('')}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        !eventTypeId 
                          ? 'bg-gray-500 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      بدون نوع
                    </button>
                    {eventTypes.map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setEventTypeId(type.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          eventTypeId === type.id 
                            ? `${getColorClass(type.color)} text-white` 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {type.name}
                      </button>
                    ))}
                  </div>
                )}
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
              
              {clients.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العميل (اختياري)</label>
                  <select
                    value={eventClientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="input-field"
                  >
                    <option value="">بدون عميل</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {filteredProjects.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ربط بمشروع (اختياري)</label>
                  <select
                    value={eventProjectId}
                    onChange={(e) => setEventProjectId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">بدون مشروع</option>
                    {filteredProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.title} {p.client_name ? `- ${p.client_name}` : ''}</option>
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

      {/* Manage Event Types Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowTypeModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-gray-700 to-gray-800 p-5 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">إدارة أنواع الأحداث</h3>
                <button onClick={() => setShowTypeModal(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Add New Type */}
              <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                <h4 className="font-medium text-gray-700">إضافة نوع جديد</h4>
                <input
                  type="text"
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="input-field"
                  placeholder="اسم النوع (مثال: اجتماع، تسليم، تصميم...)"
                />
                <div>
                  <label className="block text-xs text-gray-500 mb-2">اللون</label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map(color => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setNewTypeColor(color.id)}
                        className={`w-8 h-8 rounded-full ${color.bg} ${
                          newTypeColor === color.id ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                        }`}
                        title={color.text}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleAddEventType}
                  disabled={!newTypeName.trim() || isSubmitting}
                  className="w-full py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  إضافة النوع
                </button>
              </div>

              {/* Existing Types */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3">الأنواع الحالية</h4>
                {eventTypes.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">لا توجد أنواع بعد</p>
                ) : (
                  <div className="space-y-2">
                    {eventTypes.map(type => (
                      <div key={type.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full ${getColorClass(type.color)}`} />
                          <span className="font-medium text-gray-700">{type.name}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteEventType(type.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Zap, Package, BarChart3, Globe, Smartphone, 
  MessageCircle, Check, ChevronDown, ChevronUp, Menu, X,
  AlertTriangle, DollarSign, Rocket,
  Play, Mail, Phone, Send, Star, Shield, Users, Copy,
  CreditCard, Wallet, Instagram, Building2,
  Store, Dumbbell, TrendingUp,
  HandCoins, UserCheck
} from 'lucide-react'

// CSS Animations
const styles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
  @keyframes float-slow {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
    50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slide-in-right {
    from { opacity: 0; transform: translateX(-30px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes bounce-subtle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  .animate-float { animation: float 6s ease-in-out infinite; }
  .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
  .animate-float-delay { animation: float 6s ease-in-out infinite; animation-delay: 2s; }
  .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
  .animate-slide-up { animation: slide-up 0.6s ease-out forwards; }
  .animate-slide-in-right { animation: slide-in-right 0.6s ease-out forwards; }
  .animate-scale-in { animation: scale-in 0.5s ease-out forwards; }
  .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
  .animation-delay-100 { animation-delay: 0.1s; }
  .animation-delay-200 { animation-delay: 0.2s; }
  .animation-delay-300 { animation-delay: 0.3s; }
  .animation-delay-400 { animation-delay: 0.4s; }
  .animation-delay-500 { animation-delay: 0.5s; }
`

type PricingPlan = {
  name: string
  subtitle: string
  price: number
  period: string
  total: string | null
  totalAmount: number
  popular: boolean
  save: string | null
}

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '' })
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const pricing: PricingPlan[] = [
    { name: '6 أشهر', subtitle: 'وفر 15%', price: 16, period: '/شهر', total: '96 د.ت إجمالي', totalAmount: 96, popular: false, save: '15%' },
    { name: 'سنوي', subtitle: 'وفر 21%', price: 15, period: '/شهر', total: '180 د.ت إجمالي', totalAmount: 180, popular: true, save: '21%' },
  ]

  const faqs = [
    { q: 'هل يعمل على الحاسوب والتابلت؟', a: 'نعم، يعمل على كل الأجهزة بنفس الحساب. يمكنك البدء من الهاتف ثم الانتقال للحاسوب بدون أي إعدادات إضافية.' },
    { q: 'هل أحتاج إنترنت؟', a: 'نعم، اتصال إنترنت بسيط يكفي. حتى اتصال 3G يعمل بشكل ممتاز.' },
    { q: 'كيف أدفع؟', a: 'عبر D17 أو Flouci أو تحويل بنكي. نوفر طرق دفع متعددة لراحتك.' },
    { q: 'ماذا لو واجهت مشكلة؟', a: 'فريق الدعم متاح على واتساب للرد على أسئلتك. نرد خلال دقائق في أوقات العمل.' },
  ]

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        setSubmitError(result.error || 'فشل في إرسال الاستفسار')
        return
      }
      
      setFormSubmitted(true)
      setTimeout(() => setFormSubmitted(false), 3000)
      setFormData({ name: '', phone: '', email: '', message: '' })
    } catch {
      setSubmitError('حدث خطأ في الاتصال')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/landing" className="flex items-center cursor-pointer">
              <Image src="/kesti.png" alt="Kesti Pro" width={56} height={56} className="w-14 h-14 rounded-xl shadow-md hover:shadow-lg transition-shadow" />
            </Link>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-primary-600 transition-colors font-medium">المميزات</a>
              <a href="#pricing" className="text-gray-600 hover:text-primary-600 transition-colors font-medium">الأسعار</a>
              <a href="#contact" className="text-gray-600 hover:text-primary-600 transition-colors font-medium">تواصل معنا</a>
              <Link href="/login" className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all hover:-translate-y-0.5">
                لوحة التحكم
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
              {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-gray-100 py-4 px-4 space-y-3 animate-slide-up">
            <a href="#features" onClick={() => setMobileMenu(false)} className="block py-2 text-gray-600 hover:text-primary-600">المميزات</a>
            <a href="#pricing" onClick={() => setMobileMenu(false)} className="block py-2 text-gray-600 hover:text-primary-600">الأسعار</a>
            <a href="#contact" onClick={() => setMobileMenu(false)} className="block py-2 text-gray-600 hover:text-primary-600">تواصل معنا</a>
            <Link href="/login" className="block w-full text-center py-3 bg-primary-600 text-white rounded-xl font-medium">لوحة التحكم</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 overflow-hidden relative">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary-200/30 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl animate-float-delay"></div>
          <div className="absolute top-40 left-1/4 w-64 h-64 bg-purple-200/20 rounded-full blur-3xl animate-float-slow"></div>
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div className={`text-center lg:text-right ${isVisible ? 'animate-slide-in-right' : 'opacity-0'}`}>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium mb-6 sm:mb-8 animate-bounce-subtle">
                <Rocket className="w-4 h-4" />
                <span>إدارة المبيعات والمخزون بذكاء</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight mb-4 sm:mb-6">
                إدارة تجارتك
                <br />
                <span className="bg-gradient-to-r from-primary-600 via-primary-500 to-blue-500 bg-clip-text text-transparent">
                  الكلّ من تليفونك
                </span>
              </h1>

              {/* Subheadline */}
              <div className="space-y-2 mb-6 sm:mb-8">
                <p className="text-gray-600 font-medium text-base sm:text-lg">
                  مبيعات، مخزون، اشتراكات، كريديات، وأرباح — نظام متكامل لكل الأعمال
                </p>
                <p className="flex items-center justify-center lg:justify-start gap-2 text-green-600 font-bold text-lg">
                  <Check className="w-5 h-5" />
                  وفّر أكثر من 2,500 د.ت في أول سنة
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
                <Link href="/register" className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-base sm:text-lg font-bold rounded-2xl hover:shadow-xl hover:shadow-primary-500/30 transition-all transform hover:-translate-y-1">
                  ابدأ تجربتك المجانية
                </Link>
                <a href="/pos" className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 border-gray-200 text-gray-700 text-base sm:text-lg font-bold rounded-2xl hover:border-primary-300 hover:bg-primary-50 transition-all">
                  لوحة التحكم
                </a>
              </div>
            </div>

            {/* Hero Visual - Video Preview */}
            <div className={`relative ${isVisible ? 'animate-scale-in' : 'opacity-0'}`}>
              <div className="relative bg-gradient-to-br from-primary-100 via-blue-50 to-purple-100 rounded-3xl p-4 sm:p-6 shadow-2xl shadow-primary-500/20">
                <div className="aspect-video bg-gradient-to-br from-primary-900 via-primary-800 to-blue-900 rounded-2xl flex items-center justify-center relative overflow-hidden">
                  {/* Video placeholder with play button */}
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="relative z-10 text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-3 mx-auto cursor-pointer hover:bg-white/30 transition-colors hover:scale-110">
                      <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white mr-[-4px]" />
                    </div>
                    <p className="text-white/90 font-medium text-sm sm:text-base">شاهد كيف يعمل Kesti Pro</p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 text-yellow-300 rounded-full text-xs sm:text-sm mt-2">
                      <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                      قريباً - Coming Soon
                    </div>
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute top-4 right-4 w-20 h-20 bg-primary-500/20 rounded-full blur-xl"></div>
                  <div className="absolute bottom-4 left-4 w-24 h-24 bg-blue-500/20 rounded-full blur-xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props - Why Kesti Pro - Clean Grid Design */}
      <section id="features" className="py-16 sm:py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">علاش Kesti Pro؟</h2>
            <p className="text-gray-500">حلول بسيطة لمشاكل حقيقية</p>
          </div>

          {/* Clean 2x3 Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">اعرف ربحك الحقيقي</h3>
              <p className="text-gray-500 text-sm">بعد كل المصاريف</p>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center mb-4">
                <HandCoins className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">تابع الكريديات</h3>
              <p className="text-gray-500 text-sm">ما تنسى شكون عليه فلوسك</p>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">تنبيهات المخزون</h3>
              <p className="text-gray-500 text-sm">قبل ما ينفد</p>
            </div>

            {/* Card 4 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">تحكم من أي مكان</h3>
              <p className="text-gray-500 text-sm">من تليفونك أو حاسوبك</p>
            </div>

            {/* Card 5 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">إدارة الاشتراكات</h3>
              <p className="text-gray-500 text-sm">تنبيهات + تجميد</p>
            </div>

            {/* Card 6 */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">وفّر 2,500+ د.ت</h3>
              <p className="text-gray-500 text-sm">بدل كاشير تقليدي</p>
            </div>
          </div>

          {/* Extra Features - Compact */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-600">بيع سريع</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100">
              <Smartphone className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">موبايل + تابلت</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100">
              <BarChart3 className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">تقارير</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100">
              <MessageCircle className="w-4 h-4 text-teal-500" />
              <span className="text-sm text-gray-600">دعم واتساب</span>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-2xl shadow-lg shadow-green-500/25 hover:shadow-xl transition-all">
              <Rocket className="w-5 h-5" />
              جرب مجاناً 15 يوم
            </Link>
            <p className="text-gray-500 text-sm mt-3">بدون بطاقة بنكية • إلغاء أي وقت</p>
          </div>
        </div>
      </section>

      {/* Three Business Types Section */}
      <section className="py-16 sm:py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">نظام واحد لكل أنواع الأعمال</h2>
            <p className="text-gray-600 text-base sm:text-lg">محل تجاري؟ جيم؟ Kesti Pro يناسبك</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Retail/Products */}
            <div className="bg-white rounded-2xl p-6 border-2 border-blue-100 hover:border-blue-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
                <Store className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">المقاهي، الحوانيت، بيع منتوجات</h3>
              <p className="text-gray-500 text-sm mb-4">كافيهات، بقالات، محلات، متاجر...</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-blue-500" />بيع سريع</li>
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-blue-500" />متابعة المخزون</li>
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-blue-500" />تنبيهات المخزون</li>
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-blue-500" />الكريديات</li>
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-blue-500" />الربح الصافي</li>
              </ul>
              <Link href="/register" className="block mt-4 text-blue-600 font-medium text-sm hover:underline">جرّبها بنفسك →</Link>
            </div>

            {/* Subscriptions */}
            <div className="bg-white rounded-2xl p-6 border-2 border-purple-100 hover:border-purple-300 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">الاشتراكات والعضويات</h3>
              <p className="text-gray-500 text-sm mb-4">جيم، co-working، نوادي، أي نشاط باشتراك زمني</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-purple-500" />إدارة الاشتراكات</li>
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-purple-500" />التنبيهات التلقائية</li>
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-purple-500" />تجميد العضويات</li>
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-purple-500" />أنواع اشتراكات متعددة</li>
              </ul>
              <Link href="/register" className="block mt-4 text-purple-600 font-medium text-sm hover:underline">جرّبها بنفسك →</Link>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">أسعار بسيطة وواضحة</h2>
            <p className="text-gray-600 text-base sm:text-lg">جميع الباقات تشمل كل المميزات</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            {/* 6 Months Plan */}
            <div 
              className="relative p-6 sm:p-8 rounded-3xl border-2 transition-all hover:-translate-y-2 cursor-pointer border-gray-200 bg-white hover:border-primary-200 hover:shadow-lg"
              onClick={() => setSelectedPlan(pricing[0])}
            >
              <div className="text-center">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">6 أشهر</h3>
                <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6">وفر 15%</p>
                
                <div className="mb-4 sm:mb-6">
                  <span className="text-4xl sm:text-5xl font-bold text-gray-900">16</span>
                  <span className="text-gray-500 text-sm sm:text-base">د.ت/شهر</span>
                </div>
                
                <p className="text-xs sm:text-sm text-gray-500 mb-2">96 د.ت إجمالي</p>
                <p className="text-xs text-primary-600 font-medium mb-4">بدون جهاز كاشير</p>
                
                <div className="space-y-2 mb-6 text-right">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>كل المميزات</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>دعم فني</span>
                  </div>
                </div>
                
                <button className="w-full py-3 sm:py-4 rounded-xl font-bold transition-all bg-gray-100 text-gray-900 hover:bg-gray-200">
                  اشترك الآن
                </button>
              </div>
            </div>

            {/* Yearly Plan - Popular */}
            <div 
              className="relative p-6 sm:p-8 rounded-3xl border-2 transition-all hover:-translate-y-2 cursor-pointer border-primary-500 bg-gradient-to-b from-primary-50 to-white shadow-xl shadow-primary-500/20"
              onClick={() => setSelectedPlan(pricing[1])}
            >
              <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs sm:text-sm font-bold rounded-full whitespace-nowrap">
                الأكثر طلباً + شهر هدية
              </div>
              
              <div className="text-center">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">سنوي</h3>
                <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6">وفر 21%</p>
                
                <div className="mb-4 sm:mb-6">
                  <span className="text-4xl sm:text-5xl font-bold text-gray-900">15</span>
                  <span className="text-gray-500 text-sm sm:text-base">د.ت/شهر</span>
                </div>
                
                <p className="text-xs sm:text-sm text-gray-500 mb-2">180 د.ت إجمالي</p>
                <p className="text-xs text-primary-600 font-medium mb-4">بدون جهاز كاشير</p>
                
                <div className="space-y-2 mb-6 text-right">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>كل المميزات</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>دعم فني مميز</span>
                  </div>
                </div>
                
                <button className="w-full py-3 sm:py-4 rounded-xl font-bold transition-all bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:shadow-lg hover:shadow-primary-500/30">
                  اشترك الآن
                </button>
              </div>
            </div>

            {/* Custom Plan - Contact Us */}
            <div className="relative p-6 sm:p-8 rounded-3xl border-2 transition-all hover:-translate-y-2 border-purple-200 bg-gradient-to-b from-purple-50 to-white hover:border-purple-400 hover:shadow-lg">
              <div className="absolute -top-3 sm:-top-4 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs sm:text-sm font-bold rounded-full">
                مخصص
              </div>
              
              <div className="text-center">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">باقة مخصصة</h3>
                <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6">للأعمال الكبيرة</p>
                
                <div className="mb-4 sm:mb-6">
                  <span className="text-2xl sm:text-3xl font-bold text-purple-600">تواصل معنا</span>
                </div>
                
                <p className="text-xs sm:text-sm text-gray-500 mb-2">سعر حسب المتطلبات</p>
                <p className="text-xs text-purple-600 font-medium mb-4">حلول مخصصة</p>
                
                <div className="space-y-2 mb-6 text-right">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span>ميزات إضافية</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span>دعم مخصص</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span>تكاملات خاصة</span>
                  </div>
                </div>
                
                <a 
                  href="#contact"
                  className="block w-full py-3 sm:py-4 rounded-xl font-bold transition-all bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:shadow-lg hover:shadow-purple-500/30 text-center"
                >
                  تواصل معنا
                </a>
              </div>
            </div>
          </div>

          {/* Plan icons */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-8 text-gray-500 text-sm">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary-500" />
              <span>يعمل من الهاتف</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-500" />
              <span>بيانات محمية</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary-500" />
              <span>دعم فني</span>
            </div>
          </div>

          <div className="text-center p-4 sm:p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
            <p className="text-base sm:text-lg font-bold text-green-800 mb-1 sm:mb-2">🎁 ابدأ تجربتك المجانية - 15 يوم</p>
            <p className="text-green-600 text-sm sm:text-base">بدون بطاقة بنكية • إلغاء في أي وقت</p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-20 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">أسئلة شائعة</h2>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all hover:shadow-md">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between text-right hover:bg-gray-50 transition-colors"
                >
                  <span className="font-bold text-gray-900 text-sm sm:text-base">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-4 sm:px-6 pb-3 sm:pb-4 text-gray-600 border-t border-gray-100 pt-3 sm:pt-4 text-sm sm:text-base animate-slide-up">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">استفسر عن الميزات</h2>
            <p className="text-gray-600 text-base sm:text-lg">أرسل استفسارك وسنرد عليك في أقرب وقت</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 sm:p-8 border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="أدخل اسمك الكامل"
                    className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">رقم الهاتف *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="أدخل رقم هاتفك"
                    dir="ltr"
                    className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm sm:text-base"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">البريد الإلكتروني (اختياري)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="أدخل بريدك الإلكتروني"
                  dir="ltr"
                  className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm sm:text-base"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">استفسارك *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  placeholder="اكتب استفسارك أو متطلبات محلك هنا"
                  className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none text-sm sm:text-base"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 sm:py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary-500/30 transition-all flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    إرسال الاستفسار
                  </>
                )}
              </button>

              {submitError && (
                <div className="text-center p-3 sm:p-4 bg-red-50 text-red-700 rounded-xl animate-scale-in">
                  {submitError}
                </div>
              )}

              {formSubmitted && (
                <div className="text-center p-3 sm:p-4 bg-green-50 text-green-700 rounded-xl animate-scale-in">
                  <Check className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" />
                  تم إرسال استفسارك بنجاح! سنتواصل معك قريباً
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 px-4 bg-gradient-to-br from-primary-600 via-primary-700 to-blue-800 text-white relative overflow-hidden">
        {/* Background Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float-delay"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">جاهز لتطوير تجارتك؟</h2>
          <p className="text-primary-100 text-base sm:text-lg mb-6 sm:mb-8">انضم لمئات التجار الذين يديرون أعمالهم بذكاء مع Kesti Pro</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link href="/register" className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-white text-primary-700 text-lg sm:text-xl font-bold rounded-2xl hover:shadow-xl transition-all hover:-translate-y-1 flex items-center justify-center gap-2">
              <Rocket className="w-5 h-5 sm:w-6 sm:h-6" />
              ابدأ الآن — مجانا لـ 15 يوم بدون بطاقة بنكية
            </Link>
          </div>
          
          <p className="text-white/70 text-sm mt-4">بدون التزام • إلغاء في أي وقت</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
            <Link href="/landing" className="flex items-center cursor-pointer">
              <Image src="/kesti.png" alt="Kesti Pro" width={48} height={48} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl hover:shadow-md transition-shadow" />
            </Link>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-xs sm:text-sm">
              <a href="mailto:support@kestipro.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-4 h-4" />
                support@kestipro.com
              </a>
              <a href="tel:+21653518337" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="w-4 h-4" />
                53518337
              </a>
            </div>
          </div>
          
          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 text-xs sm:text-sm">
            <p>© 2025 Kesti Pro. جميع الحقوق محفوظة.</p>
            <a href="#" className="hover:text-white transition-colors">الشروط والأحكام</a>
          </div>
        </div>
      </footer>

      {/* Payment Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPlan(null)}>
          <div 
            className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-auto animate-scale-in"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">باقة {selectedPlan.name}</h3>
                <p className="text-2xl sm:text-3xl font-bold text-primary-600 mt-1">{selectedPlan.totalAmount} د.ت</p>
              </div>
              <button onClick={() => setSelectedPlan(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Payment Methods */}
            <div className="p-4 sm:p-6 space-y-4">
              <p className="text-gray-600 font-medium text-sm sm:text-base">حوّل المبلغ عبر:</p>

              {/* D17 */}
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-4 border border-orange-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                      <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm sm:text-base">D17</div>
                      <div className="text-xs sm:text-sm text-gray-500">تحويل فوري</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white rounded-xl p-3">
                  <span className="font-mono text-base sm:text-lg font-bold" dir="ltr">58415520</span>
                  <button 
                    onClick={() => copyToClipboard('58415520', 'd17')}
                    className={`p-2 rounded-lg transition-all ${copied === 'd17' ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100'}`}
                  >
                    {copied === 'd17' ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>

              {/* Flouci */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm sm:text-base">Flouci</div>
                      <div className="text-xs sm:text-sm text-gray-500">دفع إلكتروني</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white rounded-xl p-3">
                  <span className="font-mono text-base sm:text-lg font-bold" dir="ltr">58415520</span>
                  <button 
                    onClick={() => copyToClipboard('58415520', 'flouci')}
                    className={`p-2 rounded-lg transition-all ${copied === 'flouci' ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100'}`}
                  >
                    {copied === 'flouci' ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>

              {/* Bank */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                      <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm sm:text-base">BTE Bank</div>
                      <div className="text-xs sm:text-sm text-gray-500">تحويل بنكي</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-white rounded-xl p-3">
                  <span className="font-mono text-xs sm:text-sm font-bold" dir="ltr">24031168005251110132</span>
                  <button 
                    onClick={() => copyToClipboard('24031168005251110132', 'bank')}
                    className={`p-2 rounded-lg transition-all ${copied === 'bank' ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100'}`}
                  >
                    {copied === 'bank' ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>

              {/* After Payment */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <p className="text-gray-700 font-medium mb-3 text-sm sm:text-base">بعد الدفع، أرسل صورة الوصل مع إيميل حسابك:</p>
                <div className="flex gap-2 sm:gap-3">
                  <a 
                    href="https://wa.me/21653518337" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 sm:py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-center transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    واتساب
                  </a>
                  <a 
                    href="https://instagram.com/kestipro" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-bold text-center transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
                    انستغرام
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/21653518337"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 w-14 h-14 sm:w-16 sm:h-16 bg-green-500 hover:bg-green-600 rounded-full shadow-lg shadow-green-500/30 flex items-center justify-center transition-all hover:scale-110 animate-bounce-subtle"
        aria-label="تواصل عبر واتساب"
      >
        <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
      </a>
    </div>
  )
}

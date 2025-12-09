'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Zap, Package, BarChart3, Calculator, Globe, Smartphone, 
  MessageCircle, Check, ChevronDown, ChevronUp, Menu, X,
  Clock, AlertTriangle, Lock, Ban, Rocket, Download,
  Play, Mail, Phone, Send, Star, Shield, Users, Copy,
  CreditCard, Building2, Wallet, Instagram, ArrowLeft,
  Store, Scissors, Coffee, Dumbbell, Wrench, ShoppingBag,
  TrendingUp, Bell, RefreshCw, Cloud, HeadphonesIcon, ServerIcon,
  Sparkles, HandCoins, Receipt, UserCheck, Quote, DollarSign,
  PiggyBank, CircleDollarSign, Banknote, Target, Trophy
} from 'lucide-react'
import { InstallButton } from '@/components/pwa'

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
  @keyframes count-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-float { animation: float 6s ease-in-out infinite; }
  .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
  .animate-float-delay { animation: float 6s ease-in-out infinite; animation-delay: 2s; }
  .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
  .animate-slide-up { animation: slide-up 0.6s ease-out forwards; }
  .animate-slide-in-right { animation: slide-in-right 0.6s ease-out forwards; }
  .animate-scale-in { animation: scale-in 0.5s ease-out forwards; }
  .animate-bounce-subtle { animation: bounce-subtle 2s ease-in-out infinite; }
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
    { name: 'شهري', subtitle: 'مرونة كاملة', price: 19, period: '/شهر', total: null, totalAmount: 19, popular: false, save: null },
    { name: '3 أشهر', subtitle: 'وفر 10%', price: 17, period: '/شهر', total: '51 د.ت إجمالي', totalAmount: 51, popular: true, save: '10%' },
    { name: 'سنوي', subtitle: 'وفر 21%', price: 15, period: '/شهر', total: '180 د.ت إجمالي', totalAmount: 180, popular: false, save: '21%' },
  ]

  const faqs = [
    { q: 'هل يعمل على الحاسوب والتابلت؟', a: 'نعم، يعمل على كل الأجهزة بنفس الحساب. يمكنك البدء من الهاتف ثم الانتقال للحاسوب بدون أي إعدادات إضافية.' },
    { q: 'هل أحتاج إنترنت؟', a: 'نعم، اتصال إنترنت بسيط يكفي. حتى اتصال 3G يعمل بشكل ممتاز.' },
    { q: 'كيف أدفع؟', a: 'عبر D17 أو Flouci أو تحويل بنكي. نوفر طرق دفع متعددة لراحتك.' },
    { q: 'ماذا لو واجهت مشكلة؟', a: 'فريق الدعم متاح على واتساب للرد على أسئلتك. نرد خلال دقائق في أوقات العمل.' },
    { q: 'هل يناسب قاعة رياضية أو جيم؟', a: 'نعم! Kesti Pro يدعم إدارة الاشتراكات والعضويات مع تنبيهات انتهاء تلقائية وتتبع المدفوعات.' },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitted(true)
    setTimeout(() => setFormSubmitted(false), 3000)
    setFormData({ name: '', phone: '', email: '', message: '' })
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

      {/* Hero Section - Clean with Floating Visual */}
      <section className="pt-24 sm:pt-28 pb-12 sm:pb-16 px-4 overflow-hidden relative">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 bg-green-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Text Content */}
            <div className="text-center lg:text-right">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold mb-6">
                <Check className="w-4 h-4" />
                وفر 3,000+ دينار سنوياً
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-5">
                إدارة تجارتك من <span className="text-green-600">تليفونك</span>
              </h1>

              {/* Subtitle */}
              <p className="text-xl text-gray-600 mb-8">
                بيع، مخزون، اشتراكات، كريديات، وأرباح — نظام متكامل لكل الأعمال
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-6">
                <Link href="/register" className="w-full sm:w-auto px-10 py-5 bg-green-600 hover:bg-green-700 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all">
                  جرب مجاناً 15 يوم
                </Link>
                <Link href="/login" className="w-full sm:w-auto px-8 py-5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-lg font-bold rounded-2xl transition-all">
                  عندي حساب
                </Link>
              </div>

              {/* Trust Line */}
              <p className="text-gray-500 text-sm mb-6">بدون بطاقة بنكية • إلغاء أي وقت</p>

              {/* Install Button */}
              <InstallButton variant="primary" />
            </div>

            {/* Floating Visual - Cost Comparison Bars */}
            <div className="relative">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">مقارنة التكلفة السنوية</h3>
                
                {/* Traditional Bar */}
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600 font-medium">كاشير تقليدي</span>
                    <span className="text-red-600 font-bold">3,000+ د.ت</span>
                  </div>
                  <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full" style={{width: '100%'}}></div>
                  </div>
                </div>

                {/* Kesti Bar */}
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600 font-medium">Kesti Pro</span>
                    <span className="text-green-600 font-bold">180 د.ت/سنة</span>
                  </div>
                  <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" style={{width: '6%'}}></div>
                  </div>
                </div>

                {/* Savings */}
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 text-center">
                  <span className="text-green-700">توفيرك: </span>
                  <span className="text-2xl font-bold text-green-600">2,820+ د.ت</span>
                  <span className="text-green-700"> سنوياً</span>
                </div>

                {/* Features Quick List */}
                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>نقطة بيع</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>المخزون</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>الكريديات</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>الاشتراكات</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section - RIGHT AFTER HERO */}
      <section className="py-12 sm:py-16 px-4 bg-gradient-to-br from-primary-900 via-primary-800 to-blue-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">شاهد كيف يعمل Kesti Pro</h2>
          <p className="text-primary-200 text-base sm:text-lg mb-6">دقيقتين فقط تكفي لتفهم كل شي</p>
          
          <div className="relative bg-white/10 backdrop-blur rounded-3xl p-4 sm:p-6 border border-white/20">
            <div className="aspect-video bg-black/30 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center mb-3 mx-auto cursor-pointer hover:bg-white/30 transition-colors animate-pulse-glow">
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white mr-[-4px]" />
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 text-yellow-300 rounded-full text-xs sm:text-sm">
                  <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                  قريباً - Coming Soon
                </div>
              </div>
            </div>
          </div>

          {/* PWA Install Button */}
          <div className="mt-6">
            <InstallButton variant="secondary" />
          </div>
        </div>
      </section>

      {/* UVP #2: Net Profit Section */}
      <section className="py-16 sm:py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div className="text-center lg:text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-bold mb-4">
                <Target className="w-4 h-4" />
                مشكلة حقيقية
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                مبيعات كثيرة لكن الربح مجهول؟
              </h2>
              <p className="text-gray-600 text-lg mb-6">
                بعت 2,000 دينار اليوم. لكن بعد الإيجار والكهرباء والماء... كم بقي فعلاً؟
              </p>
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-gray-600">مبيعات اليوم</span>
                    <span className="text-2xl font-bold text-green-600">2,000 د.ت</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">- إيجار (يومي)</span>
                    <span className="text-red-500">-33 د.ت</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">- كهرباء (يومي)</span>
                    <span className="text-red-500">-10 د.ت</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">- تكلفة البضاعة</span>
                    <span className="text-red-500">-1,400 د.ت</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">- مصاريف أخرى</span>
                    <span className="text-red-500">-107 د.ت</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t-2 border-primary-200">
                    <span className="font-bold text-gray-900">الربح الصافي الحقيقي</span>
                    <span className="text-3xl font-bold text-primary-600">450 د.ت</span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-primary-600 font-bold">Kesti Pro يريك الحقيقة كل يوم ✨</p>
            </div>

            {/* Visual */}
            <div className="relative">
              <div className="bg-gradient-to-br from-orange-100 to-yellow-100 rounded-3xl p-8 text-center">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center mb-6 shadow-xl">
                  <TrendingUp className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">تعرف ربحك الحقيقي</h3>
                <p className="text-gray-600">بعد كل المصاريف — بدون تخمين</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* UVP #3: Credit Tracking */}
      <section className="py-16 sm:py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Visual */}
            <div className="order-2 lg:order-1">
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-3xl p-6 border border-red-100">
                <div className="space-y-3">
                  {/* Fake debt list */}
                  <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold">أ</div>
                      <div>
                        <div className="font-bold">أحمد العلوي</div>
                        <div className="text-xs text-gray-500">منذ 15 يوم</div>
                      </div>
                    </div>
                    <span className="text-red-600 font-bold">320 د.ت</span>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">م</div>
                      <div>
                        <div className="font-bold">محمد السالم</div>
                        <div className="text-xs text-gray-500">منذ 8 أيام</div>
                      </div>
                    </div>
                    <span className="text-orange-600 font-bold">180 د.ت</span>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold">س</div>
                      <div>
                        <div className="font-bold">سامي بن علي</div>
                        <div className="text-xs text-gray-500">منذ 3 أيام</div>
                      </div>
                    </div>
                    <span className="text-yellow-600 font-bold">350 د.ت</span>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-red-100 rounded-xl text-center">
                  <span className="text-red-700 font-bold">إجمالي الديون: </span>
                  <span className="text-2xl font-bold text-red-600">850 د.ت</span>
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="order-1 lg:order-2 text-center lg:text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-sm font-bold mb-4">
                <HandCoins className="w-4 h-4" />
                فلوس ضايعة؟
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                كم واحد عليه فلوسك؟
              </h2>
              <p className="text-gray-600 text-lg mb-6">
                تتبع كل الديون وما تضيع ولا مليم.
              </p>
              <ul className="space-y-3 text-right">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>سجل كل دين باسم العميل</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>تذكير بالمبالغ المستحقة</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>دفع جزئي أو كامل</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>تاريخ كامل لكل عميل</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Three Segments Section */}
      <section className="py-16 sm:py-20 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">نظام واحد لكل أنواع الأعمال</h2>
            <p className="text-gray-600 text-base sm:text-lg">محل تجاري؟ جيم؟ مستقل؟ Kesti Pro يناسبك</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Retail */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-blue-100 hover:border-blue-300 transition-all hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <Store className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">المحلات والبقالات</h3>
              <p className="text-gray-500 text-sm mb-4">بيع المنتجات وتتبع المخزون</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-blue-500" />نقطة بيع سريعة</li>
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-blue-500" />تنبيهات المخزون</li>
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-blue-500" />الكريديات</li>
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-blue-500" />الربح الصافي</li>
              </ul>
              <div className="mt-4 p-3 bg-blue-50 rounded-xl text-center">
                <span className="text-blue-700 text-sm font-bold">💡 وفر 3,000+ د.ت على الكاشير</span>
              </div>
            </div>

            {/* Gyms */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-purple-100 hover:border-purple-300 transition-all hover:-translate-y-2 relative">
              <div className="absolute -top-3 right-4 bg-purple-500 text-white text-xs px-3 py-1 rounded-full font-bold">مميز للجيم</div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <Dumbbell className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">القاعات الرياضية</h3>
              <p className="text-gray-500 text-sm mb-4">إدارة الاشتراكات والعضويات</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-purple-500" />تنبيهات انتهاء تلقائية</li>
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-purple-500" />تتبع المدفوعات</li>
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-purple-500" />أنواع اشتراكات متعددة</li>
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-purple-500" />تجميد العضويات</li>
              </ul>
              <div className="mt-4 p-3 bg-purple-50 rounded-xl text-center">
                <span className="text-purple-700 text-sm font-bold">💪 وفر 4,000+ د.ت</span>
              </div>
            </div>

            {/* Freelancers */}
            <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-green-100 hover:border-green-300 transition-all hover:-translate-y-2">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <UserCheck className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">المستقلين والخدمات</h3>
              <p className="text-gray-500 text-sm mb-4">مدرب؟ مصمم؟ محاسب؟</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-green-500" />تتبع العملاء</li>
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-green-500" />جلسات ومواعيد</li>
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-green-500" />فوترة سهلة</li>
                <li className="flex items-center gap-2 text-gray-600"><Check className="w-4 h-4 text-green-500" />تقارير الدخل</li>
              </ul>
              <div className="mt-4 p-3 bg-green-50 rounded-xl text-center">
                <span className="text-green-700 text-sm font-bold">📱 كل شي من تليفونك</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* All Features Section */}
      <section id="features" className="py-16 sm:py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">كل شي تحتاجه في نظام واحد</h2>
            <p className="text-gray-600 text-base sm:text-lg">من البيع للمخزون للأرباح — الكل بضغطة زر</p>
          </div>

          {/* Main Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Zap, title: 'بيع سريع', desc: 'ضغطتين والبيع يحفظ', color: 'from-yellow-400 to-orange-500' },
              { icon: Package, title: 'متابعة المخزون', desc: 'تنبيه قبل النفاد', color: 'from-blue-400 to-cyan-500' },
              { icon: TrendingUp, title: 'الربح الصافي', desc: 'بعد كل المصاريف', color: 'from-green-400 to-emerald-500' },
              { icon: HandCoins, title: 'الكريديات', desc: 'تتبع من يدينك', color: 'from-orange-400 to-red-500' },
              { icon: Users, title: 'الاشتراكات', desc: 'للجيم والخدمات', color: 'from-purple-400 to-pink-500' },
              { icon: Globe, title: 'من أي مكان', desc: 'تابع من البيت', color: 'from-indigo-400 to-blue-500' },
            ].map((feature, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-all hover:-translate-y-1">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-3`}>
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1 text-sm sm:text-base">{feature.title}</h3>
                <p className="text-gray-500 text-xs sm:text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 sm:py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">أسعار بسيطة وواضحة</h2>
            <p className="text-gray-600 text-base sm:text-lg">كل الباقات تشمل كل المميزات • بدون مفاجآت</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {pricing.map((plan, i) => (
              <div 
                key={i} 
                className={`relative p-6 sm:p-8 rounded-3xl border-2 transition-all hover:-translate-y-2 cursor-pointer ${
                  plan.popular 
                    ? 'border-primary-500 bg-gradient-to-b from-primary-50 to-white shadow-xl' 
                    : 'border-gray-200 bg-white hover:border-primary-200 hover:shadow-lg'
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary-600 text-white text-xs font-bold rounded-full">الأكثر طلباً</div>
                )}
                {plan.name === 'سنوي' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-green-500 text-white text-xs font-bold rounded-full">+ شهر هدية</div>
                )}
                
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{plan.subtitle}</p>
                  
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500">د.ت{plan.period}</span>
                  </div>
                  
                  {plan.total && <p className="text-sm text-gray-500 mb-4">{plan.total}</p>}
                  
                  <button className={`w-full py-3 rounded-xl font-bold transition-all ${
                    plan.popular
                      ? 'bg-primary-600 text-white hover:shadow-lg'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}>
                    اشترك الآن
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Big CTA After Pricing */}
          <div className="text-center p-6 sm:p-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl shadow-xl shadow-green-500/20">
            <p className="text-2xl sm:text-3xl font-bold text-white mb-2">🎁 جرب 15 يوم مجاناً</p>
            <p className="text-green-100 mb-6">بدون بطاقة بنكية • بدون التزام • إلغاء في أي وقت</p>
            <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-green-700 text-lg font-bold rounded-xl hover:bg-green-50 transition-all hover:shadow-lg">
              <Rocket className="w-5 h-5" />
              سجل الآن وابدأ فوراً
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">أسئلة شائعة</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-5 py-4 flex items-center justify-between text-right hover:bg-gray-100 transition-colors"
                >
                  <span className="font-bold text-gray-900 text-sm sm:text-base">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-gray-600 border-t border-gray-200 pt-3 text-sm">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 sm:py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">تواصل معنا</h2>
            <p className="text-gray-600">أرسل استفسارك وسنرد عليك في أقرب وقت</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="أدخل اسمك"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الهاتف *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="أدخل رقم هاتفك"
                    dir="ltr"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">استفسارك *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  placeholder="اكتب استفسارك هنا"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                إرسال
              </button>

              {formSubmitted && (
                <div className="text-center p-4 bg-green-50 text-green-700 rounded-xl">
                  <Check className="w-6 h-6 mx-auto mb-2" />
                  تم إرسال استفسارك بنجاح!
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Final CTA - Urgency & Value */}
      <section className="py-20 sm:py-24 px-4 bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative">
          {/* Urgency Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-full text-sm font-bold mb-6 animate-bounce-subtle">
            <Sparkles className="w-4 h-4" />
            عرض محدود: 15 يوم تجربة مجانية
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            وفر <span className="text-green-400">3,000+ د.ت</span> وابدأ اليوم
          </h2>
          <p className="text-gray-300 text-lg sm:text-xl mb-8 max-w-2xl mx-auto">
            كل يوم بدون Kesti Pro = فرصة ضائعة لتتبع أرباحك الحقيقية
          </p>
          
          {/* Big CTA Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <Link href="/register" className="group w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-green-400 via-emerald-500 to-green-500 text-gray-900 text-xl font-bold rounded-2xl shadow-2xl shadow-green-500/30 hover:shadow-green-500/50 transition-all transform hover:-translate-y-1 hover:scale-[1.02] flex items-center justify-center gap-3">
              <Rocket className="w-6 h-6" />
              سجل الآن — مجاني تماماً
            </Link>
            <Link href="/login" className="w-full sm:w-auto px-8 py-5 border-2 border-white/30 text-white text-lg font-bold rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              دخول حسابي
            </Link>
          </div>
          
          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
            <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-400" />بياناتك محمية 100%</span>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-green-400" />بدون بطاقة بنكية</span>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-green-400" />إلغاء في أي وقت</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/landing">
              <Image src="/kesti.png" alt="Kesti Pro" width={48} height={48} className="w-12 h-12 rounded-xl" />
            </Link>
            
            <div className="flex items-center gap-6 text-sm">
              <a href="mailto:support@kestipro.com" className="flex items-center gap-2 hover:text-white">
                <Mail className="w-4 h-4" />
                support@kestipro.com
              </a>
              <a href="tel:+21653518337" className="flex items-center gap-2 hover:text-white">
                <Phone className="w-4 h-4" />
                53518337
              </a>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-800 text-center text-sm">
            <p>© 2025 Kesti Pro. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>

      {/* Payment Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPlan(null)}>
          <div 
            className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-auto animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">باقة {selectedPlan.name}</h3>
                <p className="text-2xl font-bold text-primary-600 mt-1">{selectedPlan.totalAmount} د.ت</p>
              </div>
              <button onClick={() => setSelectedPlan(null)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-600 font-medium">حوّل المبلغ عبر:</p>

              {/* D17 */}
              <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div className="font-bold">D17</div>
                </div>
                <div className="flex items-center justify-between bg-white rounded-xl p-3">
                  <span className="font-mono text-lg font-bold" dir="ltr">58415520</span>
                  <button 
                    onClick={() => copyToClipboard('58415520', 'd17')}
                    className={`p-2 rounded-lg ${copied === 'd17' ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100'}`}
                  >
                    {copied === 'd17' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Flouci */}
              <div className="bg-purple-50 rounded-2xl p-4 border border-purple-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div className="font-bold">Flouci</div>
                </div>
                <div className="flex items-center justify-between bg-white rounded-xl p-3">
                  <span className="font-mono text-lg font-bold" dir="ltr">58415520</span>
                  <button 
                    onClick={() => copyToClipboard('58415520', 'flouci')}
                    className={`p-2 rounded-lg ${copied === 'flouci' ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100'}`}
                  >
                    {copied === 'flouci' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* After Payment */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-gray-700 font-medium mb-3">بعد الدفع، أرسل صورة الوصل:</p>
                <div className="flex gap-3">
                  <a 
                    href="https://wa.me/21653518337" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold text-center flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    واتساب
                  </a>
                  <a 
                    href="https://instagram.com/kestipro" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-center flex items-center justify-center gap-2"
                  >
                    <Instagram className="w-5 h-5" />
                    انستغرام
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Buttons */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3">
        {/* Install App Button - Mobile Only */}
        <InstallButton variant="primary" showText={false} className="w-14 h-14 rounded-full shadow-lg" />
        
        {/* WhatsApp */}
        <a
          href="https://wa.me/21653518337"
          target="_blank"
          rel="noopener noreferrer"
          className="w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        >
          <MessageCircle className="w-7 h-7 text-white" />
        </a>
      </div>
    </div>
  )
}

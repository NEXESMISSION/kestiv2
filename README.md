# KESTI Pro - نظام إدارة الأعمال

نظام متكامل لإدارة الأعمال التجارية مبني باستخدام Next.js و Supabase.

## المتطلبات

- Node.js 18+ 
- حساب Supabase

## التثبيت

1. **تثبيت الحزم:**
```bash
npm install
```

2. **إعداد المتغيرات البيئية:**
   
   عدّل ملف `.env.local` وأضف مفاتيح Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=https://mmvddostklktfhvonrvp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```

3. **إعداد قاعدة البيانات:**
   
   افتح Supabase SQL Editor وقم بتشغيل الأوامر التالية:

```sql
-- 1. Create the Business Mode Enum
create type business_mode as enum (
  'subscription', -- Gyms, Working Spaces
  'retail',       -- Stores, Small Projects (Piece/Weight)
  'service',      -- Freelancers, Consultants
  'hospitality'   -- Restaurants, Coffee Shops
);

-- 2. Create Profiles Table linked to Auth Users
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text not null,
  phone_number text,
  business_mode business_mode not null default 'retail',
  pin_code varchar(6), -- The 4-6 digit security PIN
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 4. Create Security Policies
-- Allow users to view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

-- Allow users to insert their own profile during signup
create policy "Users can insert own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

-- Allow users to update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );
```

4. **تشغيل التطبيق:**
```bash
npm run dev
```

5. **افتح المتصفح:**
   
   اذهب إلى [http://localhost:3000](http://localhost:3000)

## الهيكل

```
src/
├── app/
│   ├── dashboard/      # لوحة التحكم
│   ├── login/          # تسجيل الدخول
│   ├── register/       # إنشاء حساب
│   ├── globals.css     # الأنماط العامة
│   ├── layout.tsx      # التخطيط الرئيسي
│   └── page.tsx        # الصفحة الرئيسية
├── lib/
│   ├── supabase/       # إعدادات Supabase
│   └── validations/    # التحقق من البيانات
├── types/
│   └── database.ts     # أنواع TypeScript
└── middleware.ts       # حماية المسارات
```

## الميزات

- ✅ تسجيل مستخدمين جدد (خطوتين)
- ✅ تسجيل الدخول
- ✅ لوحة تحكم محمية
- ✅ دعم RTL العربية
- ✅ 4 أنواع أعمال (اشتراكات، تجزئة، خدمات، ضيافة)
- ✅ كود PIN للأمان
- ✅ Row Level Security

## الأمان

- جميع المسارات المحمية تتطلب تسجيل دخول
- RLS مفعّل على جدول profiles
- كود PIN مشفر للعمليات الحساسة
- التحقق من صحة البيانات باستخدام Zod

## إدارة قاعدة البيانات

لإعادة ضبط قاعدة البيانات أو تحديثها، استخدم الملف `database-management.sql` الموحد:

### إعادة ضبط قاعدة البيانات

الملف `database-management.sql` يقوم بالعمليات التالية:

1. **إعادة ضبط قاعدة البيانات** - حذف كل البيانات مع الاحتفاظ فقط بحساب support@kestipro.com
2. **تحديث الهيكل** - التأكد من وجود جميع الأعمدة المطلوبة
3. **إعداد التخزين** - تهيئة مساحة التخزين للملفات المرفوعة
4. **إصلاح سياسات الأمان** - التأكد من تطبيق سياسات RLS بشكل صحيح

### ملاحظة مهمة

⚠️ **تنبيه: هذه العملية ستحذف جميع البيانات باستثناء حساب support@kestipro.com** ⚠️

تأكد من عمل نسخة احتياطية إذا كنت بحاجة للاحتفاظ بأي بيانات.

### التحقق من نجاح العملية

بعد تنفيذ السكريبت، سيظهر عدد السجلات المتبقية في الجداول الأساسية وتفاصيل الحساب المتبقي.

## Migration Note

إذا كان لديك بيانات موجودة بدون business_mode:

```sql
UPDATE public.profiles
SET business_mode = 'retail'
WHERE business_mode IS NULL;
```

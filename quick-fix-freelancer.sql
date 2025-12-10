-- =====================================================
-- QUICK FIX - Run this in Supabase SQL Editor
-- This fixes the freelancer tables and RLS policies
-- =====================================================

-- 1. Add pin_code column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_code TEXT;

-- 2. Create freelancer_clients table
CREATE TABLE IF NOT EXISTS public.freelancer_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  total_spent DECIMAL(10,3) DEFAULT 0,
  total_credit DECIMAL(10,3) DEFAULT 0,
  projects_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create freelancer_categories table
CREATE TABLE IF NOT EXISTS public.freelancer_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create freelancer_payments table
CREATE TABLE IF NOT EXISTS public.freelancer_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.freelancer_clients(id) ON DELETE SET NULL,
  project_id UUID,
  amount DECIMAL(10,3) NOT NULL,
  payment_type TEXT DEFAULT 'full' CHECK (payment_type IN ('full', 'partial', 'deposit', 'general', 'credit', 'cash')),
  category_id UUID,
  category TEXT DEFAULT 'عام',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create freelancer_expenses table
CREATE TABLE IF NOT EXISTS public.freelancer_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,3) NOT NULL,
  category_id UUID,
  category TEXT DEFAULT 'عام',
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create freelancer_reminders table
CREATE TABLE IF NOT EXISTS public.freelancer_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID,
  project_id UUID,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'عام',
  date DATE NOT NULL,
  is_done BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Enable RLS on all tables
ALTER TABLE public.freelancer_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_reminders ENABLE ROW LEVEL SECURITY;

-- 8. DROP existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "freelancer_clients_select" ON public.freelancer_clients;
DROP POLICY IF EXISTS "freelancer_clients_insert" ON public.freelancer_clients;
DROP POLICY IF EXISTS "freelancer_clients_update" ON public.freelancer_clients;
DROP POLICY IF EXISTS "freelancer_clients_delete" ON public.freelancer_clients;

DROP POLICY IF EXISTS "freelancer_categories_select" ON public.freelancer_categories;
DROP POLICY IF EXISTS "freelancer_categories_insert" ON public.freelancer_categories;
DROP POLICY IF EXISTS "freelancer_categories_update" ON public.freelancer_categories;
DROP POLICY IF EXISTS "freelancer_categories_delete" ON public.freelancer_categories;

DROP POLICY IF EXISTS "freelancer_payments_select" ON public.freelancer_payments;
DROP POLICY IF EXISTS "freelancer_payments_insert" ON public.freelancer_payments;

DROP POLICY IF EXISTS "freelancer_expenses_select" ON public.freelancer_expenses;
DROP POLICY IF EXISTS "freelancer_expenses_insert" ON public.freelancer_expenses;

DROP POLICY IF EXISTS "freelancer_reminders_select" ON public.freelancer_reminders;
DROP POLICY IF EXISTS "freelancer_reminders_insert" ON public.freelancer_reminders;
DROP POLICY IF EXISTS "freelancer_reminders_update" ON public.freelancer_reminders;
DROP POLICY IF EXISTS "freelancer_reminders_delete" ON public.freelancer_reminders;

-- Also drop old-named policies
DROP POLICY IF EXISTS "Users can view own freelancer_clients" ON public.freelancer_clients;
DROP POLICY IF EXISTS "Users can insert own freelancer_clients" ON public.freelancer_clients;
DROP POLICY IF EXISTS "Users can update own freelancer_clients" ON public.freelancer_clients;
DROP POLICY IF EXISTS "Users can delete own freelancer_clients" ON public.freelancer_clients;

DROP POLICY IF EXISTS "Users can view own freelancer_categories" ON public.freelancer_categories;
DROP POLICY IF EXISTS "Users can insert own freelancer_categories" ON public.freelancer_categories;
DROP POLICY IF EXISTS "Users can update own freelancer_categories" ON public.freelancer_categories;
DROP POLICY IF EXISTS "Users can delete own freelancer_categories" ON public.freelancer_categories;

DROP POLICY IF EXISTS "Users can view own freelancer_payments" ON public.freelancer_payments;
DROP POLICY IF EXISTS "Users can insert own freelancer_payments" ON public.freelancer_payments;

DROP POLICY IF EXISTS "Users can view own freelancer_expenses" ON public.freelancer_expenses;
DROP POLICY IF EXISTS "Users can insert own freelancer_expenses" ON public.freelancer_expenses;

DROP POLICY IF EXISTS "Users can view own freelancer_reminders" ON public.freelancer_reminders;
DROP POLICY IF EXISTS "Users can insert own freelancer_reminders" ON public.freelancer_reminders;
DROP POLICY IF EXISTS "Users can update own freelancer_reminders" ON public.freelancer_reminders;
DROP POLICY IF EXISTS "Users can delete own freelancer_reminders" ON public.freelancer_reminders;

-- 9. CREATE new policies with unique names
-- freelancer_clients
CREATE POLICY "freelancer_clients_select" ON public.freelancer_clients FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "freelancer_clients_insert" ON public.freelancer_clients FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "freelancer_clients_update" ON public.freelancer_clients FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "freelancer_clients_delete" ON public.freelancer_clients FOR DELETE USING (auth.uid() = business_id);

-- freelancer_categories
CREATE POLICY "freelancer_categories_select" ON public.freelancer_categories FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "freelancer_categories_insert" ON public.freelancer_categories FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "freelancer_categories_update" ON public.freelancer_categories FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "freelancer_categories_delete" ON public.freelancer_categories FOR DELETE USING (auth.uid() = business_id);

-- freelancer_payments
CREATE POLICY "freelancer_payments_select" ON public.freelancer_payments FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "freelancer_payments_insert" ON public.freelancer_payments FOR INSERT WITH CHECK (auth.uid() = business_id);

-- freelancer_expenses
CREATE POLICY "freelancer_expenses_select" ON public.freelancer_expenses FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "freelancer_expenses_insert" ON public.freelancer_expenses FOR INSERT WITH CHECK (auth.uid() = business_id);

-- freelancer_reminders
CREATE POLICY "freelancer_reminders_select" ON public.freelancer_reminders FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "freelancer_reminders_insert" ON public.freelancer_reminders FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "freelancer_reminders_update" ON public.freelancer_reminders FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "freelancer_reminders_delete" ON public.freelancer_reminders FOR DELETE USING (auth.uid() = business_id);

-- 10. Create indexes
CREATE INDEX IF NOT EXISTS idx_freelancer_clients_business ON public.freelancer_clients(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_categories_business ON public.freelancer_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_payments_business ON public.freelancer_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_expenses_business ON public.freelancer_expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_reminders_business ON public.freelancer_reminders(business_id);

-- 11. Grant permissions
GRANT ALL ON public.freelancer_clients TO authenticated;
GRANT ALL ON public.freelancer_categories TO authenticated;
GRANT ALL ON public.freelancer_payments TO authenticated;
GRANT ALL ON public.freelancer_expenses TO authenticated;
GRANT ALL ON public.freelancer_reminders TO authenticated;

-- DONE! 
-- Now refresh your page and try again

-- =====================================================
-- KESTI Pro - Database Migration 2024
-- Run this script in Supabase SQL Editor
-- This adds missing columns and tables
-- =====================================================

-- =====================================================
-- 1. UPDATE subscription_plans TABLE
-- Add sessions and plan_type for package/single session support
-- =====================================================
DO $$ 
BEGIN
  -- Add sessions column (for package plans)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'subscription_plans' AND column_name = 'sessions') THEN
    ALTER TABLE public.subscription_plans ADD COLUMN sessions INTEGER DEFAULT 0;
    COMMENT ON COLUMN public.subscription_plans.sessions IS 'Number of sessions for package plans (0 = time-based)';
  END IF;

  -- Add plan_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'subscription_plans' AND column_name = 'plan_type') THEN
    ALTER TABLE public.subscription_plans ADD COLUMN plan_type TEXT DEFAULT 'subscription' 
      CHECK (plan_type IN ('subscription', 'package', 'single'));
    COMMENT ON COLUMN public.subscription_plans.plan_type IS 'subscription=time-based, package=multiple sessions, single=one session';
  END IF;
END $$;

-- =====================================================
-- 2. UPDATE members TABLE
-- Add session tracking and plan type
-- =====================================================
DO $$ 
BEGIN
  -- Add plan_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'plan_type') THEN
    ALTER TABLE public.members ADD COLUMN plan_type TEXT DEFAULT 'subscription'
      CHECK (plan_type IN ('subscription', 'package', 'single'));
  END IF;

  -- Add plan_start_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'plan_start_at') THEN
    ALTER TABLE public.members ADD COLUMN plan_start_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add sessions_total column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'sessions_total') THEN
    ALTER TABLE public.members ADD COLUMN sessions_total INTEGER DEFAULT 0;
  END IF;

  -- Add sessions_used column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'sessions_used') THEN
    ALTER TABLE public.members ADD COLUMN sessions_used INTEGER DEFAULT 0;
  END IF;

  -- Make expires_at nullable (single sessions don't have expiry)
  ALTER TABLE public.members ALTER COLUMN expires_at DROP NOT NULL;
END $$;

-- =====================================================
-- 3. UPDATE products TABLE
-- Add missing columns
-- =====================================================
DO $$ 
BEGIN
  -- Add cost_price column (alias for cost)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'cost_price') THEN
    ALTER TABLE public.products ADD COLUMN cost_price DECIMAL(10,3) DEFAULT 0;
  END IF;

  -- Add category_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'category_id') THEN
    ALTER TABLE public.products ADD COLUMN category_id UUID;
  END IF;

  -- Add track_stock column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'track_stock') THEN
    ALTER TABLE public.products ADD COLUMN track_stock BOOLEAN DEFAULT true;
  END IF;

  -- Add image_url column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'image_url') THEN
    ALTER TABLE public.products ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- =====================================================
-- 4. UPDATE transactions TABLE
-- Add customer_id for retail and items JSONB
-- =====================================================
DO $$ 
BEGIN
  -- Add customer_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'customer_id') THEN
    ALTER TABLE public.transactions ADD COLUMN customer_id UUID;
  END IF;

  -- Add items JSONB column for storing cart items
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'items') THEN
    ALTER TABLE public.transactions ADD COLUMN items JSONB;
  END IF;

  -- Update type constraint to include 'sale'
  ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
  ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
    CHECK (type IN ('subscription', 'retail', 'service', 'debt_payment', 'sale'));
END $$;

-- =====================================================
-- 5. CREATE retail_customers TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.retail_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  total_debt DECIMAL(10,3) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.retail_customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own retail_customers" ON public.retail_customers;
DROP POLICY IF EXISTS "Users can insert own retail_customers" ON public.retail_customers;
DROP POLICY IF EXISTS "Users can update own retail_customers" ON public.retail_customers;
DROP POLICY IF EXISTS "Users can delete own retail_customers" ON public.retail_customers;

-- Create policies
CREATE POLICY "Users can view own retail_customers" ON public.retail_customers
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own retail_customers" ON public.retail_customers
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own retail_customers" ON public.retail_customers
  FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Users can delete own retail_customers" ON public.retail_customers
  FOR DELETE USING (auth.uid() = business_id);

-- =====================================================
-- 6. CREATE categories TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;

-- Create policies
CREATE POLICY "Users can view own categories" ON public.categories
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Users can delete own categories" ON public.categories
  FOR DELETE USING (auth.uid() = business_id);

-- Add foreign key to products
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'products_category_id_fkey' AND table_name = 'products') THEN
    ALTER TABLE public.products 
      ADD CONSTRAINT products_category_id_fkey 
      FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- 7. CREATE expenses TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,3) NOT NULL,
  category TEXT DEFAULT 'عام',
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON public.expenses;

-- Create policies
CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = business_id);

-- =====================================================
-- 8. CREATE subscription_history TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  plan_name TEXT,
  type TEXT NOT NULL CHECK (type IN ('subscription', 'session_add', 'session_use', 'plan_change', 'service', 'freeze', 'unfreeze', 'cancellation')),
  sessions_added INTEGER DEFAULT 0,
  sessions_before INTEGER DEFAULT 0,
  sessions_after INTEGER DEFAULT 0,
  expires_before TIMESTAMP WITH TIME ZONE,
  expires_after TIMESTAMP WITH TIME ZONE,
  amount DECIMAL(10,3) DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'debt')),
  notes TEXT,
  old_plan_id UUID,
  new_plan_id UUID,
  old_plan_name TEXT,
  new_plan_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own subscription_history" ON public.subscription_history;
DROP POLICY IF EXISTS "Users can insert own subscription_history" ON public.subscription_history;

-- Create policies
CREATE POLICY "Users can view own subscription_history" ON public.subscription_history
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own subscription_history" ON public.subscription_history
  FOR INSERT WITH CHECK (auth.uid() = business_id);

-- =====================================================
-- 9. CREATE debt_payments TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.debt_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.retail_customers(id) ON DELETE CASCADE NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount DECIMAL(10,3) NOT NULL,
  payment_type TEXT DEFAULT 'partial' CHECK (payment_type IN ('full', 'partial')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own debt_payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Users can insert own debt_payments" ON public.debt_payments;

-- Create policies
CREATE POLICY "Users can view own debt_payments" ON public.debt_payments
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own debt_payments" ON public.debt_payments
  FOR INSERT WITH CHECK (auth.uid() = business_id);

-- =====================================================
-- 10. ADD INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_retail_customers_business_id ON public.retail_customers(business_id);
CREATE INDEX IF NOT EXISTS idx_categories_business_id ON public.categories(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_business_id ON public.expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_subscription_history_member_id ON public.subscription_history(member_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON public.subscription_history(created_at);
CREATE INDEX IF NOT EXISTS idx_members_plan_type ON public.members(plan_type);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON public.transactions(customer_id);

-- =====================================================
-- 11. ADD FOREIGN KEY from transactions to retail_customers
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_customer_id_fkey' AND table_name = 'transactions') THEN
    ALTER TABLE public.transactions 
      ADD CONSTRAINT transactions_customer_id_fkey 
      FOREIGN KEY (customer_id) REFERENCES public.retail_customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- 12. UPDATE profiles TABLE for super admin
-- Ensure required columns exist
-- =====================================================
DO $$ 
BEGIN
  -- Add pin_code column if not exists (for settings access)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'pin_code') THEN
    ALTER TABLE public.profiles ADD COLUMN pin_code TEXT;
  END IF;

  -- Add is_paused column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_paused') THEN
    ALTER TABLE public.profiles ADD COLUMN is_paused BOOLEAN DEFAULT false;
  END IF;

  -- Add pause_reason column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'pause_reason') THEN
    ALTER TABLE public.profiles ADD COLUMN pause_reason TEXT;
  END IF;

  -- Add subscription_days column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_days') THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_days INTEGER;
  END IF;
  
  -- Add business_mode column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'business_mode') THEN
    ALTER TABLE public.profiles ADD COLUMN business_mode TEXT DEFAULT 'subscription';
  END IF;
END $$;

-- =====================================================
-- 13. FREELANCER TABLES
-- =====================================================

-- Create freelancer_clients table
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.freelancer_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own freelancer_clients" ON public.freelancer_clients;
DROP POLICY IF EXISTS "Users can insert own freelancer_clients" ON public.freelancer_clients;
DROP POLICY IF EXISTS "Users can update own freelancer_clients" ON public.freelancer_clients;
DROP POLICY IF EXISTS "Users can delete own freelancer_clients" ON public.freelancer_clients;

CREATE POLICY "Users can view own freelancer_clients" ON public.freelancer_clients FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer_clients" ON public.freelancer_clients FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own freelancer_clients" ON public.freelancer_clients FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Users can delete own freelancer_clients" ON public.freelancer_clients FOR DELETE USING (auth.uid() = business_id);

-- Create freelancer_categories table
CREATE TABLE IF NOT EXISTS public.freelancer_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.freelancer_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own freelancer_categories" ON public.freelancer_categories;
DROP POLICY IF EXISTS "Users can insert own freelancer_categories" ON public.freelancer_categories;
DROP POLICY IF EXISTS "Users can update own freelancer_categories" ON public.freelancer_categories;
DROP POLICY IF EXISTS "Users can delete own freelancer_categories" ON public.freelancer_categories;

CREATE POLICY "Users can view own freelancer_categories" ON public.freelancer_categories FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer_categories" ON public.freelancer_categories FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own freelancer_categories" ON public.freelancer_categories FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Users can delete own freelancer_categories" ON public.freelancer_categories FOR DELETE USING (auth.uid() = business_id);

-- Create freelancer_payments table (income)
CREATE TABLE IF NOT EXISTS public.freelancer_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.freelancer_clients(id) ON DELETE SET NULL,
  project_id UUID,
  amount DECIMAL(10,3) NOT NULL,
  payment_type TEXT DEFAULT 'full' CHECK (payment_type IN ('full', 'partial', 'deposit', 'general', 'credit')),
  category_id UUID REFERENCES public.freelancer_categories(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'عام',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.freelancer_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own freelancer_payments" ON public.freelancer_payments;
DROP POLICY IF EXISTS "Users can insert own freelancer_payments" ON public.freelancer_payments;

CREATE POLICY "Users can view own freelancer_payments" ON public.freelancer_payments FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer_payments" ON public.freelancer_payments FOR INSERT WITH CHECK (auth.uid() = business_id);

-- Create freelancer_expenses table
CREATE TABLE IF NOT EXISTS public.freelancer_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,3) NOT NULL,
  category_id UUID REFERENCES public.freelancer_categories(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'عام',
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.freelancer_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own freelancer_expenses" ON public.freelancer_expenses;
DROP POLICY IF EXISTS "Users can insert own freelancer_expenses" ON public.freelancer_expenses;

CREATE POLICY "Users can view own freelancer_expenses" ON public.freelancer_expenses FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer_expenses" ON public.freelancer_expenses FOR INSERT WITH CHECK (auth.uid() = business_id);

-- Create freelancer_projects table
CREATE TABLE IF NOT EXISTS public.freelancer_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.freelancer_clients(id) ON DELETE CASCADE NOT NULL,
  service_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  total_price DECIMAL(10,3) DEFAULT 0,
  deposit DECIMAL(10,3) DEFAULT 0,
  paid_amount DECIMAL(10,3) DEFAULT 0,
  remaining DECIMAL(10,3) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'delivered', 'completed', 'cancelled')),
  deadline DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.freelancer_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own freelancer_projects" ON public.freelancer_projects;
DROP POLICY IF EXISTS "Users can insert own freelancer_projects" ON public.freelancer_projects;
DROP POLICY IF EXISTS "Users can update own freelancer_projects" ON public.freelancer_projects;

CREATE POLICY "Users can view own freelancer_projects" ON public.freelancer_projects FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer_projects" ON public.freelancer_projects FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own freelancer_projects" ON public.freelancer_projects FOR UPDATE USING (auth.uid() = business_id);

-- Create freelancer_reminders table
CREATE TABLE IF NOT EXISTS public.freelancer_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.freelancer_clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.freelancer_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'عام',
  date DATE NOT NULL,
  is_done BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.freelancer_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own freelancer_reminders" ON public.freelancer_reminders;
DROP POLICY IF EXISTS "Users can insert own freelancer_reminders" ON public.freelancer_reminders;
DROP POLICY IF EXISTS "Users can update own freelancer_reminders" ON public.freelancer_reminders;
DROP POLICY IF EXISTS "Users can delete own freelancer_reminders" ON public.freelancer_reminders;

CREATE POLICY "Users can view own freelancer_reminders" ON public.freelancer_reminders FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer_reminders" ON public.freelancer_reminders FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own freelancer_reminders" ON public.freelancer_reminders FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Users can delete own freelancer_reminders" ON public.freelancer_reminders FOR DELETE USING (auth.uid() = business_id);

-- Create indexes for freelancer tables
CREATE INDEX IF NOT EXISTS idx_freelancer_clients_business_id ON public.freelancer_clients(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_categories_business_id ON public.freelancer_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_payments_business_id ON public.freelancer_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_expenses_business_id ON public.freelancer_expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_projects_business_id ON public.freelancer_projects(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_reminders_business_id ON public.freelancer_reminders(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_reminders_date ON public.freelancer_reminders(date);

-- Grant permissions
GRANT ALL ON public.freelancer_clients TO authenticated;
GRANT ALL ON public.freelancer_categories TO authenticated;
GRANT ALL ON public.freelancer_payments TO authenticated;
GRANT ALL ON public.freelancer_expenses TO authenticated;
GRANT ALL ON public.freelancer_projects TO authenticated;
GRANT ALL ON public.freelancer_reminders TO authenticated;

-- =====================================================
-- DONE!
-- =====================================================
-- To verify:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'members';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'subscription_plans';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'freelancer_categories';

-- =====================================================
-- KESTI Pro - COMPLETE Freelancer Migration
-- Run this in Supabase SQL Editor
-- This is the COMPLETE migration - run this once
-- =====================================================

-- =====================================================
-- 1. ADD EMAIL TO PROFILES (if not exists)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
        RAISE NOTICE 'Added email column to profiles table';
    END IF;
END $$;

-- Update existing profiles with email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- =====================================================
-- 2. FREELANCER CLIENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.freelancer_clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  phone TEXT,
  email TEXT,
  notes TEXT,
  total_spent DECIMAL(10,3) DEFAULT 0 CHECK (total_spent >= 0),
  total_credit DECIMAL(10,3) DEFAULT 0 CHECK (total_credit >= 0),
  projects_count INTEGER DEFAULT 0 CHECK (projects_count >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_freelancer_clients_business ON public.freelancer_clients(business_id);

-- =====================================================
-- 3. FREELANCER SERVICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.freelancer_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  price DECIMAL(10,3) NOT NULL DEFAULT 0 CHECK (price >= 0),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_freelancer_services_business ON public.freelancer_services(business_id);

-- =====================================================
-- 4. FREELANCER PROJECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.freelancer_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.freelancer_clients(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.freelancer_services(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT,
  total_price DECIMAL(10,3) NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  deposit DECIMAL(10,3) DEFAULT 0 CHECK (deposit >= 0),
  paid_amount DECIMAL(10,3) DEFAULT 0 CHECK (paid_amount >= 0),
  remaining DECIMAL(10,3) GENERATED ALWAYS AS (total_price - paid_amount) STORED,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'delivered', 'completed', 'cancelled')),
  deadline TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_freelancer_projects_business ON public.freelancer_projects(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_projects_client ON public.freelancer_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_projects_status ON public.freelancer_projects(status);

-- =====================================================
-- 5. FREELANCER PAYMENTS TABLE (client is OPTIONAL)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.freelancer_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.freelancer_clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.freelancer_projects(id) ON DELETE SET NULL,
  amount DECIMAL(10,3) NOT NULL CHECK (amount > 0),
  payment_type TEXT DEFAULT 'partial' CHECK (payment_type IN ('full', 'partial', 'deposit', 'general')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_freelancer_payments_business ON public.freelancer_payments(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_payments_client ON public.freelancer_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_payments_created ON public.freelancer_payments(created_at);

-- =====================================================
-- 6. FREELANCER EXPENSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.freelancer_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,3) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL DEFAULT 'عام',
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_freelancer_expenses_business ON public.freelancer_expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_expenses_date ON public.freelancer_expenses(date);

-- =====================================================
-- 7. FREELANCER REMINDERS TABLE (with client_id)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.freelancer_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.freelancer_clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.freelancer_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  type TEXT DEFAULT 'other' CHECK (type IN ('shoot', 'edit', 'delivery', 'meeting', 'other')),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_done BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add client_id column if it doesn't exist (for existing tables)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'freelancer_reminders'
        AND column_name = 'client_id'
    ) THEN
        ALTER TABLE public.freelancer_reminders 
        ADD COLUMN client_id UUID REFERENCES public.freelancer_clients(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_freelancer_reminders_business ON public.freelancer_reminders(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_reminders_date ON public.freelancer_reminders(date);

-- =====================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.freelancer_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_reminders ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 9. DROP EXISTING POLICIES (to avoid conflicts)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own freelancer clients" ON public.freelancer_clients;
DROP POLICY IF EXISTS "Users can insert own freelancer clients" ON public.freelancer_clients;
DROP POLICY IF EXISTS "Users can update own freelancer clients" ON public.freelancer_clients;
DROP POLICY IF EXISTS "Users can delete own freelancer clients" ON public.freelancer_clients;

DROP POLICY IF EXISTS "Users can view own freelancer services" ON public.freelancer_services;
DROP POLICY IF EXISTS "Users can insert own freelancer services" ON public.freelancer_services;
DROP POLICY IF EXISTS "Users can update own freelancer services" ON public.freelancer_services;
DROP POLICY IF EXISTS "Users can delete own freelancer services" ON public.freelancer_services;

DROP POLICY IF EXISTS "Users can view own freelancer projects" ON public.freelancer_projects;
DROP POLICY IF EXISTS "Users can insert own freelancer projects" ON public.freelancer_projects;
DROP POLICY IF EXISTS "Users can update own freelancer projects" ON public.freelancer_projects;
DROP POLICY IF EXISTS "Users can delete own freelancer projects" ON public.freelancer_projects;

DROP POLICY IF EXISTS "Users can view own freelancer payments" ON public.freelancer_payments;
DROP POLICY IF EXISTS "Users can insert own freelancer payments" ON public.freelancer_payments;
DROP POLICY IF EXISTS "Users can update own freelancer payments" ON public.freelancer_payments;
DROP POLICY IF EXISTS "Users can delete own freelancer payments" ON public.freelancer_payments;

DROP POLICY IF EXISTS "Users can view own freelancer expenses" ON public.freelancer_expenses;
DROP POLICY IF EXISTS "Users can insert own freelancer expenses" ON public.freelancer_expenses;
DROP POLICY IF EXISTS "Users can update own freelancer expenses" ON public.freelancer_expenses;
DROP POLICY IF EXISTS "Users can delete own freelancer expenses" ON public.freelancer_expenses;

DROP POLICY IF EXISTS "Users can view own freelancer reminders" ON public.freelancer_reminders;
DROP POLICY IF EXISTS "Users can insert own freelancer reminders" ON public.freelancer_reminders;
DROP POLICY IF EXISTS "Users can update own freelancer reminders" ON public.freelancer_reminders;
DROP POLICY IF EXISTS "Users can delete own freelancer reminders" ON public.freelancer_reminders;

-- =====================================================
-- 10. CREATE SECURE RLS POLICIES
-- =====================================================

-- Freelancer Clients Policies
CREATE POLICY "Users can view own freelancer clients" ON public.freelancer_clients
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer clients" ON public.freelancer_clients
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own freelancer clients" ON public.freelancer_clients
  FOR UPDATE USING (auth.uid() = business_id) WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can delete own freelancer clients" ON public.freelancer_clients
  FOR DELETE USING (auth.uid() = business_id);

-- Freelancer Services Policies
CREATE POLICY "Users can view own freelancer services" ON public.freelancer_services
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer services" ON public.freelancer_services
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own freelancer services" ON public.freelancer_services
  FOR UPDATE USING (auth.uid() = business_id) WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can delete own freelancer services" ON public.freelancer_services
  FOR DELETE USING (auth.uid() = business_id);

-- Freelancer Projects Policies
CREATE POLICY "Users can view own freelancer projects" ON public.freelancer_projects
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer projects" ON public.freelancer_projects
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own freelancer projects" ON public.freelancer_projects
  FOR UPDATE USING (auth.uid() = business_id) WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can delete own freelancer projects" ON public.freelancer_projects
  FOR DELETE USING (auth.uid() = business_id);

-- Freelancer Payments Policies
CREATE POLICY "Users can view own freelancer payments" ON public.freelancer_payments
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer payments" ON public.freelancer_payments
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own freelancer payments" ON public.freelancer_payments
  FOR UPDATE USING (auth.uid() = business_id) WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can delete own freelancer payments" ON public.freelancer_payments
  FOR DELETE USING (auth.uid() = business_id);

-- Freelancer Expenses Policies
CREATE POLICY "Users can view own freelancer expenses" ON public.freelancer_expenses
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer expenses" ON public.freelancer_expenses
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own freelancer expenses" ON public.freelancer_expenses
  FOR UPDATE USING (auth.uid() = business_id) WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can delete own freelancer expenses" ON public.freelancer_expenses
  FOR DELETE USING (auth.uid() = business_id);

-- Freelancer Reminders Policies
CREATE POLICY "Users can view own freelancer reminders" ON public.freelancer_reminders
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer reminders" ON public.freelancer_reminders
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own freelancer reminders" ON public.freelancer_reminders
  FOR UPDATE USING (auth.uid() = business_id) WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can delete own freelancer reminders" ON public.freelancer_reminders
  FOR DELETE USING (auth.uid() = business_id);

-- =====================================================
-- 11. SECURE TRIGGER FUNCTIONS
-- =====================================================

-- Update client stats when payment is added (handles NULL client_id)
CREATE OR REPLACE FUNCTION update_client_on_payment()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update client if client_id is not null
  IF NEW.client_id IS NOT NULL THEN
    UPDATE public.freelancer_clients
    SET 
      total_spent = total_spent + NEW.amount,
      updated_at = NOW()
    WHERE id = NEW.client_id;
  END IF;
  
  -- Update project paid_amount if linked to a project
  IF NEW.project_id IS NOT NULL THEN
    UPDATE public.freelancer_projects
    SET 
      paid_amount = paid_amount + NEW.amount,
      updated_at = NOW()
    WHERE id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_payment_insert ON public.freelancer_payments;
CREATE TRIGGER on_payment_insert
  AFTER INSERT ON public.freelancer_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_client_on_payment();

-- Update client project count when project is added
CREATE OR REPLACE FUNCTION update_client_on_project()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.freelancer_clients
  SET 
    projects_count = projects_count + 1,
    total_credit = total_credit + NEW.total_price - NEW.paid_amount,
    updated_at = NOW()
  WHERE id = NEW.client_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_project_insert ON public.freelancer_projects;
CREATE TRIGGER on_project_insert
  AFTER INSERT ON public.freelancer_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_client_on_project();

-- Update client credit when project is updated
CREATE OR REPLACE FUNCTION update_client_on_project_update()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalculate credit when paid_amount changes
  IF OLD.paid_amount != NEW.paid_amount THEN
    UPDATE public.freelancer_clients
    SET 
      total_credit = total_credit - (NEW.paid_amount - OLD.paid_amount),
      updated_at = NOW()
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_project_update ON public.freelancer_projects;
CREATE TRIGGER on_project_update
  AFTER UPDATE ON public.freelancer_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_client_on_project_update();

-- =====================================================
-- 12. VERIFY INSTALLATION
-- =====================================================
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN (
    'freelancer_clients', 
    'freelancer_services', 
    'freelancer_projects', 
    'freelancer_payments', 
    'freelancer_expenses', 
    'freelancer_reminders'
  );
  
  IF table_count = 6 THEN
    RAISE NOTICE '✅ All 6 freelancer tables created successfully!';
  ELSE
    RAISE WARNING '⚠️ Only % of 6 tables found', table_count;
  END IF;
END $$;

SELECT 
  '✅ FREELANCER MIGRATION COMPLETE!' AS status,
  'All tables, indexes, RLS policies, and triggers are set up.' AS message;

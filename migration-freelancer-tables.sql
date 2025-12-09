-- =====================================================
-- KESTI Pro - Freelancer Tables Migration
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- FREELANCER CLIENTS TABLE
-- =====================================================
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

-- =====================================================
-- FREELANCER SERVICES TABLE (preset services with prices)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.freelancer_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(10,3) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- FREELANCER PROJECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.freelancer_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.freelancer_clients(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.freelancer_services(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  total_price DECIMAL(10,3) NOT NULL DEFAULT 0,
  deposit DECIMAL(10,3) DEFAULT 0,
  paid_amount DECIMAL(10,3) DEFAULT 0,
  remaining DECIMAL(10,3) GENERATED ALWAYS AS (total_price - paid_amount) STORED,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'delivered', 'completed', 'cancelled')),
  deadline TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- FREELANCER PAYMENTS TABLE (income - client is optional for general income)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.freelancer_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.freelancer_clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.freelancer_projects(id) ON DELETE SET NULL,
  amount DECIMAL(10,3) NOT NULL,
  payment_type TEXT DEFAULT 'partial' CHECK (payment_type IN ('full', 'partial', 'deposit', 'general')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- FREELANCER EXPENSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.freelancer_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,3) NOT NULL,
  category TEXT NOT NULL DEFAULT 'عام',
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- FREELANCER REMINDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.freelancer_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.freelancer_projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'other' CHECK (type IN ('shoot', 'edit', 'delivery', 'meeting', 'other')),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_done BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.freelancer_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_reminders ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Freelancer Clients Policies
CREATE POLICY "Users can view own freelancer clients" ON public.freelancer_clients
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer clients" ON public.freelancer_clients
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own freelancer clients" ON public.freelancer_clients
  FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Users can delete own freelancer clients" ON public.freelancer_clients
  FOR DELETE USING (auth.uid() = business_id);

-- Freelancer Services Policies
CREATE POLICY "Users can view own freelancer services" ON public.freelancer_services
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer services" ON public.freelancer_services
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own freelancer services" ON public.freelancer_services
  FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Users can delete own freelancer services" ON public.freelancer_services
  FOR DELETE USING (auth.uid() = business_id);

-- Freelancer Projects Policies
CREATE POLICY "Users can view own freelancer projects" ON public.freelancer_projects
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer projects" ON public.freelancer_projects
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own freelancer projects" ON public.freelancer_projects
  FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Users can delete own freelancer projects" ON public.freelancer_projects
  FOR DELETE USING (auth.uid() = business_id);

-- Freelancer Payments Policies
CREATE POLICY "Users can view own freelancer payments" ON public.freelancer_payments
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer payments" ON public.freelancer_payments
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own freelancer payments" ON public.freelancer_payments
  FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Users can delete own freelancer payments" ON public.freelancer_payments
  FOR DELETE USING (auth.uid() = business_id);

-- Freelancer Expenses Policies
CREATE POLICY "Users can view own freelancer expenses" ON public.freelancer_expenses
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer expenses" ON public.freelancer_expenses
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own freelancer expenses" ON public.freelancer_expenses
  FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Users can delete own freelancer expenses" ON public.freelancer_expenses
  FOR DELETE USING (auth.uid() = business_id);

-- Freelancer Reminders Policies
CREATE POLICY "Users can view own freelancer reminders" ON public.freelancer_reminders
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own freelancer reminders" ON public.freelancer_reminders
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own freelancer reminders" ON public.freelancer_reminders
  FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Users can delete own freelancer reminders" ON public.freelancer_reminders
  FOR DELETE USING (auth.uid() = business_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATE
-- =====================================================

-- Update client stats when payment is added
CREATE OR REPLACE FUNCTION update_client_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.freelancer_clients
  SET 
    total_spent = total_spent + NEW.amount,
    updated_at = NOW()
  WHERE id = NEW.client_id;
  
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
RETURNS TRIGGER AS $$
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

-- =====================================================
-- VERIFY
-- =====================================================
SELECT 'Freelancer tables created successfully!' AS status;

-- =====================================================
-- KESTI Pro - Complete Database Schema V2
-- Run this ENTIRE script in Supabase SQL Editor
-- This adds Members, Products, Transactions tables
-- =====================================================

-- =====================================================
-- SUBSCRIPTION PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(10,3) NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  member_code TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  plan_name TEXT DEFAULT 'شهري',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_frozen BOOLEAN DEFAULT false,
  frozen_at TIMESTAMP WITH TIME ZONE,
  freeze_days INTEGER DEFAULT 0,
  debt DECIMAL(10,3) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Generate member code automatically
CREATE OR REPLACE FUNCTION generate_member_code()
RETURNS TRIGGER AS $$
DECLARE
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO member_count 
  FROM public.members 
  WHERE business_id = NEW.business_id;
  
  NEW.member_code := 'M' || LPAD(member_count::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_member_code ON public.members;
CREATE TRIGGER set_member_code
  BEFORE INSERT ON public.members
  FOR EACH ROW
  WHEN (NEW.member_code IS NULL)
  EXECUTE FUNCTION generate_member_code();

-- =====================================================
-- PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,3) NOT NULL DEFAULT 0,
  cost DECIMAL(10,3) DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER DEFAULT 5,
  category TEXT DEFAULT 'عام',
  barcode TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- SERVICES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,3) NOT NULL DEFAULT 0,
  duration_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('subscription', 'retail', 'service', 'debt_payment')),
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer', 'debt')),
  amount DECIMAL(10,3) NOT NULL DEFAULT 0,
  discount DECIMAL(10,3) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- TRANSACTION ITEMS TABLE (for retail transactions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,3) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- CHECK-INS TABLE (for member attendance)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  checked_out_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - Users can only access their own data
-- =====================================================

-- Subscription Plans Policies
CREATE POLICY "Users can view own subscription plans" ON public.subscription_plans
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own subscription plans" ON public.subscription_plans
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own subscription plans" ON public.subscription_plans
  FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Users can delete own subscription plans" ON public.subscription_plans
  FOR DELETE USING (auth.uid() = business_id);

-- Members Policies
CREATE POLICY "Users can view own members" ON public.members
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own members" ON public.members
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own members" ON public.members
  FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Users can delete own members" ON public.members
  FOR DELETE USING (auth.uid() = business_id);

-- Products Policies
CREATE POLICY "Users can view own products" ON public.products
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own products" ON public.products
  FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Users can delete own products" ON public.products
  FOR DELETE USING (auth.uid() = business_id);

-- Services Policies
CREATE POLICY "Users can view own services" ON public.services
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own services" ON public.services
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own services" ON public.services
  FOR UPDATE USING (auth.uid() = business_id);
CREATE POLICY "Users can delete own services" ON public.services
  FOR DELETE USING (auth.uid() = business_id);

-- Transactions Policies
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = business_id);

-- Transaction Items Policies
CREATE POLICY "Users can view own transaction items" ON public.transaction_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND t.business_id = auth.uid())
  );
CREATE POLICY "Users can insert own transaction items" ON public.transaction_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND t.business_id = auth.uid())
  );

-- Check-ins Policies
CREATE POLICY "Users can view own check_ins" ON public.check_ins
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own check_ins" ON public.check_ins
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own check_ins" ON public.check_ins
  FOR UPDATE USING (auth.uid() = business_id);

-- =====================================================
-- INDEXES FOR BETTER PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_members_business_id ON public.members(business_id);
CREATE INDEX IF NOT EXISTS idx_members_expires_at ON public.members(expires_at);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members(phone);
CREATE INDEX IF NOT EXISTS idx_products_business_id ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products(stock);
CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON public.transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_check_ins_member_id ON public.check_ins(member_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_checked_in_at ON public.check_ins(checked_in_at);

-- =====================================================
-- FUNCTION: Update stock after sale
-- =====================================================
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products 
    SET stock = stock - NEW.quantity,
        updated_at = NOW()
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_transaction_item_insert ON public.transaction_items;
CREATE TRIGGER after_transaction_item_insert
  AFTER INSERT ON public.transaction_items
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();

-- =====================================================
-- FUNCTION: Update member debt
-- =====================================================
CREATE OR REPLACE FUNCTION update_member_debt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.member_id IS NOT NULL AND NEW.payment_method = 'debt' THEN
    UPDATE public.members 
    SET debt = debt + NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.member_id;
  ELSIF NEW.member_id IS NOT NULL AND NEW.type = 'debt_payment' THEN
    UPDATE public.members 
    SET debt = debt - NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.member_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS after_transaction_insert ON public.transactions;
CREATE TRIGGER after_transaction_insert
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_member_debt();

-- =====================================================
-- ENABLE REALTIME FOR THESE TABLES
-- Run in Supabase Dashboard > Database > Replication
-- Or use these commands:
-- =====================================================
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- Replace 'YOUR_USER_ID' with actual user UUID
-- =====================================================
/*
-- Get your user ID first:
-- SELECT id FROM auth.users WHERE email = 'your@email.com';

-- Insert sample subscription plans
INSERT INTO public.subscription_plans (business_id, name, price, duration_days) VALUES
  ('YOUR_USER_ID', 'شهري', 80, 30),
  ('YOUR_USER_ID', '3 أشهر', 200, 90),
  ('YOUR_USER_ID', 'سنوي', 700, 365);

-- Insert sample members
INSERT INTO public.members (business_id, name, phone, plan_name, expires_at, debt) VALUES
  ('YOUR_USER_ID', 'أحمد محمد', '55123456', 'شهري', NOW() - INTERVAL '5 days', 45),
  ('YOUR_USER_ID', 'سارة أحمد', '55234567', 'شهري', NOW() + INTERVAL '3 days', 0),
  ('YOUR_USER_ID', 'محمود خالد', '55345678', '3 أشهر', NOW() + INTERVAL '5 days', 20),
  ('YOUR_USER_ID', 'فاطمة حسن', '55456789', 'سنوي', NOW() + INTERVAL '180 days', 0),
  ('YOUR_USER_ID', 'يوسف أمين', '55567890', 'شهري', NOW() + INTERVAL '45 days', 15);

-- Insert sample products
INSERT INTO public.products (business_id, name, price, stock, reorder_level, category) VALUES
  ('YOUR_USER_ID', 'مياه 0.5L', 1, 48, 10, 'مشروبات'),
  ('YOUR_USER_ID', 'مياه 1.5L', 2, 24, 10, 'مشروبات'),
  ('YOUR_USER_ID', 'مشروب طاقة', 5, 5, 12, 'مشروبات'),
  ('YOUR_USER_ID', 'بروتين بار', 8, 3, 10, 'مكملات'),
  ('YOUR_USER_ID', 'مخفوق بروتين', 12, 0, 5, 'مكملات');

-- Insert sample services
INSERT INTO public.services (business_id, name, price, duration_minutes) VALUES
  ('YOUR_USER_ID', 'تذكرة يوم', 15, 480),
  ('YOUR_USER_ID', 'جلسة تدريب شخصي', 40, 60),
  ('YOUR_USER_ID', 'استئجار منشفة', 3, 0);

-- Insert sample transactions
INSERT INTO public.transactions (business_id, type, amount, payment_method) VALUES
  ('YOUR_USER_ID', 'subscription', 80, 'cash'),
  ('YOUR_USER_ID', 'subscription', 200, 'cash'),
  ('YOUR_USER_ID', 'subscription', 80, 'cash'),
  ('YOUR_USER_ID', 'retail', 15, 'cash'),
  ('YOUR_USER_ID', 'retail', 25, 'cash'),
  ('YOUR_USER_ID', 'retail', 8, 'cash');
*/

-- =====================================================
-- DONE! 
-- =====================================================
-- To verify setup:
-- SELECT * FROM public.members LIMIT 5;
-- SELECT * FROM public.products LIMIT 5;
-- SELECT * FROM public.transactions LIMIT 5;

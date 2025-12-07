-- =====================================================
-- RETAIL UPDATE V2 - Credit System + Expenses
-- Run in Supabase SQL Editor
-- =====================================================

-- 1. RETAIL CUSTOMERS TABLE (for credit/debt tracking)
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

-- RLS for retail_customers
ALTER TABLE retail_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "retail_customers_select" ON retail_customers;
DROP POLICY IF EXISTS "retail_customers_insert" ON retail_customers;
DROP POLICY IF EXISTS "retail_customers_update" ON retail_customers;
DROP POLICY IF EXISTS "retail_customers_delete" ON retail_customers;

CREATE POLICY "retail_customers_select" ON retail_customers FOR SELECT TO authenticated USING (business_id = auth.uid());
CREATE POLICY "retail_customers_insert" ON retail_customers FOR INSERT TO authenticated WITH CHECK (business_id = auth.uid());
CREATE POLICY "retail_customers_update" ON retail_customers FOR UPDATE TO authenticated USING (business_id = auth.uid());
CREATE POLICY "retail_customers_delete" ON retail_customers FOR DELETE TO authenticated USING (business_id = auth.uid());

-- 2. DEBT PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.debt_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.retail_customers(id) ON DELETE CASCADE NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount DECIMAL(10,3) NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'partial', -- 'full' or 'partial'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for debt_payments
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debt_payments_select" ON debt_payments;
DROP POLICY IF EXISTS "debt_payments_insert" ON debt_payments;

CREATE POLICY "debt_payments_select" ON debt_payments FOR SELECT TO authenticated USING (business_id = auth.uid());
CREATE POLICY "debt_payments_insert" ON debt_payments FOR INSERT TO authenticated WITH CHECK (business_id = auth.uid());

-- 3. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,3) NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "expenses_insert" ON expenses;
DROP POLICY IF EXISTS "expenses_update" ON expenses;
DROP POLICY IF EXISTS "expenses_delete" ON expenses;

CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated USING (business_id = auth.uid());
CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated WITH CHECK (business_id = auth.uid());
CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated USING (business_id = auth.uid());
CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated USING (business_id = auth.uid());

-- 4. UPDATE TRANSACTIONS TABLE - add customer_id for credit sales
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES retail_customers(id);

-- 5. GRANT PERMISSIONS
GRANT ALL ON retail_customers TO authenticated;
GRANT ALL ON debt_payments TO authenticated;
GRANT ALL ON expenses TO authenticated;

SELECT '✅ Retail Update V2 completed!' as result;

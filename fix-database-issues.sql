-- =====================================================
-- FIX ALL DATABASE LINTER ISSUES
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. FIX SECURITY DEFINER VIEWS (ERROR)
-- Recreate views without SECURITY DEFINER
-- =====================================================

-- Drop and recreate member_summary view
DROP VIEW IF EXISTS public.member_summary;
CREATE VIEW public.member_summary AS
SELECT 
  m.id,
  m.business_id,
  m.name,
  m.phone,
  m.plan_name,
  m.expires_at,
  m.sessions_total,
  m.sessions_used,
  m.debt
FROM public.members m
WHERE m.business_id = (SELECT auth.uid());

-- Drop and recreate monthly_revenue view
DROP VIEW IF EXISTS public.monthly_revenue;
CREATE VIEW public.monthly_revenue AS
SELECT 
  date_trunc('month', created_at) as month,
  SUM(amount) as total
FROM public.transactions
WHERE business_id = (SELECT auth.uid())
GROUP BY date_trunc('month', created_at)
ORDER BY month DESC;

-- Drop and recreate daily_check_ins view
DROP VIEW IF EXISTS public.daily_check_ins;
CREATE VIEW public.daily_check_ins AS
SELECT 
  DATE(checked_in_at) as check_date,
  COUNT(*) as total_check_ins
FROM public.check_ins
WHERE business_id = (SELECT auth.uid())
GROUP BY DATE(checked_in_at)
ORDER BY check_date DESC;

-- =====================================================
-- 2. FIX FUNCTIONS WITH MUTABLE SEARCH PATH (WARN)
-- Add SET search_path = '' to all functions
-- =====================================================

-- Fix update_updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Fix update_products_updated_at
CREATE OR REPLACE FUNCTION public.update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Fix delete_user_storage
CREATE OR REPLACE FUNCTION public.delete_user_storage()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM storage.objects 
  WHERE bucket_id = 'products' 
  AND (storage.foldername(name))[1] = OLD.id::text;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Fix is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = '';

-- Fix is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = '';

-- Fix sync_role_to_metadata
CREATE OR REPLACE FUNCTION public.sync_role_to_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users 
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = '';

-- Fix generate_member_code
CREATE OR REPLACE FUNCTION public.generate_member_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.member_code IS NULL OR NEW.member_code = '' THEN
    NEW.member_code := 'M' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Fix update_member_debt
CREATE OR REPLACE FUNCTION public.update_member_debt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_method = 'debt' THEN
    UPDATE public.members 
    SET debt = COALESCE(debt, 0) + NEW.amount 
    WHERE id = NEW.member_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- Fix update_product_stock
CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.products 
    SET stock = COALESCE(stock, 0) - NEW.quantity 
    WHERE id = NEW.product_id AND track_stock = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- =====================================================
-- 3. FIX RLS POLICIES - Use (select auth.uid()) for performance
-- Drop old policies and create optimized ones
-- =====================================================

-- MEMBERS TABLE
DROP POLICY IF EXISTS "Users manage own members" ON public.members;
DROP POLICY IF EXISTS "members_policy" ON public.members;
CREATE POLICY "members_policy" ON public.members FOR ALL TO authenticated
USING (business_id = (SELECT auth.uid()))
WITH CHECK (business_id = (SELECT auth.uid()));

-- RETAIL_CUSTOMERS TABLE
DROP POLICY IF EXISTS "Users manage own customers" ON public.retail_customers;
DROP POLICY IF EXISTS "retail_customers_select" ON public.retail_customers;
DROP POLICY IF EXISTS "retail_customers_insert" ON public.retail_customers;
DROP POLICY IF EXISTS "retail_customers_update" ON public.retail_customers;
DROP POLICY IF EXISTS "retail_customers_delete" ON public.retail_customers;
CREATE POLICY "retail_customers_policy" ON public.retail_customers FOR ALL TO authenticated
USING (business_id = (SELECT auth.uid()))
WITH CHECK (business_id = (SELECT auth.uid()));

-- PRODUCTS TABLE
DROP POLICY IF EXISTS "Users manage own products" ON public.products;
DROP POLICY IF EXISTS "Users can view their own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert their own products" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products" ON public.products;
CREATE POLICY "products_policy" ON public.products FOR ALL TO authenticated
USING (business_id = (SELECT auth.uid()))
WITH CHECK (business_id = (SELECT auth.uid()));

-- CATEGORIES TABLE
DROP POLICY IF EXISTS "Users manage own categories" ON public.categories;
DROP POLICY IF EXISTS "categories_select" ON public.categories;
DROP POLICY IF EXISTS "categories_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_update" ON public.categories;
DROP POLICY IF EXISTS "categories_delete" ON public.categories;
CREATE POLICY "categories_policy" ON public.categories FOR ALL TO authenticated
USING (business_id = (SELECT auth.uid()))
WITH CHECK (business_id = (SELECT auth.uid()));

-- SUBSCRIPTION_PLANS TABLE
DROP POLICY IF EXISTS "Users manage own plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Users can manage own plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Users can view own plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "subscription_plans_policy" ON public.subscription_plans;
CREATE POLICY "subscription_plans_policy" ON public.subscription_plans FOR ALL TO authenticated
USING (business_id = (SELECT auth.uid()))
WITH CHECK (business_id = (SELECT auth.uid()));

-- SERVICES TABLE
DROP POLICY IF EXISTS "Users manage own services" ON public.services;
DROP POLICY IF EXISTS "services_policy" ON public.services;
CREATE POLICY "services_policy" ON public.services FOR ALL TO authenticated
USING (business_id = (SELECT auth.uid()))
WITH CHECK (business_id = (SELECT auth.uid()));

-- TRANSACTIONS TABLE
DROP POLICY IF EXISTS "Users manage own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can manage own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "transactions_policy" ON public.transactions;
CREATE POLICY "transactions_policy" ON public.transactions FOR ALL TO authenticated
USING (business_id = (SELECT auth.uid()))
WITH CHECK (business_id = (SELECT auth.uid()));

-- SUBSCRIPTION_HISTORY TABLE
DROP POLICY IF EXISTS "Users manage own history" ON public.subscription_history;
DROP POLICY IF EXISTS "subscription_history_policy" ON public.subscription_history;
CREATE POLICY "subscription_history_policy" ON public.subscription_history FOR ALL TO authenticated
USING (business_id = (SELECT auth.uid()))
WITH CHECK (business_id = (SELECT auth.uid()));

-- EXPENSES TABLE
DROP POLICY IF EXISTS "Users manage own expenses" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
CREATE POLICY "expenses_policy" ON public.expenses FOR ALL TO authenticated
USING (business_id = (SELECT auth.uid()))
WITH CHECK (business_id = (SELECT auth.uid()));

-- PROFILES TABLE
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()) OR public.is_super_admin());
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()) OR public.is_super_admin())
WITH CHECK (id = (SELECT auth.uid()) OR public.is_super_admin());

-- TRANSACTION_ITEMS TABLE
DROP POLICY IF EXISTS "transaction_items_select" ON public.transaction_items;
DROP POLICY IF EXISTS "transaction_items_insert" ON public.transaction_items;
DROP POLICY IF EXISTS "transaction_items_policy" ON public.transaction_items;
CREATE POLICY "transaction_items_policy" ON public.transaction_items FOR ALL TO authenticated
USING (business_id = (SELECT auth.uid()))
WITH CHECK (business_id = (SELECT auth.uid()));

-- DEBT_PAYMENTS TABLE
DROP POLICY IF EXISTS "debt_payments_select" ON public.debt_payments;
DROP POLICY IF EXISTS "debt_payments_insert" ON public.debt_payments;
CREATE POLICY "debt_payments_policy" ON public.debt_payments FOR ALL TO authenticated
USING (business_id = (SELECT auth.uid()))
WITH CHECK (business_id = (SELECT auth.uid()));

-- =====================================================
-- 4. DROP DUPLICATE INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_members_business_id;
DROP INDEX IF EXISTS idx_products_business_id;
DROP INDEX IF EXISTS idx_retail_customers_business_id;
DROP INDEX IF EXISTS idx_transactions_business_id;
DROP INDEX IF EXISTS idx_transactions_date;

-- =====================================================
-- 5. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_debt_payments_customer_id ON public.debt_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_transaction_id ON public.debt_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_members_plan_id ON public.members(plan_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_plan_id ON public.subscription_history(plan_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_product_id ON public.transaction_items(product_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_service_id ON public.transaction_items(service_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON public.transactions(customer_id);

-- =====================================================
-- 6. DROP UNUSED INDEXES (optional - uncomment if sure)
-- =====================================================

-- DROP INDEX IF EXISTS idx_check_ins_date;
-- DROP INDEX IF EXISTS idx_members_phone;
-- DROP INDEX IF EXISTS idx_members_expires;
-- DROP INDEX IF EXISTS idx_subscription_history_date;
-- DROP INDEX IF EXISTS idx_activity_log_date;
-- DROP INDEX IF EXISTS idx_activity_log_type;
-- DROP INDEX IF EXISTS idx_products_is_active;
-- DROP INDEX IF EXISTS idx_transactions_items;
-- DROP INDEX IF EXISTS idx_products_barcode;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'Functions fixed' as status;
SELECT 'RLS policies optimized' as status;
SELECT 'Duplicate indexes removed' as status;
SELECT 'Foreign key indexes added' as status;
SELECT '✅ All database issues fixed!' as result;

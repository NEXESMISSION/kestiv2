-- =====================================================
-- FIX RLS POLICIES - Run this in Supabase SQL Editor
-- This completely resets all RLS policies
-- =====================================================

-- =====================================================
-- STEP 0: DIAGNOSTIC - Run these queries first to check
-- =====================================================

-- Check your current user ID (run this separately first!)
-- SELECT auth.uid();

-- Check if profiles table has RLS blocking you
-- SELECT * FROM public.profiles WHERE id = 'e4e2f1f8-67b1-45c1-bbd1-e40a3fdeb316';

-- Check existing policies on all freelancer tables
-- SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename LIKE 'freelancer_%'
-- ORDER BY tablename, policyname;

-- =====================================================
-- OPTION 1: DISABLE RLS TEMPORARILY (for testing)
-- Uncomment these lines to completely disable RLS
-- =====================================================
-- ALTER TABLE public.freelancer_clients DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.freelancer_categories DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.freelancer_payments DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.freelancer_expenses DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.freelancer_reminders DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- OPTION 2: FIX RLS POLICIES PROPERLY
-- =====================================================

-- Step 1: Drop ALL existing policies on these tables
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on freelancer_clients
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'freelancer_clients'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.freelancer_clients', pol.policyname);
    END LOOP;
    
    -- Drop all policies on freelancer_categories
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'freelancer_categories'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.freelancer_categories', pol.policyname);
    END LOOP;
    
    -- Drop all policies on freelancer_payments
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'freelancer_payments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.freelancer_payments', pol.policyname);
    END LOOP;
    
    -- Drop all policies on freelancer_expenses
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'freelancer_expenses'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.freelancer_expenses', pol.policyname);
    END LOOP;
    
    -- Drop all policies on freelancer_reminders
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'freelancer_reminders'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.freelancer_reminders', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Make sure RLS is enabled
ALTER TABLE public.freelancer_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_reminders ENABLE ROW LEVEL SECURITY;

-- Step 3: Create simple, permissive policies for authenticated users

-- freelancer_clients - Allow all operations for authenticated users on their own data
CREATE POLICY "allow_all_clients" ON public.freelancer_clients
    FOR ALL
    TO authenticated
    USING (business_id = auth.uid())
    WITH CHECK (business_id = auth.uid());

-- freelancer_categories - Allow all operations for authenticated users on their own data
CREATE POLICY "allow_all_categories" ON public.freelancer_categories
    FOR ALL
    TO authenticated
    USING (business_id = auth.uid())
    WITH CHECK (business_id = auth.uid());

-- freelancer_payments - Allow all operations for authenticated users on their own data
CREATE POLICY "allow_all_payments" ON public.freelancer_payments
    FOR ALL
    TO authenticated
    USING (business_id = auth.uid())
    WITH CHECK (business_id = auth.uid());

-- freelancer_expenses - Allow all operations for authenticated users on their own data
CREATE POLICY "allow_all_expenses" ON public.freelancer_expenses
    FOR ALL
    TO authenticated
    USING (business_id = auth.uid())
    WITH CHECK (business_id = auth.uid());

-- freelancer_reminders - Allow all operations for authenticated users on their own data
CREATE POLICY "allow_all_reminders" ON public.freelancer_reminders
    FOR ALL
    TO authenticated
    USING (business_id = auth.uid())
    WITH CHECK (business_id = auth.uid());

-- Step 4: Grant permissions
GRANT ALL ON public.freelancer_clients TO authenticated;
GRANT ALL ON public.freelancer_categories TO authenticated;
GRANT ALL ON public.freelancer_payments TO authenticated;
GRANT ALL ON public.freelancer_expenses TO authenticated;
GRANT ALL ON public.freelancer_reminders TO authenticated;

-- Step 5: Verify policies exist
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename LIKE 'freelancer_%';

-- =====================================================
-- OPTION 3: NUCLEAR OPTION - If nothing else works
-- This completely removes RLS and creates the simplest possible policies
-- =====================================================

/*
-- Run this if the above still doesn't work:

-- Completely disable RLS first
ALTER TABLE public.freelancer_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_reminders DISABLE ROW LEVEL SECURITY;

-- Force drop all policies by recreating tables (BACKUP DATA FIRST!)
-- Or just keep RLS disabled for now

-- Re-enable with FORCE option
ALTER TABLE public.freelancer_clients FORCE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_expenses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_reminders FORCE ROW LEVEL SECURITY;
*/

-- =====================================================
-- OPTION 4: QUICK TEST - Temporarily allow all inserts
-- Use this to test if the issue is RLS or something else
-- =====================================================

/*
-- Create a permissive policy that allows any authenticated user to insert
-- (NOT SECURE - only for testing!)

DROP POLICY IF EXISTS "temp_allow_all_clients_insert" ON public.freelancer_clients;
CREATE POLICY "temp_allow_all_clients_insert" ON public.freelancer_clients
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "temp_allow_all_categories_insert" ON public.freelancer_categories;
CREATE POLICY "temp_allow_all_categories_insert" ON public.freelancer_categories
    FOR INSERT TO authenticated WITH CHECK (true);
*/

-- =====================================================
-- DONE! Refresh your page and try again
-- =====================================================

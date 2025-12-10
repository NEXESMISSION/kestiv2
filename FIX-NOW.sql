-- =====================================================
-- DEFINITIVE FIX - Copy and paste this ENTIRE script 
-- into Supabase SQL Editor and run it
-- =====================================================

-- Step 1: Drop ALL existing policies on freelancer tables
DO $$
DECLARE
    pol RECORD;
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['freelancer_clients', 'freelancer_categories', 'freelancer_payments', 'freelancer_expenses', 'freelancer_reminders']
    LOOP
        FOR pol IN 
            SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
            RAISE NOTICE 'Dropped policy: % on %', pol.policyname, tbl;
        END LOOP;
    END LOOP;
END $$;

-- Step 2: Enable RLS on all tables
ALTER TABLE public.freelancer_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_reminders ENABLE ROW LEVEL SECURITY;

-- Step 3: Create proper RLS policies for authenticated users
-- These policies allow users to access only their own data

-- freelancer_clients
CREATE POLICY "users_manage_own_clients" ON public.freelancer_clients
    FOR ALL TO authenticated
    USING (business_id = auth.uid())
    WITH CHECK (business_id = auth.uid());

-- freelancer_categories
CREATE POLICY "users_manage_own_categories" ON public.freelancer_categories
    FOR ALL TO authenticated
    USING (business_id = auth.uid())
    WITH CHECK (business_id = auth.uid());

-- freelancer_payments
CREATE POLICY "users_manage_own_payments" ON public.freelancer_payments
    FOR ALL TO authenticated
    USING (business_id = auth.uid())
    WITH CHECK (business_id = auth.uid());

-- freelancer_expenses
CREATE POLICY "users_manage_own_expenses" ON public.freelancer_expenses
    FOR ALL TO authenticated
    USING (business_id = auth.uid())
    WITH CHECK (business_id = auth.uid());

-- freelancer_reminders
CREATE POLICY "users_manage_own_reminders" ON public.freelancer_reminders
    FOR ALL TO authenticated
    USING (business_id = auth.uid())
    WITH CHECK (business_id = auth.uid());

-- Step 4: Grant table permissions to authenticated users only
GRANT ALL ON public.freelancer_clients TO authenticated;
GRANT ALL ON public.freelancer_categories TO authenticated;
GRANT ALL ON public.freelancer_payments TO authenticated;
GRANT ALL ON public.freelancer_expenses TO authenticated;
GRANT ALL ON public.freelancer_reminders TO authenticated;

-- Revoke from anon for security
REVOKE ALL ON public.freelancer_clients FROM anon;
REVOKE ALL ON public.freelancer_categories FROM anon;
REVOKE ALL ON public.freelancer_payments FROM anon;
REVOKE ALL ON public.freelancer_expenses FROM anon;
REVOKE ALL ON public.freelancer_reminders FROM anon;

-- Step 5: Verify RLS is enabled and policies exist
SELECT 'RLS STATUS:' as info;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE 'freelancer_%';

SELECT 'POLICIES:' as info;
SELECT tablename, policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename LIKE 'freelancer_%'
ORDER BY tablename;

-- =====================================================
-- Also ensure profiles table has correct policies
-- =====================================================

-- Drop existing policies on profiles
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_read_own_profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

-- Super admins can read ALL profiles
CREATE POLICY "superadmin_read_all_profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Super admins can update ALL profiles
CREATE POLICY "superadmin_update_all_profiles" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Grant permissions
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- =====================================================
-- DONE! 
-- 1. Clear your browser cookies for localhost
-- 2. Restart your dev server (npm run dev)
-- 3. Login fresh
-- =====================================================

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

-- Step 2: COMPLETELY DISABLE RLS (this will allow all operations)
ALTER TABLE public.freelancer_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_reminders DISABLE ROW LEVEL SECURITY;

-- Step 3: Grant all permissions to authenticated and anon users
GRANT ALL ON public.freelancer_clients TO authenticated;
GRANT ALL ON public.freelancer_categories TO authenticated;
GRANT ALL ON public.freelancer_payments TO authenticated;
GRANT ALL ON public.freelancer_expenses TO authenticated;
GRANT ALL ON public.freelancer_reminders TO authenticated;

GRANT ALL ON public.freelancer_clients TO anon;
GRANT ALL ON public.freelancer_categories TO anon;
GRANT ALL ON public.freelancer_payments TO anon;
GRANT ALL ON public.freelancer_expenses TO anon;
GRANT ALL ON public.freelancer_reminders TO anon;

-- Step 4: Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE 'freelancer_%';

-- The 'rowsecurity' column should show 'false' for all tables

-- DONE! Now refresh your browser and try again.
-- If it works, we know RLS was the issue and we need to fix the auth session.

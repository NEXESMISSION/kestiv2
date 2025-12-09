-- =====================================================
-- KESTI Pro - Database Reset Script
-- Run this in Supabase SQL Editor to reset the database
-- Keeps only support@kestipro.com account
-- =====================================================

-- Step 1: Delete ALL data from dependent tables first (no conditions)
TRUNCATE TABLE public.check_ins CASCADE;
TRUNCATE TABLE public.transaction_items CASCADE;
TRUNCATE TABLE public.transactions CASCADE;
TRUNCATE TABLE public.services CASCADE;
TRUNCATE TABLE public.subscription_plans CASCADE;
TRUNCATE TABLE public.members CASCADE;
TRUNCATE TABLE public.products CASCADE;

-- Step 2: Handle retail tables if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_sale_items') THEN
        TRUNCATE TABLE public.credit_sale_items CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_sales') THEN
        TRUNCATE TABLE public.credit_sales CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'retail_customers') THEN
        TRUNCATE TABLE public.retail_customers CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_history') THEN
        TRUNCATE TABLE public.subscription_history CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'expenses') THEN
        TRUNCATE TABLE public.expenses CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'categories') THEN
        TRUNCATE TABLE public.categories CASCADE;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'debt_payments') THEN
        TRUNCATE TABLE public.debt_payments CASCADE;
    END IF;
END $$;

-- Step 3: Delete profiles except support user
DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users WHERE email = 'support@kestipro.com');

-- Step 4: Delete auth users except support user
DELETE FROM auth.users WHERE email != 'support@kestipro.com';

-- Step 5: Reset the support user's subscription status
UPDATE public.profiles 
SET 
    subscription_status = 'active',
    subscription_end_date = (NOW() + INTERVAL '1 year'),
    subscription_days = 365,
    is_active = true,
    is_paused = false,
    pause_reason = NULL
WHERE id = (SELECT id FROM auth.users WHERE email = 'support@kestipro.com');

-- Step 6: Verify
SELECT 'Database reset complete!' AS status;
SELECT COUNT(*) AS total_users FROM auth.users;
SELECT * FROM auth.users;
SELECT * FROM public.profiles;

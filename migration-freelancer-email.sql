-- =====================================================
-- KESTI Pro - Migration: Add Freelancer Mode & Email
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add email column to profiles table if it doesn't exist
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
    ELSE
        RAISE NOTICE 'email column already exists in profiles table';
    END IF;
END $$;

-- 2. Update existing profiles with email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 3. Verify the changes
SELECT 
    'Migration complete!' AS status,
    COUNT(*) FILTER (WHERE email IS NOT NULL) AS profiles_with_email,
    COUNT(*) FILTER (WHERE email IS NULL) AS profiles_without_email
FROM public.profiles;

-- 4. Show sample data
SELECT id, email, full_name, business_mode, subscription_status
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

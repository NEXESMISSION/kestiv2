-- =====================================================
-- FIX SUPERADMIN - Complete Fix (v2)
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- 1. ADD MISSING COLUMNS TO PROFILES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pause_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_days INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN DEFAULT false;

-- 2. UPDATE EXISTING NULL VALUES
UPDATE profiles SET is_paused = false WHERE is_paused IS NULL;
UPDATE profiles SET subscription_status = 'trial' WHERE subscription_status IS NULL;
UPDATE profiles SET subscription_days = 0 WHERE subscription_days IS NULL;
UPDATE profiles SET has_seen_welcome = false WHERE has_seen_welcome IS NULL;

-- 3. CREATE A FUNCTION TO CHECK SUPER ADMIN (checks JWT metadata, no table query)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check role from JWT token metadata (set during signup/login)
  RETURN COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin',
    FALSE
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. DROP ALL OLD POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for auth users" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_all_policy" ON profiles;

-- 5. CREATE NEW POLICIES USING THE FUNCTION
-- SELECT: users see own profile, super_admin sees all
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_super_admin());

-- UPDATE: users update own profile, super_admin updates all
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id OR public.is_super_admin())
    WITH CHECK (auth.uid() = id OR public.is_super_admin());

-- INSERT: users can only insert their own profile
CREATE POLICY "profiles_insert_policy" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- 6. ENSURE RLS IS ENABLED
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 7. GRANT PERMISSIONS
GRANT ALL ON profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- 8. VERIFY CHANGES
SELECT 'Profiles columns:' as info;
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('is_paused', 'pause_reason', 'subscription_status', 'subscription_end_date', 'subscription_days', 'role', 'has_seen_welcome')
ORDER BY column_name;

SELECT 'Policies on profiles:' as info;
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles';

SELECT '✅ SuperAdmin fix complete!' as result;

-- =====================================================
-- IMPORTANT: SET YOUR SUPER ADMIN
-- Run this AFTER the above, replacing the email
-- =====================================================

-- Option 1: Update auth.users metadata (REQUIRED for RLS to work)
-- Replace 'your-admin-email@example.com' with your actual email
/*
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "super_admin"}'::jsonb
WHERE email = 'your-admin-email@example.com';
*/

-- Option 2: Also update profiles table
/*
UPDATE profiles 
SET role = 'super_admin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-admin-email@example.com');
*/

-- Verify super admin is set
-- SELECT id, email, raw_user_meta_data->>'role' as role FROM auth.users WHERE email = 'your-admin-email@example.com';

-- =====================================================
-- FIX SUPERADMIN - Complete Fix
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- 1. ADD MISSING COLUMNS TO PROFILES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pause_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_days INTEGER DEFAULT 0;

-- 2. UPDATE EXISTING NULL VALUES
UPDATE profiles SET is_paused = false WHERE is_paused IS NULL;
UPDATE profiles SET subscription_status = 'trial' WHERE subscription_status IS NULL;
UPDATE profiles SET subscription_days = 0 WHERE subscription_days IS NULL;

-- 3. DROP OLD POLICIES (if they exist)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_policy" ON profiles;

-- 4. CREATE NEW POLICIES THAT ALLOW SUPER_ADMIN
-- Super admins can view ALL profiles, regular users can only view their own
CREATE POLICY "profiles_select_policy" ON profiles
    FOR SELECT TO authenticated
    USING (
        auth.uid() = id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Super admins can update ALL profiles, regular users can only update their own
CREATE POLICY "profiles_update_policy" ON profiles
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
    WITH CHECK (
        auth.uid() = id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- 5. ENSURE RLS IS ENABLED
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. GRANT PERMISSIONS
GRANT ALL ON profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 7. VERIFY CHANGES
SELECT 'Profiles columns:' as info;
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('is_paused', 'pause_reason', 'subscription_status', 'subscription_end_date', 'subscription_days', 'role')
ORDER BY column_name;

SELECT 'Policies on profiles:' as info;
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

SELECT '✅ SuperAdmin fix complete!' as result;

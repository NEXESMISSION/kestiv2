-- =====================================================
-- FIX RLS RECURSION - Run this in Supabase SQL Editor
-- =====================================================

-- 1. DROP ALL PROBLEMATIC POLICIES
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for users" ON profiles;
DROP POLICY IF EXISTS "Enable update for users" ON profiles;

-- 2. CREATE A SECURITY DEFINER FUNCTION TO CHECK ROLE (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. CREATE NEW POLICIES USING THE FUNCTION
-- Select policy: users see own profile OR super_admin sees all
CREATE POLICY "profiles_select" ON profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_super_admin());

-- Update policy: users update own profile OR super_admin updates all
CREATE POLICY "profiles_update" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id OR public.is_super_admin())
    WITH CHECK (auth.uid() = id OR public.is_super_admin());

-- Insert policy (for new user creation)
CREATE POLICY "profiles_insert" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- 4. MAKE SURE COLUMNS EXIST
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pause_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_days INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 5. FIX NULL VALUES
UPDATE profiles SET is_paused = false WHERE is_paused IS NULL;
UPDATE profiles SET subscription_status = 'trial' WHERE subscription_status IS NULL;
UPDATE profiles SET role = 'user' WHERE role IS NULL;

-- 6. ENABLE RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 7. GRANT PERMISSIONS
GRANT ALL ON profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- DONE
SELECT '✅ RLS Fixed! Refresh your browser.' as result;

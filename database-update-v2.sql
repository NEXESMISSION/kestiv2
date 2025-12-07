-- =====================================================
-- KESTI Pro - Database Update v2
-- Run this in Supabase SQL Editor
-- This adds all required columns for the new POS system
-- =====================================================

-- =====================================================
-- 0. UPDATE profiles TABLE (SuperAdmin needs these)
-- =====================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pause_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_days INTEGER DEFAULT 0;

-- =====================================================
-- 1. UPDATE subscription_plans TABLE
-- =====================================================
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS sessions INTEGER DEFAULT 0;
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'subscription';

-- Update existing plans to set plan_type
UPDATE subscription_plans 
SET plan_type = CASE
  WHEN duration_days = 0 AND sessions = 1 THEN 'single'
  WHEN duration_days = 0 AND sessions > 1 THEN 'package'
  ELSE 'subscription'
END
WHERE plan_type IS NULL OR plan_type = '';

-- =====================================================
-- 2. UPDATE members TABLE
-- =====================================================
ALTER TABLE members ADD COLUMN IF NOT EXISTS sessions_total INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS sessions_used INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20);
ALTER TABLE members ADD COLUMN IF NOT EXISTS plan_start_at TIMESTAMPTZ;

-- Make expires_at nullable (for single sessions that don't expire)
ALTER TABLE members ALTER COLUMN expires_at DROP NOT NULL;

-- Update existing members to set plan_start_at
UPDATE members SET plan_start_at = created_at WHERE plan_start_at IS NULL;

-- Update plan_type for existing members
UPDATE members m
SET plan_type = CASE
  WHEN m.sessions_total = 1 THEN 'single'
  WHEN m.sessions_total > 1 THEN 'package'
  ELSE 'subscription'
END
WHERE m.plan_type IS NULL AND m.plan_id IS NOT NULL;

-- Set expires_at to NULL for single session members
UPDATE members 
SET expires_at = NULL 
WHERE sessions_total = 1 AND plan_type = 'single';

-- =====================================================
-- 3. CREATE subscription_history TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
    plan_name TEXT,
    type VARCHAR(50) NOT NULL,
    sessions_added INTEGER DEFAULT 0,
    sessions_before INTEGER DEFAULT 0,
    sessions_after INTEGER DEFAULT 0,
    expires_before TIMESTAMPTZ,
    expires_after TIMESTAMPTZ,
    amount NUMERIC(10, 3) DEFAULT 0,
    payment_method VARCHAR(50),
    notes TEXT,
    old_plan_id UUID,
    old_plan_name TEXT,
    new_plan_id UUID,
    new_plan_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for subscription_history
CREATE INDEX IF NOT EXISTS idx_subscription_history_business ON subscription_history(business_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_member ON subscription_history(member_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_date ON subscription_history(created_at);

-- Enable RLS
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Policy for subscription_history
DROP POLICY IF EXISTS "subscription_history_policy" ON subscription_history;
CREATE POLICY "subscription_history_policy" ON subscription_history
    FOR ALL TO authenticated
    USING (auth.uid() = business_id)
    WITH CHECK (auth.uid() = business_id);

GRANT ALL ON subscription_history TO authenticated;

-- =====================================================
-- 4. CREATE services TABLE (if not exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 3) DEFAULT 0,
    duration_minutes INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_policy" ON services;
CREATE POLICY "services_policy" ON services
    FOR ALL TO authenticated
    USING (auth.uid() = business_id)
    WITH CHECK (auth.uid() = business_id);

GRANT ALL ON services TO authenticated;

-- =====================================================
-- 5. UPDATE transactions TABLE
-- =====================================================
-- Make sure member_id can be NULL
ALTER TABLE transactions ALTER COLUMN member_id DROP NOT NULL;

-- =====================================================
-- 6. FIX members TABLE - Allow NULL for optional fields
-- =====================================================
-- Allow plan_id to be NULL (for customers without plans)
ALTER TABLE members ALTER COLUMN plan_id DROP NOT NULL;

-- Allow plan_name to be NULL
ALTER TABLE members ALTER COLUMN plan_name DROP NOT NULL;

-- =====================================================
-- 7. VERIFY EVERYTHING IS CORRECT
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Database update complete!';
    RAISE NOTICE 'Tables updated: subscription_plans, members, services';
    RAISE NOTICE 'Tables created: subscription_history';
END $$;

-- Show current column structure
SELECT 'members columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'members' 
ORDER BY ordinal_position;

SELECT 'subscription_plans columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'subscription_plans' 
ORDER BY ordinal_position;

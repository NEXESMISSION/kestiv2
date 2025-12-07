-- =====================================================
-- KESTI - DATABASE UPDATE SCRIPT
-- Run this if you already have the base tables
-- =====================================================

-- Add sessions column to subscription_plans
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS sessions INTEGER DEFAULT 0;

-- Add sessions columns to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS sessions_total INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS sessions_used INTEGER DEFAULT 0;

-- Create activity_log table if not exists
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_activity_log_business ON activity_log(business_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_member ON activity_log(member_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_date ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(action_type);

-- Enable RLS on activity_log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy (to avoid "already exists" error)
DROP POLICY IF EXISTS "activity_log_policy" ON activity_log;
CREATE POLICY "activity_log_policy" ON activity_log
    FOR ALL TO authenticated
    USING (auth.uid() = business_id)
    WITH CHECK (auth.uid() = business_id);

GRANT ALL ON activity_log TO authenticated;

-- Fix existing members with session-based plans
-- This updates members who have a session-based plan but no sessions_total set
UPDATE members m
SET 
  sessions_total = COALESCE(p.sessions, 1),
  sessions_used = 0
FROM subscription_plans p
WHERE m.plan_id = p.id
  AND p.duration_days = 0
  AND (m.sessions_total IS NULL OR m.sessions_total = 0);

-- Create subscription_history table to track all subscriptions and sessions
CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
    plan_name TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'subscription', 'session_add', 'session_use'
    sessions_added INTEGER DEFAULT 0,
    sessions_before INTEGER DEFAULT 0,
    sessions_after INTEGER DEFAULT 0,
    expires_before TIMESTAMPTZ,
    expires_after TIMESTAMPTZ,
    amount NUMERIC(10, 3) DEFAULT 0,
    payment_method VARCHAR(50), -- 'cash', 'debt'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_business ON subscription_history(business_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_member ON subscription_history(member_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_date ON subscription_history(created_at);

ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_history_policy" ON subscription_history;
CREATE POLICY "subscription_history_policy" ON subscription_history
    FOR ALL TO authenticated
    USING (auth.uid() = business_id)
    WITH CHECK (auth.uid() = business_id);

GRANT ALL ON subscription_history TO authenticated;

-- =====================================================
-- PLAN TYPE COLUMN - For better subscription management
-- =====================================================

-- Add plan_type column to subscription_plans
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'subscription';

-- Update existing plans based on their duration_days and sessions
UPDATE subscription_plans 
SET plan_type = CASE
  WHEN duration_days = 0 AND sessions = 1 THEN 'single'
  WHEN duration_days = 0 AND sessions > 1 THEN 'package'
  ELSE 'subscription'
END
WHERE plan_type IS NULL OR plan_type = 'subscription';

-- Add comment to explain the column
COMMENT ON COLUMN subscription_plans.plan_type IS 'Plan type: subscription (time-based), package (multiple sessions), single (one session)';

-- =====================================================
-- SAIF UPDATE - New Requirements (Dec 2024)
-- =====================================================

-- 1. Add plan_start_at to members table (track subscription start date)
ALTER TABLE members ADD COLUMN IF NOT EXISTS plan_start_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Update existing members to set plan_start_at from created_at
UPDATE members SET plan_start_at = created_at WHERE plan_start_at IS NULL;

-- 3. For single session members: set expires_at to NULL (they don't expire by time)
-- Single session = sessions_total = 1
UPDATE members 
SET expires_at = NULL 
WHERE sessions_total = 1;

-- 4. Add new columns to subscription_history for plan changes
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS old_plan_id UUID;
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS new_plan_id UUID;
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS old_plan_name VARCHAR(255);
ALTER TABLE subscription_history ADD COLUMN IF NOT EXISTS new_plan_name VARCHAR(255);

-- 5. Update subscription_history type to include 'plan_change'
-- The type column should accept: 'subscription', 'session_add', 'session_use', 'plan_change'
COMMENT ON COLUMN subscription_history.type IS 'Type: subscription, session_add, session_use, plan_change';

-- 6. Add plan_type to members table (to track current plan type without needing to join)
ALTER TABLE members ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'subscription';

-- 7. Update existing members plan_type based on their sessions
UPDATE members 
SET plan_type = CASE
  WHEN sessions_total = 1 THEN 'single'
  WHEN sessions_total > 1 THEN 'package'
  ELSE 'subscription'
END
WHERE plan_type IS NULL OR plan_type = 'subscription';

-- Done!
SELECT 'Database updated successfully with Saif requirements!' as message;

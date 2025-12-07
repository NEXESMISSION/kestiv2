-- FIX PROFILES TABLE FOR SUPERADMIN
-- Run this in Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pause_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_days INTEGER DEFAULT 0;

-- Update existing profiles
UPDATE profiles SET is_paused = false WHERE is_paused IS NULL;
UPDATE profiles SET subscription_status = 'trial' WHERE subscription_status IS NULL;

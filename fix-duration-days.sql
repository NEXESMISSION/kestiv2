-- Fix duration_days to support decimal values (for minutes testing)
-- Run this in your Supabase SQL Editor

-- Change duration_days from integer to numeric to support fractional days
ALTER TABLE subscription_plans 
ALTER COLUMN duration_days TYPE NUMERIC USING duration_days::NUMERIC;

-- Add a comment for clarity
COMMENT ON COLUMN subscription_plans.duration_days IS 'Duration in days. Supports decimals for minutes (e.g., 0.0007 = ~1 minute). -1 = unlimited, 0 = session-based';

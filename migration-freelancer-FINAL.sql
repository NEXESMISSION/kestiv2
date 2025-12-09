-- =====================================================
-- FREELANCER FINAL MIGRATION - December 2024
-- Run this AFTER the previous migrations
-- This adds custom event types for calendar
-- =====================================================

-- =====================================================
-- 1. CREATE CUSTOM EVENT TYPES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.freelancer_event_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50) DEFAULT 'blue',
  icon VARCHAR(50) DEFAULT 'calendar',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_freelancer_event_types_business 
  ON public.freelancer_event_types(business_id);

-- =====================================================
-- 2. UPDATE REMINDERS TABLE FOR CUSTOM TYPES
-- =====================================================
-- Add type_id column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'freelancer_reminders' 
    AND column_name = 'type_id'
  ) THEN
    ALTER TABLE public.freelancer_reminders 
      ADD COLUMN type_id UUID REFERENCES public.freelancer_event_types(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add client_id column to reminders if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'freelancer_reminders' 
    AND column_name = 'client_id'
  ) THEN
    ALTER TABLE public.freelancer_reminders 
      ADD COLUMN client_id UUID REFERENCES public.freelancer_clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Make old 'type' column nullable for backward compatibility
ALTER TABLE public.freelancer_reminders 
  ALTER COLUMN type DROP NOT NULL;

-- =====================================================
-- 3. ROW LEVEL SECURITY FOR EVENT TYPES
-- =====================================================
ALTER TABLE public.freelancer_event_types ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own event types" ON public.freelancer_event_types;
DROP POLICY IF EXISTS "Users can insert own event types" ON public.freelancer_event_types;
DROP POLICY IF EXISTS "Users can update own event types" ON public.freelancer_event_types;
DROP POLICY IF EXISTS "Users can delete own event types" ON public.freelancer_event_types;

-- Create policies
CREATE POLICY "Users can view own event types" ON public.freelancer_event_types
  FOR SELECT USING (auth.uid() = business_id);

CREATE POLICY "Users can insert own event types" ON public.freelancer_event_types
  FOR INSERT WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Users can update own event types" ON public.freelancer_event_types
  FOR UPDATE USING (auth.uid() = business_id);

CREATE POLICY "Users can delete own event types" ON public.freelancer_event_types
  FOR DELETE USING (auth.uid() = business_id);

-- =====================================================
-- 4. ADD INDEXES FOR PERFORMANCE
-- =====================================================
-- Index for payments by date (for history filtering)
CREATE INDEX IF NOT EXISTS idx_freelancer_payments_created 
  ON public.freelancer_payments(created_at DESC);

-- Index for expenses by date
CREATE INDEX IF NOT EXISTS idx_freelancer_expenses_date 
  ON public.freelancer_expenses(date DESC);

-- Index for reminders by date
CREATE INDEX IF NOT EXISTS idx_freelancer_reminders_date 
  ON public.freelancer_reminders(date);

-- Index for projects by status
CREATE INDEX IF NOT EXISTS idx_freelancer_projects_status 
  ON public.freelancer_projects(status);

-- =====================================================
-- 5. ENSURE PAYMENTS TABLE HAS NULLABLE CLIENT_ID
-- =====================================================
ALTER TABLE public.freelancer_payments 
  ALTER COLUMN client_id DROP NOT NULL;

-- =====================================================
-- 6. VERIFICATION - Check tables exist
-- =====================================================
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN (
    'freelancer_clients',
    'freelancer_projects', 
    'freelancer_payments',
    'freelancer_expenses',
    'freelancer_services',
    'freelancer_reminders',
    'freelancer_event_types'
  );
  
  IF table_count >= 7 THEN
    RAISE NOTICE '✅ All freelancer tables exist (%/7)', table_count;
  ELSE
    RAISE NOTICE '⚠️ Some tables missing (%/7)', table_count;
  END IF;
END $$;

-- =====================================================
-- DONE!
-- =====================================================
SELECT '✅ FREELANCER FINAL MIGRATION COMPLETE!' AS status;

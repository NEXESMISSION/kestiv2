-- =====================================================
-- KESTI Pro - Custom Event Types for Freelancers
-- Run this to add customizable event types
-- =====================================================

-- =====================================================
-- 1. FREELANCER EVENT TYPES TABLE (user-defined)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.freelancer_event_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  color TEXT NOT NULL DEFAULT 'blue' CHECK (color IN ('blue', 'green', 'red', 'orange', 'purple', 'pink', 'yellow', 'gray')),
  icon TEXT DEFAULT 'star',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_freelancer_event_types_business ON public.freelancer_event_types(business_id);

-- =====================================================
-- 2. UPDATE REMINDERS TABLE - use custom type_id
-- =====================================================
-- Add type_id column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'freelancer_reminders'
        AND column_name = 'type_id'
    ) THEN
        ALTER TABLE public.freelancer_reminders 
        ADD COLUMN type_id UUID REFERENCES public.freelancer_event_types(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added type_id column to freelancer_reminders';
    END IF;
END $$;

-- =====================================================
-- 3. ENABLE RLS
-- =====================================================
ALTER TABLE public.freelancer_event_types ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Users can view own event types" ON public.freelancer_event_types;
DROP POLICY IF EXISTS "Users can insert own event types" ON public.freelancer_event_types;
DROP POLICY IF EXISTS "Users can update own event types" ON public.freelancer_event_types;
DROP POLICY IF EXISTS "Users can delete own event types" ON public.freelancer_event_types;

CREATE POLICY "Users can view own event types" ON public.freelancer_event_types
  FOR SELECT USING (auth.uid() = business_id);
CREATE POLICY "Users can insert own event types" ON public.freelancer_event_types
  FOR INSERT WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can update own event types" ON public.freelancer_event_types
  FOR UPDATE USING (auth.uid() = business_id) WITH CHECK (auth.uid() = business_id);
CREATE POLICY "Users can delete own event types" ON public.freelancer_event_types
  FOR DELETE USING (auth.uid() = business_id);

-- =====================================================
-- DONE!
-- =====================================================
SELECT '✅ Custom event types table created!' AS status;

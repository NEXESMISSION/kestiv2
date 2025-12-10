-- =====================================================
-- FREELANCER CATEGORIES TABLE
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Create the freelancer_categories table for income/expense categories
CREATE TABLE IF NOT EXISTS freelancer_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_freelancer_categories_business 
  ON freelancer_categories(business_id);

-- Enable RLS
ALTER TABLE freelancer_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own categories" 
  ON freelancer_categories FOR SELECT 
  USING (auth.uid() = business_id);

CREATE POLICY "Users can insert own categories" 
  ON freelancer_categories FOR INSERT 
  WITH CHECK (auth.uid() = business_id);

CREATE POLICY "Users can update own categories" 
  ON freelancer_categories FOR UPDATE 
  USING (auth.uid() = business_id);

CREATE POLICY "Users can delete own categories" 
  ON freelancer_categories FOR DELETE 
  USING (auth.uid() = business_id);

-- =====================================================
-- UPDATE FREELANCER_PAYMENTS TABLE
-- Add category_id and category columns if not exists
-- =====================================================

-- Add category_id column to freelancer_payments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'freelancer_payments' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE freelancer_payments ADD COLUMN category_id UUID REFERENCES freelancer_categories(id);
  END IF;
END $$;

-- Add category column to freelancer_payments (for display name)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'freelancer_payments' AND column_name = 'category'
  ) THEN
    ALTER TABLE freelancer_payments ADD COLUMN category TEXT DEFAULT 'عام';
  END IF;
END $$;

-- =====================================================
-- UPDATE FREELANCER_EXPENSES TABLE
-- Add category_id column if not exists
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'freelancer_expenses' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE freelancer_expenses ADD COLUMN category_id UUID REFERENCES freelancer_categories(id);
  END IF;
END $$;

-- =====================================================
-- UPDATE FREELANCER_CLIENTS TABLE
-- Ensure total_spent and total_credit columns exist
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'freelancer_clients' AND column_name = 'total_spent'
  ) THEN
    ALTER TABLE freelancer_clients ADD COLUMN total_spent DECIMAL(10,3) DEFAULT 0;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'freelancer_clients' AND column_name = 'total_credit'
  ) THEN
    ALTER TABLE freelancer_clients ADD COLUMN total_credit DECIMAL(10,3) DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- CREATE FREELANCER_REMINDERS TABLE (if not exists)
-- For calendar events
-- =====================================================

CREATE TABLE IF NOT EXISTS freelancer_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES freelancer_clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES freelancer_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'عام',
  date DATE NOT NULL,
  is_done BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_freelancer_reminders_business 
  ON freelancer_reminders(business_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_reminders_date 
  ON freelancer_reminders(date);

-- Enable RLS
ALTER TABLE freelancer_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies (skip if already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'freelancer_reminders' AND policyname = 'Users can view own reminders'
  ) THEN
    CREATE POLICY "Users can view own reminders" 
      ON freelancer_reminders FOR SELECT 
      USING (auth.uid() = business_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'freelancer_reminders' AND policyname = 'Users can insert own reminders'
  ) THEN
    CREATE POLICY "Users can insert own reminders" 
      ON freelancer_reminders FOR INSERT 
      WITH CHECK (auth.uid() = business_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'freelancer_reminders' AND policyname = 'Users can update own reminders'
  ) THEN
    CREATE POLICY "Users can update own reminders" 
      ON freelancer_reminders FOR UPDATE 
      USING (auth.uid() = business_id);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'freelancer_reminders' AND policyname = 'Users can delete own reminders'
  ) THEN
    CREATE POLICY "Users can delete own reminders" 
      ON freelancer_reminders FOR DELETE 
      USING (auth.uid() = business_id);
  END IF;
END $$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON freelancer_categories TO authenticated;
GRANT ALL ON freelancer_reminders TO authenticated;

-- =====================================================
-- DONE!
-- =====================================================


